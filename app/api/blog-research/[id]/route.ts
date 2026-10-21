import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseUuidParam } from '@/app/api/request-validation';
import { get } from '@/lib/services/blog-research';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(_request: Request, context: {params:Promise<{id:string}>}): Promise<NextResponse> {
  try {
    await requireAdmin();
    const id = parseUuidParam((await context.params).id,'research id');
    return NextResponse.json({success:true,data:await get(id)}, {headers:{'Cache-Control':'private, no-store'}});
  } catch (error) { return handleRouteError(error); }
}
