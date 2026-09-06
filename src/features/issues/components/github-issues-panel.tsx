'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CircleDot, CheckCircle2, MessageSquare, ExternalLink, RefreshCw, AlertCircle, Inbox } from 'lucide-react';
import { showToast } from '@/components/ui/toast';

interface GithubIssue {
    id: number;
    number: number;
    title: string;
    state: 'open' | 'closed';
    author: string;
    authorAvatar?: string;
    labels: { name: string; color?: string }[];
    comments: number;
    createdAt: string;
    url: string;
    body?: string;
}

interface GithubIssuesPanelProps {
    repoName?: string;
    repoUrl?: string;
    repoId?: string;
}

export default function GithubIssuesPanel({ repoName = 'Repository', repoUrl, repoId }: GithubIssuesPanelProps) {
    const [issues, setIssues] = useState<GithubIssue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [empty, setEmpty] = useState(false);
    const [filterState, setFilterState] = useState<'open' | 'closed' | 'all'>('open');

    const CACHE_KEY = `gitflair_issues_${repoId || repoName}`;

    const fetchIssues = async () => {
        // Read local cache first for instant render
        let hasCache = false;
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setIssues(parsed);
                    hasCache = true;
                    setIsLoading(false);
                }
            }
        } catch {
            // Ignore storage parse error
        }

        if (!hasCache) {
            setIsLoading(true);
        }

        setError(null);
        setEmpty(false);
        try {
            const query = repoUrl ? `repoUrl=${encodeURIComponent(repoUrl)}` : `repoId=${repoId || ''}`;
            const res = await fetch(`/api/issues?${query}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setIssues(data);
                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
                } catch {}
            } else if (data.empty) {
                if (!hasCache) setIssues([]);
                setEmpty(true);
            } else if (data.error) {
                if (!hasCache) {
                    setError(data.error);
                    setIssues([]);
                }
            }
        } catch {
            if (!hasCache) {
                setError('Failed to fetch GitHub issues');
                setIssues([]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
    }, [repoUrl, repoId]);

    const filteredIssues = issues.filter((issue) => {
        if (filterState === 'open') return issue.state === 'open';
        if (filterState === 'closed') return issue.state === 'closed';
        return true;
    });

    return (
        <div className="space-y-6 font-sans">
            {/* Header & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                    <CircleDot className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-bold text-white tracking-tight">GitHub Issues</h2>
                    <span className="text-[10px] font-mono text-zinc-500 px-2 py-0.5 rounded bg-white/5 font-semibold">
                        GET API • {repoName}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchIssues}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                        title="Refresh GitHub Issues"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    {(['open', 'closed', 'all'] as const).map((st) => (
                        <button
                            key={st}
                            onClick={() => setFilterState(st)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                                filterState === st
                                    ? 'bg-[#232328] text-white border border-white/10 shadow-sm font-semibold'
                                    : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1e]'
                            }`}
                        >
                            {st}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content List */}
            {isLoading && issues.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
                </div>
            ) : error && issues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                    <p className="text-xs text-zinc-400">{error}</p>
                    <button
                        onClick={fetchIssues}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                    >
                        Retry Fetch
                    </button>
                </div>
            ) : empty || filteredIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                    <Inbox className="w-10 h-10 text-zinc-600" />
                    <p className="text-xs text-zinc-400 font-medium">No issues found matching filter ({filterState})</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredIssues.map((issue) => (
                        <motion.div
                            key={issue.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-[#121215] border border-white/5 hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                            <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {issue.state === 'open' ? (
                                        <CircleDot className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                    )}
                                    <span className="text-[11px] font-mono text-zinc-500 font-semibold">#{issue.number}</span>
                                    <h3 className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
                                        {issue.title}
                                    </h3>
                                </div>

                                <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono">
                                    <span>by {issue.author}</span>
                                    <span>•</span>
                                    <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                                    {issue.comments > 0 && (
                                        <span className="flex items-center gap-1 text-zinc-400">
                                            <MessageSquare className="w-3 h-3 text-zinc-500" />
                                            {issue.comments}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <a
                                href={issue.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-medium shrink-0 self-start sm:self-center"
                            >
                                <span>View</span>
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
