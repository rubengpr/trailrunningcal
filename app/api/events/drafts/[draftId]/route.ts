import { NextResponse } from 'next/server';
import { parseUuidParam } from '@/app/api/request-validation';
import { requireDraftAccess } from '@/lib/auth/draft-access';
import {
  revalidateEventMutation,
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
    await requireDraftAccess(request, 'propose');

    const { draftId } = await context.params;
    const parsedDraftId = parseUuidParam(draftId, 'draft id');
    const input = parseDraftActionInput(await parseJsonBody(request));

    switch (input.action) {
      case 'accept': {
        await requireDraftAccess(request, 'publish');
        const { previousDetail, updatedDetail } =
          await acceptEventDraft(parsedDraftId);

        revalidateEventMutation(
          previousDetail,
          updatedDetail,
          'event-draft-accept',
        );

        return NextResponse.json({ success: true, data: updatedDetail });
      }
      case 'update': {
        const data = await updateEventDraft(parsedDraftId, input.data);
        return NextResponse.json({ success: true, data });
      }
      case 'reject': {
        await requireDraftAccess(request, 'reject');
        const data = await rejectEventDraft(parsedDraftId);
        return NextResponse.json({ success: true, data });
      }
    }
  } catch (error) {
    return handleRouteError(error);
  }
}
