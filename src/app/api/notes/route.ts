import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { codeNotes } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoId = searchParams.get("repoId") ?? undefined;
    const userId = searchParams.get("userId") ?? undefined;

    const { user } = await requireAuth(request.headers, userId);

    const conditions = [eq(codeNotes.userId, user.id)];
    if (repoId && repoId !== "empty-workspace") {
      conditions.push(eq(codeNotes.repoId, repoId));
    }

    const notes = await db
      .select()
      .from(codeNotes)
      .where(and(...conditions))
      .orderBy(desc(codeNotes.createdAt));

    return NextResponse.json(notes);
  } catch (error: unknown) {
    console.error("GET /api/notes error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId: bodyUserId, repoId, title, category, assignee } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const { user } = await requireAuth(req.headers, bodyUserId);

    const [inserted] = await db
      .insert(codeNotes)
      .values({
        userId: user.id,
        repoId: repoId && repoId !== "empty-workspace" ? repoId : null,
        code: `NOTE-${Math.floor(Math.random() * 900) + 100}`,
        title,
        completed: false,
        category: category || "logic",
        assignee: assignee || "Unassigned",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      })
      .returning();

    return NextResponse.json(inserted);
  } catch (error: unknown) {
    console.error("POST /api/notes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create note" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { noteId, completed } = body;

    if (!noteId) {
      return NextResponse.json({ error: "noteId is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(codeNotes)
      .set({ completed, updatedAt: new Date() })
      .where(eq(codeNotes.id, noteId))
      .returning();

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("PATCH /api/notes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update note" },
      { status: 500 },
    );
  }
}