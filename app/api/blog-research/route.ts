import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseJsonBody } from '@/app/api/request-validation';
import { parseInput, parsePage } from '@/app/api/blog-drafts/validation';
import { ValidationError } from '@/lib/errors';
import { listIndependent, requestSelection } from '@/lib/services/blog-research';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireAdmin();
    const page = parsePage(new URL(request.url).searchParams.get('page'));
    return NextResponse.json({success:true,data:await listIndependent(page)}, {headers:{'Cache-Control':'private, no-store'}});
  } catch (error) { return handleRouteError(error); }
}
export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireAdmin();
    const input = parseInput(await parseJsonBody(request));
    if (!('regionId' in input)) throw new ValidationError('Invalid research selection',400);
    return NextResponse.json({success:true,data:await requestSelection(input)}, {status:202});
  } catch (error) { return handleRouteError(error); }
}
