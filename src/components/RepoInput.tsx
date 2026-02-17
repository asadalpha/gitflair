'use client';

import { useState } from 'react';
import { Github, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface RepoInputProps {
    onIngest: (url: string) => void;
    isLoading: boolean;
}

export default function RepoInput({ onIngest, isLoading }: RepoInputProps) {
    const [url, setUrl] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            onIngest(url.trim());
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl mx-auto"
        >
            <form onSubmit={handleSubmit} className="relative glow-ring">
                <div className={`absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors duration-200 ${isFocused ? 'text-blue-400' : 'text-zinc-600'}`}>
                    <Github size={18} />
                </div>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="github.com/user/repository"
                    className="w-full bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-2xl pl-12 pr-32 py-4 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500/40 transition-all font-light tracking-wide"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !url.trim()}
                    className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-5 rounded-xl transition-all flex items-center gap-2 text-sm font-medium"
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin" size={16} />
                    ) : (
                        <>
                            <span>Index</span>
                            <ArrowRight size={14} />
                        </>
                    )}
                </button>
            </form>
            {isLoading && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-zinc-600 text-xs mt-3 text-center"
                >
                    Fetching and embedding code... this may take a minute.
                </motion.p>
            )}
        </motion.div>
    );
}
