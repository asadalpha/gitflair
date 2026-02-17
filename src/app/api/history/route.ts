import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const repoId = searchParams.get('repoId');
        const userId = searchParams.get('userId') || 'anonymous';

        if (!repoId) {
            return NextResponse.json({ error: 'repoId is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('qa_history')
            .select('*')
            .eq('repo_id', repoId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('History query error:', error);
            return NextResponse.json([]);
        }

        return NextResponse.json(data ?? []);
    } catch {
        return NextResponse.json([]);
    }
}
