'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Send,
    Loader2,
    MessageSquare,
    Bot,
    User,
    Copy,
    Check,
    FileCode,
    Sparkles,
    RefreshCw,
    CornerDownLeft,
    Shield,
    Zap,
    Cpu,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { showToast } from '@/components/ui/toast';

interface Chunk {
    file_path: string;
    content: string;
    start_line: number;
    end_line: number;
    language?: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    chunks?: Chunk[];
}

interface ChatInterfaceProps {
    repoId: string;
    userId: string;
    repoUrl?: string;
    onFileClick: (path: string) => void;
}

const SUGGESTED_PROMPTS = [
    { icon: <Zap className="w-3.5 h-3.5 text-amber-400" />, title: 'Performance Bottlenecks', prompt: 'Where are the potential performance bottlenecks or unindexed DB queries?' },
    { icon: <Shield className="w-3.5 h-3.5 text-rose-400" />, title: 'Security Hotspots', prompt: 'Audit the authentication flows and endpoint session checks for security issues.' },
    { icon: <Cpu className="w-3.5 h-3.5 text-blue-400" />, title: 'System Architecture', prompt: 'Explain the high-level architecture, main directory structure, and state management.' },
    { icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />, title: 'Refactoring Ideas', prompt: 'Which modules or files would benefit most from refactoring or modularization?' },
];

