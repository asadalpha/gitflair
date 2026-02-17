import { NextRequest, NextResponse } from 'next/server';
import { embedQuery, chatWithContext, isQuotaExceeded } from '@/lib/gemini';
import { supabase, CodeChunk } from '@/lib/supabase';

/**
 * API route to handle codebase Q&A using RAG (Retrieval-Augmented Generation).
 */
export async function POST(req: NextRequest) {
    try {
        const { question, repoId, userId } = await req.json();
        const userIdSafe = userId || 'anonymous';

        // Validate input
        if (!question || !repoId) {
            return NextResponse.json(
                { error: 'Question and repoId are required' },
                { status: 400 }
            );
        }

        // 1. Generate embedding for the question
        const queryEmbedding = await embedQuery(question);

        if (!queryEmbedding || queryEmbedding.length === 0) {
            return NextResponse.json({
                error: 'Failed to generate query embedding'
            }, { status: 500 });
        }

        // RATE LIMIT: Max 10 chats per repository per user
        const { count: chatCount, error: chatCountError } = await supabase
            .from('qa_history')
            .select('*', { count: 'exact', head: true })
            .eq('repo_id', repoId)
            .eq('user_id', userIdSafe);

        if (chatCountError) {
            console.error('[ASK] Chat count query error:', chatCountError);
        }

        if (chatCount && chatCount >= 10) {
            return NextResponse.json({
                error: 'Limit reached: You can only have up to 10 chats per repository. Please delete an old repository or index a new one.'
            }, { status: 403 });
        }

        // DIAGNOSTIC: Check if this repo has ANY chunks stored
        const { count, error: countError } = await supabase
            .from('code_chunks')
            .select('*', { count: 'exact', head: true })
            .eq('repo_id', repoId);

        console.log(`[ASK] Repo ${repoId}: ${count ?? 0} chunks in DB, query embedding dims: ${queryEmbedding.length}`);

        if (countError) {
            console.error('[ASK] Count query error:', countError);
        }

        if (!count || count === 0) {
            return NextResponse.json({
                answer: `No code chunks found for this repository. This usually means the ingestion failed — likely due to a vector dimension mismatch in Supabase. Please run the migration SQL in your Supabase SQL Editor to change vector(768) → vector(3072), then re-index the repo.`,
                evidence: [],
                chunks: []
            });
        }

        // 2. Fetch relevant chunks from Supabase via RPC
        const { data: rawChunks, error: rpcError } = await supabase.rpc('match_code_chunks', {
            query_embedding: queryEmbedding,
            match_threshold: 0.15,
            match_count: 4,
            p_repo_id: repoId,
        });

        if (rpcError) {
            console.error('Supabase RPC Error:', JSON.stringify(rpcError));
            return NextResponse.json({
                answer: `Database search error: ${rpcError.message}. This is likely a vector dimension mismatch — run the migration SQL in Supabase.`,
                evidence: [],
                chunks: []
            });
        }

        const chunks: CodeChunk[] = rawChunks || [];

        console.log(`[ASK] RPC returned ${chunks.length} matching chunks`);

        // 3. Handle case where no context is found
        if (chunks.length === 0) {
            return NextResponse.json({
                answer: `Found ${count} chunks in DB but none matched your query. Try asking about a specific file, function, or feature in the codebase.`,
                evidence: [],
                chunks: []
            });
        }

        // 4. Prepare context for the LLM
        const context = chunks
            .map((c) => `File: ${c.file_path} (Lines ${c.start_line}-${c.end_line})\nContent:\n${c.content}`)
            .join('\n\n---\n\n');

        // 4b. Fetch recent chat history for conversational context
        const { data: recentHistory } = await supabase
            .from('qa_history')
            .select('question, answer')
            .eq('repo_id', repoId)
            .eq('user_id', userIdSafe)
            .order('created_at', { ascending: false })
            .limit(5);

        const chatHistory = (recentHistory || []).reverse().flatMap(h => [
            { role: 'user', content: h.question },
            { role: 'assistant', content: h.answer }
        ]);

        // 5. Call Gemini with context + history
        const answer = await chatWithContext(context, question, chatHistory);

        // 6. Save the successful query to history
        const historyEntry = {
            user_id: userIdSafe,
            repo_id: repoId,
            question,
            answer,
            references_json: chunks.map((c) => ({
                file_path: c.file_path,
                start_line: c.start_line,
                end_line: c.end_line
            }))
        };

        const { error: insertError } = await supabase
            .from('qa_history')
            .insert([historyEntry]);

        if (insertError) {
            console.error('History logging error:', insertError);
        }

        // 7. Only send chunks to frontend if user explicitly asked for code
        const codeKeywords = /show|code|snippet|implementation|function|how does|source|example/i;
        const includeChunks = codeKeywords.test(question);

        return NextResponse.json({
            answer,
            chunks: includeChunks ? chunks : []
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        console.error('Ask Route Error:', error);

        if (isQuotaExceeded(error)) {
            return NextResponse.json({ error: errorMessage }, { status: 429 });
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}