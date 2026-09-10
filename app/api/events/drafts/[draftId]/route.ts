import { NextResponse } from 'next/server';
import { parseUuidParam } from '@/app/api/request-validation';
import { requireAdmin } from '@/lib/auth';
import {
  revalidateEventRelatedPages,
  revalidateHomepages,
} from '@/lib/cache/revalidation';
import {
  acceptEventDraft,
  rejectEventDraft,
  updateEventDraft,
} from '@/lib/services/event-drafts';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseJsonBody } from '@/app/api/request-validation';
import { parseDraftActionInput } from './validation';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ draftId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { draftId } = await context.params;
    const parsedDraftId = parseUuidParam(draftId, 'draft id');
    const input = parseDraftActionInput(await parseJsonBody(request));

    switch (input.action) {
      case 'accept': {
        const { previousDetail, updatedDetail } =
          await acceptEventDraft(parsedDraftId);

        revalidateHomepages('event-draft-accept');
        if (previousDetail) {
          revalidateEventRelatedPages(previousDetail, 'event-draft-accept');
        }
        revalidateEventRelatedPages(updatedDetail, 'event-draft-accept');

        return NextResponse.json({ success: true, data: updatedDetail });
      }
      case 'update': {
        const data = await updateEventDraft(parsedDraftId, input.data);
        return NextResponse.json({ success: true, data });
      }
      case 'reject': {
        const data = await rejectEventDraft(parsedDraftId);
        return NextResponse.json({ success: true, data });
      }
    }
  } catch (error) {
    return handleRouteError(error);
  }
}
