import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { list } from '@/lib/services/blog-selection';
import { parsePage } from '@/app/api/blog-drafts/validation';
import { ValidationError } from '@/lib/errors';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(request: Request) {
  const headers = {'Cache-Control': 'private, no-store'};
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const regionId = params.get('regionId');
    if (!regionId) throw new ValidationError('Invalid region', 400);
    return NextResponse.json({success: true, data: await list(regionId, params.get('search') ?? '', parsePage(params.get('page')))}, {headers});
  } catch (error) {
    const response = handleRouteError(error); response.headers.set('Cache-Control', headers['Cache-Control']); return response;
  }
}
