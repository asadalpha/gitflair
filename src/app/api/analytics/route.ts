import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { account } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request.headers);
    if (!session) {
      return NextResponse.json({ error: "Sign in to analyze your GitHub profile." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const repoUrl = body?.repoUrl;

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

    let token = ghAccount?.accessToken ?? null;

    if (!token) {
      const envToken = process.env.GITHUB_TOKEN;
      if (envToken && envToken.length > 10 && !envToken.includes("your_") && !envToken.includes("placeholder")) {
        token = envToken;
      }
    }

    if (!token) {
      return NextResponse.json({
        error: "Link your GitHub account to analyze real data.",
        needsGithubLink: true,
      });
    }

    const octokit = new Octokit({ auth: token });

    const { data: ghUser } = await octokit.rest.users.getAuthenticated();
    const username = ghUser.login;

    let owner: string | null = null;
    let repoName: string | null = null;
    if (repoUrl) {
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        owner = match[1];
        repoName = match[2].replace(".git", "");
      }
    }

    let commits = 0;
    let prs: { number: number; title: string; state: string; createdAt: string; url: string }[] = [];
    let issues: { number: number; title: string; state: string; createdAt: string; url: string; labels: string[] }[] = [];
    let mergeTimes: number[] = [];

    if (owner && repoName) {
      const repoParts: { number: number; title: string; state: string; created_at: string; html_url: string; merged_at: string | null }[] = [];
      try {
        const { data: repoPRs } = await octokit.rest.pulls.list({
          owner,
          repo: repoName,
          state: "all",
          per_page: 50,
          sort: "created",
          direction: "desc",
        });
        for (const pr of repoPRs) {
          prs.push({
            number: pr.number,
            title: pr.title,
            state: pr.merged_at ? "merged" : pr.state,
            createdAt: pr.created_at,
            url: pr.html_url,
          });
          repoParts.push({
            number: pr.number,
            title: pr.title,
            state: pr.merged_at ? "merged" : pr.state,
            created_at: pr.created_at,
            html_url: pr.html_url,
            merged_at: pr.merged_at,
          });
          if (pr.merged_at && pr.created_at) {
            const diff = new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime();
            mergeTimes.push(diff / 3_600_000);
          }
        }
      } catch (e) {
        console.error("PR fetch failed:", e);
      }

      try {
        const { data: repoIssues } = await octokit.rest.issues.listForRepo({
          owner,
          repo: repoName,
          state: "all",
          per_page: 50,
          sort: "created",
          direction: "desc",
        });
        for (const iss of repoIssues) {
          if (iss.pull_request) continue;
          issues.push({
            number: iss.number,
            title: iss.title,
            state: iss.state,
            createdAt: iss.created_at,
            url: iss.html_url,
            labels: iss.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")).filter(Boolean),
          });
        }
      } catch (e) {
        console.error("Issue fetch failed:", e);
      }

      try {
        const { data: contributors } = await octokit.rest.repos.listContributors({
          owner,
          repo: repoName,
          per_page: 100,
        });
        const me = contributors.find((c) => c.login === username);
        commits = me?.contributions ?? 0;
      } catch (e) {
        console.error("Contributors fetch failed:", e);
      }
    } else {
      try {
        const { data: events } = await octokit.rest.activity.listEventsForAuthenticatedUser({
          username,
          per_page: 100,
        });
        for (const ev of events) {
          if (ev.type === "PushEvent") {
            commits += (ev.payload as { commits?: unknown[] }).commits?.length ?? 1;
          }
        }
      } catch {
        // ignore
      }

      try {
        const { data: userPRs } = await octokit.rest.search.issuesAndPullRequests({
          q: `author:${username} is:pr`,
          per_page: 30,
          sort: "created",
          order: "desc",
        });
        for (const pr of userPRs.items) {
          prs.push({
            number: pr.number,
            title: pr.title,
            state: pr.state ?? "open",
            createdAt: pr.created_at,
            url: pr.html_url,
          });
          if (pr.pull_request?.merged_at && pr.created_at) {
            const diff = new Date(pr.pull_request.merged_at).getTime() - new Date(pr.created_at).getTime();
            mergeTimes.push(diff / 3_600_000);
          }
        }
      } catch (e) {
        console.error("PR search failed:", e);
      }

      try {
        const { data: userIssues } = await octokit.rest.search.issuesAndPullRequests({
          q: `author:${username} is:issue`,
          per_page: 30,
          sort: "created",
          order: "desc",
        });
        for (const iss of userIssues.items) {
          issues.push({
            number: iss.number,
            title: iss.title,
            state: iss.state ?? "open",
            createdAt: iss.created_at,
            url: iss.html_url,
            labels: iss.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")).filter(Boolean),
          });
        }
      } catch (e) {
        console.error("Issue search failed:", e);
      }
    }

    const avgMergeHours = mergeTimes.length > 0
      ? mergeTimes.reduce((s, t) => s + t, 0) / mergeTimes.length
      : 0;

    const mergedCount = prs.filter((p) => p.state === "merged" || p.state === "closed").length;
    const reviewRate = prs.length > 0 ? (mergedCount / prs.length) * 100 : 0;

    return NextResponse.json({
      username,
      avatar: ghUser.avatar_url,
      stats: {
        commits,
        totalPRs: prs.length,
        totalIssues: issues.length,
        mergedPRs: mergedCount,
        avgMergeHours: Number(avgMergeHours.toFixed(1)),
        reviewRate: Number(reviewRate.toFixed(1)),
      },
      recentPRs: prs.slice(0, 8),
      recentIssues: issues.slice(0, 8),
    });
  } catch (error: unknown) {
    console.error("Analytics fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}