import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { organizationName, organizationWebsite, facebookUrl, instagramUrl, youtubeUrl, tiktokUrl } = await request.json();

        if (!organizationName || typeof organizationName !== 'string' || organizationName.trim().length === 0 || organizationName.trim().length > 100) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        const urlFields = { organizationWebsite, facebookUrl, instagramUrl, youtubeUrl, tiktokUrl };
        for (const [, value] of Object.entries(urlFields)) {
            if (value !== undefined && value !== null && value !== '') {
                try { new URL(value); } catch {
                    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
                }
            }
        }

        const { data, error } = await supabase
            .from('organizers')
            .update({
                name: organizationName,
                website: organizationWebsite,
                facebook_url: facebookUrl,
                instagram_url: instagramUrl,
                youtube_url: youtubeUrl,
                tiktok_url: tiktokUrl,
                updated_at: new Date().toISOString()
            })
            .eq('owner_id', user.id)
            .select()
            .single()

            if (error) {
                console.error('Database error:', error);
                return NextResponse.json(
                    { error: 'Failed to update organizer' },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                data
            });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}