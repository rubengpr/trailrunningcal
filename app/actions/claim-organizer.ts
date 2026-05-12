'use server';

import { Resend } from 'resend';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { escapeHtml } from '@/lib/security/escape-html';
import { checkRateLimitByIp } from '@/lib/security/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function claimOrganizer(raceName: string): Promise<void> {
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',').at(-1)!.trim() : 'unknown';

  const rateLimitResult = checkRateLimitByIp(ip);
  if (!rateLimitResult.success) {
    throw new Error('Too many requests. Please try again later.');
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    throw new Error('Unauthorized');
  }

  if (!raceName || typeof raceName !== 'string' || raceName.trim().length === 0) {
    throw new Error('Race name is required');
  }

  const escapedRaceName = escapeHtml(raceName.trim());
  const escapedUserEmail = escapeHtml(user.email);

  const { error } = await resend.emails.send({
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
    throw new Error('Failed to send email');
  }
}
