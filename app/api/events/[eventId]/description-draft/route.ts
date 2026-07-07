import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError } from '@/lib/utils/handle-error';
import { DEFAULT_EVENT_DESCRIPTION_MODEL, generateEventDescriptionDraft } from '@/lib/services/event-description';
import { parseImportModel } from '@/app/api/races/import/validation';

export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { eventId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const model =
      typeof body.model === 'string' && body.model.length > 0
        ? parseImportModel(body.model)
        : DEFAULT_EVENT_DESCRIPTION_MODEL;

    const data = await generateEventDescriptionDraft(eventId, model);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
