'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitPullRequest, ArrowRight, Loader2, Award, ClipboardCheck, AlertTriangle, XCircle, Info, History } from 'lucide-react';
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
            fetchPastReviews(); // refresh history list
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Review failed';
            showToast(msg, 'error');
            setCurrentReview(null);
        } finally {
            setIsLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5';
        if (score >= 60) return 'text-amber-500 border-amber-500/20 bg-amber-500/5';
        return 'text-red-500 border-red-500/20 bg-red-500/5';
    };

    const getCommentIcon = (type: string) => {
        switch (type) {
            case 'error': return <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />;
            case 'warning': return <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />;
            default: return <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Input Form & Past Reviews Panel (Left column on large screens) */}
            <div className="lg:col-span-1 space-y-6">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 text-zinc-400 mb-4">
                        <GitPullRequest size={16} />
                        <h3 className="text-xs font-semibold uppercase tracking-widest">New Review</h3>
                    </div>

                    <form onSubmit={handleRunReview} className="space-y-3">
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase tracking-wide block mb-1">
                                Pull Request Number
                            </label>
                            <input
                                type="text"
                                value={prNumber}
                                onChange={(e) => setPrNumber(e.target.value)}
                                placeholder="e.g. 42"
                                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/40 transition-all placeholder:text-zinc-700"
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !prNumber.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={14} />
                                    <span>Reviewing...</span>
                                </>
                            ) : (
                                <>
                                    <span>Run Review</span>
                                    <ArrowRight size={14} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {pastReviews.length > 0 && (
                    <div className="glass-card p-5">
                        <div className="flex items-center gap-2 text-zinc-400 mb-3">
                            <History size={16} />
                            <h3 className="text-xs font-semibold uppercase tracking-widest">Past Reviews</h3>
                        </div>
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                            {pastReviews.map((rev) => (
                                <button
                                    key={rev.id}
                                    onClick={() => setCurrentReview(rev)}
                                    className="w-full p-2.5 text-left rounded-lg bg-zinc-950/30 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 transition-all flex justify-between items-center text-xs group"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-zinc-300 group-hover:text-white truncate">
                                            #{rev.prNumber} {rev.title}
                                        </p>
                                        <p className="text-[10px] text-zinc-600 mt-1">
                                            {new Date(rev.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    {rev.score && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ml-2 shrink-0 ${
                                            rev.score >= 80 ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' :
                                            rev.score >= 60 ? 'text-amber-500 border-amber-500/20 bg-amber-500/10' :
                                            'text-red-500 border-red-500/20 bg-red-500/10'
                                        }`}>
                                            {rev.score}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Display Area (Right 3 columns) */}
            <div className="lg:col-span-3">
                <AnimatePresence mode="wait">
                    {!currentReview ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="glass-card p-12 text-center text-zinc-500 h-full flex flex-col items-center justify-center min-h-[300px]"
                        >
                            <ClipboardCheck size={36} strokeWidth={1} className="text-zinc-700 mb-2" />
                            <p className="text-sm font-light text-zinc-400">No active review selected.</p>
                            <p className="text-xs text-zinc-600 mt-1">Enter a PR number or pick a past review from history.</p>
                        </motion.div>
                    ) : currentReview.status === 'pending' ? (
                        <motion.div
                            key="pending"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="glass-card p-12 text-center text-zinc-500 h-full flex flex-col items-center justify-center min-h-[300px]"
                        >
                            <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
                            <h4 className="text-sm font-medium text-zinc-300">Analyzing PR #{currentReview.prNumber}</h4>
                            <p className="text-xs text-zinc-500 mt-1.5 max-w-sm leading-relaxed">
                                Downloading the pull request diff, compiling code references, and prompting Gemini for logical, security, and stylistic review feedback.
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="completed"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                        >
                            {/* Score & Summary Card */}
                            <div className="glass-card p-6 flex flex-col md:flex-row items-center gap-6">
                                {currentReview.score !== undefined && currentReview.score !== null && (
                                    <div className={`w-20 h-20 rounded-full border flex flex-col items-center justify-center shrink-0 shadow-lg ${
                                        getScoreColor(currentReview.score)
                                    }`}>
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-sans">Score</span>
                                        <span className="text-2xl font-bold font-mono tracking-tight">{currentReview.score}</span>
                                    </div>
                                )}
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-base font-semibold text-white mb-2">
                                        PR #{currentReview.prNumber}: {currentReview.title}
                                    </h3>
                                    <p className="text-zinc-300 text-sm font-light leading-relaxed">
                                        {currentReview.summary}
                                    </p>
                                </div>
                            </div>

                            {/* File Reviews Listings */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                                    File Reviews
                                </h3>

                                {(!currentReview.fileReviews || currentReview.fileReviews.length === 0) ? (
                                    <div className="glass-card p-6 text-center text-zinc-500">
                                        <Award size={20} className="text-emerald-500/80 inline mb-1" />
                                        <p className="text-xs text-zinc-300 mt-1">LGTMB! No review issues identified in this pull request.</p>
                                    </div>
                                ) : (
                                    currentReview.fileReviews.map((fr, fri) => (
                                        <div key={fri} className="glass-card overflow-hidden">
                                            {/* File Header */}
                                            <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between">
                                                <button
                                                    onClick={() => onFileClick(fr.file_path)}
                                                    className="text-xs font-mono font-medium text-zinc-300 hover:text-blue-400 transition-colors truncate max-w-[80%]"
                                                >
                                                    {fr.file_path}
                                                </button>
                                                <span className="text-[10px] text-zinc-500 font-mono">
                                                    {fr.comments.length} comments
                                                </span>
                                            </div>

                                            {/* File Comments */}
                                            <div className="divide-y divide-zinc-900/60 bg-zinc-950/20">
                                                {fr.comments.map((comment, ci) => (
                                                    <div key={ci} className="px-4 py-3 flex gap-3 text-xs leading-relaxed">
                                                        {getCommentIcon(comment.type)}
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded font-mono">
                                                                    Line {comment.line}
                                                                </span>
                                                                <span className={`text-[9px] uppercase font-bold tracking-wider ${
                                                                    comment.type === 'error' ? 'text-red-400' :
                                                                    comment.type === 'warning' ? 'text-amber-400' :
                                                                    'text-blue-400'
                                                                }`}>
                                                                    {comment.type}
                                                                </span>
                                                            </div>
                                                            <p className="text-zinc-300 font-light mt-1 text-[13px]">
                                                                {comment.text}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
