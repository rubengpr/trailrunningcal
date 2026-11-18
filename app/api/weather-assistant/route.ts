import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseJsonBody } from '@/app/api/request-validation';
import { askWeather } from '@/lib/services/weather-assistant';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseInput } from './validation';

export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  let response: NextResponse;
  try {
    await requireAdmin();
    const input = parseInput(await parseJsonBody(request));
    const data = await askWeather(input, request.signal);
    response = NextResponse.json({ success: true, data });
  } catch (error) {
    response = handleRouteError(error);
  }
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
