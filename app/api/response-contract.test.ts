import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const API_ROOT = join(process.cwd(), 'app', 'api');

function collectRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectRouteFiles(path);
    }

    return entry.name === 'route.ts' ? [path] : [];
  });
}

function getPropertyName(property: ts.ObjectLiteralElementLike): string {
  if (ts.isSpreadAssignment(property)) {
    return '<spread>';
  }

  const { name } = property;

  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }

  return name.getText();
}

function findContractViolations(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const violations: string[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'json' &&
      ['NextResponse', 'Response'].includes(node.expression.expression.getText())
    ) {
      const body = node.arguments[0];
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const location = `${file}:${line + 1}`;

      if (!body || !ts.isObjectLiteralExpression(body)) {
        violations.push(`${location} must use an explicit response object`);
      } else {
        const properties = body.properties.map(getPropertyName);

        if (!properties.includes('error')) {
          const successProperty = body.properties.find(
            (property): property is ts.PropertyAssignment =>
              ts.isPropertyAssignment(property) &&
              getPropertyName(property) === 'success',
          );
          const hasTrueSuccess =
            successProperty?.initializer.kind === ts.SyntaxKind.TrueKeyword;
          const hasExactKeys =
            properties.length === 2 &&
            properties.includes('success') &&
            properties.includes('data');

          if (!hasTrueSuccess || !hasExactKeys) {
            violations.push(
              `${location} must return exactly { success: true, data }`,
            );
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

describe('API response contract', () => {
  it('wraps every successful JSON response in { success: true, data }', () => {
    const violations = collectRouteFiles(API_ROOT).flatMap(
      findContractViolations,
    );

    expect(violations).toEqual([]);
  });
});
