import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/db";
import { workspace, workspaceMember } from "@/db/schema";

const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};

if (
  process.env.GOOGLE_CLIENT_ID &&
  !process.env.GOOGLE_CLIENT_ID.includes("your-") &&
  process.env.GOOGLE_CLIENT_SECRET &&
  !process.env.GOOGLE_CLIENT_SECRET.includes("your-")
) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}

if (
  process.env.GITHUB_CLIENT_ID &&
  !process.env.GITHUB_CLIENT_ID.includes("your-") &&
  process.env.GITHUB_CLIENT_SECRET &&
  !process.env.GITHUB_CLIENT_SECRET.includes("your-")
) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  socialProviders,
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (refresh session every day)
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Auto-create a personal workspace for every new user
          const slug = `personal-${user.id.slice(0, 8)}`;
          const [ws] = await db
            .insert(workspace)
            .values({
              name: `${user.name}'s Workspace`,
              slug,
              createdById: user.id,
            })
            .returning();

          if (ws) {
            await db.insert(workspaceMember).values({
              workspaceId: ws.id,
              userId: user.id,
              role: "owner",
            });
          }
        },
      },
    },
  },
});
