import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { qaHistory } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/session";

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

    const rows = await db
      .select()
      .from(qaHistory)
      .where(
        and(
          eq(qaHistory.repositoryId, repositoryId),
          eq(qaHistory.userId, user.id),
        ),
      )
      .orderBy(desc(qaHistory.createdAt))
      .limit(10);

    return NextResponse.json(rows);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
