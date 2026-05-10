import { NextResponse } from 'next/server';
import { getUrlConflicts } from '@/lib/db/races';

export async function conflictCheckResponse(urls: string[]): Promise<NextResponse | null> {
  const conflicts = await getUrlConflicts(urls);
  if (conflicts.length === 0) return null;
  return NextResponse.json({ error: 'conflict', conflicts }, { status: 409 });
}
