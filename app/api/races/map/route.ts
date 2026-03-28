import { NextResponse } from 'next/server';
import { getRacesMapData } from '@/lib/db/races-map';

export async function GET(): Promise<NextResponse> {
  try {
    const data = await getRacesMapData();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('API error (GET /api/races/map):', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
