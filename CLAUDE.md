# Project Conventions

## Code Style (Always Applied)

- Use camelCase with descriptive names for functions and variables
- Use descriptive error variable names with context
- Use kebab-case with file type/purpose in name
- Use UPPER_SNAKE_CASE for constants
- Organize assets by type/purpose, use kebab-case naming
- All internal URLs, paths, and links must be generated without trailing slashes
- Accessibility ARIA attributes or references are not needed
- Never hardcode user-facing strings. Always define all text strings in translation files
- Never use native error messages for inputs
- Use Supabase query builder methods (from, select, insert, update, delete) for database operations

---

## TypeScript Conventions

**Applies to:** `**/*.ts`, `**/*.tsx`

### Type Definitions

- Use strict typing; avoid `any`; prefer explicit return types
- Create domain types in `types/`; use union types for controlled values

```typescript
// types/race.types.ts
export interface TrailRace {
  id: string;
  name: string;
  date: string | null;
  distanceKm: number;
  city: string;
  province: string;
  // ...
}

export type RaceRow = { /* Supabase row shape */ };

// i18n.ts - union from const array
export const locales = ['es', 'ca'] as const;
export type Locale = (typeof locales)[number];
```

### Function Signatures

- Always specify return types; use explicit parameter types
- Prefer async/await over Promise chains

```typescript
export function raceRowToTrailRace(row: RaceRow): TrailRace {
  return { id: row.id, name: row.name, /* ... */ };
}

export async function getRaces(useStaticClient?: boolean): Promise<TrailRace[]> {
  // ...
}

export function generateRaceSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
```

### Utility Types

- Use `Omit`, `Pick`, `Partial` for props and derived types
- Keep generic constraints minimal

```typescript
interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  label: string | React.ReactNode;
  error?: string;
}

// Indexed access for nested types
priceEur: TrailRace['priceEur'];
```

### Error Handling

- Keep error handling straightforward; API returns `{ error: string }`
- Throw or return typed errors; avoid leaking internals

```typescript
return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
// For validation: return 400 with specific message
```

### Imports

- Use `import type` for type-only imports; use `@/` alias for internal modules
- Order: external, then `@/`, then relative `./`

```typescript
import { useState } from 'react';
import type { TrailRace, RaceRow } from '@/types/race.types';
import { getRaces } from '@/lib/db/races';
import { FormInput } from './form-input';
```

### React Component Types

- Use `ComponentNameProps` interface; avoid `React.FC`; use direct function declarations
- Extend native HTML attributes with `Omit` when wrapping inputs

```typescript
interface TrailRaceCardProps {
  name: string;
  distanceKm: number;
  raceSlug?: string;
  displayOnly?: boolean;
}

export default function TrailRaceCard({ name, distanceKm }: TrailRaceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // ...
}
```

### Configuration and Env

- Next.js: use `process.env.NEXT_PUBLIC_*` for client-exposed vars; `process.env.*` for server-only
- No explicit config object required; access env where needed

```typescript
// Client-exposed (bundled into client)
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!);

// Server-only
const resend = new Resend(process.env.RESEND_API_KEY);
```

### Type Safety

- Use type guards for runtime checks (e.g. locale, enum-like values)
- Use `readonly` for immutable data when useful

```typescript
const isSupportedLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && locales.includes(value as Locale);

const finalLocale: Locale = isSupportedLocale(locale) ? locale : defaultLocale;
```

---

## React Conventions

**Applies to:** `app/**/*.tsx`, `components/**/*.tsx`

### Server vs Client Components

- Prefer Server Components (default); no `'use client'`
- Add `'use client'` only for components using hooks, event handlers, or browser APIs
- Use async Server Components when fetching data or using `getTranslations`

```typescript
// Server Component (default)
export default async function RaceServicesList({ services, locale }: RaceServicesListProps) {
  const t = await getTranslations({ locale, namespace: 'race' });
  return <ul>{services.map(...)}</ul>;
}

// Client Component
'use client';
export default function HomeClient({ races }: HomeClientProps) {
  const [selectedMonth, setSelectedMonth] = useState('');
  const handleMonthSelect = (month: string) => setSelectedMonth(month);
  return <MonthFilter onMonthSelect={handleMonthSelect} />;
}
```

### Props and Component Structure

- Use functional components with TypeScript; props interface `ComponentNameProps` matching component name
- PascalCase for component names

```typescript
interface TrailRaceCardProps {
  name: string;
  distanceKm: number;
  // ...
}
export default function TrailRaceCard({ name, distanceKm }: TrailRaceCardProps) { }
```

### Exports

- Named exports for reusable components (forms, shared UI); default for page-level or single-use components

```typescript
export function FormInput({ ... }: FormInputProps) { }
export function ErrorMessage({ ... }: ErrorMessageProps) { }
export default function Navbar() { }
```

### State and Event Handlers

- Use `useState` for local state, `useMemo` for derived values; lift state up when needed
- `handle` prefix for internal handlers, `on` prefix for event handler props

```typescript
const handleMonthSelect = (month: string) => setSelectedMonth(month);
<MonthFilter onMonthSelect={handleMonthSelect} />
```

### Imports

- Order: React, next/next-intl, third-party, then `@/` aliases, then relative `./`
- Group related imports together

```typescript
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { FormInput } from './form-input';
import type { TrailRace } from '@/types/race.types';
```

### i18n (next-intl)

- Client components: `useTranslations(namespace)`
- Server Components: `getTranslations({ locale, namespace })` (async)

