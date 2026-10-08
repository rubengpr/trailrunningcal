import { NextResponse } from 'next/server';
import { requireDraftAccess } from '@/lib/auth/draft-access';
import { parseEventInput } from '@/app/api/events/validation';
import { parseJsonBody, parseUuidParam } from '@/app/api/request-validation';
import { handleRouteError } from '@/lib/utils/handle-error';
import { getDraft, rejectDraft, updateDraft } from '@/lib/services/event-import-drafts';

export async function GET(request: Request, { params }: { params: Promise<{ draftId: string }> }): Promise<NextResponse> {
  try {
    await requireDraftAccess(request, 'read');
    const draft = await getDraft(parseUuidParam((await params).draftId, 'Invalid draft ID'));
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: draft });
  } catch (error) { return handleRouteError(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ draftId: string }> }): Promise<NextResponse> {
  try {
    await requireDraftAccess(request, 'update');
    const input = parseEventInput(await parseJsonBody(request));
    const draft = await updateDraft(parseUuidParam((await params).draftId, 'Invalid draft ID'), input);
    return NextResponse.json({ success: true, data: draft });
  } catch (error) { return handleRouteError(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ draftId: string }> }): Promise<NextResponse> {
  try {
    await requireDraftAccess(request, 'reject');
    await rejectDraft(parseUuidParam((await params).draftId, 'Invalid draft ID'));
    return NextResponse.json({ success: true, data: null });
  } catch (error) { return handleRouteError(error); }
}
