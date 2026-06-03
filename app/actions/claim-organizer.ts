'use server';

import { Resend } from 'resend';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { escapeHtml } from '@/lib/security/escape-html';
import { checkRateLimitByIp } from '@/lib/security/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY);

type ClaimResourceType = 'race' | 'event';

function getResourceLabels(resourceType: ClaimResourceType) {
  return resourceType === 'event'
    ? {
        required: 'Event name is required',
        subject: 'Nueva solicitud de propiedad de evento',
        heading: 'Nueva solicitud de propiedad de evento',
        field: 'Nombre del evento',
      }
    : {
        required: 'Race name is required',
        subject: 'Nueva solicitud de propiedad de carrera',
        heading: 'Nueva solicitud de propiedad de carrera',
        field: 'Nombre de la carrera',
      };
}

export async function claimOrganizer(
  resourceName: string,
  resourceType: ClaimResourceType = 'race',
): Promise<void> {
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

  const labels = getResourceLabels(resourceType);

  if (!resourceName || typeof resourceName !== 'string' || resourceName.trim().length === 0) {
    throw new Error(labels.required);
  }

  const escapedResourceName = escapeHtml(resourceName.trim());
  const escapedUserEmail = escapeHtml(user.email);

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: 'ruben@trailrunningcal.com',
    subject: `${labels.subject}: ${escapedResourceName}`,
    html: `
      <h2>${labels.heading}</h2>
      <p><strong>Email del usuario:</strong> ${escapedUserEmail}</p>
      <p><strong>${labels.field}:</strong> ${escapedResourceName}</p>
    `,
    text: `${labels.heading}\n\nEmail del usuario: ${user.email}\n${labels.field}: ${resourceName.trim()}`,
  });

  if (error) {
    console.error('Resend error:', error);
    throw new Error('Failed to send email');
  }
}
