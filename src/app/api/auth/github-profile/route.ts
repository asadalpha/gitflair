import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { account } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request.headers);

    const { searchParams } = new URL(request.url);
    const usernameParam = searchParams.get("username");

    let token: string | null = null;

    if (session) {
      const [ghAccount] = await db
        .select()
        .from(account)
        .where(
          and(
            eq(account.userId, session.user.id),
            eq(account.providerId, "github"),
          ),
        )
        .limit(1);
      token = ghAccount?.accessToken ?? null;
    }

    if (!token) {
      const envToken = process.env.GITHUB_TOKEN;
      if (envToken && envToken.length > 10 && !envToken.includes("your_") && !envToken.includes("placeholder")) {
        token = envToken;
      }
    }

    if (!token && !usernameParam) {
      return NextResponse.json({
        error: "No GitHub account linked. Link GitHub or enter your username below.",
        needsUsername: true,
      });
    }

    const octokit = new Octokit(token ? { auth: token } : {});

    let username: string;
    if (token && !usernameParam) {
      const { data: ghUser } = await octokit.rest.users.getAuthenticated();
      username = ghUser.login;
    } else if (usernameParam) {
      username = usernameParam;
    } else {
      return NextResponse.json({
        error: "Unable to authenticate with GitHub. Enter your username below.",
        needsUsername: true,
      });
    }

    const { data: ghUser } = token && !usernameParam
      ? await octokit.rest.users.getAuthenticated()
      : await octokit.rest.users.getByUsername({ username });

    const isAuthed = !!token && !usernameParam;
    const { data: repos } = isAuthed
      ? await octokit.rest.repos.listForAuthenticatedUser({ sort: "updated", per_page: 100, visibility: "all" })
      : await octokit.rest.repos.listForUser({ username: ghUser.login, sort: "updated", per_page: 100 });

    const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);

    // Aggregate top languages across repos
    const langCounts: Record<string, number> = {};
    for (const repo of repos.slice(0, 30)) {
      if (repo.language) {
        langCounts[repo.language] = (langCounts[repo.language] ?? 0) + 1;
      }
    }
    const topLanguages = Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));

    // Fetch recent commits (last 30 events)
    let recentCommits = 0;
    let recentPRs = 0;
    try {
      const { data: events } = await octokit.rest.activity.listEventsForAuthenticatedUser({
        username: ghUser.login,
        per_page: 30,
      });
      for (const ev of events) {
        if (ev.type === "PushEvent") recentCommits += (ev.payload as { commits?: unknown[] }).commits?.length ?? 1;
        if (ev.type === "PullRequestEvent") recentPRs += 1;
      }
    } catch {
      // events may be empty for new users
    }

    return NextResponse.json({
      linked: true,
      profile: {
        login: ghUser.login,
        name: ghUser.name,
        avatar: ghUser.avatar_url,
        bio: ghUser.bio,
        company: ghUser.company,
        location: ghUser.location,
        blog: ghUser.blog,
        followers: ghUser.followers,
        following: ghUser.following,
        publicRepos: ghUser.public_repos,
        totalStars,
        createdAt: ghUser.created_at,
      },
      stats: {
        repos: repos.length,
        totalStars,
        followers: ghUser.followers,
        recentCommits,
        recentPRs,
      },
      languages: topLanguages,
    });
  } catch (error: unknown) {
    console.error("GitHub profile fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch GitHub profile" },
      { status: 500 },
    );
  }
}