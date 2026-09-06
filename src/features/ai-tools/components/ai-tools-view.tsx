'use client';

import { motion } from 'framer-motion';
import { Sparkles, Bot } from 'lucide-react';

export default function AIToolsView() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center font-sans space-y-6 max-w-md mx-auto">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-xl relative"
            >
                <Bot className="w-8 h-8" />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400" />
            </motion.div>

            <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[11px] font-mono font-bold text-purple-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI TOOLS</span>
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">AI Tools</h1>
                <p className="text-xs text-zinc-400 leading-relaxed">
                    AI-powered code refactoring, automated test generation, and multi-agent workflows are currently in development.
                </p>
            </div>

            <div className="px-4 py-2 rounded-xl bg-[#121215] border border-white/10 text-xs font-mono text-amber-400 font-semibold shadow-sm">
                Coming Soon
            </div>
        </div>
    );
}
