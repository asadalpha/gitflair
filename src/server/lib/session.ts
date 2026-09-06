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

  // 2. Ensure workspace exists in 'workspace' & 'workspace_member' tables
  let wsResult = await getUserWorkspace(userId);
  if (!wsResult) {
    const slug = `ws-${userId.slice(0, 8)}`;
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
    workspace: wsResult
      ? wsResult.workspace
      : {
          id: "default-ws-id",
          name: "Personal Workspace",
          slug: `ws-${userId.slice(0, 8)}`,
          description: null,
          logoUrl: null,
          createdById: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
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
