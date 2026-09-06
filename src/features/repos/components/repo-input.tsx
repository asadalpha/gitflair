'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Github, ArrowRight, Loader2 } from 'lucide-react';

interface RepoInputProps {
    onIngest: (url: string) => void;
    isLoading: boolean;
}

export default function RepoInput({ onIngest, isLoading }: RepoInputProps) {
    const [url, setUrl] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            onIngest(url.trim());
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-3"
        >
            <form onSubmit={handleSubmit} className="p-1.5 rounded-2xl bg-[#141417] border border-white/10 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="flex-1 flex items-center px-3.5 py-2.5 bg-[#1a1a1e] rounded-xl border border-white/5 w-full">
                        <Github className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://github.com/owner/repository"
                            className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                            disabled={isLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !url.trim()}
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs flex items-center gap-2 transition-all disabled:opacity-30 shrink-0"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                                <span>Analyzing...</span>
                            </>
                        ) : (
                            <>
                                <span>Ingest Repo</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </>
                        )}
                    </button>
                </div>
            </form>

            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-[#141417] border border-white/5 text-center text-xs text-zinc-400 flex items-center justify-center gap-2 rounded-xl font-mono"
                >
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    <span>Indexing repository vectors & architecture...</span>
                </motion.div>
            )}
        </motion.div>
    );
}

