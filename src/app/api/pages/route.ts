import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { codePages } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoId = searchParams.get("repoId") ?? undefined;
    const userId = searchParams.get("userId") ?? undefined;

    const { user } = await requireAuth(request.headers, userId);

    const conditions = [eq(codePages.userId, user.id)];
    if (repoId && repoId !== "empty-workspace") {
      conditions.push(eq(codePages.repoId, repoId));
    }

    const pages = await db
      .select()
      .from(codePages)
      .where(and(...conditions))
      .orderBy(desc(codePages.updatedAt));

    return NextResponse.json(pages);
  } catch (error: unknown) {
    console.error("GET /api/pages error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId: bodyUserId, repoId, title, content } = body;

    const { user } = await requireAuth(req.headers, bodyUserId);

    const [inserted] = await db
      .insert(codePages)
      .values({
        userId: user.id,
        repoId: repoId && repoId !== "empty-workspace" ? repoId : null,
        title: title || "Untitled Page",
        content: content || "",
      })
      .returning();

    return NextResponse.json(inserted);
  } catch (error: unknown) {
    console.error("POST /api/pages error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create page" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageId, title, content } = body;

    if (!pageId) {
      return NextResponse.json({ error: "pageId is required" }, { status: 400 });
    }

    const updates: { title?: string; content?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;

    const [updated] = await db
      .update(codePages)
      .set(updates)
      .where(eq(codePages.id, pageId))
      .returning();

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("PATCH /api/pages error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update page" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get("pageId");

    if (!pageId) {
      return NextResponse.json({ error: "pageId is required" }, { status: 400 });
    }

    await db.delete(codePages).where(eq(codePages.id, pageId));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE /api/pages error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete page" },
      { status: 500 },
    );
  }
}