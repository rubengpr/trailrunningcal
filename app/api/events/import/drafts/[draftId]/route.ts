import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseEventInput } from '@/app/api/events/validation';
import { parseUuidParam } from '@/app/api/events/description-batches/validation';
import { handleRouteError } from '@/lib/utils/handle-error';
import { getDraft, rejectDraft, updateDraft } from '@/lib/services/event-import-drafts';

export async function GET(_request: Request, { params }: { params: Promise<{ draftId: string }> }): Promise<NextResponse> {
  try {
    await requireAdmin();
    const draft = await getDraft(parseUuidParam((await params).draftId, 'Invalid draft ID'));
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: draft });
  } catch (error) { return handleRouteError(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ draftId: string }> }): Promise<NextResponse> {
  try {
    await requireAdmin();
    const input = parseEventInput(await request.json());
    const draft = await updateDraft(parseUuidParam((await params).draftId, 'Invalid draft ID'), input);
    return NextResponse.json({ success: true, data: draft });
  } catch (error) { return handleRouteError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ draftId: string }> }): Promise<NextResponse> {
  try {
    await requireAdmin();
    await rejectDraft(parseUuidParam((await params).draftId, 'Invalid draft ID'));
    return NextResponse.json({ success: true, data: null });
  } catch (error) { return handleRouteError(error); }
}
