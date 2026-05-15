import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { deletePendingRace } from '@/lib/db/pending-races';
import { handleRouteError } from '@/lib/api/handle-error';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await requireAdmin();
    await deletePendingRace(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
