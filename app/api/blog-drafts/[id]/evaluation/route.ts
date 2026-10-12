import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseUuidParam } from '@/app/api/request-validation';
import { evaluateDraft } from '@/lib/services/blog-drafts';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function POST(_request:Request,context:{params:Promise<{id:string}>}):Promise<NextResponse> {
  try {
    await requireAdmin();
    const {id:rawId} = await context.params;
    const id = parseUuidParam(rawId,'draft id');
    const draft = await evaluateDraft(id);
    if (!draft) return NextResponse.json({error:'Blog draft not found'},{status:404});
    return NextResponse.json({success:true,data:draft},{status:202});
  } catch (error) { return handleRouteError(error); }
}
