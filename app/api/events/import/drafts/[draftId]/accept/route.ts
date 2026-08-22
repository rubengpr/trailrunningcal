import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseUuidParam } from '@/app/api/events/description-batches/validation';
import { handleRouteError } from '@/lib/utils/handle-error';
import { acceptDraft } from '@/lib/services/event-import-drafts';
import {
  revalidateEventPages,
  revalidatePublicListingPages,
} from '@/lib/cache/revalidation';

export async function POST(_request: Request, { params }: { params: Promise<{ draftId: string }> }): Promise<NextResponse> {
  try {
    await requireAdmin();
    const data = await acceptDraft(parseUuidParam((await params).draftId, 'Invalid draft ID'));
    revalidatePublicListingPages();
    revalidateEventPages(data.eventSlug);
    return NextResponse.json({ success: true, data });
  } catch (error) { return handleRouteError(error); }
}
