import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseUuidParam } from '@/app/api/request-validation';
import { handleRouteError } from '@/lib/utils/handle-error';
import { getImageMetadata } from '@/lib/services/blog-publication';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  let response: NextResponse;
  try {
    await requireAdmin();
    const id = parseUuidParam((await context.params).id, 'draft id');
    response = NextResponse.json({ success: true, data: await getImageMetadata(id) });
  } catch (error) { response = handleRouteError(error); }
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
