import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateProfile } from '@/lib/db/profiles';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseProfileInput } from './validation';

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const body = await request.json();
    const input = parseProfileInput(body);
    const data = await updateProfile(user.id, input);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
