import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getOrganizerEventContext } from '@/lib/auth/organizer';
import {
  revalidateEventRelatedPages,
  revalidateHomepages,
} from '@/lib/cache/revalidation';
import { ValidationError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseUuidParam } from '@/app/api/events/description-batches/validation';
import { parseEventPatchInput } from '@/app/api/events/validation';
import { updateOrganizerEventWithRaces } from '@/lib/services/events';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    await requireAuth();

    const { eventId } = await context.params;
    const parsedEventId = parseUuidParam(eventId, 'event id');
    const supabase = await createClient();
    const organizerContext = await getOrganizerEventContext(
      supabase,
      parsedEventId,
    );

    if (!organizerContext) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const input = parseEventPatchInput(await request.json());

    if (input.mode !== 'update-races') {
      throw new ValidationError('Invalid mode', 400);
    }

    const updatedDetail = await updateOrganizerEventWithRaces(
      parsedEventId,
      organizerContext.organizerId,
      input,
    );

    revalidateHomepages();
    revalidateEventRelatedPages(organizerContext.event);
    revalidateEventRelatedPages(updatedDetail);

    return NextResponse.json({ success: true, data: updatedDetail });
  } catch (error) {
    return handleRouteError(error);
  }
}
