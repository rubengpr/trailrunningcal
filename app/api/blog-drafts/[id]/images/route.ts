import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseUuidParam } from '@/app/api/request-validation';
import { handleRouteError } from '@/lib/utils/handle-error';
import { addImage, requireDocument } from '@/lib/services/blog-article-images';
import { parseUpload } from './validation';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    await requireAdmin();
    const id = parseUuidParam((await context.params).id, 'draft id');
    await requireDocument(id);
    const input = await parseUpload(request, true);
    return NextResponse.json({ success: true, data: await addImage(id, input.file, input.afterId, input.version) }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return handleRouteError(error); }
}