export default function ChatInterface({ repoId, userId, onFileClick }: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [expandedChunks, setExpandedChunks] = useState<Record<number, boolean>>({});
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);

    // Load saved chat history on mount
    useEffect(() => {
        async function loadChatHistory() {
            try {
                const res = await fetch(`/api/history?repositoryId=${repoId}&userId=${userId}`);
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const restored: Message[] = [];
                    for (const entry of data.reverse()) {
                        restored.push({ role: 'user', content: entry.question });
                        const chunks = (entry.referencesJson || []).map((ref: { file_path: string; start_line: number; end_line: number }) => ({
                            file_path: ref.file_path,
                            start_line: ref.start_line,
                            end_line: ref.end_line,
                            content: '',
                            language: ''
                        }));
                        restored.push({ role: 'assistant', content: entry.answer, chunks });
                    }
                    setMessages(restored);
                }
            } catch {
                // silently handle fallback
            } finally {
                setIsLoadingHistory(false);
            }
        }
        loadChatHistory();
    }, [repoId, userId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async (customPrompt?: string) => {
        const queryText = customPrompt || input;
        if (!queryText.trim() || isLoading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: queryText }]);
        setIsLoading(true);
        let firstTokenReceived = false;

        const assistantIndex = messages.length + 1;
        setMessages(prev => [...prev, { role: 'assistant', content: '', chunks: undefined }]);

        try {
            const response = await fetch('/api/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: queryText, repositoryId: repoId, userId }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${response.status}`);
            }

            if (!response.body) throw new Error('No response stream');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let receivedChunks: Chunk[] | undefined;
            let hasError = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const block of lines) {
                    const trimmed = block.trim();
                    if (!trimmed.startsWith('data: ')) continue;
                    try {
                        const msg = JSON.parse(trimmed.slice(6));
                        if (msg.type === 'chunks') {
                            receivedChunks = msg.chunks?.length > 0 ? msg.chunks : undefined;
                            setMessages(prev => prev.map((m, i) =>
                                i === assistantIndex ? { ...m, chunks: receivedChunks } : m
                            ));
                        } else if (msg.type === 'token') {
                            if (!isStreaming) setIsStreaming(true);
                            setMessages(prev => prev.map((m, i) =>
                                i === assistantIndex ? { ...m, content: m.content + msg.text } : m
                            ));
                        } else if (msg.type === 'done') {
                            void 0;
                        } else if (msg.type === 'error') {
                            hasError = true;
                            showToast(msg.error || 'LLM error', 'error');
                            setMessages(prev => prev.filter((_, i) => i !== assistantIndex));
                        }
                    } catch {
                        void 0;
                    }
                }
            }

            if (hasError) {
                void 0;
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Something went wrong';
            showToast(message, 'error');
            setMessages(prev => prev.filter((_, i) => i !== assistantIndex));
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        showToast('Response copied to clipboard', 'info');
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const toggleChunks = (index: number) => {
        setExpandedChunks(prev => ({ ...prev, [index]: !prev[index] }));
    };

    return (
        <div className="flex flex-col h-[620px] w-full matte-card bg-[#161619] border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#121215]">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        <Bot size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">Codebase Intelligence Assistant</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                GEMINI 2.0 FLASH
                            </span>
                        </div>
                        <span className="text-[11px] text-zinc-500 block">Context-aware Q&A indexed via 384-dim vectors</span>
                    </div>
                </div>
                {messages.length > 0 && (
                    <button
                        onClick={() => setMessages([])}
                        className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e1e22] border border-white/5 transition-all"
                    >
                        <RefreshCw size={12} />
                        <span>Clear</span>
                    </button>
                )}
            </div>

            {/* Messages Body */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-[#0d0d0f]/50"
            >
                <AnimatePresence initial={false}>
                    {isLoadingHistory && messages.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2"
                        >
                            <Loader2 className="animate-spin text-blue-400" size={24} />
                            <span className="text-xs font-mono">Restoring conversation history...</span>
                        </motion.div>
                    )}

                    {!isLoadingHistory && messages.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="h-full flex flex-col items-center justify-center text-center space-y-6 px-4 py-8"
                        >
                            <div className="p-4 rounded-2xl bg-[#1a1a1e] border border-white/10 text-blue-400 shadow-xl">
                                <Sparkles size={32} />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-white">Ask anything about this repository</h3>
                                <p className="text-xs text-zinc-400 max-w-sm mt-1">
                                    Deep code search, vector retrieval, and architectural explanations powered by repository embeddings.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
                                {SUGGESTED_PROMPTS.map((item) => (
                                    <button
                                        key={item.title}
                                        onClick={() => handleSend(item.prompt)}
                                        className="p-3.5 rounded-xl bg-[#161619] hover:bg-[#1e1e22] border border-white/5 hover:border-white/15 text-left transition-all group"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            {item.icon}
                                            <span className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                                                {item.title}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                                            {item.prompt}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {messages.map((m, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {m.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-1">
                                    <Bot size={16} />
                                </div>
                            )}

                            <div className={`max-w-[82%] rounded-2xl p-4 shadow-md ${
                                m.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-[#161619] border border-white/10 text-zinc-200 rounded-tl-none'
                            }`}>
                                {m.role === 'assistant' ? (
                                    <div className="prose prose-invert prose-xs max-w-none text-xs leading-relaxed font-sans">
                                        <ReactMarkdown>{m.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="text-xs leading-relaxed font-normal">{m.content}</p>
                                )}

                                {/* Cited Code File References Drawer */}
                                {m.role === 'assistant' && m.chunks && m.chunks.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-white/5">
                                        <button
                                            onClick={() => toggleChunks(i)}
                                            className="flex items-center justify-between w-full text-[11px] text-zinc-400 hover:text-white font-mono mb-2"
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <FileCode size={12} className="text-blue-400" />
                                                <span>Referenced Files ({m.chunks.length})</span>
                                            </span>
                                            {expandedChunks[i] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        </button>

                                        <div className="flex flex-wrap gap-1.5">
                                            {Array.from(new Set(m.chunks.map(c => c.file_path))).map((file) => (
                                                <button
                                                    key={file}
                                                    onClick={() => onFileClick(file)}
                                                    className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 bg-[#121215] hover:bg-[#1e1e22] border border-white/5 text-blue-400 rounded-lg font-mono transition-all text-left truncate max-w-[240px]"
                                                >
                                                    <FileCode size={12} />
                                                    <span className="truncate">{file}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action bar for assistant response */}
                                {m.role === 'assistant' && (
                                    <div className="mt-3 pt-2 flex items-center justify-end border-t border-white/5">
                                        <button
                                            onClick={() => copyToClipboard(m.content, i)}
                                            className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 font-mono transition-colors"
                                        >
                                            {copiedIndex === i ? (
                                                <>
                                                    <Check size={12} className="text-emerald-400" />
                                                    <span className="text-emerald-400">Copied</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={12} />
                                                    <span>Copy</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {m.role === 'user' && (
                                <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-white/10 text-white flex items-center justify-center shrink-0 mt-1">
                                    <User size={16} />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3 justify-start"
                    >
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <Bot size={16} />
                        </div>
                        <div className="bg-[#161619] border border-white/10 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-3 text-xs text-zinc-400 font-mono">
                            <Loader2 className="animate-spin text-blue-400" size={16} />
                            <span>Retrieving codebase context & synthesizing response...</span>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Input Footer Area */}
            <div className="p-4 border-t border-white/5 bg-[#121215]">
                <div className="flex items-center gap-2 bg-[#1b1b1f] border border-white/10 rounded-xl p-1.5 focus-within:border-blue-500/50 transition-all">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Ask about components, routes, database queries or security..."
                        rows={1}
                        className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none"
                    />
                    <div className="flex items-center gap-2 pr-1">
                        <span className="hidden sm:inline-block text-[10px] font-mono text-zinc-500 select-none">
                            Enter ↵
                        </span>
                        <button
                            onClick={() => handleSend()}
                            disabled={isLoading || !input.trim()}
                            className="p-2.5 bg-white text-black font-medium hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-all shrink-0"
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
