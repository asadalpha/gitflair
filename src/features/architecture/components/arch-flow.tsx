'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

interface ArchNode {
    id: string;
    label: string;
    type: 'frontend' | 'gateway' | 'service' | 'database' | 'ai';
    tech: string;
    status: 'active' | 'standby';
    desc: string;
}

interface RepoAnalysis {
    summary?: string;
    architecture?: string;
    improvements?: { title: string; desc: string; files: string[] }[];
}

export default function ArchFlow({ repoName, repoUrl, languages, analysis }: { repoName: string; repoUrl?: string; languages?: Record<string, number> | null; analysis?: RepoAnalysis }) {
    const nodes = useMemo<ArchNode[]>(() => {
        const languageEntries = Object.entries(languages || {}).sort(([, a], [, b]) => b - a);
        const languageSummary = languageEntries.length
            ? languageEntries.map(([name, bytes]) => `${name} (${bytes.toLocaleString()} bytes)`).join(', ')
            : 'No language data returned by GitHub';
        const findingCount = analysis?.improvements?.length || 0;
        return [
            { id: 'repo', label: repoName.toUpperCase(), type: 'service', tech: repoUrl || 'GitHub repository', status: 'active', desc: 'Repository currently selected in GitFlair.' },
            { id: 'languages', label: 'DETECTED LANGUAGES', type: 'service', tech: `${languageEntries.length} language${languageEntries.length === 1 ? '' : 's'}`, status: 'active', desc: languageSummary },
            { id: 'architecture', label: 'ARCHITECTURE EVIDENCE', type: 'ai', tech: 'Analysis generated from indexed files', status: analysis?.architecture ? 'active' : 'standby', desc: analysis?.architecture || 'Architecture analysis is not available yet.' },
            { id: 'findings', label: 'AI FINDINGS', type: 'ai', tech: `${findingCount} improvement${findingCount === 1 ? '' : 's'}`, status: findingCount ? 'active' : 'standby', desc: findingCount ? analysis!.improvements!.map(item => item.title).join(' · ') : 'No improvement findings are available.' },
        ];
    }, [analysis, languages, repoName, repoUrl]);
    const [selectedNode, setSelectedNode] = useState<ArchNode | null>(null);
    const [prompt, setPrompt] = useState('');

    const selected = selectedNode || nodes[0];

    const handleFocus = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;
        const query = prompt.toLowerCase();
        const match = nodes.find(node => `${node.label} ${node.tech} ${node.desc}`.toLowerCase().includes(query));
        setSelectedNode(match || nodes[nodes.length - 1]);
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
                         Evidence-based view for {repoName}; values come from this repository only.
                    </p>
                </div>

                <form onSubmit={handleFocus} className="flex items-center gap-2 w-full md:w-auto">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Find language, architecture, or finding..."
                        className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs font-mono-tech text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 w-full md:w-64"
                    />
                        <button
                            type="submit"
                            disabled={!prompt.trim()}
                            className="boxy-btn py-1.5 px-3 text-[11px] shrink-0 disabled:opacity-40"
                        >
                            [ FIND NODE ]
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
                            <span className={`w-1.5 h-1.5 rounded-none ${node.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
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

                {/* Actual request/data path */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25">
                    <line x1="10%" y1="50%" x2="90%" y2="50%" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 6" />
                </svg>

                {analysis && (
                    <div className="relative z-10 mt-6 grid md:grid-cols-2 gap-3">
                        <div className="p-3 border border-zinc-800 bg-zinc-900/70">
                            <div className="text-[10px] text-blue-400 font-bold mb-1">[ REPOSITORY ANALYSIS ]</div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">{analysis.summary || analysis.architecture || 'Repository analysis available.'}</p>
                        </div>
                        {analysis.improvements?.length ? (
                            <div className="p-3 border border-zinc-800 bg-zinc-900/70">
                                <div className="text-[10px] text-amber-400 font-bold mb-1">[ DETECTED IMPROVEMENTS ]</div>
                                <p className="text-[11px] text-zinc-400 leading-relaxed">{analysis.improvements.slice(0, 2).map(item => item.title).join(' · ')}</p>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Selected Node Details Drawer */}
                {selected && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 p-4 boxy-card border-zinc-800 bg-zinc-900/90 font-mono-tech text-xs"
                    >
                        <div className="flex items-center justify-between mb-2 border-b border-zinc-800 pb-2">
                            <span className="text-blue-400 font-bold">[ EVIDENCE ] {selected.label}</span>
                            <span className="text-zinc-600 text-[10px]">ID: {selected.id}</span>
                        </div>
                        <p className="text-zinc-300 leading-relaxed font-light">{selected.desc}</p>
                        <div className="mt-3 flex items-center gap-4 text-[10px] text-zinc-500">
                            <span>DATA: <strong className="text-zinc-300">{selected.tech}</strong></span>
                            <span>STATUS: <strong className={selected.status === 'active' ? 'text-emerald-400' : 'text-zinc-500'}>{selected.status.toUpperCase()}</strong></span>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
