import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  API_AUTHORIZATION_POLICY,
  PUBLIC_API_REASONS,
  type ApiAuthorization,
} from '@/app/api/authorization-policy';

const API_ROOT = join(process.cwd(), 'app', 'api');
const HTTP_METHODS = new Set([
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS',
]);
const OWNERSHIP_CHECKS = new Set([
  'getOrganizerEventContext',
  'getOrganizerRaceContext',
  'getRaceAccessContext',
]);
const PROTECTED_IMPORT_PREFIXES = [
  '@/lib/db/',
  '@/lib/services/',
  '@/lib/integrations/',
  '@/lib/cache/',
];

type HandlerFunction =
  | ts.FunctionDeclaration
  | ts.ArrowFunction
  | ts.FunctionExpression;

interface DiscoveredHandler {
  method: string;
  functionNode: HandlerFunction;
  sourceFile: ts.SourceFile;
}

interface RouteHandler extends DiscoveredHandler {
  key: string;
  access: ApiAuthorization | undefined;
}

function collectRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectRouteFiles(path);
    }

    return entry.name === 'route.ts' ? [path] : [];
  });
}

function hasExportModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node)
    ? (ts.getModifiers(node)?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      ) ?? false)
    : false;
}

function discoverSourceHandlers(sourceFile: ts.SourceFile): DiscoveredHandler[] {
  const handlers: DiscoveredHandler[] = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name &&
      HTTP_METHODS.has(statement.name.text) &&
      hasExportModifier(statement)
    ) {
      handlers.push({
        method: statement.name.text,
        functionNode: statement,
        sourceFile,
      });
      continue;
    }

    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          !ts.isIdentifier(declaration.name) ||
          !HTTP_METHODS.has(declaration.name.text)
        ) {
          continue;
        }

        if (
          !declaration.initializer ||
          (!ts.isArrowFunction(declaration.initializer) &&
            !ts.isFunctionExpression(declaration.initializer))
        ) {
          throw new Error(
            `${sourceFile.fileName}: ${declaration.name.text} must be an inline auditable function`,
          );
        }

        handlers.push({
          method: declaration.name.text,
          functionNode: declaration.initializer,
          sourceFile,
        });
      }
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      if (!statement.exportClause) {
        throw new Error(
          `${sourceFile.fileName}: wildcard re-exports cannot be authorization-audited`,
        );
      }

      if (ts.isNamedExports(statement.exportClause)) {
        const exportedMethod = statement.exportClause.elements.find((element) =>
          HTTP_METHODS.has(element.name.text),
        );

        if (exportedMethod) {
          throw new Error(
            `${sourceFile.fileName}: ${exportedMethod.name.text} must be defined inline for authorization auditing`,
          );
        }
      }
    }
  }

  return handlers;
}

function routePath(file: string): string {
  const directory = relative(API_ROOT, file).split(sep).slice(0, -1);
  return `/api/${directory.join('/')}`.replace(/\/$/, '');
}

function collectHandlers(): RouteHandler[] {
  return collectRouteFiles(API_ROOT).flatMap((file) => {
    const sourceFile = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );

    return discoverSourceHandlers(sourceFile).map((handler) => {
      const key = `${handler.method} ${routePath(file)}`;
      const access = API_AUTHORIZATION_POLICY[
        key as keyof typeof API_AUTHORIZATION_POLICY
      ];

      return { ...handler, key, access };
    });
  });
}

function calledFunctionNodes(handler: RouteHandler): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      calls.push(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(handler.functionNode);
  return calls;
}

function expectedGuard(access: ApiAuthorization): string | null {
  if (typeof access === 'object') return 'requireDraftAccess';
  switch (access) {
    case 'public': return null;
    case 'cron': return 'requireCronSecret';
    case 'import-track': return 'requireImportTrackSecret';
    case 'revalidation': return 'requireRevalidationSecret';
    case 'admin': return 'requireAdmin';
    default: return 'requireAuth';
  }
}

function guardViolations(handler: RouteHandler): string[] {
  const { access, key, sourceFile } = handler;
  if (access === undefined) return [`${key} must have an authorization policy`];
  const calls = calledFunctionNodes(handler);
  const guard = expectedGuard(access);
  if (guard === null) {
    const privateGuards = new Set([
      'requireAuth', 'requireAdmin', 'requireDraftAccess',
      'requireCronSecret', 'requireImportTrackSecret', 'requireRevalidationSecret',
    ]);
    return calls.some((call) => privateGuards.has(call.expression.getText(sourceFile)))
      ? [`${key} unexpectedly has a private guard`] : [];
  }

  const guardCall = calls.find((call) => call.expression.getText(sourceFile) === guard);
  if (!guardCall) return [`${key} must call ${guard}`];
  const violations: string[] = [];
  if (calls[0] !== guardCall) {
    violations.push(`${key} must call ${guard} before other functions`);
  }
  if (['requireAuth', 'requireAdmin', 'requireDraftAccess'].includes(guard)
    && !ts.isAwaitExpression(guardCall.parent)) {
    violations.push(`${key} must await ${guard}`);
  }
  if (typeof access === 'object') {
    const permission = guardCall.arguments[1];
    if (!permission || !ts.isStringLiteral(permission) || permission.text !== access.permission) {
      violations.push(`${key} must require draft permission ${access.permission}`);
    }
    const request = handler.functionNode.parameters[0]?.name;
    const argument = guardCall.arguments[0];
    if (!request || !argument || !ts.isIdentifier(request)
      || !ts.isIdentifier(argument) || request.text !== argument.text) {
      violations.push(`${key} must pass its request to ${guard}`);
    }
  }
  return violations;
}

function protectedFunctionNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;

    const moduleName = ts.isStringLiteral(statement.moduleSpecifier)
      ? statement.moduleSpecifier.text
      : '';
    const isProtectedModule =
      PROTECTED_IMPORT_PREFIXES.some((prefix) => moduleName.startsWith(prefix)) ||
      moduleName === 'next/cache';

    if (!isProtectedModule) continue;

    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        names.add(element.name.text);
      }
    }
  }

  return names;
}

function isInsideAdminBranch(
  call: ts.CallExpression,
  handler: RouteHandler,
): boolean {
  let node: ts.Node | undefined = call;

  while (node?.parent && node.parent !== handler.functionNode) {
    const parent: ts.Node = node.parent;
    if (
      ts.isIfStatement(parent) &&
      parent.expression.getText(handler.sourceFile) === 'isAdmin' &&
      call.getStart() >= parent.thenStatement.getStart() &&
      call.getEnd() <= parent.thenStatement.getEnd()
    ) {
      return true;
    }
    node = parent;
  }

  return false;
}

function ownershipOrderViolations(handler: RouteHandler): string[] {
  const calls = calledFunctionNodes(handler);
  const ownershipCall = calls.find((call) =>
    OWNERSHIP_CHECKS.has(call.expression.getText(handler.sourceFile)),
  );

  if (!ownershipCall) {
    return [`${handler.key} must verify race ownership`];
  }

  const protectedNames = protectedFunctionNames(handler.sourceFile);
  const earlyProtectedCalls = calls.filter((call) => {
    const calledName = call.expression.getText(handler.sourceFile);
    return (
      protectedNames.has(calledName) &&
      call.getStart() < ownershipCall.getStart() &&
      !isInsideAdminBranch(call, handler)
    );
  });

  return earlyProtectedCalls.map(
    (call) =>
      `${handler.key} calls ${call.expression.getText(handler.sourceFile)} before ownership verification`,
  );
}

function sourceFile(source: string): ts.SourceFile {
  return ts.createSourceFile(
    'app/api/example/route.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
  );
}

describe('API authorization policy', () => {
  const handlers = collectHandlers();

  it('classifies every exported API handler exactly once', () => {
    expect(handlers.map(({ key }) => key).sort()).toEqual(
      Object.keys(API_AUTHORIZATION_POLICY).sort(),
    );
    expect(handlers.every(({ access }) => access !== undefined)).toBe(true);
  });

  it('discovers variable handlers for every supported HTTP method', () => {
    const declarations = [...HTTP_METHODS]
      .map((method) => `export const ${method} = async () => {}`)
      .join('\n');

    expect(
      discoverSourceHandlers(sourceFile(declarations)).map(
        ({ method }) => method,
      ),
    ).toEqual([...HTTP_METHODS]);
  });

  it('rejects opaque HTTP handler re-exports', () => {
    expect(() =>
      discoverSourceHandlers(
        sourceFile(`const handler = async () => {}\nexport { handler as GET }`),
      ),
    ).toThrow(/GET must be defined inline/);
  });

  it('documents why every public handler is public', () => {
    const publicHandlers = handlers
      .filter(({ access }) => access === 'public')
      .map(({ key }) => key)
      .sort();

    expect(Object.keys(PUBLIC_API_REASONS).sort()).toEqual(publicHandlers);
  });

  it('enforces guards, draft permissions, and authentication ordering', () => {
    expect(handlers.flatMap(guardViolations)).toEqual([]);
  });

  it.each([
    { body: 'await loadDraft();', violation: 'must call requireDraftAccess' },
    { body: "await requireDraftAccess(request, 'read');", violation: 'must require draft permission update' },
    { body: "requireDraftAccess(request, 'update');", violation: 'must await requireDraftAccess' },
    { body: "await loadDraft(); await requireDraftAccess(request, 'update');", violation: 'must call requireDraftAccess before other functions' },
    { body: "await requireDraftAccess(otherRequest, 'update');", violation: 'must pass its request to requireDraftAccess' },
  ])('rejects invalid draft authorization: $violation', ({ body, violation }) => {
    const [discovered] = discoverSourceHandlers(sourceFile(`
      export async function PATCH(request: Request) { ${body} }
    `));
    const handler: RouteHandler = {
      ...discovered, key: 'PATCH /api/example',
      access: { kind: 'draft', permission: 'update' },
    };
    expect(guardViolations(handler)).toContain(`PATCH /api/example ${violation}`);
  });

  it('accepts the configured draft guard and permission before protected work', () => {
    const [discovered] = discoverSourceHandlers(sourceFile(`
      export async function PATCH(request: Request) {
        await requireDraftAccess(request, 'update');
        await loadDraft();
      }
    `));
    expect(guardViolations({
      ...discovered, key: 'PATCH /api/example',
      access: { kind: 'draft', permission: 'update' },
    })).toEqual([]);
  });

  it('checks ownership before protected operations', () => {
    const violations = handlers
      .filter(({ access }) => access === 'owner' || access === 'owner-or-admin')
      .flatMap(ownershipOrderViolations);

    expect(violations).toEqual([]);
  });

  it('detects a protected operation before ownership verification', () => {
    const syntheticSource = sourceFile(`
      import { updateRace } from '@/lib/db/races';
      export async function PATCH() {
        await requireAuth();
        await updateRace();
        await getOrganizerRaceContext();
      }
    `);
    const [discovered] = discoverSourceHandlers(syntheticSource);
    if (!discovered) throw new Error('Synthetic handler was not discovered');
    const handler: RouteHandler = {
      ...discovered,
      key: 'PATCH /api/example',
      access: 'owner-or-admin',
    };

    expect(ownershipOrderViolations(handler)).toEqual([
      'PATCH /api/example calls updateRace before ownership verification',
    ]);
  });
});
