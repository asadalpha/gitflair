import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { repository } from "@/db/schema";
import { eq, desc, isNotNull } from "drizzle-orm";
import { requireAuth, requireWorkspace } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const userIdParam = request.nextUrl.searchParams.get("userId") || undefined;
    const { user } = await requireAuth(request.headers, userIdParam);
    const { workspace: userWorkspace } = await requireWorkspace(user.id);

    const repos = await db
      .select({
        id: repository.id,
        name: repository.name,
        fullName: repository.fullName,
        url: repository.url,
        createdAt: repository.createdAt,
        languagesJson: repository.languagesJson,
        analysisJson: repository.analysisJson,
      })
      .from(repository)
      .where(eq(repository.workspaceId, userWorkspace.id))
      .orderBy(desc(repository.createdAt))
      .limit(20);

    return NextResponse.json(repos);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
