import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseUuidParam } from '@/app/api/request-validation';
import { getDraftPublicationStatus } from '@/lib/services/event-import-drafts';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();
    const draftId = parseUuidParam((await params).draftId, 'Invalid draft ID');
    const jobId = new URL(request.url).searchParams.get('jobId');
    if (!jobId) return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });

    const status = await getDraftPublicationStatus(parseUuidParam(jobId, 'Invalid job ID'));
    if (!status || status.job.draftId !== draftId) {
      return NextResponse.json({ error: 'Draft publication not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: status });
  } catch (error) { return handleRouteError(error); }
}
