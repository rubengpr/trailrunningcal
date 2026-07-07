import { NextResponse } from 'next/server';
import { parseUuidParam } from '@/app/api/events/description-batches/validation';
import { requireAdmin } from '@/lib/auth';
import { generateEventDraft } from '@/lib/services/event-drafts';
import { handleRouteError } from '@/lib/utils/handle-error';

export const maxDuration = 60;

export async function POST(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { eventId } = await context.params;
    const parsedEventId = parseUuidParam(eventId, 'event id');
    const data = await generateEventDraft(parsedEventId);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
