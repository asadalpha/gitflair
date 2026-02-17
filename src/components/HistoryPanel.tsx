'use client';

import { useState, useEffect } from 'react';
import { History, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface HistoryItem {
    id: string;
    question: string;
    created_at: string;
    references_json: { file_path: string; start_line: number; end_line: number; }[];
}

interface HistoryPanelProps {
    repoId: string;
    userId: string;
}

export default function HistoryPanel({ repoId, userId }: HistoryPanelProps) {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchHistory() {
            try {
                const res = await fetch(`/api/history?repoId=${repoId}&userId=${userId}`);
                const data = await res.json();
                setHistory(data);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchHistory();

        // Refresh every 30 seconds
        const interval = setInterval(fetchHistory, 30000);
        return () => clearInterval(interval);
    }, [repoId, userId]);

    if (history.length === 0 && !isLoading) return null;

    return (
        <div className="w-full max-w-lg mx-auto mt-12 mb-20">
            <div className="flex items-center gap-2 text-zinc-400 mb-6">
                <History size={18} />
                <h2 className="text-sm font-medium uppercase tracking-widest">Recent Q&A</h2>
            </div>
            <div className="space-y-3">
                {history.map((item, i) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="group glass-card p-4 hover:bg-zinc-800/50 transition-colors cursor-default"
                    >
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-zinc-200 line-clamp-1 group-hover:line-clamp-none transition-all">
                                    {item.question}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500 font-mono">
                                    <span className="flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(item.created_at).toLocaleTimeString()}
                                    </span>
                                    <span>|</span>
                                    <span>{item.references_json?.length || 0} files cited</span>
                                </div>
                            </div>
                            <ArrowRight size={14} className="text-zinc-600 group-hover:text-blue-500 transition-colors mt-1" />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
