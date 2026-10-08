import { NextResponse } from 'next/server';
import { requireDraftAccess } from '@/lib/auth/draft-access';
import { parseUuidParam } from '@/app/api/request-validation';
import { handleRouteError } from '@/lib/utils/handle-error';
import { acceptDraft } from '@/lib/services/event-import-drafts';

export async function POST(request: Request, { params }: { params: Promise<{ draftId: string }> }): Promise<NextResponse> {
  try {
    await requireDraftAccess(request, 'publish');
    const data = await acceptDraft(parseUuidParam((await params).draftId, 'Invalid draft ID'));
    return NextResponse.json(
      { success: true, data },
      { status: data.status === 'accepted' ? 200 : 202 },
    );
  } catch (error) { return handleRouteError(error); }
}
