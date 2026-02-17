'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Code2, FileText, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { showToast } from '@/components/Toast';

interface Chunk {
    file_path: string;
    content: string;
    start_line: number;
    end_line: number;
    language: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    chunks?: Chunk[];
    hasHiddenChunks?: boolean;
}

interface ChatInterfaceProps {
    repoId: string;
    repoUrl: string;
    userId: string;
}

function buildGitHubLink(repoUrl: string, filePath: string, startLine: number, endLine: number): string {
    // Convert github.com/user/repo → github.com/user/repo/blob/main/path#L1-L10
    const base = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
    return `${base}/blob/main/${filePath}#L${startLine}-L${endLine}`;
}

export default function ChatInterface({ repoId, repoUrl, userId }: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedSnippets, setExpandedSnippets] = useState<Record<number, boolean>>({});
    const scrollRef = useRef<HTMLDivElement>(null);
    const [hiddenChunksMap, setHiddenChunksMap] = useState<Record<number, Chunk[]>>({});
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Load saved chat history on mount
    useEffect(() => {
        async function loadChatHistory() {
            try {
                const res = await fetch(`/api/history?repoId=${repoId}&userId=${userId}`);
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    // History comes newest-first, reverse to show oldest first
                    const restored: Message[] = [];
                    for (const entry of data.reverse()) {
                        restored.push({ role: 'user', content: entry.question });
                        restored.push({ role: 'assistant', content: entry.answer });
                    }
                    setMessages(restored);
                }
            } catch {
                // silently fail
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
    }, [messages]);

    const toggleSnippets = (index: number) => {
        setExpandedSnippets(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const handleShowCode = async (messageIndex: number) => {
        // Re-ask the same question but force include chunks
        const originalQuestion = messages.slice(0, messageIndex).reverse().find(m => m.role === 'user');
        if (!originalQuestion) return;

        setIsLoading(true);
        try {
            const response = await fetch('/api/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: `show me the code for: ${originalQuestion.content}`,
                    repoId,
                    userId
                }),
            });
            const data = await response.json();
            if (data.chunks && data.chunks.length > 0) {
                // Update that message to include chunks
                setHiddenChunksMap(prev => ({ ...prev, [messageIndex]: data.chunks }));
                setExpandedSnippets(prev => ({ ...prev, [messageIndex]: true }));
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to retrieve code snippets';
            showToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: userMessage, repoId, userId }),
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const hasChunks = data.chunks && data.chunks.length > 0;

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.answer,
                chunks: hasChunks ? data.chunks : undefined,
                hasHiddenChunks: !hasChunks, // Flag to show "view code?" button
            }]);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Something went wrong';
            showToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const getChunksForMessage = (index: number, message: Message): Chunk[] => {
        return hiddenChunksMap[index] || message.chunks || [];
    };

    return (
        <div className="flex flex-col h-[600px] w-full glass-card overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3 border-b border-zinc-800/60 flex items-center gap-2">
                <Code2 size={16} className="text-blue-400" />
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Code Q&A</span>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-5 space-y-5 scroll-smooth"
            >
                <AnimatePresence initial={false}>
                    {isLoadingHistory && messages.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex items-center justify-center text-zinc-600"
                        >
                            <Loader2 className="animate-spin" size={20} />
                            <span className="ml-2 text-xs">Loading conversation...</span>
                        </motion.div>
                    )}
                    {!isLoadingHistory && messages.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-3"
                        >
                            <Code2 size={40} strokeWidth={1} />
                            <p className="font-light text-sm">Ask anything about the codebase...</p>
                            <div className="flex flex-wrap gap-2 mt-2 max-w-md justify-center">
                                {['What does this project do?', 'Suggest folder structure improvements', 'What tech stack is used?', 'Show me the main entry point'].map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => { setInput(q); }}
                                        className="text-[11px] px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                    {messages.map((m, i) => {
                        const chunks = getChunksForMessage(i, m);
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] rounded-2xl p-4 ${m.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-zinc-800/40 text-zinc-200 border border-zinc-700/40'
                                    }`}>
                                    <div className="whitespace-pre-wrap leading-relaxed text-[13px]">
                                        {m.content}
                                    </div>

                                    {/* "View relevant code?" button - when snippets were hidden */}
                                    {m.role === 'assistant' && m.hasHiddenChunks && chunks.length === 0 && (
                                        <button
                                            onClick={() => handleShowCode(i)}
                                            disabled={isLoading}
                                            className="mt-3 pt-3 border-t border-zinc-700/30 w-full text-left flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                                        >
                                            <Code2 size={12} />
                                            View relevant code?
                                        </button>
                                    )}

                                    {/* Collapsible code snippets */}
                                    {m.role === 'assistant' && chunks.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-zinc-700/30">
                                            <button
                                                onClick={() => toggleSnippets(i)}
                                                className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest"
                                            >
                                                {expandedSnippets[i] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                <FileText size={10} />
                                                {chunks.length} source snippets
                                            </button>

                                            <AnimatePresence>
                                                {expandedSnippets[i] && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="space-y-3 mt-3">
                                                            {chunks.map((chunk, ci) => {
                                                                const ghLink = buildGitHubLink(repoUrl, chunk.file_path, chunk.start_line, chunk.end_line);
                                                                return (
                                                                    <div key={ci} className="rounded-lg overflow-hidden border border-zinc-700/50">
                                                                        <div className="bg-zinc-900/80 px-3 py-1.5 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                                                                            <a
                                                                                href={ghLink}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="flex items-center gap-1 truncate max-w-[260px] hover:text-blue-400 transition-colors"
                                                                            >
                                                                                {chunk.file_path}
                                                                                <ExternalLink size={8} className="flex-shrink-0 opacity-60" />
                                                                            </a>
                                                                            <span className="text-zinc-600">L{chunk.start_line}–{chunk.end_line}</span>
                                                                        </div>
                                                                        <SyntaxHighlighter
                                                                            language={chunk.language}
                                                                            style={atomDark}
                                                                            customStyle={{
                                                                                margin: 0,
                                                                                padding: '12px',
                                                                                fontSize: '11px',
                                                                                lineHeight: '1.5',
                                                                                background: '#0c0c0c',
                                                                                maxHeight: '350px',
                                                                            }}
                                                                            showLineNumbers
                                                                            startingLineNumber={chunk.start_line}
                                                                        >
                                                                            {chunk.content}
                                                                        </SyntaxHighlighter>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                    >
                        <div className="bg-zinc-800/40 rounded-2xl p-4 flex items-center gap-2 border border-zinc-700/40">
                            <Loader2 className="animate-spin text-blue-400" size={14} />
                            <span className="text-xs text-zinc-400">Analyzing code...</span>
                        </div>
                    </motion.div>
                )}
            </div>

            <div className="p-4 border-t border-zinc-800/60">
                <div className="flex items-center gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Ask about the code..."
                        rows={1}
                        className="flex-1 bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-none placeholder:text-zinc-600"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-all flex-shrink-0"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
