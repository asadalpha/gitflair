'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Github,
    ExternalLink,
    ShieldCheck,
    Loader2,
    LogOut,
    CheckCircle2,
    User,
    BarChart3,
    Star,
    Users,
    Flame,
    Code,
    Activity
} from 'lucide-react';
import { useSession, signIn, signOut } from '@/lib/auth-client';

interface GithubProfileData {
    linked?: boolean;
    error?: string;
    needsUsername?: boolean;
    profile?: {
        login: string;
        name: string | null;
        avatar: string;
        bio: string | null;
        company: string | null;
        location: string | null;
        followers: number;
        publicRepos: number;
        totalStars?: number;
    };
    stats?: {
        repos: number;
        totalStars: number;
        followers: number;
        recentCommits: number;
        recentPRs: number;
    };
    languages?: { name: string; count: number }[];
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

interface GithubProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'profile' | 'analytics';
}

export default function GithubProfileModal({ isOpen, onClose, initialTab = 'profile' }: GithubProfileModalProps) {
    const [activeTab, setActiveTab] = useState<'profile' | 'analytics'>(initialTab);
    const [ghData, setGhData] = useState<GithubProfileData | null>(null);
    const [loading, setLoading] = useState(false);
    const [needsUsername, setNeedsUsername] = useState(false);
    const [usernameInput, setUsernameInput] = useState('');
    const { data: session } = useSession();
    const isLoggedIn = !!session?.user;

    const CACHE_KEY = `gitflair_gh_profile_${session?.user?.id || 'anon'}`;

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    useEffect(() => {
        if (!isOpen || !isLoggedIn) return;

        // Try reading cached data from localStorage for instant loading
        let hasCache = false;
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed && parsed.profile) {
                    setGhData(parsed);
                    hasCache = true;
                    setLoading(false);
                    setNeedsUsername(false);
                }
            }
        } catch {
            // Ignore parse errors
        }

        if (!hasCache) {
            setLoading(true);
        }

        setNeedsUsername(false);
        fetch('/api/auth/github-profile')
            .then(r => r.json())
            .then(d => {
                if (d.needsUsername) {
                    if (!hasCache) {
                        setNeedsUsername(true);
                        setGhData(null);
                    }
                } else if (d.profile) {
                    setGhData(d);
                    setNeedsUsername(false);
                    try {
                        localStorage.setItem(CACHE_KEY, JSON.stringify(d));
                    } catch {}
                }
            })
            .catch(() => {
                if (!hasCache) setGhData(null);
            })
            .finally(() => setLoading(false));
    }, [isOpen, isLoggedIn, CACHE_KEY]);

    const fetchWithUsername = () => {
        if (!usernameInput.trim()) return;
        setLoading(true);
        setNeedsUsername(false);
        fetch(`/api/auth/github-profile?username=${encodeURIComponent(usernameInput.trim())}`)
            .then(r => r.json())
            .then(d => {
                if (d.profile) {
                    setGhData(d);
                    setNeedsUsername(false);
                    try {
                        localStorage.setItem(CACHE_KEY, JSON.stringify(d));
                    } catch {}
                } else {
                    setGhData(d);
                }
            })
            .catch(() => setGhData(null))
            .finally(() => setLoading(false));
    };

    if (!isOpen) return null;

    const googleName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User';
    const googleImage = session?.user?.image;
    const googleEmail = session?.user?.email;

    const hasGithub = !!ghData?.profile?.login;
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
                    className="bg-[#121215] border border-white/10 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col font-sans max-h-[85vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 px-5 border-b border-white/5 flex items-center justify-between bg-[#16161a]">
                        <div className="flex items-center gap-3">
                            {googleImage ? (
                                <img src={googleImage} alt={googleName} className="w-8 h-8 rounded-full border border-white/20" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                                    {googleName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h3 className="text-sm font-bold text-white tracking-tight">{googleName}</h3>
                                <p className="text-[11px] text-zinc-400">
                                    {hasGithub ? `@${ghData?.profile?.login}` : 'Account Settings & Analytics'}
                                </p>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-[#1c1c20] p-1 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                        activeTab === 'profile'
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    Profile
                                </button>
                                <button
                                    onClick={() => setActiveTab('analytics')}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                        activeTab === 'analytics'
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    GitHub Analytics
                                </button>
                            </div>

                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 overflow-y-auto space-y-5 flex-1">
                        {!isLoggedIn ? (
                            <div className="space-y-4 text-center py-4">
                                <p className="text-xs text-zinc-400">
                                    Sign in to view your profile details and GitHub analytics.
                                </p>
                                <button
                                    onClick={() => signIn.social({ provider: 'google' })}
                                    className="w-full p-3 rounded-xl bg-[#1a1a1e] hover:bg-white hover:text-black border border-white/10 flex items-center justify-center gap-2.5 transition-all font-semibold text-xs text-white"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                    </svg>
                                    <span>Sign in with Google</span>
                                </button>
                            </div>
                        ) : activeTab === 'profile' ? (
                            /* ───── PROFILE TAB ───── */
                            <div className="space-y-4">
                                {/* Section 1: Google Profile */}
                                <div className="p-4 rounded-xl bg-[#161619] border border-white/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                            </svg>
                                            <span>Google Account</span>
                                        </span>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                            <span>AUTHENTICATED</span>
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3.5 pt-1">
                                        {googleImage ? (
                                            <img
                                                src={googleImage}
                                                alt={googleName}
                                                className="w-12 h-12 rounded-full border border-white/20 shadow-md shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-lg shadow-md border border-white/20 shrink-0">
                                                {googleName.charAt(0).toUpperCase()}
                                            </div>
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-bold text-white truncate">{googleName}</h4>
                                            {googleEmail && (
                                                <p className="text-xs text-zinc-400 font-mono truncate">{googleEmail}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: GitHub Profile Status */}
                                <div className="p-4 rounded-xl bg-[#161619] border border-white/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <Github className="w-3.5 h-3.5 text-white" />
                                            <span>GitHub Profile</span>
                                        </span>
                                        {hasGithub && (
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                CONNECTED
                                            </span>
                                        )}
                                    </div>

                                    {loading ? (
                                        <div className="flex items-center justify-center py-4 text-xs text-zinc-400 font-mono">
                                            <Loader2 className="animate-spin text-purple-400 mr-2" size={16} />
                                            <span>Loading GitHub details...</span>
                                        </div>
                                    ) : hasGithub && ghData?.profile ? (
                                        <div className="flex items-center justify-between pt-1">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <img
                                                    src={ghData.profile.avatar}
                                                    alt={ghData.profile.login}
                                                    className="w-10 h-10 rounded-full border border-white/20 shadow-md shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                                        <span>{ghData.profile.name || ghData.profile.login}</span>
                                                    </h4>
                                                    <p className="text-[11px] text-purple-300 font-mono">@{ghData.profile.login}</p>
                                                </div>
                                            </div>

                                            <a
                                                href={`https://github.com/${ghData.profile.login}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-medium shrink-0"
                                            >
                                                <span>View</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    ) : needsUsername ? (
                                        <div className="space-y-3 pt-1">
                                            <p className="text-xs text-zinc-400">
                                                No GitHub account linked to session. Add your GitHub username to link:
                                            </p>
                                            <form
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    fetchWithUsername();
                                                }}
                                                className="flex items-center gap-2"
                                            >
                                                <input
                                                    type="text"
                                                    value={usernameInput}
                                                    onChange={(e) => setUsernameInput(e.target.value)}
                                                    placeholder="GitHub username (e.g. torvalds)"
                                                    className="flex-1 bg-[#1c1c20] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 font-mono"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={!usernameInput.trim()}
                                                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold text-xs transition-all shrink-0"
                                                >
                                                    Add Profile
                                                </button>
                                            </form>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between pt-1">
                                            <p className="text-xs text-zinc-400">No GitHub profile added yet.</p>
                                            <button
                                                onClick={() => signIn.social({ provider: 'github' })}
                                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-medium text-white transition-all flex items-center gap-1.5"
                                            >
                                                <Github className="w-3.5 h-3.5" />
                                                <span>Link GitHub</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Actions */}
                                <div className="pt-2 flex items-center justify-between border-t border-white/5">
                                    <button
                                        onClick={() => signOut()}
                                        className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all"
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                        <span>Sign Out</span>
                                    </button>

                                    <button
                                        onClick={onClose}
                                        className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ───── GITHUB ANALYTICS TAB ───── */
                            <div className="space-y-4">
                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="animate-spin text-purple-400" size={24} />
                                        <span className="ml-3 text-xs text-zinc-400 font-mono">Loading GitHub analytics...</span>
                                    </div>
                                ) : !hasGithub && needsUsername ? (
                                    <div className="space-y-4 py-4 text-center">
                                        <Github className="w-10 h-10 text-zinc-500 mx-auto" />
                                        <h4 className="text-sm font-bold text-white">Enter GitHub Username for Analytics</h4>
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                fetchWithUsername();
                                            }}
                                            className="flex items-center gap-2 max-w-sm mx-auto"
                                        >
                                            <input
                                                type="text"
                                                value={usernameInput}
                                                onChange={(e) => setUsernameInput(e.target.value)}
                                                placeholder="e.g. torvalds"
                                                className="flex-1 bg-[#1c1c20] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 font-mono"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!usernameInput.trim()}
                                                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 text-white font-semibold text-xs"
                                            >
                                                Analyze
                                            </button>
                                        </form>
                                    </div>
                                ) : ghData?.stats ? (
                                    <>
                                        {/* Real Profile Stats Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <StatCard icon={<Github className="w-4 h-4 text-purple-400" />} title="Repos" value={String(ghData.stats.repos)} subtext="Public & Private" />
                                            <StatCard icon={<Star className="w-4 h-4 text-amber-400" />} title="Total Stars" value={ghData.stats.totalStars.toLocaleString()} subtext="Across repos" />
                                            <StatCard icon={<Users className="w-4 h-4 text-blue-400" />} title="Followers" value={String(ghData.stats.followers)} subtext="GitHub devs" />
                                            <StatCard icon={<Flame className="w-4 h-4 text-rose-400" />} title="Recent Commits" value={String(ghData.stats.recentCommits)} subtext="Last 30 events" />
                                        </div>

                                        {/* Real Languages Breakdown */}
                                        {ghData.languages && ghData.languages.length > 0 && (
                                            <div className="p-4 rounded-xl bg-[#161619] border border-white/5 space-y-3">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-semibold text-white flex items-center gap-2">
                                                        <Code className="w-4 h-4 text-emerald-400" />
                                                        <span>Top Programming Languages</span>
                                                    </span>
                                                </div>
                                                <div className="h-2.5 w-full rounded-full bg-[#1e1e22] overflow-hidden flex">
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
                                                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-zinc-400 pt-0.5">
                                                    {ghData.languages.map((lang) => (
                                                        <div key={lang.name} className="flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LANGUAGE_COLORS[lang.name] || '#8b5cf6' }} />
                                                            <span>{lang.name} ({((lang.count / totalLangCount) * 100).toFixed(0)}%)</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Bio and Company */}
                                        {ghData.profile?.bio && (
                                            <div className="p-4 rounded-xl bg-[#161619] border border-white/5 space-y-1.5 text-xs">
                                                <span className="font-semibold text-white">GitHub Bio</span>
                                                <p className="text-zinc-400 leading-relaxed">{ghData.profile.bio}</p>
                                                {(ghData.profile.company || ghData.profile.location) && (
                                                    <p className="text-[10px] text-zinc-500 font-mono pt-1">
                                                        {[ghData.profile.company, ghData.profile.location].filter(Boolean).join(' • ')}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-xs text-zinc-500 text-center py-6">No GitHub analytics data available.</p>
                                )}
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
        <div className="p-3.5 rounded-xl bg-[#161619] border border-white/5 space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-medium">{title}</span>
                {icon}
            </div>
            <p className="text-base font-bold text-white tracking-tight">{value}</p>
            {subtext && <p className="text-[9px] text-zinc-500 font-mono">{subtext}</p>}
        </div>
    );
}