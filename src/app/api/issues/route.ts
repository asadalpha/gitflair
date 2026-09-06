import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from 'octokit';
import { requireAuth } from '@/lib/session';
import { createOctokitForUser } from '@/services/github';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repoUrl = searchParams.get('repoUrl');
  const userId = searchParams.get('userId') ?? undefined;

  let ownerRepo = '';
  if (repoUrl) {
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    if (match) {
      ownerRepo = match[1].replace('.git', '');
    }
  }

  if (!ownerRepo) {
    return NextResponse.json(
      { error: 'Valid repoUrl is required (e.g. https://github.com/owner/repo)' },
      { status: 400 },
    );
  }

  const [owner, repo] = ownerRepo.split('/');

  let octokit: Octokit;
  try {
    const { user } = await requireAuth(req.headers, userId);
    octokit = await createOctokitForUser(user.id);
  } catch {
    const envToken = process.env.GITHUB_TOKEN;
    if (envToken && envToken.length > 10 && !envToken.includes('your_') && !envToken.includes('placeholder')) {
      octokit = new Octokit({ auth: envToken });
    } else {
      octokit = new Octokit({});
    }
  }

  try {
    const { data: issuesData } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: 'all',
      per_page: 20,
      sort: 'created',
      direction: 'desc',
    });

    const formatted = issuesData
      .filter((issue) => !('pull_request' in issue) || issue.pull_request === undefined)
      .map((issue) => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        author: issue.user?.login || 'ghost',
        authorAvatar: issue.user?.avatar_url,
        labels: (issue.labels || []).map((l) => ({
          name: typeof l === 'string' ? l : l.name ?? '',
          color: typeof l === 'string' ? undefined : l.color,
        })),
        comments: issue.comments,
        createdAt: issue.created_at,
        url: issue.html_url,
        body: issue.body,
      }));

    if (formatted.length === 0) {
      return NextResponse.json({ empty: true, message: `No issues found for ${ownerRepo}.` });
    }

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    const message = error instanceof Error ? error.message : 'GitHub API request failed';

    if (status === 404) {
      return NextResponse.json(
        { error: `Repository ${ownerRepo} not found or is private.` },
        { status: 404 },
      );
    }

    if (status === 403 || status === 429) {
      return NextResponse.json(
        { error: 'GitHub API rate limit reached. Link your GitHub account for higher limits.' },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: `Failed to fetch issues: ${message}` },
      { status: 500 },
    );
  }
}