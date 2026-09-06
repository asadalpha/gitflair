'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import RepoInput from '@/features/repos/components/repo-input';
import ChatInterface from '@/features/chat/components/chat-interface';
import HistoryPanel from '@/features/chat/components/history-panel';
import StatusBadge from '@/components/ui/status-badge';
import RepoAnalyzer from '@/features/repos/components/repo-analyzer';
import PRReviewPanel from '@/features/pr-review/components/pr-review-panel';
import FileInspector from '@/features/repos/components/file-inspector';
import ArchFlow from '@/features/architecture/components/arch-flow';
import CodeReviewNotes from '@/features/notes/components/code-review-notes';
import DevAnalytics from '@/features/analytics/components/dev-analytics';
import AIChatView from '@/features/chat/components/ai-chat-view';
import ProjectsView from '@/features/projects/components/projects-view';
import NotesPagesView from '@/features/notes/components/notes-pages-view';
import GithubIssuesPanel from '@/features/issues/components/github-issues-panel';
import AIToolsView from '@/features/ai-tools/components/ai-tools-view';
import InboxModal from '@/components/ui/inbox-modal';
import GithubProfileModal from '@/components/ui/github-profile-modal';
import TechTriviaModal from '@/components/ui/tech-trivia-modal';
import AuthModal from '@/components/ui/auth-modal';
import { getAnonymousUserId } from '@/lib/user';
import { useSession, signIn, signOut } from '@/lib/auth-client';
import { showToast } from '@/components/ui/toast';
import {
    BarChart3,
    CheckSquare,
    MessageSquare,
    GitPullRequest,
    ArrowLeft,
    FolderGit2,
    Sparkles,
    ArrowRight,
    Search,
    Layers,
    Plus,
    BookOpen,
    Inbox,
    FileText,
    Star,
    ChevronDown,
    ChevronUp,
    Bot,
    Zap,
    Shield,
    LogOut
} from 'lucide-react';

interface Analysis {
    summary: string;
    architecture: string;
    improvements: { title: string; desc: string; files: string[] }[];
}

interface Repo {
    id: string;
    full_name?: string;
    fullName?: string;
    name?: string;
    url: string;
    indexed_at?: string;
    createdAt?: string;
    languages_json?: Record<string, number>;
    languagesJson?: Record<string, number>;
    analysis_json?: Analysis;
    analysisJson?: Analysis;
}

function getRepoFullName(r: Repo | null | undefined): string {
    if (!r) return '';
    return r.fullName || r.full_name || r.name || 'Repository';
}

function getRepoName(r: Repo | null | undefined): string {
    if (!r) return '';
    const fn = getRepoFullName(r);
    return fn.includes('/') ? fn.split('/')[1] : (r.name || fn);
}

function getRepoIndexedAt(r: Repo | null | undefined): string {
    if (!r) return new Date().toISOString();
    return r.indexed_at || r.createdAt || new Date().toISOString();
}

