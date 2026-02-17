import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId') || 'anonymous';

        const { data, error } = await supabase
            .from('repositories')
            .select('id, url, name, full_name, indexed_at')
            .eq('user_id', userId)
            .not('indexed_at', 'is', null)
            .order('indexed_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Repos list error:', error);
            return NextResponse.json([]);
        }

        return NextResponse.json(data ?? []);
    } catch {
        return NextResponse.json([]);
    }
}
