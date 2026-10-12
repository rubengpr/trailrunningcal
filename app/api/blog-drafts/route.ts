import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseJsonBody } from '@/app/api/request-validation';
import { generate, list } from '@/lib/services/blog-drafts';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseInput, parsePage } from './validation';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireAdmin();
    const page = parsePage(new URL(request.url).searchParams.get('page'));
    return NextResponse.json({ success: true, data: await list(page) }, { headers });
  } catch (error) {
    const response = handleRouteError(error);
    response.headers.set('Cache-Control', headers['Cache-Control']);
    return response;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireAdmin();
    const input = parseInput(await parseJsonBody(request));
    const data = await generate(input);
    return NextResponse.json({ success: true, data }, { status: 202 });
  } catch (error) {
    return handleRouteError(error);
  }
}
