import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
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
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { raceName } = body;

    // Server-side validation
    if (!raceName || typeof raceName !== 'string' || raceName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Race name is required' },
        { status: 400 }
      );
    }

    const escapedRaceName = escapeHtml(raceName.trim());
    const escapedUserEmail = escapeHtml(user.email);

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: 'ruben@trailrunningcal.com',
      subject: `Nueva solicitud de propiedad de carrera: ${escapedRaceName}`,
      html: `
        <h2>Nueva solicitud de propiedad de carrera</h2>
        <p><strong>Email del usuario:</strong> ${escapedUserEmail}</p>
        <p><strong>Nombre de la carrera:</strong> ${escapedRaceName}</p>
      `,
      text: `Nueva solicitud de propiedad de carrera\n\nEmail del usuario: ${user.email}\nNombre de la carrera: ${raceName.trim()}`,
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
