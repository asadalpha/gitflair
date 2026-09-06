'use client';

import { useState } from 'react';
import {
    TrendingUp,
    GitCommit,
    GitPullRequest,
    Clock,
    Activity,
    ArrowUpRight,
    Loader2,
    AlertCircle,
    Github,
    Inbox,
} from 'lucide-react';
import { showToast } from '@/components/ui/toast';

interface DevAnalyticsProps {
    repoName: string;
    repoUrl?: string;
}

interface AnalyticsData {
    username: string;
    avatar: string;
    stats: {
        commits: number;
        totalPRs: number;
        totalIssues: number;
        mergedPRs: number;
        avgMergeHours: number;
        reviewRate: number;
    };
    recentPRs: { number: number; title: string; state: string; createdAt: string; url: string }[];
    recentIssues: { number: number; title: string; state: string; createdAt: string; url: string; labels: string[] }[];
}

export default function DevAnalytics({ repoName, repoUrl }: DevAnalyticsProps) {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [needsGithubLink, setNeedsGithubLink] = useState(false);
    const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);
        setNeedsGithubLink(false);
        try {
            const res = await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl }),
            });
            const json = await res.json();
            if (json.error) {
                if (json.needsGithubLink) setNeedsGithubLink(true);
                setError(json.error);
                showToast(json.error, 'error');
            } else {
                setData(json);
                showToast('Analytics loaded', 'success');
            }
        } catch {
            setError('Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    };

    if (!data && !loading && !error) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-2 pb-6 mb-6 border-b border-white/[0.06]">
                    <Activity className="w-4 h-4 text-zinc-400" />
                    <h2 className="text-sm font-semibold text-white tracking-tight">Developer Analytics</h2>
                </div>
                <div className="flex flex-col items-center justify-center py-16 space-y-5">
                    <div className="p-5 rounded-2xl bg-[#1a1a1e] border border-white/[0.08]">
                        <Github className="w-8 h-8 text-zinc-400" />
                    </div>
                    <div className="text-center space-y-1.5">
                        <h3 className="text-sm font-medium text-white">Analyze Your GitHub Activity</h3>
                        <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                            Pulls real commit counts, pull requests, and issues for {repoName || 'your account'}.
                        </p>
                    </div>
                    <button
                        onClick={fetchAnalytics}
                        className="px-4 py-2 rounded-lg bg-[#5e6ad2] hover:bg-[#4b57c6] text-white text-xs font-medium flex items-center gap-2 transition-colors"
                    >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Analyze Activity</span>
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <Loader2 className="animate-spin text-[#5e6ad2]" size={28} />
                <span className="text-xs text-zinc-500 font-mono">Fetching real GitHub activity...</span>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="max-w-md mx-auto py-16">
                <div className="flex flex-col items-center text-center space-y-4">
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                    <p className="text-sm text-zinc-400">{error}</p>
                    {needsGithubLink ? (
                        <a
                            href="/api/auth/signin/github"
                            className="px-4 py-2 rounded-lg bg-[#1a1a1e] hover:bg-[#25252c] text-white text-xs font-medium flex items-center gap-2 border border-white/10 transition-colors"
                        >
                            <Github className="w-3.5 h-3.5" />
                            <span>Link GitHub Account</span>
                        </a>
                    ) : (
                        <button
                            onClick={fetchAnalytics}
                            className="px-4 py-2 rounded-lg bg-[#5e6ad2] hover:bg-[#4b57c6] text-white text-xs font-medium transition-colors"
                        >
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const s = data!.stats;

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <img src={data!.avatar} alt={data!.username} className="w-8 h-8 rounded-full" />
                    <div>
                        <h2 className="text-base font-semibold text-white tracking-tight">@{data!.username}</h2>
                        <p className="text-[11px] text-zinc-500">Real GitHub activity</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 bg-[#141417] rounded-lg p-0.5 border border-white/[0.06]">
                        {(['7d', '30d', '90d'] as const).map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-medium transition-all ${
                                    timeframe === tf
                                        ? 'bg-white/10 text-white'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchAnalytics}
                        className="text-[10px] text-zinc-500 hover:text-white font-mono px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        ↻
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPI label="Commits" value={s.commits.toLocaleString()} icon={<GitCommit className="w-3.5 h-3.5 text-zinc-400" />} trend={s.commits > 50 ? '+active' : ''} />
                <KPI label="Pull Requests" value={String(s.totalPRs)} subtext={`${s.mergedPRs} merged`} icon={<GitPullRequest className="w-3.5 h-3.5 text-zinc-400" />} />
                <KPI label="Issues" value={String(s.totalIssues)} icon={<Inbox className="w-3.5 h-3.5 text-zinc-400" />} />
                <KPI label="Avg Merge" value={s.avgMergeHours > 0 ? `${s.avgMergeHours}h` : '—'} subtext={s.reviewRate > 0 ? `${s.reviewRate.toFixed(0)}% merged` : ''} icon={<Clock className="w-3.5 h-3.5 text-zinc-400" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2">
                            <GitPullRequest className="w-3.5 h-3.5 text-zinc-400" />
                            <h3 className="text-xs font-semibold text-white">Pull Requests</h3>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">{s.totalPRs} total</span>
                    </div>
                    <div className="space-y-1">
                        {data!.recentPRs.length === 0 ? (
                            <p className="text-xs text-zinc-600 py-6 text-center">No pull requests found.</p>
                        ) : (
                            data!.recentPRs.map((pr) => (
                                <a
                                    key={pr.number}
                                    href={pr.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group"
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pr.state === 'merged' ? 'bg-purple-400' : pr.state === 'closed' ? 'bg-red-400' : 'bg-emerald-400'}`} />
                                    <span className="text-[11px] text-zinc-500 font-mono shrink-0">#{pr.number}</span>
                                    <span className="text-xs text-zinc-300 truncate flex-1 group-hover:text-white transition-colors">{pr.title}</span>
                                    <ArrowUpRight className="w-3 h-3 text-zinc-600 group-hover:text-white shrink-0" />
                                </a>
                            ))
                        )}
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2">
                            <Inbox className="w-3.5 h-3.5 text-zinc-400" />
                            <h3 className="text-xs font-semibold text-white">Issues</h3>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">{s.totalIssues} total</span>
                    </div>
                    <div className="space-y-1">
                        {data!.recentIssues.length === 0 ? (
                            <p className="text-xs text-zinc-600 py-6 text-center">No issues found.</p>
                        ) : (
                            data!.recentIssues.map((iss) => (
                                <a
                                    key={iss.number}
                                    href={iss.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group"
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${iss.state === 'closed' ? 'bg-red-400' : 'bg-emerald-400'}`} />
                                    <span className="text-[11px] text-zinc-500 font-mono shrink-0">#{iss.number}</span>
                                    <span className="text-xs text-zinc-300 truncate flex-1 group-hover:text-white transition-colors">{iss.title}</span>
                                    <ArrowUpRight className="w-3 h-3 text-zinc-600 group-hover:text-white shrink-0" />
                                </a>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPI({ label, value, subtext, icon, trend }: { label: string; value: string; subtext?: string; icon: React.ReactNode; trend?: string }) {
    return (
        <div className="p-4 rounded-xl bg-[#121215] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 font-medium">{label}</span>
                {icon}
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-white tracking-tight">{value}</span>
                {subtext && <span className="text-[10px] text-zinc-500 font-mono">{subtext}</span>}
            </div>
            {trend && (
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                    <TrendingUp className="w-2.5 h-2.5" />
                    <span>{trend}</span>
                </div>
            )}
        </div>
    );
}