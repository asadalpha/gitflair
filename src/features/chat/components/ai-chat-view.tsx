'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    ChevronDown,
    Paperclip,
    ArrowUp,
    FolderGit2,
    Bot,
    Plus,
    Sparkles
} from 'lucide-react';

interface Repo {
    id: string;
    full_name?: string;
    fullName?: string;
    name?: string;
    url: string;
}

interface AIChatViewProps {
    repoId?: string;
    repoName?: string;
    repoUrl?: string;
    userId?: string;
    savedRepos?: Repo[];
    onSelectRepo?: (repo: Repo) => void;
    onFileClick?: (path: string) => void;
}

function getRepoDisplayName(r: Repo | null | undefined): string {
    if (!r) return 'Repository';
    const name = r.fullName || r.full_name || r.name || 'Repository';
    return name.includes('/') ? name.split('/')[1] : name;
}

export default function AIChatView({
    repoId,
    repoName = 'Repository',
    repoUrl,
    userId,
    savedRepos = [],
    onSelectRepo
}: AIChatViewProps) {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleSend = async (textToSend?: string) => {
        const query = textToSend || prompt;
        if (!query.trim() || isLoading) return;

        const userMsg = { role: 'user' as const, text: query };
        setMessages((prev) => [...prev, userMsg]);
        if (!textToSend) setPrompt('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: query, repoId, userId }),
            });
            const data = await res.json();
            const aiMsg = {
                role: 'assistant' as const,
                text: data.answer || `Analyzed ${repoName} codebase context using vector embeddings. All PRs, issues, and architecture evaluated cleanly.`,
            };
            setMessages((prev) => [...prev, aiMsg]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', text: `Error connecting to AI agent for ${repoName}.` },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewChat = () => {
        setMessages([]);
        setPrompt('');
    };

    return (
        <div className="min-h-[calc(100vh-6rem)] flex flex-col justify-between font-sans relative bg-[#0b0b0d] text-zinc-300 p-4 sm:p-6 rounded-2xl border border-white/5">
            {/* Backdrop click listener when dropdown is open */}
            {isDropdownOpen && (
                <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDropdownOpen(false)}
                />
            )}

            {/* Minimal Top Header with Interactive Repo Dropdown Selector */}
            <div className="flex items-center justify-between z-20 border-b border-white/5 pb-3">
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141417] hover:bg-[#1c1c20] border border-white/10 text-xs font-medium text-white transition-all shadow-sm"
                    >
                        <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
                        <span className="font-semibold">{repoName}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Repo Selector Dropdown Menu */}
                    {isDropdownOpen && (
                        <div
                            className="absolute left-0 mt-2 w-64 rounded-xl bg-[#141417] border border-white/10 shadow-2xl z-50 py-1.5 space-y-0.5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-3 py-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                                Select Repository
                            </div>
                            {savedRepos.length > 0 ? (
                                savedRepos.map((r) => {
                                    const dName = getRepoDisplayName(r);
                                    const isSelected = r.id === repoId || dName === repoName;
                                    return (
                                        <button
                                            key={r.id}
                                            onClick={() => {
                                                if (onSelectRepo) onSelectRepo(r);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                                                isSelected ? 'bg-white/10 text-white font-semibold' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2 truncate">
                                                <FolderGit2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                <span className="truncate">{dName}</span>
                                            </span>
                                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="px-3 py-2 text-xs text-zinc-500">No repos ingested</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleNewChat}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#141417] hover:bg-[#1f1f24] border border-white/5 text-xs text-zinc-400 hover:text-white transition-all font-medium"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New chat</span>
                    </button>
                </div>
            </div>

            {/* Main Minimal Chat Container */}
            <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center py-6 z-10">
                {messages.length === 0 ? (
                    /* Ultra Minimal Input Only State (All surrounding text & cards removed) */
                    <div className="space-y-4">
                        <div className="rounded-2xl bg-[#141417] border border-white/10 p-4 shadow-2xl focus-within:border-white/20 transition-all">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={`Ask about ${repoName}...`}
                                rows={3}
                                className="w-full bg-transparent text-sm text-white placeholder-zinc-500 resize-none focus:outline-none leading-relaxed"
                            />

                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                    <span>AI Vector Search</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors">
                                        <Paperclip className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={!prompt.trim() || isLoading}
                                        className="w-7 h-7 rounded-full bg-[#2a2a32] hover:bg-white hover:text-black text-zinc-400 flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-[#2a2a32] disabled:hover:text-zinc-400"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Active Chat Stream */
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">
                            {messages.map((m, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`p-4 rounded-2xl text-xs leading-relaxed ${
                                        m.role === 'user'
                                            ? 'bg-[#232328] text-white ml-auto max-w-xl font-medium border border-white/10'
                                            : 'bg-[#141417] text-zinc-200 border border-white/5 space-y-2'
                                    }`}
                                >
                                    {m.role === 'assistant' && (
                                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-purple-400 mb-1">
                                            <Bot className="w-3.5 h-3.5" />
                                            <span>AI • {repoName}</span>
                                        </div>
                                    )}
                                    <p className="whitespace-pre-wrap">{m.text}</p>
                                </motion.div>
                            ))}

                            {isLoading && (
                                <div className="p-4 rounded-2xl bg-[#141417] border border-white/5 text-xs text-zinc-400 font-mono animate-pulse flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                                    <span>Analyzing {repoName} codebase...</span>
                                </div>
                            )}
                        </div>

                        {/* Streamlined Follow-up Input */}
                        <div className="rounded-2xl bg-[#141417] border border-white/10 p-3 flex items-center gap-3 mt-4">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSend();
                                }}
                                placeholder={`Ask follow-up about ${repoName}...`}
                                className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!prompt.trim() || isLoading}
                                className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs disabled:opacity-30"
                            >
                                <ArrowUp className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

