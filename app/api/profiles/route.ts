import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';

export async function PATCH(request: NextRequest) {
    try {
        const { user } = await requireAuth();
        const supabase = await createClient();

        const { userName, userRole } = await request.json();

        if (!userName || typeof userName !== 'string' || userName.trim().length === 0 || userName.trim().length > 100) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }
        if (userRole !== undefined && userRole !== null && (typeof userRole !== 'string' || userRole.length > 100)) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

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
        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}