export default function Home() {
    const [repo, setRepo] = useState<Repo | null>(null);
    const [savedRepos, setSavedRepos] = useState<Repo[]>([]);
    const [isIngesting, setIsIngesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState('');

    const { data: session } = useSession();
    const isLoggedIn = !!session?.user;
    const noRepo = !repo || !repo.url || repo.id === 'empty-workspace';

    // Tabs navigation: 'dashboard' | 'arch' | 'notes' | 'analytics' | 'chat' | 'pr' | 'projects' | 'notes_pages' | 'issues' | 'ai_tools'
    const [activeTab, setActiveTab] = useState<'dashboard' | 'arch' | 'notes' | 'analytics' | 'chat' | 'pr' | 'projects' | 'notes_pages' | 'issues' | 'ai_tools'>('chat');

    // File Inspector drawer state
    const [inspectingFile, setInspectingFile] = useState<string | null>(null);

    // Modal states
    const [isReposOverlayOpen, setIsReposOverlayOpen] = useState(false);
    const [isInboxOpen, setIsInboxOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [profileModalTab, setProfileModalTab] = useState<'profile' | 'analytics'>('profile');
    const [isTriviaOpen, setIsTriviaOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    // GSAP Refs
    const heroTitleRef = useRef<HTMLHeadingElement>(null);
    const heroSubRef = useRef<HTMLParagraphElement>(null);
    const heroCtaRef = useRef<HTMLDivElement>(null);
    const mockWindowRef = useRef<HTMLDivElement>(null);
    const aiCardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (session?.user) {
            setUserId(session.user.id);
        } else {
            const id = getAnonymousUserId();
            setUserId(id);
        }
    }, [session]);

    // Automatically enter workspace when user logs in
    useEffect(() => {
        if (isLoggedIn && (!repo || repo.id === 'empty-workspace')) {
            if (savedRepos.length > 0) {
                setRepo(savedRepos[0]);
            } else {
                setActiveTab('projects');
            }
        } else if (!isLoggedIn && repo) {
            setRepo(null);
        }
    }, [isLoggedIn, savedRepos]);

    // GSAP Entrance & Floating Animations
    useEffect(() => {
        if (repo) return; // Only run on landing view

        const ctx = gsap.context(() => {
            if (heroTitleRef.current) {
                gsap.fromTo(
                    heroTitleRef.current,
                    { y: 30, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
                );
            }
            if (heroSubRef.current) {
                gsap.fromTo(
                    heroSubRef.current,
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.8, delay: 0.15, ease: 'power3.out' }
                );
            }
            if (heroCtaRef.current) {
                gsap.fromTo(
                    heroCtaRef.current,
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.8, delay: 0.25, ease: 'power3.out' }
                );
            }
            if (mockWindowRef.current) {
                gsap.fromTo(
                    mockWindowRef.current,
                    { y: 40, opacity: 0, scale: 0.98 },
                    { y: 0, opacity: 1, scale: 1, duration: 1, delay: 0.35, ease: 'power3.out' }
                );
            }
            if (aiCardRef.current) {
                gsap.to(aiCardRef.current, {
                    y: -8,
                    duration: 2.5,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut',
                });
            }
        });

        return () => ctx.revert();
    }, [repo]);

    // Load previously indexed repos for this user
    useEffect(() => {
        if (!userId) return;
        async function loadRepos() {
            try {
                const res = await fetch(`/api/repos?userId=${userId}`);
                const data = await res.json();
                if (Array.isArray(data)) setSavedRepos(data);
            } catch {
                console.error('Failed to load repos');
            }
        }
        loadRepos();
    }, [userId]);

    const handleIngest = async (url: string) => {
        if (!isLoggedIn) {
            showToast('Please sign in to index repositories', 'info');
            setIsAuthModalOpen(true);
            return;
        }

        const githubPattern = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;
        if (!githubPattern.test(url.trim())) {
            showToast('Please enter a valid GitHub repository URL', 'error');
            return;
        }

        setIsIngesting(true);
        setError(null);
        try {
            const response = await fetch('/api/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, userId }),
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Fetch newly ingested repo details
            const resDetails = await fetch(`/api/repos?userId=${userId}`);
            const updatedRepos = await resDetails.json();
            if (Array.isArray(updatedRepos)) {
                setSavedRepos(updatedRepos);
                const freshlyIndexed = updatedRepos.find(r => r.id === data.repositoryId);
                if (freshlyIndexed) {
                    setRepo(freshlyIndexed);
                } else {
                    const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
                    const fullName = match ? match[1].replace('.git', '') : url;
                    setRepo({
                        id: data.repositoryId,
                        fullName: fullName,
                        url: url,
                        createdAt: new Date().toISOString(),
                    });
                }
            }

            showToast('Repository indexed successfully!', 'success');
            setActiveTab('dashboard');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'An error occurred during indexing';
            showToast(msg, 'error');
            setError(msg);
        } finally {
            setIsIngesting(false);
        }
    };

    const selectRepo = (r: Repo) => {
        if (!isLoggedIn) {
            showToast('Please sign in to access the repository workspace', 'info');
            setIsAuthModalOpen(true);
            return;
        }

        async function fetchDetails() {
            try {
                const res = await fetch(`/api/repos?userId=${userId}`);
                const list = await res.json();
                if (Array.isArray(list)) {
                    setSavedRepos(list);
                    const fresh = list.find(item => item.id === r.id);
                    if (fresh) {
                        setRepo(fresh);
                        return;
                    }
                }
                setRepo(r);
            } catch {
                setRepo(r);
            }
        }
        fetchDetails();
        setActiveTab('dashboard');
        setError(null);
    };

    const handleFileClick = (path: string) => {
        setInspectingFile(path);
    };

    const handleOpenWorkspace = () => {
        if (!isLoggedIn) {
            showToast('Please sign in to access the GitFlair workspace', 'info');
            setIsAuthModalOpen(true);
            return;
        }

        if (savedRepos.length > 0) {
            selectRepo(savedRepos[0]);
        } else {
            setActiveTab('projects');
        }
    };

    return (
        <main className="min-h-screen relative bg-[#08080a] text-zinc-200 selection:bg-blue-500/30 selection:text-white font-sans">
            <AnimatePresence mode="wait">
                {!repo ? (
                    /* ───── Landing View ───── */
                    <motion.div
                        key="landing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="min-h-screen flex flex-col justify-between bg-[#080809] text-zinc-100 font-sans"
                    >
                        {/* Minimal Top Header Navbar */}
                        <header className="border-b border-white/5 bg-[#080809]/80 backdrop-blur-md sticky top-0 z-50">
                            <div className="max-w-7xl mx-auto px-6 sm:px-12 h-16 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                                        GF
                                    </div>
                                    <span className="font-bold text-sm tracking-tight text-white">GitFlair</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {isLoggedIn ? (
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setIsProfileOpen(true)}
                                                className="flex items-center gap-2 text-xs text-zinc-300 hover:text-white font-medium transition-colors"
                                            >
                                                {session?.user?.image ? (
                                                    <img
                                                        src={session.user.image}
                                                        alt={session.user.name || 'User'}
                                                        className="w-7 h-7 rounded-full border border-white/20"
                                                    />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                                                        {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                )}
                                                <span className="hidden sm:inline">{session?.user?.name || 'Account'}</span>
                                            </button>

                                            <button
                                                onClick={() => signOut()}
                                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                                title="Sign Out"
                                            >
                                                <LogOut className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsAuthModalOpen(true)}
                                            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white transition-all"
                                        >
                                            Sign In
                                        </button>
                                    )}

                                    <button
                                        onClick={handleOpenWorkspace}
                                        className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-all flex items-center gap-1.5 shadow-md"
                                    >
                                        <span>Open Workspace</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </header>

                        {/* Main Hero Header */}
                        <div className="max-w-7xl mx-auto px-6 sm:px-12 pt-16 pb-8 w-full space-y-4">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="max-w-3xl space-y-3">
                                    <h1
                                        ref={heroTitleRef}
                                        className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white leading-[1.1]"
                                    >
                                        AI architect & repo analyzer
                                    </h1>
                                    <p
                                        ref={heroSubRef}
                                        className="text-sm sm:text-base text-zinc-400 font-normal"
                                    >
                                        Index any GitHub repo, chat with your codebase, and get AI-powered architecture insights.
                                    </p>
                                </div>
                            </div>

                            {/* Navigation CTAs */}
                            <div ref={heroCtaRef} id="ingest" className="pt-4 space-y-4">
                                <button
                                    onClick={handleOpenWorkspace}
                                    className="px-6 py-3 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95"
                                >
                                    <span>{isLoggedIn ? 'Go to Workspace' : 'Sign In to Access Workspace'}</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Hero Interactive Preview Mockup Window */}
                        <div className="max-w-7xl mx-auto px-6 sm:px-12 py-8 w-full">
                            <div
                                ref={mockWindowRef}
                                className="rounded-2xl border border-white/[0.08] bg-[#0c0c0e] shadow-2xl overflow-hidden relative cursor-pointer"
                                onClick={handleOpenWorkspace}
                            >
                                <div className="flex flex-col md:flex-row min-h-[420px]">
                                    {/* Sidebar Mock */}
                                    <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-white/[0.06] bg-[#09090b] p-3 space-y-4 shrink-0 select-none">
                                        <div className="flex items-center justify-between px-2 py-1 border-b border-white/5 pb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-gradient-to-tr from-purple-600 to-pink-500 text-white font-bold flex items-center justify-center text-[9px]">
                                                    GF
                                                </div>
                                                <span className="font-semibold text-white text-xs">GitFlair</span>
                                                <ChevronDown className="w-3 h-3 text-zinc-500" />
                                            </div>
                                        </div>

                                        <div className="space-y-1 text-xs">
                                            <div className="px-2 py-1 text-zinc-400 hover:text-white flex items-center gap-2">
                                                <Zap className="w-3.5 h-3.5 text-purple-400" /> AI Vector Search
                                            </div>
                                            <div className="px-2 py-1 text-zinc-400 hover:text-white flex items-center gap-2">
                                                <Inbox className="w-3.5 h-3.5 text-blue-400" /> Ingest Queue
                                            </div>
                                            <div className="px-2 py-1 text-zinc-400 hover:text-white flex items-center gap-2">
                                                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> Action Items
                                            </div>
                                            <div className="px-2 py-1 text-zinc-400 hover:text-white flex items-center gap-2">
                                                <GitPullRequest className="w-3.5 h-3.5 text-pink-400" /> PR Reviews
                                            </div>
                                        </div>

                                        <div className="space-y-1 text-xs pt-2 border-t border-white/5">
                                            <div className="px-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                                                <span>Workspaces</span>
                                                <ChevronDown className="w-3 h-3 text-zinc-500" />
                                            </div>
                                            <div className="px-2 py-1 text-white bg-white/5 rounded-lg flex items-center gap-2 font-medium">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400" /> order-supervisor-ai
                                            </div>
                                            <div className="px-2 py-1 text-zinc-400">gitflair-core</div>
                                            <div className="px-2 py-1 text-zinc-400">temporal-worker</div>
                                        </div>
                                    </div>

                                    {/* Main Content Mock */}
                                    <div className="flex-1 p-6 space-y-6 relative bg-[#0e0e11] text-xs">
                                        <div className="flex items-center justify-between text-zinc-400 border-b border-white/5 pb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                    GF-1042
                                                </span>
                                                <span className="font-mono text-white font-semibold">Autonomous Vector Indexing & Code Architecture</span>
                                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                                            </div>
                                            <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500">
                                                <span>1 / 42</span>
                                                <ChevronUp className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
                                                <ChevronDown className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
                                            </div>
                                        </div>

                                        <div className="space-y-3 max-w-xl">
                                            <h2 className="text-xl font-bold text-white tracking-tight">Automate Codebase Indexing & Vector Search</h2>
                                            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                                                Index any GitHub repository in seconds, generate interactive architectural specs, and run long-running AI code analysis workflows with full context awareness using <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-purple-300 text-[11px]">Supabase PgVector</code> and <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-emerald-300 text-[11px]">Temporal SDK</code>.
                                            </p>
                                        </div>

                                        {/* AI Floating Card Overlay */}
                                        <div
                                            ref={aiCardRef}
                                            className="absolute bottom-6 right-6 w-84 rounded-2xl bg-[#141418] border border-purple-500/20 shadow-2xl p-4 space-y-3 backdrop-blur-md hidden sm:block"
                                        >
                                            <div className="flex items-center justify-between text-xs text-white border-b border-white/5 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-[11px] font-bold border border-purple-500/30">
                                                        <Bot className="w-3.5 h-3.5 text-purple-400" />
                                                    </div>
                                                    <span className="font-semibold text-white">GitFlair <span className="text-purple-400 font-bold">AI Agent</span></span>
                                                </div>
                                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    COMPLETED
                                                </span>
                                            </div>

                                            <div className="p-3 rounded-xl bg-[#1c1c22] border border-white/5 text-xs text-zinc-200 font-medium">
                                                Analyze order-supervisor-ai repo structure and generate architectural spec
                                            </div>

                                            <p className="text-zinc-300 text-[11px] leading-relaxed">
                                                Parsed 4,210 lines across FastAPI, Next.js & Temporal. Indexed vector embeddings and generated 3 prioritized security action items.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Landing Page Features Grid */}
                        <div className="max-w-7xl mx-auto px-6 sm:px-12 py-12 w-full border-t border-white/[0.08]">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <div className="h-36 flex items-center justify-center">
                                        <svg className="w-28 h-28 stroke-zinc-500 fill-none" viewBox="0 0 200 200">
                                            <path d="M100 40 L170 75 L100 110 L30 75 Z" strokeWidth="1" strokeDasharray="3 3" />
                                            <path d="M30 75 L30 135 L100 170 L170 135 L170 75" strokeWidth="1.2" />
                                            <path d="M30 90 L100 125 L170 90" strokeWidth="1" strokeOpacity="0.4" />
                                            <path d="M30 105 L100 140 L170 105" strokeWidth="1" strokeOpacity="0.4" />
                                            <path d="M30 120 L100 155 L170 120" strokeWidth="1" strokeOpacity="0.4" />
                                            <path d="M100 110 L100 170" strokeWidth="1.2" />
                                            <ellipse cx="100" cy="75" rx="32" ry="16" strokeWidth="1.2" />
                                            <line x1="70" y1="75" x2="130" y2="75" strokeWidth="0.8" strokeDasharray="2 2" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-semibold text-white tracking-tight">Purpose-built</h3>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Shaped by the practices of world-class product teams.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <div className="h-36 flex items-center justify-center">
                                        <svg className="w-28 h-28 stroke-zinc-500 fill-none" viewBox="0 0 200 200">
                                            <g transform="translate(100, 30)">
                                                <path d="M0 0 L28 14 L0 28 L-28 14 Z" strokeWidth="1.2" />
                                                <path d="M-28 14 L-28 42 L0 56 L28 42 L28 14" strokeWidth="1.2" />
                                                <path d="M0 28 L0 56" strokeWidth="1.2" />
                                            </g>
                                            <g transform="translate(55, 65)">
                                                <path d="M0 0 L28 14 L0 28 L-28 14 Z" strokeWidth="1.2" />
                                                <path d="M-28 14 L-28 46 L0 60 L28 46 L28 14" strokeWidth="1.2" />
                                                <path d="M0 28 L0 60" strokeWidth="1.2" />
                                            </g>
                                            <g transform="translate(145, 65)">
                                                <path d="M0 0 L28 14 L0 28 L-28 14 Z" strokeWidth="1.2" />
                                                <path d="M-28 14 L-28 46 L0 60 L28 46 L28 14" strokeWidth="1.2" />
                                                <path d="M0 28 L0 60" strokeWidth="1.2" />
                                            </g>
                                            <g transform="translate(100, 105)">
                                                <path d="M0 0 L25 12.5 L0 25 L-25 12.5 Z" strokeWidth="1.2" />
                                                <path d="M-25 12.5 L-25 42.5 L0 55 L25 42.5 L25 12.5" strokeWidth="1.2" />
                                                <path d="M0 25 L0 55" strokeWidth="1.2" />
                                            </g>
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-semibold text-white tracking-tight">Powered by agents</h3>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Workflows shared by humans and agents — from PRDs to PRs.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <div className="h-36 flex items-center justify-center">
                                        <svg className="w-28 h-28 stroke-zinc-500 fill-none" viewBox="0 0 200 200">
                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
                                                const x = 25 + i * 12;
                                                const y = 145 - i * 7;
                                                const height = 25 + i * 9;
                                                return (
                                                    <g key={i}>
                                                        <path
                                                            d={`M${x} ${y} L${x + 10} ${y - 5} L${x + 10} ${y - 5 - height} L${x} ${y - height} Z`}
                                                            strokeWidth={i === 11 ? '1.5' : '1'}
                                                            strokeOpacity={0.3 + (i / 11) * 0.7}
                                                        />
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-semibold text-white tracking-tight">Designed for speed</h3>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Reduces noise and restores momentum to ship with focus.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <footer className="border-t border-white/5 py-6 text-center text-xs text-zinc-500 font-mono">
                            <div className="max-w-7xl mx-auto px-6 sm:px-12 flex items-center justify-between">
                                <span className="text-zinc-400">Built by Asad · GitFlair</span>
                                <StatusBadge />
                            </div>
                        </footer>
                    </motion.div>
                ) : (
                    /* ───── Workspace Active View ───── */
                    <motion.div
                        key="workspace"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="min-h-screen flex flex-col md:flex-row bg-[#0e0e10] font-sans text-xs text-zinc-300"
                    >
                        {/* Streamlined Left Sidebar */}
                        <div className="w-full md:w-60 border-b md:border-b-0 md:border-r border-white/[0.06] bg-[#0c0c0e] p-3 flex flex-col justify-between shrink-0 select-none">
                            <div className="space-y-4">
                                {/* Top Team / Workspace Selector Row */}
                                <div className="flex items-center justify-between px-1 py-1">
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsReposOverlayOpen(true)}>
                                        <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow">
                                            GF
                                        </div>
                                        <span className="font-semibold text-white text-xs truncate max-w-[110px]">
                                            GitFlair
                                        </span>
                                        <ChevronDown className="w-3 h-3 text-zinc-500" />
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-500">
                                        <Search className="w-3.5 h-3.5 cursor-pointer hover:text-white transition-colors" onClick={() => setIsReposOverlayOpen(true)} />
                                        <button onClick={() => signOut()} title="Sign Out">
                                            <LogOut className="w-3.5 h-3.5 cursor-pointer hover:text-white transition-colors" />
                                        </button>
                                    </div>
                                </div>

                                {/* Primary Shortcuts */}
                                <div className="space-y-0.5">
                                    <SidebarLink
                                        active={activeTab === 'projects'}
                                        icon={<Layers className="w-3.5 h-3.5 text-blue-400" />}
                                        label="Projects"
                                        onClick={() => setActiveTab('projects')}
                                    />
                                    <SidebarLink
                                        active={activeTab === 'notes_pages'}
                                        icon={<FileText className="w-3.5 h-3.5 text-pink-400" />}
                                        label="Pages & Notes"
                                        onClick={() => setActiveTab('notes_pages')}
                                    />
                                </div>

                                {/* Workspace Section */}
                                <div className="space-y-1">
                                    <div className="px-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                                        <span>Workspace</span>
                                    </div>

                                    {/* Repos Button */}
                                    <button
                                        onClick={() => setIsReposOverlayOpen(true)}
                                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#1a1a1e] text-zinc-300 hover:text-white flex items-center justify-between transition-all"
                                    >
                                        <span className="flex items-center gap-2 font-medium">
                                            <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
                                            <span>Repos</span>
                                        </span>
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
                                            {savedRepos.length}
                                        </span>
                                    </button>

                                    {/* Sub-items for Active Selected Repo */}
                                    <div className="pl-3 space-y-0.5 border-l border-white/5 ml-3">
                                        <SidebarSubLink
                                            active={activeTab === 'chat'}
                                            label="AI Chat"
                                            onClick={() => setActiveTab('chat')}
                                        />
                                        <SidebarSubLink
                                            active={activeTab === 'dashboard'}
                                            label="Overview (Analyzer)"
                                            onClick={() => setActiveTab('dashboard')}
                                        />
                                        <SidebarSubLink
                                            active={activeTab === 'arch'}
                                            label="Arch Diagram"
                                            onClick={() => setActiveTab('arch')}
                                        />
                                        <SidebarSubLink
                                            active={activeTab === 'analytics'}
                                            label="Dev Analytics"
                                            onClick={() => setActiveTab('analytics')}
                                        />
                                        <SidebarSubLink
                                            active={activeTab === 'issues'}
                                            label="GitHub Issues"
                                            onClick={() => setActiveTab('issues')}
                                        />
                                        <SidebarSubLink
                                            active={activeTab === 'notes'}
                                            label="To-Do & Checklist"
                                            onClick={() => setActiveTab('notes')}
                                        />
                                        <SidebarSubLink
                                            active={activeTab === 'pr'}
                                            label="PR Reviews"
                                            onClick={() => setActiveTab('pr')}
                                        />
                                    </div>
                                </div>

                                {/* Profile Section */}
                                <div className="space-y-1 pt-1">
                                    <div className="px-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                                        <span>Profile</span>
                                    </div>

                                    <button
                                        onClick={() => setIsProfileOpen(true)}
                                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#1a1a1e] text-zinc-300 hover:text-white flex items-center justify-between transition-all"
                                    >
                                        <span className="flex items-center gap-2 font-medium">
                                            {session?.user?.image ? (
                                                <img
                                                    src={session.user.image}
                                                    alt={session.user.name || 'User'}
                                                    className="w-4 h-4 rounded-full"
                                                />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[9px]">
                                                    {(session?.user?.name?.charAt(0) || 'U').toUpperCase()}
                                                </div>
                                            )}
                                            <span className="text-white font-semibold truncate max-w-[100px]">{session?.user?.name || 'Account'}</span>
                                        </span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    </button>

                                    {/* Sub-items inside Profile */}
                                    <div className="pl-3 space-y-0.5 border-l border-white/5 ml-3">
                                        <SidebarSubLink
                                            active={false}
                                            label="Personal"
                                            onClick={() => { setProfileModalTab('profile'); setIsProfileOpen(true); }}
                                        />
                                        <SidebarSubLink
                                            active={false}
                                            label="GitHub Profile"
                                            onClick={() => { setProfileModalTab('analytics'); setIsProfileOpen(true); }}
                                        />
                                        <SidebarSubLink
                                            active={activeTab === 'ai_tools'}
                                            label="AI Tools"
                                            onClick={() => setActiveTab('ai_tools')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Workspace Body Content */}
                        <div className="flex-1 flex flex-col min-w-0 bg-[#0e0e10]">
                            {/* Top Breadcrumb & Filter Bar */}
                            <div className="h-12 border-b border-white/[0.06] px-6 flex items-center justify-between bg-[#0c0c0e]">
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-4 h-4 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">
                                        R
                                    </div>
                                    <span className="font-semibold text-white">{getRepoName(repo) || 'Workspace'}</span>
                                    <span className="text-zinc-600">›</span>
                                    <span className="text-zinc-300 font-medium">
                                        {activeTab === 'chat' ? 'AI Chat' : activeTab === 'projects' ? 'Projects' : activeTab === 'notes_pages' ? 'Pages & Notes' : activeTab === 'issues' ? 'GitHub Issues' : activeTab === 'notes' ? 'To-Do & Checklist' : activeTab === 'dashboard' ? 'Overview' : activeTab === 'arch' ? 'Architecture' : activeTab === 'analytics' ? 'Analytics' : activeTab === 'ai_tools' ? 'AI Tools' : 'PR Reviews'}
                                    </span>
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
                                        {getRepoFullName(repo) || 'No repo selected'}
                                    </span>
                                </div>
                            </div>

                            {/* Main Active Tab Content View */}
                            <div className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'chat' && (
                                        <motion.div key="chat-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            {noRepo ? (
                                                <NoRepoState tab="chat" onIngest={() => setActiveTab('projects')} />
                                            ) : (
                                                <AIChatView
                                                    repoId={repo?.id}
                                                    repoName={getRepoName(repo)}
                                                    repoUrl={repo?.url}
                                                    userId={userId}
                                                    savedRepos={savedRepos}
                                                    onSelectRepo={selectRepo}
                                                    onFileClick={handleFileClick}
                                                />
                                            )}
                                        </motion.div>
                                    )}

                                    {activeTab === 'projects' && (
                                        <motion.div key="projects-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <ProjectsView onIngest={handleIngest} isIngesting={isIngesting} />
                                        </motion.div>
                                    )}

                                    {activeTab === 'notes_pages' && (
                                        <motion.div key="notes-pages-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <NotesPagesView repoId={repo?.id} userId={userId} />
                                        </motion.div>
                                    )}

                                    {activeTab === 'dashboard' && (
                                        <motion.div key="dashboard-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            {noRepo ? (
                                                <NoRepoState tab="analyzer" onIngest={() => setActiveTab('projects')} />
                                            ) : (
                                                <RepoAnalyzer
                                                    repoName={getRepoName(repo)}
                                                    repoUrl={repo?.url || ''}
                                                    languages={repo?.languagesJson || repo?.languages_json || null}
                                                    analysis={(repo?.analysisJson as any) || (repo?.analysis_json as any) || null}
                                                    onFileClick={handleFileClick}
                                                />
                                            )}
                                        </motion.div>
                                    )}

                                    {activeTab === 'arch' && (
                                        <motion.div key="arch-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            {noRepo ? (
                                                <NoRepoState tab="arch" onIngest={() => setActiveTab('projects')} />
                                            ) : (
                                                <ArchFlow repoName={getRepoName(repo)} />
                                            )}
                                        </motion.div>
                                    )}

                                    {activeTab === 'issues' && (
                                        <motion.div key="issues-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            {noRepo ? (
                                                <NoRepoState tab="issues" onIngest={() => setActiveTab('projects')} />
                                            ) : (
                                                <GithubIssuesPanel
                                                    repoName={getRepoName(repo)}
                                                    repoUrl={repo?.url || ''}
                                                    repoId={repo?.id}
                                                />
                                            )}
                                        </motion.div>
                                    )}

                                    {activeTab === 'notes' && (
                                        <motion.div key="notes-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <CodeReviewNotes repoId={repo?.id} userId={userId} />
                                        </motion.div>
                                    )}

                                    {activeTab === 'analytics' && (
                                        <motion.div key="analytics-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <DevAnalytics repoName={getRepoName(repo)} repoUrl={noRepo ? '' : repo?.url || ''} />
                                        </motion.div>
                                    )}

                                    {activeTab === 'pr' && (
                                        <motion.div key="pr-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            {noRepo ? (
                                                <NoRepoState tab="pr" onIngest={() => setActiveTab('projects')} />
                                            ) : (
                                                <PRReviewPanel repoId={repo?.id} userId={userId} onFileClick={handleFileClick} />
                                            )}
                                        </motion.div>
                                    )}

                                    {activeTab === 'ai_tools' && (
                                        <motion.div key="ai-tools-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <AIToolsView />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Ingested Repos Overlay Modal */}
                        <AnimatePresence>
                            {isReposOverlayOpen && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                                    onClick={() => setIsReposOverlayOpen(false)}
                                >
                                    <motion.div
                                        initial={{ scale: 0.95 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0.95 }}
                                        className="bg-[#121215] border border-white/10 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                            <div className="flex items-center gap-2">
                                                <FolderGit2 className="w-5 h-5 text-blue-400" />
                                                <h3 className="text-base font-bold text-white">Ingested Repositories</h3>
                                            </div>
                                            <button
                                                onClick={() => setIsReposOverlayOpen(false)}
                                                className="text-zinc-500 hover:text-white text-xs font-mono"
                                            >
                                                [ESC] Close
                                            </button>
                                        </div>

                                        <div className="space-y-2 max-h-[340px] overflow-y-auto">
                                            {savedRepos.map((r) => (
                                                <div
                                                    key={r.id}
                                                    onClick={() => {
                                                        selectRepo(r);
                                                        setIsReposOverlayOpen(false);
                                                    }}
                                                    className="p-3.5 rounded-xl bg-[#18181c] hover:bg-[#232328] border border-white/5 cursor-pointer flex items-center justify-between transition-all"
                                                >
                                                    <div>
                                                        <div className="font-semibold text-white text-xs flex items-center gap-2">
                                                            <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
                                                            <span>{getRepoFullName(r)}</span>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-zinc-500 block mt-1">
                                                            Indexed: {new Date(getRepoIndexedAt(r)).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <button className="px-3 py-1 rounded-lg bg-white/10 text-white text-xs font-medium">
                                                        Select
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-2 border-t border-white/5 flex justify-end">
                                            <button
                                                onClick={() => {
                                                    setRepo(null);
                                                    setIsReposOverlayOpen(false);
                                                }}
                                                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold"
                                            >
                                                + Ingest New Repo
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* File Inspector Drawer */}
                        {repo && (
                            <FileInspector
                                filePath={inspectingFile}
                                repoId={repo.id}
                                repoUrl={repo.url}
                                userId={userId}
                                onClose={() => setInspectingFile(null)}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Workspace Modals */}
            <InboxModal isOpen={isInboxOpen} onClose={() => setIsInboxOpen(false)} />
            <GithubProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} initialTab={profileModalTab} />
            <TechTriviaModal isOpen={isTriviaOpen} onClose={() => setIsTriviaOpen(false)} />
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </main>
    );
}

function SidebarLink({ active, icon, label, badge, onClick }: {
    active?: boolean;
    icon: React.ReactNode;
    label: string;
    badge?: string;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-2 py-1.5 rounded-lg font-medium text-xs transition-all flex items-center justify-between ${
                active ? 'bg-[#232328] text-white shadow-sm font-semibold' : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1e]'
            }`}
        >
            <span className="flex items-center gap-2">
                <span className={active ? 'text-white' : 'text-zinc-500'}>{icon}</span>
                <span>{label}</span>
            </span>
            {badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                    {badge}
                </span>
            )}
        </button>
    );
}

function SidebarSubLink({ active, label, onClick }: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                active ? 'text-white font-semibold bg-white/5' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
        >
            {label}
        </button>
    );
}

function NoRepoState({ tab, onIngest }: {
    tab: string;
    onIngest: () => void;
}) {
    const labels: Record<string, string> = {
        chat: 'Chat with your codebase',
        analyzer: 'Analyze repository architecture',
        arch: 'View architecture diagrams',
        issues: 'Browse GitHub issues',
        pr: 'Review pull requests',
    };
    return (
        <div className="flex flex-col items-center justify-center py-20 space-y-5 text-center">
            <div className="p-5 rounded-2xl bg-[#1a1a1e] border border-white/10">
                <FolderGit2 className="w-10 h-10 text-zinc-500" />
            </div>
            <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">{labels[tab] || 'No Repository'}</h3>
                <p className="text-xs text-zinc-500 max-w-sm">
                    Ingest a GitHub repository to unlock this feature.
                </p>
            </div>
            <button
                onClick={onIngest}
                className="px-5 py-2.5 rounded-xl bg-[#5e6ad2] hover:bg-[#4b57c6] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
            >
                <Plus className="w-3.5 h-3.5" />
                <span>Ingest a Repository</span>
            </button>
        </div>
    );
}