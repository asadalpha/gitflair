import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { repository, codeChunk } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireWorkspace } from "@/lib/session";
import {
  createOctokitForUser,
  parseGitHubUrl,
  fetchRepoInfo,
  fetchRepoContents,
  fetchRepoLanguages,
} from "@/services/github";
import {
  chunkCode,
  embedDocuments,
  isQuotaExceeded,
  analyzeRepository,
} from "@/lib/gemini";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, userId: bodyUserId } = body || {};

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 },
      );
    }

    const { user } = await requireAuth(req.headers, bodyUserId);
    const { workspace: userWorkspace } = await requireWorkspace(user.id);

    const repoInfo = parseGitHubUrl(url);
    if (!repoInfo) {
      return NextResponse.json(
        { error: "Invalid GitHub URL" },
        { status: 400 },
      );
    }

    const { owner, repo: repoName } = repoInfo;
    const fullName = `${owner}/${repoName}`;

    // 1. Check if this workspace already has this repo
    const [existingRepo] = await db
      .select()
      .from(repository)
      .where(
        and(
          eq(repository.fullName, fullName),
          eq(repository.workspaceId, userWorkspace.id),
        ),
      )
      .limit(1);

    let repoId: string;
    if (existingRepo) {
      repoId = existingRepo.id;
      // Delete old chunks for re-indexing
      await db
        .delete(codeChunk)
        .where(eq(codeChunk.repositoryId, repoId));
    } else {
      // Rate limit: max 10 repos per workspace
      const repoCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(repository)
        .where(eq(repository.workspaceId, userWorkspace.id));

      const repoCount = Number(repoCountResult[0]?.count ?? 0);
      if (repoCount >= 3) {
        return NextResponse.json(
          {
            error:
              "Limit reached: You can have up to 3 repositories per workspace. Delete an old repository to index a new one.",
          },
          { status: 403 },
        );
      }

      // Fetch repo info from GitHub
      const octokit = await createOctokitForUser(user.id);
      const ghRepo = await fetchRepoInfo(octokit, owner, repoName);

      const [newRepo] = await db
        .insert(repository)
        .values({
          workspaceId: userWorkspace.id,
          name: repoName,
          fullName,
          owner,
          url,
          githubId: ghRepo.id,
          description: ghRepo.description,
          isPrivate: ghRepo.isPrivate ? "true" : "false",
          defaultBranch: ghRepo.defaultBranch,
          language: ghRepo.language,
          stars: ghRepo.stars,
          forks: ghRepo.forks,
          openIssues: ghRepo.openIssues,
          topics: ghRepo.topics,
          addedById: user.id,
        })
        .returning();

      repoId = newRepo.id;
    }

    // 2. Fetch contents from GitHub with user's token
    const octokit = await createOctokitForUser(user.id);
    const allFiles = await fetchRepoContents(owner, repoName, octokit);

    // Cap the number of files processed in a single request to stay within
    // serverless time limits. Prioritize source files over docs/config.
    const MAX_FILES = 400;
    const files = allFiles.length > MAX_FILES ? allFiles.slice(0, MAX_FILES) : allFiles;

    // 3. Process files (chunking & embeddings)
    const FILE_CONCURRENCY = 3;
    for (let i = 0; i < files.length; i += FILE_CONCURRENCY) {
      const fileBatch = files.slice(i, i + FILE_CONCURRENCY);

      await Promise.all(
        fileBatch.map(async (file) => {
          const chunks = await chunkCode(file.content, file.path);

          // ⚡ Bolt: Performance optimization
          // Filter valid chunks first to avoid O(n²) nested .find() on every mapping iteration
          const validChunks = chunks.filter((c: { content: string }) => c.content.trim().length > 0);

          if (validChunks.length === 0) return;

          const chunkContents = validChunks.map((c: { content: string }) => c.content);
          const chunkEmbeddings = await embedDocuments(chunkContents);

          const chunksWithEmbeddings = validChunks
            .map((chunk: { content: string; start_line: number; end_line: number }, index: number) => {
              return {
                repositoryId: repoId,
                filePath: file.path,
                content: chunk.content,
                startLine: chunk.start_line,
                endLine: chunk.end_line,
                language: file.language,
                embedding: chunkEmbeddings[index],
              };
            })
            .filter((c: { embedding: number[] }) => c.embedding && c.embedding.length > 0);

          if (chunksWithEmbeddings.length === 0) return;

          // Batch insert chunks
          await db.insert(codeChunk).values(chunksWithEmbeddings);
        }),
      );
    }

    // 4. Generate repository analysis
    let analysis = null;
    let languages: Record<string, number> | null = null;
    try {
      const filePaths = files.map((f) => f.path);
      const sampleChunks = files
        .slice(0, 8)
        .map(
          (f) =>
            `File: ${f.path}\n${f.content.slice(0, 1000)}`,
        )
        .join("\n\n---\n\n");
      analysis = await analyzeRepository(filePaths, sampleChunks);
      languages = await fetchRepoLanguages(octokit, owner, repoName);
    } catch (err) {
      console.error("[INGEST] Automatic repository analysis failed:", err);
    }

    // 5. Update repo metadata
    await db
      .update(repository)
      .set({
        analysisJson: analysis,
        languagesJson: languages,
      })
      .where(eq(repository.id, repoId));

    return NextResponse.json({
      message: "Indexing complete",
      repositoryId: repoId,
      filesProcessed: files.length,
      totalFiles: allFiles.length,
      capped: allFiles.length > MAX_FILES,
    });
  } catch (error: unknown) {
    console.error("Ingest error:", error);

    if (isQuotaExceeded(error)) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Quota exceeded" },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
