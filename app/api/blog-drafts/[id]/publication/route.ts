import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseJsonBody, parseUuidParam } from '@/app/api/request-validation';
import { handleRouteError } from '@/lib/utils/handle-error';
import { saveDetails } from '@/lib/services/blog-publication';
import { parseDetails } from './validation';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    await requireAdmin();
    const id = parseUuidParam((await context.params).id, 'draft id');
    const result = await saveDetails(id, parseDetails(await parseJsonBody(request)));
    return NextResponse.json({ success: true, data: result }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return handleRouteError(error); }
}
