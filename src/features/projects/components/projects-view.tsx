'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Box, Plus, BookOpen, Layers, FolderGit2, Sparkles } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import RepoInput from '@/features/repos/components/repo-input';

interface ProjectsViewProps {
    onIngest?: (url: string) => Promise<void>;
    isIngesting?: boolean;
}

export default function ProjectsView({ onIngest, isIngesting }: ProjectsViewProps) {
    const [projects, setProjects] = useState<{ id: string; name: string; desc: string; date: string }[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState<'repo' | 'project'>('repo');
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');

    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        const newProj = {
            id: `proj-${Date.now()}`,
            name: name.trim(),
            desc: desc.trim() || 'New feature project',
            date: 'Just now',
        };
        setProjects([newProj, ...projects]);
        setName('');
        setDesc('');
        setShowModal(false);
        showToast('New project created!', 'success');
    };

    return (
        <div className="min-h-[calc(100vh-6rem)] flex flex-col justify-center items-center font-sans bg-[#0c0c0e] text-zinc-300 p-6 sm:p-12">
            {projects.length === 0 ? (
                /* Empty Projects View (Exact Match of Image 1) */
                <div className="max-w-xl mx-auto space-y-6 text-left">
                    {/* Isometric 3D Cubes Wireframe Icon Illustration */}
                    <div className="w-24 h-24 relative">
                        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-zinc-400">
                            {/* Cube 1 */}
                            <path d="M50 15 L75 28 L50 42 L25 28 Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                            <path d="M25 28 L25 55 L50 68 L50 42 Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                            <path d="M75 28 L75 55 L50 68 L50 42 Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                            {/* Cube 2 Top Right */}
                            <path d="M75 42 L95 53 L75 65 L55 53 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                            <path d="M55 53 L55 75 L75 87 L75 65 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                            <path d="M95 53 L95 75 L75 87 L75 65 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                            {/* Cube 3 Bottom Left */}
                            <path d="M25 42 L45 53 L25 65 L5 53 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                            <path d="M5 53 L5 75 L25 87 L25 65 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                            <path d="M45 53 L45 75 L25 87 L25 65 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                        </svg>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
                        <p className="text-sm text-zinc-400 leading-relaxed font-normal">
                            Projects are larger units of work with a clear outcome, such as a new feature you want to ship or an ingested GitHub repository. They can be shared across multiple teams and are comprised of issues and optional documents.
                        </p>
                    </div>

                    {/* Action Buttons (Exact Image 1 Match) */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-4 py-2 rounded-full bg-[#5e6ad2] hover:bg-[#4b57c6] text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
                        >
                            <span>Create new project</span>
                            <div className="flex items-center gap-1 font-mono text-[10px]">
                                <span className="px-1.5 py-0.5 rounded bg-white/20">N</span>
                                <span>then</span>
                                <span className="px-1.5 py-0.5 rounded bg-white/20">P</span>
                            </div>
                        </button>

                        <button className="px-4 py-2 rounded-full bg-[#1c1c20] hover:bg-[#25252c] text-white font-medium text-xs border border-white/5 transition-all">
                            Documentation
                        </button>
                    </div>
                </div>
            ) : (
                /* Projects List Grid */
                <div className="max-w-4xl mx-auto w-full space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div>
                            <h2 className="text-xl font-bold text-white">Active Projects</h2>
                            <p className="text-xs text-zinc-400">Track initiatives and feature scope</p>
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-4 py-2 rounded-full bg-[#5e6ad2] text-white text-xs font-semibold"
                        >
                            + New Project
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {projects.map((p) => (
                            <div key={p.id} className="p-5 rounded-2xl bg-[#141417] border border-white/10 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-purple-400" />
                                        <h3 className="text-sm font-bold text-white">{p.name}</h3>
                                    </div>
                                    <span className="text-[10px] font-mono text-zinc-500">{p.date}</span>
                                </div>
                                <p className="text-xs text-zinc-400">{p.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Project / Ingest Repo Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#141417] border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <h3 className="text-base font-bold text-white">Add New Project or Repo</h3>
                            <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white text-xs">
                                ✕
                            </button>
                        </div>

                        {/* Modal Tab Switcher */}
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <button
                                onClick={() => setActiveModalTab('repo')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                                    activeModalTab === 'repo'
                                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <FolderGit2 className="w-3.5 h-3.5" />
                                <span>Ingest GitHub Repo</span>
                            </button>
                            <button
                                onClick={() => setActiveModalTab('project')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                                    activeModalTab === 'project'
                                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span>Create Local Project</span>
                            </button>
                        </div>

                        {activeModalTab === 'repo' ? (
                            <div className="pt-1">
                                {onIngest ? (
                                    <RepoInput
                                        onIngest={async (url) => {
                                            await onIngest(url);
                                            setShowModal(false);
                                        }}
                                        isLoading={isIngesting ?? false}
                                    />
                                ) : (
                                    <p className="text-xs text-zinc-500 font-mono">Ingest service unavailable</p>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleCreateProject} className="space-y-4">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Project name..."
                                    className="w-full bg-[#1c1c20] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                                />
                                <textarea
                                    value={desc}
                                    onChange={(e) => setDesc(e.target.value)}
                                    placeholder="Description / outcome..."
                                    className="w-full bg-[#1c1c20] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                                    rows={3}
                                />
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-xs text-zinc-400">Cancel</button>
                                    <button type="submit" className="px-4 py-2 rounded-xl bg-[#5e6ad2] text-white text-xs font-semibold">Create Project</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

