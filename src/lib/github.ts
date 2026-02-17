import { Octokit } from 'octokit';

// Use token if provided and not a placeholder, otherwise unauthenticated (60 req/hr)
const token = process.env.GITHUB_TOKEN;
const isValidToken = token && token.length > 10 && !token.includes('your_');

const octokit = new Octokit(isValidToken ? { auth: token } : {});

export interface RepoFile {
    path: string;
    content: string;
    language: string;
}

const SUPPORTED_EXTENSIONS: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.cpp': 'cpp',
    '.c': 'c',
    '.h': 'cpp',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
    '.sh': 'shell',
    '.sql': 'sql',
    '.css': 'css',
    '.html': 'html',
};

const IGNORED_PATHS = [
    'node_modules', '.git', 'dist', 'build', '.next', 'out',
    'venv', '.venv', 'vendor', '__pycache__', '.vscode', '.idea'
];

export interface GitHubTreeItem {
    path?: string;
    mode?: string;
    type?: string;
    sha?: string;
    size?: number;
    url?: string;
}

export async function fetchRepoContents(owner: string, repo: string): Promise<RepoFile[]> {
    try {
        // 1. Get the default branch
        const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
        const defaultBranch = repoData.default_branch;

        // 2. Get the recursive tree
        // This is much more efficient than recursive getContent calls
        const { data: treeData } = await octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: defaultBranch,
            recursive: 'true',
        });

        const repoFiles: RepoFile[] = [];
        const treeItems = treeData.tree as GitHubTreeItem[];

        const filesToProcess = treeItems.filter((item) => {
            if (item.type !== 'blob') return false;

            const path = item.path || '';
            const isIgnored = IGNORED_PATHS.some(ignored => path.includes(`${ignored}/`) || path.startsWith(`${ignored}/`));
            if (isIgnored) return false;

            const ext = '.' + path.split('.').pop()?.toLowerCase();
            return !!SUPPORTED_EXTENSIONS[ext];
        });

        // Use a concurrency limit to avoid hitting rate limits or memory issues
        const CONCURRENCY_LIMIT = 5;
        for (let i = 0; i < filesToProcess.length; i += CONCURRENCY_LIMIT) {
            const batch = filesToProcess.slice(i, i + CONCURRENCY_LIMIT);
            await Promise.all(batch.map(async (item) => {
                const itemPath = item.path;
                if (!itemPath) return;

                try {
                    const content = await fetchFileContent(owner, repo, itemPath);
                    const ext = '.' + itemPath.split('.').pop()?.toLowerCase();

                    if (content.length > 0 && content.length < 500000) { // Skip files over 500kb
                        repoFiles.push({
                            path: itemPath,
                            content: content,
                            language: SUPPORTED_EXTENSIONS[ext] || 'text',
                        });
                    }
                } catch (e) {
                    console.error(`Failed to fetch ${itemPath}:`, e);
                }
            }));
        }

        return repoFiles;
    } catch (error) {
        console.error('Error fetching repo contents:', error);
        throw error;
    }
}

async function fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
    const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
    });

    if ('content' in data && typeof data.content === 'string') {
        return Buffer.from(data.content, 'base64').toString('utf8');
    }

    if ('download_url' in data && data.download_url) {
        const response = await fetch(data.download_url);
        return await response.text();
    }

    return '';
}

export function parseGitHubUrl(url: string) {
    try {
        const cleanUrl = url.trim().replace(/\/$/, "");
        const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (match) {
            const owner = match[1];
            const repo = match[2].replace(".git", "");
            return { owner, repo };
        }
    } catch (e) {
        return null;
    }
    return null;
}
