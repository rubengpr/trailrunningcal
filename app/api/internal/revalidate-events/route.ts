import { NextRequest, NextResponse } from 'next/server';
import { requireRevalidationSecret } from '@/lib/auth/revalidation';
import { revalidateEventPages } from '@/lib/cache/revalidation';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseRevalidateEventSlugs } from './validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    requireRevalidationSecret(request);
    const body = await request.json().catch(() => null);
    const slugs = parseRevalidateEventSlugs(body);

    for (const slug of slugs) {
      revalidateEventPages(slug);
    }

    return NextResponse.json({ success: true, data: { slugs } });
  } catch (error) {
    return handleRouteError(error);
  }
}
