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

    const fetchIssues = async () => {
        setIsLoading(true);
        setError(null);
        setEmpty(false);
        try {
            const query = repoUrl ? `repoUrl=${encodeURIComponent(repoUrl)}` : `repoId=${repoId || ''}`;
            const res = await fetch(`/api/issues?${query}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setIssues(data);
            } else if (data.empty) {
                setIssues([]);
                setEmpty(true);
            } else if (data.error) {
                setError(data.error);
                setIssues([]);
            }
        } catch {
            setError('Failed to fetch GitHub issues');
            setIssues([]);
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
                            {st} ({issues.filter(i => st === 'all' ? true : i.state === st).length})
                        </button>
                    ))}
                </div>
            </div>

            {/* Issues List */}
            {isLoading ? (
                <div className="p-8 text-center text-xs font-mono text-zinc-500 space-y-2">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto text-purple-400" />
                    <p>Fetching issues from GitHub...</p>
                </div>
            ) : error ? (
                <div className="p-8 rounded-2xl bg-[#141417] border border-amber-500/20 text-center space-y-3">
                    <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
                    <p className="text-xs text-zinc-400">{error}</p>
                    <button
                        onClick={fetchIssues}
                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white font-medium transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            ) : empty ? (
                <div className="p-8 rounded-2xl bg-[#141417] border border-white/5 text-center space-y-2">
                    <Inbox className="w-6 h-6 text-zinc-500 mx-auto" />
                    <p className="text-xs text-zinc-500">No issues found for {repoName}.</p>
                </div>
            ) : filteredIssues.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#141417] border border-white/5 text-center text-xs text-zinc-500 font-mono">
                    No {filterState} issues found for {repoName}.
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredIssues.map((issue) => (
                        <div
                            key={issue.id}
                            className="p-4 rounded-2xl bg-[#141417] hover:bg-[#1a1a1f] border border-white/5 transition-all space-y-2 group"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    {issue.state === 'open' ? (
                                        <CircleDot className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                                    )}
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                                                {issue.title}
                                            </span>
                                            <span className="text-[11px] font-mono text-zinc-500">#{issue.number}</span>
                                        </div>
                                        {issue.body && (
                                            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                                {issue.body}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                                            {issue.labels.map((lbl, idx) => (
                                                <span
                                                    key={idx}
                                                    className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-zinc-300"
                                                >
                                                    {lbl.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 text-xs text-zinc-500 font-mono">
                                    {issue.comments > 0 && (
                                        <span className="flex items-center gap-1">
                                            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                                            <span>{issue.comments}</span>
                                        </span>
                                    )}
                                    <a
                                        href={issue.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 hover:text-white transition-colors"
                                        title="View on GitHub"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
