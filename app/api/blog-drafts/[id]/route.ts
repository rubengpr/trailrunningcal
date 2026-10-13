import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseUuidParam } from '@/app/api/request-validation';
import { get, remove } from '@/lib/services/blog-drafts';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    await requireAdmin();
    await remove(parseUuidParam((await context.params).id, 'draft id'));
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { id: rawId } = await context.params;
    const id = parseUuidParam(rawId, 'draft id');
    const draft = await get(id);
    if (!draft) {
      return NextResponse.json({ error: 'Blog draft not found' }, {
        status: 404, headers: { 'Cache-Control': 'private, no-store' },
      });
    }
    return NextResponse.json({ success: true, data: draft }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    const response = handleRouteError(error);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
}
