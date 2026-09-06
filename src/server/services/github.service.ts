import { Octokit } from "octokit";
import { db } from "@/db";
import { account } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// ── Helpers ──

export function parseGitHubUrl(url: string) {
  try {
    const cleanUrl = url.trim().replace(/\/$/, "");
    const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) {
      const owner = match[1];
      const repo = match[2].replace(".git", "");
      return { owner, repo };
    }
  } catch {
    return null;
  }
  return null;
}

// ── Token Retrieval ──

export async function getGitHubToken(
  userId: string,
): Promise<string | null> {
  const [ghAccount] = await db
    .select()
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, "github"),
      ),
    )
    .limit(1);

  return ghAccount?.accessToken ?? null;
}

// ── Octokit Instance ──

export async function createOctokitForUser(userId: string): Promise<Octokit> {
  const token = await getGitHubToken(userId);

  if (token) {
    return new Octokit({ auth: token });
  }

  // Fall back to shared env token (unauthenticated if empty)
  const envToken = process.env.GITHUB_TOKEN;
  if (
    envToken &&
    envToken.length > 10 &&
    !envToken.includes("your_") &&
    !envToken.includes("placeholder")
  ) {
    return new Octokit({ auth: envToken });
  }

  return new Octokit({});
}

// ── API Methods ──

export interface RepoInfo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
}

export async function fetchRepoInfo(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<RepoInfo> {
  const { data } = await octokit.rest.repos.get({ owner, repo });

  return {
    id: data.id,
    name: data.name,
    fullName: data.full_name,
    owner: data.owner.login,
    description: data.description,
    url: data.html_url,
    defaultBranch: data.default_branch,
    isPrivate: data.private,
    language: data.language,
    topics: data.topics ?? [],
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    openIssues: data.open_issues_count ?? 0,
  };
}

/**
 * Fetch file contents from a GitHub repo using the default branch.
 */
export async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
): Promise<string> {
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  });

  if ("content" in data && typeof data.content === "string") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }

  if ("download_url" in data && data.download_url) {
    const response = await fetch(data.download_url);
    return await response.text();
  }

  return "";
}

/**
 * Fetch PR details (title + file list).
 */
export async function fetchPRDetails(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
) {
  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  });

  return {
    title: pr.title,
    files: files.map((f) => f.filename),
  };
}

/**
 * Fetch PR diff for analysis.
 */
export async function fetchPRDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string> {
  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner,
      repo,
      pull_number: prNumber,
      headers: {
        accept: "application/vnd.github.v3.diff",
      },
    },
  );
  return response.data as unknown as string;
}

export async function fetchRepoLanguages(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<Record<string, number>> {
  try {
    const { data } = await octokit.rest.repos.listLanguages({
      owner,
      repo,
    });
    return data as Record<string, number>;
  } catch (error) {
    console.error("Error fetching repo languages:", error);
    return {};
  }
}

// ── Repo Contents (for ingestion) ──

export interface RepoFile {
  path: string;
  content: string;
  language: string;
}

const SUPPORTED_EXTENSIONS: Record<string, string> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".java": "java",
  ".go": "go",
  ".rs": "rust",
  ".cpp": "cpp",
  ".c": "c",
  ".h": "cpp",
  ".cs": "csharp",
  ".rb": "ruby",
  ".php": "php",
  ".swift": "swift",
  ".kt": "kotlin",
  ".scala": "scala",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".md": "markdown",
  ".sh": "shell",
  ".sql": "sql",
  ".css": "css",
  ".html": "html",
};

const IGNORED_PATHS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "out",
  "venv",
  ".venv",
  "vendor",
  "__pycache__",
  ".vscode",
  ".idea",
];

interface GitHubTreeItem {
  path?: string;
  mode?: string;
  type?: string;
  sha?: string;
  size?: number;
  url?: string;
}

export async function fetchRepoContents(
  owner: string,
  repo: string,
  octokit: Octokit,
): Promise<RepoFile[]> {
  try {
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    const { data: treeData } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: "true",
    });

    const repoFiles: RepoFile[] = [];
    const treeItems = treeData.tree as GitHubTreeItem[];

    const filesToProcess = treeItems.filter((item) => {
      if (item.type !== "blob") return false;

      const path = item.path || "";
      const isIgnored = IGNORED_PATHS.some(
        (ignored) =>
          path.includes(`${ignored}/`) || path.startsWith(`${ignored}/`),
      );
      if (isIgnored) return false;

      const ext = "." + path.split(".").pop()?.toLowerCase();
      return !!SUPPORTED_EXTENSIONS[ext];
    });

    const CONCURRENCY_LIMIT = 5;
    for (let i = 0; i < filesToProcess.length; i += CONCURRENCY_LIMIT) {
      const batch = filesToProcess.slice(i, i + CONCURRENCY_LIMIT);
      await Promise.all(
        batch.map(async (item) => {
          const itemPath = item.path;
          if (!itemPath) return;

          try {
            const content = await fetchFileContent(
              octokit,
              owner,
              repo,
              itemPath,
            );
            const ext = "." + itemPath.split(".").pop()?.toLowerCase();

            if (content.length > 0 && content.length < 500000) {
              repoFiles.push({
                path: itemPath,
                content,
                language: SUPPORTED_EXTENSIONS[ext] || "text",
              });
            }
          } catch (e) {
            console.error(`Failed to fetch ${itemPath}:`, e);
          }
        }),
      );
    }

    return repoFiles;
  } catch (error) {
    console.error("Error fetching repo contents:", error);
    throw error;
  }
}
