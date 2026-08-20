import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseEventInput } from '@/app/api/events/validation';
import { handleRouteError } from '@/lib/utils/handle-error';
import { createDraft, listDrafts } from '@/lib/services/event-import-drafts';
import { parseDraftCreateInput } from './validation';

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin();
    return NextResponse.json({ success: true, data: await listDrafts() });
  } catch (error) { return handleRouteError(error); }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireAdmin();
    const body = await request.json();
    const data = parseEventInput(body);
    const metadata = parseDraftCreateInput(body);
    const draft = await createDraft({ data, ...metadata });
    return NextResponse.json({ success: true, data: draft }, { status: 201 });
  } catch (error) { return handleRouteError(error); }
}
