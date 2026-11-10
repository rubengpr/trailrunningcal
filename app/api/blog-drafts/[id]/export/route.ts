import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseUuidParam } from '@/app/api/request-validation';
import { exportDraft } from '@/lib/services/blog-export';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    await requireAdmin();
    const id = parseUuidParam((await context.params).id, 'draft id');
    const file = await exportDraft(id);
    return new NextResponse(file.content, { headers: {
      'Content-Type': 'text/mdx; charset=utf-8',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    const response = handleRouteError(error);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
}
