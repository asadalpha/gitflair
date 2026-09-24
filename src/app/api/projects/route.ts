import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { project } from "@/db/schema";
import { requireAuth } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth(request.headers, new URL(request.url).searchParams.get("userId") ?? undefined);
    const projects = await db.select().from(project).where(eq(project.userId, user.id)).orderBy(desc(project.updatedAt));
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    const { user } = await requireAuth(request.headers, body.userId);
    const [created] = await db.insert(project).values({ userId: user.id, name: body.name.trim(), description: body.description?.trim() || "" }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create project" }, { status: 500 });
  }
}
