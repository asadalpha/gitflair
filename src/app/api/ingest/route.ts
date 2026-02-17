import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubUrl, fetchRepoContents } from '@/lib/github';
import { chunkCode, embedDocuments, isQuotaExceeded } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const { url, userId } = await req.json();
        if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

        const userIdSafe = userId || 'anonymous';

        const repoInfo = parseGitHubUrl(url);
        if (!repoInfo) return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });

        const { owner, repo } = repoInfo;

        // 1. Check if this user already has this repo indexed
        const { data: existingRepo } = await supabase
            .from('repositories')
            .select('*')
            .eq('url', url)
            .eq('user_id', userIdSafe)
            .single();

        let repoId: string;
        if (existingRepo) {
            repoId = existingRepo.id;
            // Return existing if already indexed within last 24h
            if (existingRepo.indexed_at) {
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                if (new Date(existingRepo.indexed_at) > oneDayAgo) {
                    return NextResponse.json({ message: 'Repository already indexed recently', repoId });
                }
            }
        } else {
            // RATE LIMIT: Max 2 repositories per user
            const { count: repoCount, error: countError } = await supabase
                .from('repositories')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userIdSafe);

            if (countError) throw countError;

            if (repoCount && repoCount >= 2) {
                return NextResponse.json({
                    error: 'Limit reached: You can only index up to 2 repositories. Please delete an old repository to index a new one.'
                }, { status: 403 });
            }

            const { data: newRepo, error: insertRepoError } = await supabase
                .from('repositories')
                .insert([{ url, name: repo, full_name: `${owner}/${repo}`, user_id: userIdSafe }])
                .select()
                .single();

            if (insertRepoError) throw insertRepoError;
            repoId = newRepo.id;
        }

        // 2. Fetch contents
        const files = await fetchRepoContents(owner, repo);

        // 3. Process files (chunking & embeddings)
        const FILE_CONCURRENCY = 3;
        for (let i = 0; i < files.length; i += FILE_CONCURRENCY) {
            const fileBatch = files.slice(i, i + FILE_CONCURRENCY);

            await Promise.all(fileBatch.map(async (file) => {
                const chunks = await chunkCode(file.content, file.path);

                interface Chunk { content: string; start_line: number; end_line: number }

                // 3b. Batch embed chunks for this file
                const chunkContents = chunks.map((c: Chunk) => c.content).filter((content: string) => content.trim().length > 0);

                if (chunkContents.length === 0) return;

                const chunkEmbeddings = await embedDocuments(chunkContents);

                // Log dimensions for debugging
                if (chunkEmbeddings.length > 0) {
                    console.log(`[INGEST] ${file.path}: ${chunkEmbeddings.length} embeddings, ${chunkEmbeddings[0].length} dimensions each`);
                }

                const chunksWithEmbeddings = chunkContents.map((content: string, index: number) => {
                    const originalChunk = chunks.find((c: Chunk) => c.content === content) || chunks[0];

                    return {
                        repo_id: repoId,
                        file_path: file.path,
                        content: content,
                        start_line: originalChunk.start_line,
                        end_line: originalChunk.end_line,
                        language: file.language,
                        embedding: chunkEmbeddings[index],
                    };
                }).filter((c: { embedding: string | unknown[]; }) => c.embedding && c.embedding.length > 0);

                if (chunksWithEmbeddings.length === 0) return;

                // 4. Batch insert chunks for this file
                const { error: insertChunksError } = await supabase
                    .from('code_chunks')
                    .insert(chunksWithEmbeddings);

                if (insertChunksError) {
                    console.error(`[INGEST] FAILED to insert ${chunksWithEmbeddings.length} chunks for ${file.path}:`, JSON.stringify(insertChunksError));
                    throw new Error(`Failed to store chunks for ${file.path}: ${insertChunksError.message} (code: ${insertChunksError.code}). If code=22000, run the Supabase migration to change vector(768) → vector(3072).`);
                } else {
                    console.log(`[INGEST] ✓ Inserted ${chunksWithEmbeddings.length} chunks for ${file.path}`);
                }
            }));
        }

        // 5. Update repo status
        await supabase
            .from('repositories')
            .update({ indexed_at: new Date().toISOString() })
            .eq('id', repoId);

        return NextResponse.json({
            message: 'Indexing complete',
            repoId,
            filesProcessed: files.length
        });
    } catch (error: unknown) {
        console.error('Ingest error:', error);
        const err = error as Error;

        if (isQuotaExceeded(error)) {
            return NextResponse.json({ error: err.message }, { status: 429 });
        }

        return NextResponse.json({
            error: err.message || 'Internal server error',
            details: err.stack
        }, { status: 500 });
    }
}
