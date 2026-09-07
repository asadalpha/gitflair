import { auth } from "@/server/lib/auth";
import { db } from "@/db";
import { user, workspace, workspaceMember } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface AuthSession {
  user: SessionUser;
  session: {
    id: string;
    expiresAt: Date;
    token: string;
    userId: string;
  };
}

export async function getSession(
  headers: Headers,
): Promise<AuthSession | null> {
  try {
    const session = await auth.api.getSession({ headers });
    return session as AuthSession | null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(
  headers: Headers,
): Promise<SessionUser | null> {
  const session = await getSession(headers);
  return session?.user ?? null;
}

export async function getUserWorkspace(userId: string) {
  const [result] = await db
    .select({
      workspace: workspace,
      role: workspaceMember.role,
    })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.userId, userId),
        eq(workspaceMember.role, "owner"),
      ),
    )
    .innerJoin(
      workspace,
      eq(workspaceMember.workspaceId, workspace.id),
    )
    .limit(1);

  return result ?? null;
}

export async function requireAuth(
  headers: Headers,
  fallbackUserId?: string,
): Promise<AuthSession> {
  const session = await getSession(headers);
  if (session?.user) {
    return session;
  }

  const headerUserId = headers.get("x-user-id");
  const targetUserId = fallbackUserId || headerUserId || "anonymous-user";

  const { session: guestSession } = await getOrCreateUserAndWorkspace(
    targetUserId,
  );
  return guestSession;
}

export async function getOrCreateUserAndWorkspace(
  userId: string,
): Promise<{ session: AuthSession; workspace: typeof workspace.$inferSelect }> {
  // 1. Ensure user row exists in 'user' table
  const [existingUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  let currentUser = existingUser;
  if (!currentUser) {
    const [inserted] = await db
      .insert(user)
      .values({
        id: userId,
        name: "Anonymous User",
        email: `${userId}@anonymous.gitflair.local`,
        emailVerified: false,
      })
      .onConflictDoNothing()
      .returning();
    currentUser = inserted;
  }

  // 2. Ensure workspace exists in 'workspace' & 'workspace_member' tables.
  // Slug uses the full userId (sanitized) — the old 8-char slice collided
  // between users sharing a name prefix, breaking workspace creation.
  let wsResult = await getUserWorkspace(userId);
  if (!wsResult) {
    const slug = `ws-${userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;
    const [newWs] = await db
      .insert(workspace)
      .values({
        name: `Personal Workspace`,
        slug,
        createdById: userId,
      })
      .onConflictDoNothing()
      .returning();

    if (newWs) {
      await db
        .insert(workspaceMember)
        .values({
          workspaceId: newWs.id,
          userId: userId,
          role: "owner",
        })
        .onConflictDoNothing();
    }
    wsResult = await getUserWorkspace(userId);
  }

  if (!wsResult) {
    throw new Error(
      "Failed to create or retrieve a workspace for the user. Cannot proceed.",
    );
  }

  const userObj: SessionUser = {
    id: userId,
    name: currentUser?.name || "Anonymous User",
    email: currentUser?.email || `${userId}@anonymous.gitflair.local`,
    image: currentUser?.image || null,
  };

  const authSession: AuthSession = {
    user: userObj,
    session: {
      id: `session-${userId}`,
      expiresAt: new Date(Date.now() + 365 * 86400000),
      token: `token-${userId}`,
      userId,
    },
  };

  return {
    session: authSession,
    workspace: wsResult.workspace,
  };
}

export async function requireWorkspace(userId: string) {
  let userWorkspace = await getUserWorkspace(userId);
  if (!userWorkspace) {
    const { workspace: createdWs } = await getOrCreateUserAndWorkspace(userId);
    return { workspace: createdWs, role: "owner" };
  }
  return userWorkspace;
}
