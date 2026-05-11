import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';
import { updateProfile } from '@/lib/db/profiles';
import { parseProfileInput } from './validation';

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const body = await request.json();
    const input = parseProfileInput(body);
    const data = await updateProfile(user.id, input);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
