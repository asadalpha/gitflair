'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface ArchNode {
    id: string;
    label: string;
    type: 'frontend' | 'gateway' | 'service' | 'database' | 'ai';
    tech: string;
    status: 'active' | 'standby';
    desc: string;
}

const DEFAULT_NODES: ArchNode[] = [
    { id: 'node-1', label: 'CLIENT FRONTEND', type: 'frontend', tech: 'Next.js 16 + React 19', status: 'active', desc: 'Minimal dark boxy UI with terminal state' },
    { id: 'node-2', label: 'API GATEWAY', type: 'gateway', tech: 'App Router API Routes', status: 'active', desc: 'Rate limiting, user session validation & routing' },
    { id: 'node-3', label: 'NEON POSTGRES', type: 'database', tech: 'Neon DB + Drizzle + pgvector', status: 'active', desc: 'Relational data + 384-dim vector embeddings' },
    { id: 'node-4', label: 'LOCAL EMBEDDER', type: 'ai', tech: 'Transformers.js (all-MiniLM-L6-v2)', status: 'active', desc: 'Offline 384-dimensional vector extraction' },
    { id: 'node-5', label: 'LLM REASONING', type: 'ai', tech: 'Gemini 2.5 Flash / OpenRouter', status: 'active', desc: 'RAG context synthesis & PR review generation' },
];

export default function ArchFlow({ repoName }: { repoName: string }) {
    const [nodes, setNodes] = useState<ArchNode[]>(DEFAULT_NODES);
    const [selectedNode, setSelectedNode] = useState<ArchNode | null>(DEFAULT_NODES[0]);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setIsGenerating(true);
        setTimeout(() => {
            const customNodes: ArchNode[] = [
                { id: 'c-1', label: 'INGRESS LOAD BALANCER', type: 'gateway', tech: 'NGINX / Cloudflare', status: 'active', desc: 'TLS termination and request routing' },
                { id: 'c-2', label: 'MICROSERVICE CORE', type: 'service', tech: 'Node.js / Go Workers', status: 'active', desc: 'Event-driven message consumer' },
                { id: 'c-3', label: 'CACHE LAYER', type: 'database', tech: 'Redis / Upstash', status: 'active', desc: 'Sub-millisecond query result caching' },
                { id: 'c-4', label: 'NEON POSTGRES VECTOR', type: 'database', tech: 'Neon + pgvector(384)', status: 'active', desc: 'Persistent code embeddings' },
                { id: 'c-5', label: 'AI REASONING PIPELINE', type: 'ai', tech: 'Gemini RAG Pipeline', status: 'active', desc: 'Context-grounded answer engine' },
            ];
            setNodes(customNodes);
            setSelectedNode(customNodes[0]);
            setIsGenerating(false);
        }, 1200);
    };

    return (
        <div className="space-y-6">
            {/* Control Bar */}
            <div className="boxy-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-blue-400 font-mono-tech text-xs font-bold">[ SYS_FLOW ]</span>
                        <h3 className="text-xs font-mono-tech uppercase font-bold text-zinc-200">
                            AI System Architecture Diagram
                        </h3>
                    </div>
                    <p className="text-[11px] font-mono-tech text-zinc-500 mt-1">
                        Interactive node graph for {repoName}
                    </p>
                </div>

                <form onSubmit={handleGenerate} className="flex items-center gap-2 w-full md:w-auto">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. Add Redis cache and microservice worker..."
                        className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs font-mono-tech text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 w-full md:w-64"
                    />
                    <button
                        type="submit"
                        disabled={isGenerating || !prompt.trim()}
                        className="boxy-btn py-1.5 px-3 text-[11px] shrink-0 disabled:opacity-40"
                    >
                        {isGenerating ? '[ GENERATING... ]' : '[ GENERATE FLOW ]'}
                    </button>
                </form>
            </div>

            {/* Canvas Area */}
            <div className="boxy-card p-6 min-h-[420px] relative overflow-hidden bg-zinc-950/80">
                {/* Background Tech Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:16px_16px] opacity-40 pointer-events-none" />

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    {nodes.map((node, index) => {
                        const isSelected = selectedNode?.id === node.id;
                        return (
                            <motion.div
                                key={node.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.08 }}
                                onClick={() => setSelectedNode(node)}
                                className={`boxy-card p-4 cursor-pointer relative transition-all ${
                                    isSelected
                                        ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                                        : 'hover:border-zinc-600 bg-zinc-900/60'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="mono-badge text-[9px] uppercase font-bold text-zinc-400">
                                        NODE 0{index + 1}
                                    </span>
                                    <span className="w-1.5 h-1.5 rounded-none bg-emerald-400 animate-pulse" />
                                </div>
                                <h4 className="text-xs font-mono-tech font-bold text-zinc-100 truncate">
                                    {node.label}
                                </h4>
                                <p className="text-[10px] font-mono-tech text-zinc-500 mt-1 truncate">
                                    {node.tech}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>

                {/* SVG Flow Lines Connector */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25">
                    <line x1="10%" y1="50%" x2="90%" y2="50%" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 6" />
                </svg>

                {/* Selected Node Details Drawer */}
                {selectedNode && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 p-4 boxy-card border-zinc-800 bg-zinc-900/90 font-mono-tech text-xs"
                    >
                        <div className="flex items-center justify-between mb-2 border-b border-zinc-800 pb-2">
                            <span className="text-blue-400 font-bold">[ SPECIFICATION ] {selectedNode.label}</span>
                            <span className="text-zinc-600 text-[10px]">ID: {selectedNode.id}</span>
                        </div>
                        <p className="text-zinc-300 leading-relaxed font-light">{selectedNode.desc}</p>
                        <div className="mt-3 flex items-center gap-4 text-[10px] text-zinc-500">
                            <span>TECH: <strong className="text-zinc-300">{selectedNode.tech}</strong></span>
                            <span>STATUS: <strong className="text-emerald-400">{selectedNode.status.toUpperCase()}</strong></span>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
