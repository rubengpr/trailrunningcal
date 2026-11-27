import { NextResponse } from 'next/server';
import { parseUuidParam } from '@/app/api/request-validation';
import { requireDraftAccess } from '@/lib/auth/draft-access';
import {
  generateEventDraft,
  proposeEventDraft,
} from '@/lib/services/event-drafts';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseDraftProposalBody } from './validation';

export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
): Promise<NextResponse> {
  try {
    await requireDraftAccess(request, 'propose');

    const { eventId } = await context.params;
    const parsedEventId = parseUuidParam(eventId, 'event id');
    const proposal = parseDraftProposalBody(await request.text());

    if (proposal) {
      const data = await proposeEventDraft(parsedEventId, proposal);
      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    const data = await generateEventDraft(parsedEventId);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
