import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseJsonBody, parseUuidParam } from '@/app/api/request-validation';
import { parsePage } from '@/app/api/blog-drafts/validation';
import { parseInput } from '@/app/api/blog-drafts/[id]/research/validation';
import { list, request as requestResearch } from '@/lib/services/blog-research';
import { handleRouteError } from '@/lib/utils/handle-error';

type Context = {params:Promise<{id:string}>};
export async function GET(request: Request, context: Context): Promise<NextResponse> {
  try {
    await requireAdmin();
    const id = parseUuidParam((await context.params).id,'draft id');
    const page = parsePage(new URL(request.url).searchParams.get('page'));
    return NextResponse.json({success:true,data:await list(id,page)},{headers:{'Cache-Control':'private, no-store'}});
  } catch (error) { return handleRouteError(error); }
}
export async function POST(request: Request, context: Context): Promise<NextResponse> {
  try {
    await requireAdmin();
    const id = parseUuidParam((await context.params).id,'draft id');
    const eventIds = parseInput(await parseJsonBody(request));
    return NextResponse.json({success:true,data:await requestResearch(id,eventIds)},{status:202});
  } catch (error) { return handleRouteError(error); }
}
