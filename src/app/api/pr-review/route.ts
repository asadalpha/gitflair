import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { repository, prReview } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireWorkspace } from "@/lib/session";
import {
  createOctokitForUser,
  parseGitHubUrl,
  fetchPRDetails,
  fetchPRDiff,
} from "@/services/github";
import { generatePRReview } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { repositoryId, prNumber, userId: bodyUserId } = await req.json();

    if (!repositoryId || !prNumber) {
      return NextResponse.json(
        { error: "repositoryId and prNumber are required" },
        { status: 400 },
      );
    }

    const { user } = await requireAuth(req.headers, bodyUserId);
    const { workspace: userWorkspace } = await requireWorkspace(user.id);

    const prNumInt = parseInt(prNumber, 10);
    if (isNaN(prNumInt)) {
      return NextResponse.json(
        { error: "prNumber must be an integer" },
        { status: 400 },
      );
    }

    // 1. Fetch repository
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
        { error: "Invalid GitHub URL" },
        { status: 400 },
      );
    }

    const { owner, repo: repoName } = repoInfo;
    const octokit = await createOctokitForUser(user.id);

    // 2. Fetch PR info and Diff
    let prDetails;
    let diffContent;
    try {
      prDetails = await fetchPRDetails(octokit, owner, repoName, prNumInt);
      diffContent = await fetchPRDiff(octokit, owner, repoName, prNumInt);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `GitHub error: ${errorMsg}` },
        { status: 400 },
      );
    }

    if (!diffContent) {
      return NextResponse.json(
        { error: "No diff content found in PR" },
        { status: 400 },
      );
    }

    // 3. Insert initial pending review record
    const [insertedReview] = await db
      .insert(prReview)
      .values({
        repositoryId,
        userId: user.id,
        prNumber: prNumInt,
        title: prDetails.title,
        status: "pending",
      })
      .returning();

    const reviewId = insertedReview.id;

    // 4. Generate AI Review
    const reviewResult = await generatePRReview(prDetails.title, diffContent);

    // 5. Update DB record to completed
    await db
      .update(prReview)
      .set({
        status: "completed",
        summary: reviewResult.summary,
        score: reviewResult.score,
        fileReviews: reviewResult.fileReviews,
      })
      .where(eq(prReview.id, reviewId));

    return NextResponse.json({
      id: reviewId,
      title: prDetails.title,
      status: "completed",
      summary: reviewResult.summary,
      score: reviewResult.score,
      fileReviews: reviewResult.fileReviews,
    });
  } catch (error: unknown) {
    console.error("PR Review route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

// GET Endpoint to fetch existing reviews for a repo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get("repositoryId");
    const userId = searchParams.get("userId") ?? undefined;

    if (!repositoryId) {
      return NextResponse.json(
        { error: "repositoryId is required" },
        { status: 400 },
      );
    }

    const { user } = await requireAuth(request.headers, userId);
    const { workspace: userWorkspace } = await requireWorkspace(user.id);

    // Verify repo belongs to user's workspace
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

    const reviews = await db
      .select()
      .from(prReview)
      .where(eq(prReview.repositoryId, repositoryId))
      .orderBy(desc(prReview.createdAt));

    return NextResponse.json(reviews);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
