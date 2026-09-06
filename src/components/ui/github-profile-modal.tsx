'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Github, Star, Users, Flame, Code, Award, Activity, ShieldCheck, Loader2 } from 'lucide-react';
import { useSession, signIn, signOut } from '@/lib/auth-client';

interface GithubProfileData {
    linked?: boolean;
    error?: string;
    needsUsername?: boolean;
    profile: {
        login: string;
        name: string | null;
        avatar: string;
        bio: string | null;
        company: string | null;
        location: string | null;
        blog: string | null;
        followers: number;
        following: number;
        publicRepos: number;
        totalStars: number;
        createdAt: string;
    };
    stats: {
        repos: number;
        totalStars: number;
        followers: number;
        recentCommits: number;
        recentPRs: number;
    };
    languages: { name: string; count: number }[];
}

const LANGUAGE_COLORS: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572a5',
    Rust: '#dea584',
    Go: '#00add8',
    Java: '#b07219',
    'C++': '#f34b7d',
    C: '#555555',
    Ruby: '#701516',
    PHP: '#4f5d95',
    Swift: '#ffac45',
    Kotlin: '#F18E33',
    Shell: '#89e051',
    HTML: '#e34c26',
    CSS: '#563d7c',
};

export default function GithubProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<'profile' | 'analytics'>('profile');
    const [ghData, setGhData] = useState<GithubProfileData | null>(null);
    const [loading, setLoading] = useState(false);
    const [needsUsername, setNeedsUsername] = useState(false);
    const [usernameInput, setUsernameInput] = useState('');
    const { data: session } = useSession();
    const isLoggedIn = !!session?.user;

    useEffect(() => {
        if (!isOpen || !isLoggedIn) return;
        setLoading(true);
        setNeedsUsername(false);
        fetch('/api/auth/github-profile')
            .then(r => r.json())
            .then(d => {
                if (d.needsUsername) {
                    setNeedsUsername(true);
                    setGhData(null);
                } else {
                    setGhData(d);
                }
            })
            .catch(() => setGhData(null))
            .finally(() => setLoading(false));
    }, [isOpen, isLoggedIn]);

    const fetchWithUsername = () => {
        if (!usernameInput.trim()) return;
        setLoading(true);
        setNeedsUsername(false);
        fetch(`/api/auth/github-profile?username=${encodeURIComponent(usernameInput.trim())}`)
            .then(r => r.json())
            .then(d => setGhData(d))
            .catch(() => setGhData(null))
            .finally(() => setLoading(false));
    };

    if (!isOpen) return null;

    const ghLogin = ghData?.profile?.login || 'Not linked';
    const displayName = session?.user?.name || ghData?.profile?.name || 'Developer';

    const totalLangCount = ghData?.languages?.reduce((s, l) => s + l.count, 0) || 1;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 15 }}
                    className="bg-[#121215] border border-white/10 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col font-sans max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Top Header */}
                    <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#16161a]">
                        <div className="flex items-center gap-3">
                            {session?.user?.image ? (
                                <img src={session.user.image} alt={displayName} className="w-10 h-10 rounded-full border border-white/20" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white font-bold flex items-center justify-center text-sm shadow-md border border-white/20">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                                    <span>{displayName}</span>
                                    {isLoggedIn && (
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            SIGNED IN
                                        </span>
                                    )}
                                </h3>
                                <p className="text-xs font-mono text-zinc-400">@{ghLogin} • GitHub Analytics</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {ghData && (
                                <div className="flex items-center gap-1 bg-[#1e1e22] p-1 rounded-xl border border-white/5">
                                    <button
                                        onClick={() => setActiveTab('profile')}
                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${activeTab === 'profile' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        Profile
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('analytics')}
                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${activeTab === 'analytics' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        Analytics
                                    </button>
                                </div>
                            )}
                            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 overflow-y-auto space-y-6 flex-1">
                        {!isLoggedIn ? (
                            <div className="space-y-4">
                                <p className="text-sm text-zinc-400 text-center py-4">
                                    Sign in to see your real GitHub profile and analytics.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        onClick={() => signIn.social({ provider: "google" })}
                                        className="p-3 rounded-xl bg-[#1a1a1e] hover:bg-white hover:text-black border border-white/10 flex items-center justify-center gap-2.5 transition-all font-semibold text-xs text-white"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                        </svg>
                                        <span>Sign in with Google</span>
                                    </button>
                                    <button
                                        onClick={() => signIn.social({ provider: "github" })}
                                        className="p-3 rounded-xl bg-[#1a1a1e] hover:bg-white hover:text-black border border-white/10 flex items-center justify-center gap-2.5 transition-all font-semibold text-xs text-white"
                                    >
                                        <Github className="w-4 h-4" />
                                        <span>Sign in with GitHub</span>
                                    </button>
                                </div>
                            </div>
                        ) : loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin text-purple-400" size={28} />
                                <span className="ml-3 text-xs text-zinc-400 font-mono">Loading GitHub profile...</span>
                            </div>
                        ) : needsUsername ? (
                            <div className="space-y-5 py-4">
                                <div className="flex flex-col items-center text-center space-y-2">
                                    <Github className="w-10 h-10 text-zinc-400" />
                                    <h3 className="text-sm font-semibold text-white">Enter Your GitHub Username</h3>
                                    <p className="text-xs text-zinc-500 max-w-xs">
                                        No GitHub account is linked. Enter your public GitHub username to analyze your profile.
                                    </p>
                                </div>
                                <form
                                    onSubmit={(e) => { e.preventDefault(); fetchWithUsername(); }}
                                    className="space-y-3"
                                >
                                    <input
                                        type="text"
                                        value={usernameInput}
                                        onChange={(e) => setUsernameInput(e.target.value)}
                                        placeholder="e.g. torvalds"
                                        className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 font-mono"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        disabled={!usernameInput.trim()}
                                        className="w-full p-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold text-xs transition-all"
                                    >
                                        Analyze Profile
                                    </button>
                                </form>
                                <div className="flex items-center gap-2 justify-center">
                                    <span className="text-[10px] text-zinc-600">or</span>
                                    <button
                                        onClick={() => signIn.social({ provider: "github" })}
                                        className="text-xs text-zinc-400 hover:text-white font-medium flex items-center gap-1.5"
                                    >
                                        <Github className="w-3.5 h-3.5" />
                                        <span>Link GitHub account</span>
                                    </button>
                                </div>
                            </div>
                        ) : ghData?.error ? (
                            <div className="space-y-4">
                                <p className="text-sm text-zinc-400 text-center py-4">
                                    {ghData.error}
                                </p>
                                <button
                                    onClick={() => signIn.social({ provider: "github" })}
                                    className="w-full p-3 rounded-xl bg-[#1a1a1e] hover:bg-white hover:text-black border border-white/10 flex items-center justify-center gap-2.5 transition-all font-semibold text-xs text-white"
                                >
                                    <Github className="w-4 h-4" />
                                    <span>Link GitHub Account</span>
                                </button>
                            </div>
                        ) : !ghData ? (
                            <p className="text-sm text-zinc-500 text-center py-8">No GitHub data available.</p>
                        ) : activeTab === 'profile' ? (
                            <>
                                {/* Real Profile Stats */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <StatCard icon={<Github className="w-4 h-4 text-purple-400" />} title="Repos" value={String(ghData.stats.repos)} subtext="Public & Private" />
                                    <StatCard icon={<Star className="w-4 h-4 text-amber-400" />} title="Stars" value={ghData.stats.totalStars.toLocaleString()} subtext="Across repos" />
                                    <StatCard icon={<Users className="w-4 h-4 text-blue-400" />} title="Followers" value={String(ghData.stats.followers)} subtext="Global devs" />
                                    <StatCard icon={<Flame className="w-4 h-4 text-rose-400" />} title="Recent Commits" value={String(ghData.stats.recentCommits)} subtext="Last 30 events" />
                                </div>

                                {/* Real Languages Breakdown */}
                                {ghData.languages.length > 0 && (
                                    <div className="p-5 rounded-xl bg-[#161619] border border-white/5 space-y-3">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-white flex items-center gap-2">
                                                <Code className="w-4 h-4 text-emerald-400" />
                                                <span>Top Programming Languages</span>
                                            </span>
                                        </div>
                                        <div className="h-3 w-full rounded-full bg-[#1e1e22] overflow-hidden flex">
                                            {ghData.languages.map((lang) => (
                                                <div
                                                    key={lang.name}
                                                    className="h-full"
                                                    style={{
                                                        width: `${(lang.count / totalLangCount) * 100}%`,
                                                        backgroundColor: LANGUAGE_COLORS[lang.name] || '#8b5cf6',
                                                    }}
                                                    title={`${lang.name}: ${((lang.count / totalLangCount) * 100).toFixed(1)}%`}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400 pt-1">
                                            {ghData.languages.map((lang) => (
                                                <div key={lang.name} className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LANGUAGE_COLORS[lang.name] || '#8b5cf6' }} />
                                                    <span>{lang.name} ({((lang.count / totalLangCount) * 100).toFixed(0)}%)</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Bio */}
                                {ghData.profile.bio && (
                                    <div className="p-5 rounded-xl bg-[#161619] border border-white/5 space-y-2 font-sans">
                                        <span className="text-xs font-semibold text-white">Bio</span>
                                        <p className="text-xs text-zinc-400 leading-relaxed">{ghData.profile.bio}</p>
                                        {(ghData.profile.company || ghData.profile.location) && (
                                            <p className="text-[10px] text-zinc-500 font-mono">
                                                {[ghData.profile.company, ghData.profile.location].filter(Boolean).join(' • ')}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Sign out */}
                                <div className="pt-2">
                                    <button
                                        onClick={() => signOut()}
                                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors font-mono"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* Analytics Tab - Real stats */
                            <div className="space-y-4 font-mono text-xs">
                                <div className="p-5 rounded-xl bg-[#161619] border border-white/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-white font-sans flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-emerald-400" />
                                            <span>Developer Activity Metrics</span>
                                        </span>
                                    </div>
                                    <div className="space-y-3 pt-2">
                                        <MetricRow label="Recent Commits" value={String(ghData.stats.recentCommits)} status="Last 30 events" />
                                        <MetricRow label="Pull Requests" value={String(ghData.stats.recentPRs)} status="Recent activity" />
                                        <MetricRow label="Total Repositories" value={String(ghData.stats.repos)} subtext="Public & Private" />
                                        <MetricRow label="Total Stars Earned" value={ghData.stats.totalStars.toLocaleString()} subtext="Across all repos" />
                                        <MetricRow label="Followers" value={String(ghData.stats.followers)} subtext="GitHub community" />
                                    </div>
                                </div>
                                <div className="p-5 rounded-xl bg-[#161619] border border-white/5 space-y-3 font-sans">
                                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                        <span className="text-white font-semibold text-xs flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-purple-400" />
                                            <span>Account Authentication</span>
                                        </span>
                                        <span className="text-[10px] font-mono text-emerald-400">VERIFIED</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            onClick={() => signOut()}
                                            className="p-3 rounded-xl bg-[#1a1a1e] hover:bg-red-500/20 hover:text-red-400 border border-white/10 flex items-center justify-center gap-2.5 transition-all font-semibold text-xs text-white"
                                        >
                                            <span>Sign Out</span>
                                        </button>
                                        <button
                                            onClick={() => signIn.social({ provider: "github" })}
                                            className="p-3 rounded-xl bg-[#1a1a1e] hover:bg-white hover:text-black border border-white/10 flex items-center justify-center gap-2.5 transition-all font-semibold text-xs text-white"
                                        >
                                            <Github className="w-4 h-4" />
                                            <span>Link GitHub</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function StatCard({ icon, title, value, subtext }: { icon: React.ReactNode; title: string; value: string; subtext?: string }) {
    return (
        <div className="p-4 rounded-xl bg-[#161619] border border-white/5 space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium">{title}</span>
                {icon}
            </div>
            <p className="text-lg font-bold text-white tracking-tight">{value}</p>
            {subtext && <p className="text-[10px] text-zinc-500 font-mono">{subtext}</p>}
        </div>
    );
}

function MetricRow({ label, value, status, subtext }: { label: string; value: string; status?: string; subtext?: string }) {
    return (
        <div className="p-3 rounded-lg bg-[#18181c] border border-white/5 flex items-center justify-between">
            <span className="text-zinc-300">{label}</span>
            <div className="flex items-center gap-3">
                <span className="text-white font-bold">{value}</span>
                {status && <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{status}</span>}
                {subtext && <span className="text-[10px] text-zinc-500">{subtext}</span>}
            </div>
        </div>
    );
}