```typescript
// Client
const t = useTranslations('results');
return <span>{t('noRacesFound')}</span>;

// Server
const t = await getTranslations({ locale, namespace: 'race' });
return <h3>{t('services.title')}</h3>;
```

### Error Handling

- Use try/catch for async operations; `useState` for `error` and `isLoading`
- Use `ErrorMessage` or variants (`SearchError`, `RaceCardError`) for user-facing errors
- Wrap client-heavy subtrees in `ErrorBoundary` with contextual fallback

```typescript
const [error, setError] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);
try {
  setIsLoading(true);
  await updateRace(...);
} catch (err) {
  setError(t('errors.failed'));
} finally {
  setIsLoading(false);
}

<ErrorBoundary fallback={<SearchError onRetry={handleRetry} />}>
  <TrailRaceCard ... />
</ErrorBoundary>
```

### Layout and Styling

- Mobile-first with Tailwind; use `sm:`, `lg:` breakpoints

```typescript
className="text-[10px] sm:text-sm lg:text-base p-2 sm:p-4"
```

---

## API Conventions

**Applies to:** `app/api/**/*.ts`, `lib/api/**/*.ts`, `lib/db/**/*.ts`

### Route Handlers

- Export named async functions per HTTP method: `GET`, `POST`, `PATCH`, `PUT`, `DELETE`
- Use `NextRequest` and `NextResponse` from `next/server`

```typescript
// app/api/races/route.ts
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  // ...
  return NextResponse.json({ success: true, data }, { status: 200 });
}
```

### Response Format

- Success: `{ success: true, data }` with status 200
- Error: `{ error: string }` with appropriate status (400, 401, 404, 429, 500)

```typescript
return NextResponse.json({ success: true, data });
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### Auth

- Check `supabase.auth.getUser()` at the start of protected routes
- Return 401 when auth fails or user is missing

```typescript
const supabase = await createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Validation

- Validate and sanitize all input inside the handler before DB or external calls
- Check types, lengths, required fields, and formats (e.g. URL)

```typescript
if (!raceName || typeof raceName !== 'string' || raceName.trim().length === 0) {
  return NextResponse.json({ error: 'Race name is required' }, { status: 400 });
}
try { new URL(raceWebsite); } catch {
  return NextResponse.json({ error: 'Invalid website URL format' }, { status: 400 });
}
```

### Data Layer

- Reads: Server Components call `lib/db/*` directly (e.g. `getRaces()`)
- Mutations: expose API routes; client calls `lib/api/*` wrappers (e.g. `updateRace()`)
- Do not fetch from client for server-available data

```typescript
// lib/db/races.ts - used in Server Components
export async function getRaces(): Promise<TrailRace[]> { /* ... */ }

// lib/api/races.ts - used in Client Components for mutations
export async function updateRace(...) {
  const response = await fetch('/api/races', { method: 'PATCH', ... });
  if (!response.ok) throw new Error(responseData.error);
  return responseData;
}
```

### Error Handling

- Wrap handler logic in try/catch
- Return 4xx/5xx via `NextResponse.json` with an `error` message
- Log errors with `console.error` before returning

```typescript
try {
  // ... handler logic
} catch (error) {
  console.error('API error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

### Rate Limiting

- Call `checkRateLimit(request)` at the start of public POST endpoints
- Return 429 when limit is exceeded

```typescript
const rateLimitResult = checkRateLimit(request);
if (!rateLimitResult.success) {
  return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
}
```

### File Structure

- One `route.ts` per resource under `app/api/[resource]/`
- Dynamic segments: `app/api/races/[id]/route.ts` for `GET /api/races/123`

```
app/api/
  races/route.ts        → PATCH /api/races
  propose-race/route.ts → POST /api/propose-race
  health/route.ts       → GET /api/health
```

---

## Security Conventions

**Applies to:** `app/**/*.ts`, `app/**/*.tsx`, `lib/**/*.ts`, `components/**/*.tsx`

### Input Validation and XSS Prevention

- Validate and sanitize all inputs on the server before DB or external calls
- Escape HTML when embedding user content in emails or HTML; React escapes by default
- Do not use `dangerouslySetInnerHTML` with unsanitized user input

```typescript
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};
const escapedName = escapeHtml(raceName.trim());
```

### Rate Limiting

- Use `checkRateLimit(request)` at the start of public POST endpoints
- Return 429 when limit exceeded

```typescript
const rateLimitResult = checkRateLimit(request);
if (!rateLimitResult.success) {
  return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
}
```

### Secrets and Environment Variables

- Never commit secrets; keep `.env*` in `.gitignore`
- Use `process.env` for API keys, Supabase keys, and other sensitive config
- Use different env values per environment (Vercel/hosting)

```typescript
const resend = new Resend(process.env.RESEND_API_KEY);
// .env* is gitignored; do not commit .env
```

### Error Messages

- Return generic messages from API; avoid exposing stack traces or internal details
- Use `"Internal server error"`, `"Unauthorized"`, `"Failed to update race"` etc.

```typescript
return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### Auth Protection

- Protected pages: check `supabase.auth.getUser()` and redirect to login if missing
- Protected API routes: check `getUser()` and return 401 if missing

```typescript
// Page
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) redirect(`/${locale}/login`);

// API route
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Optional (Future Improvements)

- Content Security Policy headers in `next.config` or middleware
- Validate required env vars on startup (fail fast)
- Security event logging for auth events, rate limit hits
