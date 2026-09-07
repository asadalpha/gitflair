'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GitPullRequest,
    ArrowRight,
    Loader2,
    Award,
    ClipboardCheck,
    AlertTriangle,
    XCircle,
    Info,
    History,
    Info as InfoIcon,
    BarChart2,
    Shield,
    Clock,
    TrendingUp,
    Database,
    Zap,
    Code,
    CheckCircle2
} from 'lucide-react';
import { showToast } from '@/components/ui/toast';

interface PRComment {
    line: number;
    type: 'info' | 'warning' | 'error';
    text: string;
}

interface FileReview {
    file_path: string;
    comments: PRComment[];
}

interface PRReview {
    id: string;
    prNumber: number;
    title: string;
    status: 'pending' | 'completed' | 'failed';
    summary: string | null;
    score: number | null;
    fileReviews: FileReview[] | null;
    createdAt: string;
}

interface PRReviewPanelProps {
    repoId: string;
    userId: string;
    onFileClick: (path: string) => void;
}

export default function PRReviewPanel({ repoId, userId, onFileClick }: PRReviewPanelProps) {
    const [activeTab, setActiveTab] = useState<'summary' | 'quality' | 'time' | 'trends' | 'explorer'>('summary');
    const [prNumber, setPrNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentReview, setCurrentReview] = useState<Partial<PRReview> | null>(null);
    const [pastReviews, setPastReviews] = useState<PRReview[]>([]);

    const fetchPastReviews = async () => {
        try {
            const res = await fetch(`/api/pr-review?repositoryId=${repoId}&userId=${userId}`);
            const data = await res.json();
            if (Array.isArray(data)) setPastReviews(data);
        } catch {
            console.error('Failed to load past reviews');
        }
    };

    useEffect(() => {
        fetchPastReviews();
    }, [repoId, userId]);

    const handleRunReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prNumber.trim() || isLoading) return;

        const prInt = parseInt(prNumber, 10);
        if (isNaN(prInt)) {
            showToast('PR number must be an integer', 'error');
            return;
        }

        setIsLoading(true);
        setCurrentReview({ prNumber: prInt, status: 'pending' });
        try {
            const res = await fetch('/api/pr-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repositoryId: repoId, prNumber: prInt, userId }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setCurrentReview(data);
            showToast(`Review for PR #${prInt} completed!`, 'success');
            fetchPastReviews();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Review failed';
            showToast(msg, 'error');
            setCurrentReview(null);
        } finally {
            setIsLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
        if (score >= 60) return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
        return 'text-rose-400 border-rose-500/20 bg-rose-500/10';
    };

    const getCommentIcon = (type: string) => {
        switch (type) {
            case 'error': return <XCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />;
            case 'warning': return <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />;
            default: return <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />;
        }
    };

    const categories = [
        { name: 'Code defect', accepted: 30, posted: 70 },
        { name: 'Stability and availability', accepted: 75, posted: 95 },
        { name: 'Security', accepted: 45, posted: 80 },
        { name: 'Performance', accepted: 85, posted: 100 },
        { name: 'Maintainability', accepted: 35, posted: 55 },
        { name: 'Code quality', accepted: 70, posted: 90 },
        { name: 'Functional correctness', accepted: 90, posted: 98 },
        { name: 'Data integrity and integration', accepted: 65, posted: 72 },
    ];

    return (
        <div className="space-y-6 font-sans text-xs text-zinc-300 max-w-7xl mx-auto">
            {/* Top Navigation / Metric Sub-Tabs */}
            <div className="flex items-center gap-6 border-b border-white/[0.08] pb-3 text-xs font-mono select-none overflow-x-auto">
                <button
                    onClick={() => setActiveTab('summary')}
                    className={`flex items-center gap-2 pb-1.5 transition-all relative ${
                        activeTab === 'summary' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>High level summary</span>
                    {activeTab === 'summary' && (
                        <motion.div layoutId="subtab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('quality')}
                    className={`flex items-center gap-2 pb-1.5 transition-all relative ${
                        activeTab === 'quality' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Quality metrics</span>
                    {activeTab === 'quality' && (
                        <motion.div layoutId="subtab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('time')}
                    className={`flex items-center gap-2 pb-1.5 transition-all relative ${
                        activeTab === 'time' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Time metrics</span>
                    {activeTab === 'time' && (
                        <motion.div layoutId="subtab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('trends')}
                    className={`flex items-center gap-2 pb-1.5 transition-all relative ${
                        activeTab === 'trends' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Trends</span>
                    {activeTab === 'trends' && (
                        <motion.div layoutId="subtab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('explorer')}
                    className={`flex items-center gap-2 pb-1.5 transition-all relative ${
                        activeTab === 'explorer' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    <Database className="w-3.5 h-3.5" />
                    <span>Data explorer</span>
                    {activeTab === 'explorer' && (
                        <motion.div layoutId="subtab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                    )}
                </button>
            </div>

            {/* Top KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard title="MERGED PULL REQUESTS" value="145" unit="PULL REQUESTS" />
                <MetricCard title="ACTIVE USERS" value="86" unit="USERS" />
                <MetricCard title="MEDIAN TIME TO LAST COMMIT" value="1.7" unit="HOURS" />
                <MetricCard title="REVIEW TIME SAVED" value="1.2" unit="DAYS" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCardDouble title="GITFLAIR REVIEW COMMENTS" val1="645" label1="POSTED" val2="45.1%" label2="ACCEPTED (%)" />
                <MetricCardDouble title="AVG REVIEW COMMENTS POSTED PER PR" val1="4.5" label1="BY GITFLAIR" val2="6.9" label2="BY HUMAN" />
                <div className="lg:col-span-2 rounded-xl bg-[#0f0f13] border border-white/[0.08] p-4 flex items-center justify-between font-mono">
                    <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">RUN NEW AI PR REVIEW</span>
                        <p className="text-xs text-white font-semibold">Automated Diff & AST Analysis</p>
                    </div>
                    <form onSubmit={handleRunReview} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={prNumber}
                            onChange={(e) => setPrNumber(e.target.value)}
                            placeholder="PR #"
                            className="w-20 bg-[#16161b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-purple-500/50"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !prNumber.trim()}
                            className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow"
                        >
                            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Review</span>}
                        </button>
                    </form>
                </div>
            </div>

            {/* Visual Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 1. Radar Chart: Review Comments by Severity */}
                <div className="rounded-xl bg-[#0f0f13] border border-white/[0.08] p-5 space-y-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                            REVIEW COMMENTS BY SEVERITY
                        </span>
                        <InfoIcon className="w-3.5 h-3.5 text-zinc-600" />
                    </div>

                    {/* SVG Triangle Radar Chart */}
                    <div className="flex items-center justify-center py-2 relative">
                        <svg className="w-56 h-48" viewBox="0 0 200 180">
                            {/* Outer Triangle Grid */}
                            <polygon points="100,20 20,150 180,150" fill="none" stroke="#26262f" strokeWidth="1" strokeDasharray="3 3" />
                            <polygon points="100,50 45,135 155,135" fill="none" stroke="#1f1f27" strokeWidth="1" />
                            <polygon points="100,80 70,120 130,120" fill="none" stroke="#1c1c23" strokeWidth="1" />

                            {/* Polygon 1: Posted (Indigo/Purple) */}
                            <polygon points="100,45 40,140 150,130" fill="#6366f1" fillOpacity="0.25" stroke="#6366f1" strokeWidth="1.5" />

                            {/* Polygon 2: Accepted (Emerald Green) */}
                            <polygon points="100,65 60,135 140,125" fill="#10b981" fillOpacity="0.35" stroke="#10b981" strokeWidth="1.5" />

                            {/* Labels */}
                            <text x="100" y="12" fill="#a1a1aa" fontSize="10" fontFamily="monospace" textAnchor="middle">Critical</text>
                            <text x="15" y="165" fill="#a1a1aa" fontSize="10" fontFamily="monospace" textAnchor="middle">Major</text>
                            <text x="185" y="165" fill="#a1a1aa" fontSize="10" fontFamily="monospace" textAnchor="middle">Minor</text>
                        </svg>
                    </div>

                    <div className="flex items-center justify-center gap-6 font-mono text-[11px]">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                            <span className="text-zinc-300">Accepted</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                            <span className="text-zinc-300">Posted</span>
                        </div>
                    </div>
                </div>

                {/* 2. Donut Ring Chart: Suggestions by Severity */}
                <div className="rounded-xl bg-[#0f0f13] border border-white/[0.08] p-5 space-y-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                            SUGGESTIONS BY SEVERITY (BAR)
                        </span>
                        <InfoIcon className="w-3.5 h-3.5 text-zinc-600" />
                    </div>

                    {/* SVG Donut Ring Chart */}
                    <div className="flex items-center justify-center py-2">
                        <svg className="w-48 h-48" viewBox="0 0 100 100">
                            {/* Outer Ring Segments */}
                            <circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" strokeWidth="14" strokeDasharray="60 180" strokeDashoffset="0" />
                            <circle cx="50" cy="50" r="38" fill="none" stroke="#312e81" strokeWidth="14" strokeDasharray="70 180" strokeDashoffset="-60" />
                            <circle cx="50" cy="50" r="38" fill="none" stroke="#0284c7" strokeWidth="14" strokeDasharray="110 180" strokeDashoffset="-130" />
                        </svg>
                    </div>

                    <div className="flex items-center justify-center gap-4 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                            <span className="text-zinc-300">Critical</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-900" />
                            <span className="text-zinc-300">Major</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-sky-600" />
                            <span className="text-zinc-300">Minor</span>
                        </div>
                    </div>
                </div>

                {/* 3. Category Distribution Spider Radar Chart */}
                <div className="rounded-xl bg-[#0f0f13] border border-white/[0.08] p-5 space-y-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                            CATEGORY DISTRIBUTION
                        </span>
                        <InfoIcon className="w-3.5 h-3.5 text-zinc-600" />
                    </div>

                    {/* SVG 8-axis Octagon Radar Chart */}
                    <div className="flex items-center justify-center py-1 relative">
                        <svg className="w-64 h-52" viewBox="0 0 220 180">
                            {/* Octagon Grid */}
                            <polygon points="110,20 160,40 180,90 160,140 110,160 60,140 40,90 60,40" fill="none" stroke="#26262f" strokeWidth="1" strokeDasharray="2 2" />
                            <polygon points="110,40 145,55 160,90 145,125 110,140 75,125 60,90 75,55" fill="none" stroke="#1c1c23" strokeWidth="1" />

                            {/* Outer Layer: Posted */}
                            <polygon points="110,35 150,50 165,90 140,120 110,135 70,120 55,90 70,50" fill="#6366f1" fillOpacity="0.25" stroke="#6366f1" strokeWidth="1.5" />

                            {/* Inner Layer: Accepted */}
                            <polygon points="110,50 135,60 150,90 130,110 110,125 80,110 70,90 80,60" fill="#10b981" fillOpacity="0.35" stroke="#10b981" strokeWidth="1.5" />

                            {/* Labels around Octagon */}
                            <text x="110" y="12" fill="#888893" fontSize="8" fontFamily="monospace" textAnchor="middle">Code defect</text>
                            <text x="182" y="36" fill="#888893" fontSize="8" fontFamily="monospace" textAnchor="start">Stability</text>
                            <text x="190" y="94" fill="#888893" fontSize="8" fontFamily="monospace" textAnchor="start">Security</text>
                            <text x="180" y="152" fill="#888893" fontSize="8" fontFamily="monospace" textAnchor="start">Performance</text>
                            <text x="110" y="174" fill="#888893" fontSize="8" fontFamily="monospace" textAnchor="middle">Maintainability</text>
                            <text x="35" y="152" fill="#888893" fontSize="8" fontFamily="monospace" textAnchor="end">Code quality</text>
                            <text x="25" y="94" fill="#888893" fontSize="8" fontFamily="monospace" textAnchor="end">Correctness</text>
                            <text x="35" y="36" fill="#888893" fontSize="8" fontFamily="monospace" textAnchor="end">Integrity</text>
                        </svg>
                    </div>

                    <div className="flex items-center justify-center gap-6 font-mono text-[11px]">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                            <span className="text-zinc-300">Accepted</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                            <span className="text-zinc-300">Posted</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Suggestions Breakdown Horizontal Stacked Bars */}
            <div className="rounded-xl bg-[#0f0f13] border border-white/[0.08] p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                        SUGGESTIONS BREAKDOWN
                    </span>
                    <InfoIcon className="w-3.5 h-3.5 text-zinc-600" />
                </div>

                <div className="space-y-3 font-mono text-xs">
                    {categories.map((cat) => (
                        <div key={cat.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-zinc-400 text-[11px] w-56 shrink-0 truncate">{cat.name}</span>
                            <div className="flex-1 h-5 rounded-md bg-[#16161b] overflow-hidden flex p-0.5 border border-white/5">
                                <div
                                    className="h-full bg-emerald-500 rounded-sm transition-all"
                                    style={{ width: `${cat.accepted}%` }}
                                    title={`Accepted: ${cat.accepted}%`}
                                />
                                <div
                                    className="h-full bg-indigo-500/80 rounded-sm transition-all ml-1"
                                    style={{ width: `${cat.posted - cat.accepted}%` }}
                                    title={`Posted: ${cat.posted}%`}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-6 font-mono text-[11px] pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                        <span className="text-zinc-300">Accepted</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                        <span className="text-zinc-300">Posted</span>
                    </div>
                </div>
            </div>

            {/* Active Review Details & Past History Section */}
            {currentReview && (
                <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <GitPullRequest className="w-4 h-4 text-purple-400" />
                            <span>Active PR Review Result (#{currentReview.prNumber})</span>
                        </h3>
                        <button
                            onClick={() => setCurrentReview(null)}
                            className="text-xs font-mono text-zinc-500 hover:text-white"
                        >
                            Close Details
                        </button>
                    </div>

                    {currentReview.status === 'pending' ? (
                        <div className="p-8 rounded-xl bg-[#0f0f13] border border-white/[0.08] text-center space-y-3">
                            <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto" />
                            <p className="text-xs text-zinc-400 font-mono">Analyzing PR #{currentReview.prNumber} AST diff...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-5 rounded-xl bg-[#0f0f13] border border-white/[0.08] flex items-center gap-4">
                                {currentReview.score !== undefined && currentReview.score !== null && (
                                    <div className={`w-16 h-16 rounded-2xl border flex flex-col items-center justify-center shrink-0 ${getScoreColor(currentReview.score)}`}>
                                        <span className="text-[9px] uppercase font-mono">Score</span>
                                        <span className="text-xl font-bold font-mono">{currentReview.score}</span>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-white">PR #{currentReview.prNumber}: {currentReview.title}</h4>
                                    <p className="text-xs text-zinc-400 leading-relaxed">{currentReview.summary}</p>
                                </div>
                            </div>

                            {/* File Level Comments */}
                            {currentReview.fileReviews?.map((fr, idx) => (
                                <div key={idx} className="rounded-xl bg-[#0f0f13] border border-white/[0.08] overflow-hidden">
                                    <div className="p-3 bg-[#141418] border-b border-white/[0.06] flex items-center justify-between">
                                        <button
                                            onClick={() => onFileClick(fr.file_path)}
                                            className="font-mono text-xs text-purple-300 hover:underline font-semibold"
                                        >
                                            {fr.file_path}
                                        </button>
                                        <span className="text-[10px] font-mono text-zinc-500">{fr.comments.length} issues</span>
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        {fr.comments.map((c, ci) => (
                                            <div key={ci} className="p-3.5 flex gap-3 text-xs">
                                                {getCommentIcon(c.type)}
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">Line {c.line}</span>
                                                    <p className="text-zinc-300 leading-relaxed">{c.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function MetricCard({ title, value, unit }: { title: string; value: string; unit?: string }) {
    return (
        <div className="rounded-xl bg-[#0f0f13] border border-white/[0.08] p-4 space-y-2 flex flex-col justify-between font-mono">
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{title}</span>
                <InfoIcon className="w-3.5 h-3.5 text-zinc-600" />
            </div>
            <div className="space-y-0.5">
                <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
                {unit && <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{unit}</span>}
            </div>
        </div>
    );
}

function MetricCardDouble({ title, val1, label1, val2, label2 }: { title: string; val1: string; label1: string; val2: string; label2: string }) {
    return (
        <div className="rounded-xl bg-[#0f0f13] border border-white/[0.08] p-4 space-y-2 flex flex-col justify-between font-mono">
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{title}</span>
                <InfoIcon className="w-3.5 h-3.5 text-zinc-600" />
            </div>
            <div className="flex items-baseline gap-4 pt-1">
                <div>
                    <span className="text-xl font-bold text-white tracking-tight">{val1}</span>
                    <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider block">{label1}</span>
                </div>
                <div className="border-l border-white/10 pl-4">
                    <span className="text-xl font-bold text-white tracking-tight">{val2}</span>
                    <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider block">{label2}</span>
                </div>
            </div>
        </div>
    );
}
