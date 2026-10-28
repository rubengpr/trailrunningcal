import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseUuidParam } from '@/app/api/request-validation';
import { handleRouteError } from '@/lib/utils/handle-error';
import { requireCompleted, readImage, removeImage, saveImage } from '@/lib/services/blog-publication';
import { maxImageBytes } from '@/lib/blog/publication';
import { ValidationError } from '@/lib/errors';

type Context = { params: Promise<{ id: string }> };
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
export async function DELETE(request: Request, context: Context): Promise<NextResponse> {
  try {
    await requireAdmin();
    const id = parseUuidParam((await context.params).id, 'draft id');
    const versions = new URL(request.url).searchParams.getAll('version');
    if (versions.length !== 1 || !/^\d+$/.test(versions[0]) || !Number.isSafeInteger(Number(versions[0]))) throw new ValidationError('Invalid version', 400);
    return NextResponse.json({ success: true, data: await removeImage(id, Number(versions[0])) }, { headers });
  } catch (error) { return handleRouteError(error); }
}
export async function POST(request: Request, context: Context): Promise<NextResponse> {
  try {
    await requireAdmin();
    const id = parseUuidParam((await context.params).id, 'draft id');
    await requireCompleted(id);
    if (Number(request.headers.get('content-length')) > maxImageBytes + 65536) throw new ValidationError('image_too_large', 413);
    let form: FormData;
    try { form = await request.formData(); } catch { throw new ValidationError('Invalid request body', 400); }
    const file = form.get('image');
    const rawVersion = form.get('version');
    if (!(file instanceof File) || typeof rawVersion !== 'string' || !/^\d+$/.test(rawVersion) || !Number.isSafeInteger(Number(rawVersion)) || form.getAll('image').length !== 1 || form.getAll('version').length !== 1 || [...form.keys()].some(key => !['image', 'version'].includes(key))) throw new ValidationError('Invalid request body', 400);
    return NextResponse.json({ success: true, data: await saveImage(id, file, Number(rawVersion)) }, { headers });
  } catch (error) { return handleRouteError(error); }
}
export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    await requireAdmin();
    const id = parseUuidParam((await context.params).id, 'draft id');
    const { blob } = await readImage(id);
    return new NextResponse(blob, { headers: { ...headers, 'Content-Type': blob.type, 'Content-Disposition': 'inline' } });
  } catch (error) {
    const response = handleRouteError(error);
    Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }
}
