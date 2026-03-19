import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getOrganizerRaceContext } from '@/lib/auth-organizer';
import { isAdminEmail } from '@/lib/auth-admin';
import { generateRaceSlug } from '@/lib/race-utils';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { raceId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = isAdminEmail(user.email);

    if (isAdmin) {
      const adminClient = createAdminClient();

      const { data: race } = await adminClient
        .from('races')
        .select('name')
        .eq('id', raceId)
        .single();

      const { error } = await adminClient
        .from('races')
        .delete()
        .eq('id', raceId);

      if (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Failed to delete race' }, { status: 500 });
      }

      if (race?.name) {
        const slug = generateRaceSlug(race.name);
        for (const locale of ['es', 'ca']) {
          revalidatePath(`/${locale}`, 'page');
          revalidatePath(`/${locale}/carrera/${slug}`, 'page');
        }
      }
    } else {
      const organizerContext = await getOrganizerRaceContext(supabase, raceId);
      if (!organizerContext) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { error } = await supabase
        .from('races')
        .delete()
        .eq('id', raceId)
        .eq('organizer_id', organizerContext.organizerId);

      if (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Failed to delete race' }, { status: 500 });
      }

      const slug = generateRaceSlug(organizerContext.race.name);
      for (const locale of ['es', 'ca']) {
        revalidatePath(`/${locale}`, 'page');
        revalidatePath(`/${locale}/carrera/${slug}`, 'page');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
