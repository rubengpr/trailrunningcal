import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseJsonBody, parseUuidParam } from '@/app/api/request-validation';
import { handleRouteError } from '@/lib/utils/handle-error';
import { editImage, readImage, removeImage, replaceImage, requireDocument } from '@/lib/services/blog-article-images';
import { parseEdit, parseUpload, parseVersion } from '../validation';
import { ValidationError } from '@/lib/errors';

type Context = { params: Promise<{ id: string; imageId: string }> };
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
async function params(context: Context) {
  const value = await context.params;
  return { id: parseUuidParam(value.id, 'draft id'), imageId: parseUuidParam(value.imageId, 'image id') };
}
export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { id, imageId } = await params(context);
    const blob = await readImage(id, imageId);
    return new NextResponse(blob, { headers: { ...headers, 'Content-Type': blob.type, 'Content-Disposition': 'inline' } });
  } catch (error) { const response = handleRouteError(error); Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value)); return response; }
}
export async function POST(request: Request, context: Context): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { id, imageId } = await params(context);
    await requireDocument(id);
    const input = await parseUpload(request, false);
    return NextResponse.json({ success: true, data: await replaceImage(id, imageId, input.file, input.version) }, { headers });
  } catch (error) { return handleRouteError(error); }
}
export async function PATCH(request: Request, context: Context): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { id, imageId } = await params(context);
    return NextResponse.json({ success: true, data: await editImage(id, imageId, parseEdit(await parseJsonBody(request))) }, { headers });
  } catch (error) { return handleRouteError(error); }
}
export async function DELETE(request: Request, context: Context): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { id, imageId } = await params(context);
    const versions = new URL(request.url).searchParams.getAll('version');
    if (versions.length !== 1 || !/^\d+$/.test(versions[0])) throw new ValidationError('Invalid version', 400);
    return NextResponse.json({ success: true, data: await removeImage(id, imageId, parseVersion(versions[0])) }, { headers });
  } catch (error) { return handleRouteError(error); }
}
