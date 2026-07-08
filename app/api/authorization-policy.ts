export type ApiAuthorization =
  | 'public'
  | 'cron'
  | 'authenticated'
  | 'admin'
  | 'owner-or-admin';

export const API_AUTHORIZATION_POLICY = {
  'GET /api/cron/event-updates': 'cron',
  'POST /api/events/[eventId]/description-draft': 'admin',
  'PATCH /api/events/[eventId]/description': 'admin',
  'POST /api/events/[eventId]/drafts': 'admin',
  'PATCH /api/events/[eventId]': 'admin',
  'DELETE /api/events/[eventId]': 'admin',
  'GET /api/events/description-batch-items/[itemId]': 'admin',
  'GET /api/events/description-batches/[batchId]': 'admin',
  'POST /api/events/description-batches': 'admin',
  'PATCH /api/events/drafts/[draftId]': 'admin',
  'POST /api/events/extract': 'admin',
  'POST /api/events/favorites': 'public',
  'GET /api/events/import/batch-items/[itemId]': 'admin',
  'GET /api/events/import/batches/[batchId]': 'admin',
  'POST /api/events/import/batches': 'admin',
  'POST /api/events/import': 'admin',
  'POST /api/events': 'admin',
  'GET /api/health': 'public',
  'GET /api/me': 'public',
  'PATCH /api/organizers': 'authenticated',
  'DELETE /api/pending-events/[id]': 'admin',
  'POST /api/pending-events': 'admin',
  'PATCH /api/profiles': 'authenticated',
  'GET /api/races/[raceId]/image': 'owner-or-admin',
  'POST /api/races/[raceId]/image': 'owner-or-admin',
  'DELETE /api/races/[raceId]/image': 'owner-or-admin',
  'PATCH /api/races/[raceId]/tiers': 'owner-or-admin',
  'PATCH /api/races/[raceId]': 'owner-or-admin',
  'DELETE /api/races/[raceId]': 'owner-or-admin',
  'POST /api/races': 'authenticated',
} as const satisfies Record<string, ApiAuthorization>;

export const PUBLIC_API_REASONS = {
  'POST /api/events/favorites': 'Returns public event data for locally stored favorites.',
  'GET /api/health': 'Exposes operational health data without protected records.',
  'GET /api/me': 'Reports anonymous users as non-admin without exposing identity data.',
} as const satisfies Partial<
  Record<keyof typeof API_AUTHORIZATION_POLICY, string>
>;
