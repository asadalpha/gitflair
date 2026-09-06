import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { repository, codeChunk } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, requireWorkspace } from "@/lib/session";
import {
  createOctokitForUser,
  fetchFileContent,
  parseGitHubUrl,
} from "@/services/github";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get("repositoryId");
    const path = searchParams.get("path");
    const userId = searchParams.get("userId") ?? undefined;

    if (!repositoryId || !path) {
      return NextResponse.json(
        { error: "repositoryId and path are required" },
        { status: 400 },
      );
    }

    const { user } = await requireAuth(request.headers, userId);
    const { workspace: userWorkspace } = await requireWorkspace(user.id);

    // 1. Fetch repository details
    const [repo] = await db
      .select()
      .from(repository)
      .where(
        and(
          eq(repository.id, repositoryId),
          eq(repository.workspaceId, userWorkspace.id),
        ),
      )
      .limit(1);

    if (!repo) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 },
      );
    }

    const repoInfo = parseGitHubUrl(repo.url);
    if (!repoInfo) {
      return NextResponse.json(
        { error: "Invalid repo URL" },
        { status: 400 },
      );
    }

    // 2. Try fetching from GitHub directly with user's token
    try {
      const octokit = await createOctokitForUser(user.id);
      const content = await fetchFileContent(
        octokit,
        repoInfo.owner,
        repoInfo.repo,
        path,
      );
      if (content) {
        return NextResponse.json({ content });
      }
    } catch {
      console.warn(
        "[FILES] GitHub fetch failed, falling back to database reconstruction",
      );
    }

    // 3. Fallback: Reconstruct from code chunks
    const chunks = await db
      .select()
      .from(codeChunk)
      .where(
        and(
          eq(codeChunk.repositoryId, repositoryId),
          eq(codeChunk.filePath, path),
        ),
      )
      .orderBy(asc(codeChunk.startLine));

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "File content not found locally" },
        { status: 404 },
      );
    }

    const code = chunks.map((c) => c.content).join("\n\n");
    return NextResponse.json({ content: code });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
