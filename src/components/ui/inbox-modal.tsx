'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Inbox, Sparkles, CheckCircle2, Rocket, ArrowUpRight, Zap, FolderGit2 } from 'lucide-react';

interface InboxModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const INBOX_ITEMS = [
    {
        id: 1,
        type: 'vector',
        title: 'Repository Vector Indexing Complete',
        desc: 'Generated 384-dimensional dense embeddings for repository code chunks in Neon Postgres.',
        time: '5 min ago',
        icon: <Zap className="w-4 h-4 text-amber-400" />,
        tag: 'VECTOR SEARCH',
    },
    {
        id: 2,
        type: 'ai',
        title: 'GitFlair AI Agent Review',
        desc: 'Analyzed code review notes and detected zero memory leak vulnerabilities.',
        time: '18 min ago',
        icon: <Sparkles className="w-4 h-4 text-purple-400" />,
        tag: 'AI TRIAGE',
    },
    {
        id: 3,
        type: 'deploy',
        title: 'Production Build Deployed',
        desc: 'Automated CI pipeline deployed release v2.4.0 with DORA lead time under 2 hours.',
        time: '42 min ago',
        icon: <Rocket className="w-4 h-4 text-emerald-400" />,
        tag: 'CI/CD PIPELINE',
    },
    {
        id: 4,
        type: 'note',
        title: 'New Code Audit Note Added',
        desc: 'Added note "Verify exception handling and zero unhandled Promise rejections" to repository notes.',
        time: '1 hour ago',
        icon: <CheckCircle2 className="w-4 h-4 text-blue-400" />,
        tag: 'AUDIT NOTE',
    },
];

export default function InboxModal({ isOpen, onClose }: InboxModalProps) {
    if (!isOpen) return null;

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
                    className="bg-[#121215] border border-white/10 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col font-sans max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Top Bar */}
                    <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#16161a]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <Inbox className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                                    <span>Workspace Inbox</span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                                        4 UNREAD
                                    </span>
                                </h3>
                                <p className="text-xs text-zinc-400">Activity notifications for AI agents, CI builds & vector indexing</p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Inbox Items Feed */}
                    <div className="p-6 overflow-y-auto space-y-3 flex-1">
                        {INBOX_ITEMS.map((item) => (
                            <div
                                key={item.id}
                                className="p-4 rounded-xl bg-[#161619] hover:bg-[#1c1c20] border border-white/5 transition-all flex items-start gap-3.5 group cursor-pointer"
                            >
                                <div className="p-2.5 rounded-xl bg-[#1e1e22] border border-white/5 shrink-0 mt-0.5">
                                    {item.icon}
                                </div>

                                <div className="space-y-1 flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                                                {item.title}
                                            </span>
                                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
                                                {item.tag}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-mono text-zinc-500">{item.time}</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 leading-relaxed font-normal">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/5 bg-[#16161a] flex items-center justify-between text-xs font-mono text-zinc-500">
                        <span>Inbox automatically syncs with GitHub webhooks</span>
                        <button onClick={onClose} className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-sans font-medium transition-all">
                            Mark all as read
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
