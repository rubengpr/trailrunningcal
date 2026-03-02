import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerRaceContext } from '@/lib/auth-organizer';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { raceId } = await context.params;
    const supabase = await createClient();

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
