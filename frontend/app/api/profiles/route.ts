import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('full_name, job_title')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch profile' },
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

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { data, error } = await supabase
        .from('profiles')
        .insert({ id: user.id })
        .select()
        .single();

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { error: 'Failed to create profile' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            data,
            { status: 201 }
        );

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

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

        const { userName, userRole } = await request.json();

        const { data, error } = await supabase
            .from('profiles')
            .update({
                full_name: userName,
                job_title: userRole,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select()
            .single()

            if (error) {
                console.error('Database error:', error);
                return NextResponse.json(
                    { error: 'Failed to update profile' },
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