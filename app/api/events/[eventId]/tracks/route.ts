import { NextResponse } from 'next/server';
import { parseUuidParam } from '@/app/api/request-validation';
import { defaultLocale, locales, type Locale } from '@/i18n';
import { getEventTrackRoutes } from '@/lib/db/events';
import { ValidationError } from '@/lib/errors';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId: rawEventId } = await params;
    const eventId = parseUuidParam(rawEventId, 'event id');
    const requestedLocale = new URL(request.url).searchParams.get('locale');
    const locale = requestedLocale ?? defaultLocale;
    if (!locales.includes(locale as Locale)) {
      throw new ValidationError('Invalid locale', 400);
    }
    const routes = await getEventTrackRoutes(eventId, locale as Locale);

    if (routes === null) {
      throw new ValidationError('Event not found', 404);
    }

    return NextResponse.json({ success: true, data: { routes } });
  } catch (error) {
    return handleRouteError(error);
  }
}
