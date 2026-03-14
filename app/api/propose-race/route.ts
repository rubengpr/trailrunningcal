import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { escapeHtml } from '@/lib/security/escape-html';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  // Check rate limit before processing
  const rateLimitResult = checkRateLimit(request);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { raceName, raceWebsite } = body;

    // Server-side validation
    if (!raceName || typeof raceName !== 'string' || raceName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Race name is required' },
        { status: 400 }
      );
    }

    if (!raceWebsite || typeof raceWebsite !== 'string' || raceWebsite.trim().length === 0) {
      return NextResponse.json(
        { error: 'Race website is required' },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      new URL(raceWebsite);
    } catch {
      return NextResponse.json(
        { error: 'Invalid website URL format' },
        { status: 400 }
      );
    }

    const escapedRaceName = escapeHtml(raceName.trim());
    const escapedRaceWebsite = escapeHtml(raceWebsite.trim());

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: 'ruben@trailrunningcal.com',
      subject: `Nueva propuesta de carrera: ${escapedRaceName}`,
      html: `
        <h2>Nueva propuesta de carrera</h2>
        <p><strong>Nombre de la carrera:</strong> ${escapedRaceName}</p>
        <p><strong>Web de la carrera:</strong> <a href="${escapedRaceWebsite}">${escapedRaceWebsite}</a></p>
      `,
      text: `Nueva propuesta de carrera\n\nNombre de la carrera: ${raceName.trim()}\nWeb de la carrera: ${raceWebsite.trim()}`,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
