import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface CodeChunk {
    id: string;
    repo_id: string;
    file_path: string;
    content: string;
    start_line: number;
    end_line: number;
    language: string;
    similarity?: number;
}
