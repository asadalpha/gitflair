'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { showToast } from '@/components/ui/toast';
import { CheckCircle2, Circle, Plus, Loader2, CheckSquare, FolderGit2 } from 'lucide-react';

interface NoteItem {
    id: string;
    code: string;
    title: string;
    completed: boolean;
    category: string;
    assignee: string;
    date: string;
}

interface CodeReviewNotesProps {
    repoId: string;
    userId: string;
}

export default function CodeReviewNotes({ repoId, userId }: CodeReviewNotesProps) {
    const [notes, setNotes] = useState<NoteItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTitle, setNewTitle] = useState('');
    const [activeFilter, setActiveFilter] = useState<'Active' | 'Completed' | 'All'>('Active');

    const fetchNotes = useCallback(async () => {
        try {
            const res = await fetch(`/api/notes?repoId=${repoId}&userId=${userId}`);
            const data = await res.json();
            if (Array.isArray(data)) setNotes(data);
        } catch {
            console.error('Failed to load notes');
        } finally {
            setLoading(false);
        }
    }, [repoId, userId]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const toggleNote = async (id: string, completed: boolean) => {
        try {
            await fetch('/api/notes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ noteId: id, completed: !completed }),
            });
            setNotes(prev => prev.map(n => n.id === id ? { ...n, completed: !completed } : n));
        } catch {
            showToast('Failed to update note', 'error');
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        try {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoId, userId, title: newTitle.trim() }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setNotes(prev => [data, ...prev]);
            setNewTitle('');
            showToast('Note added!', 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to add note', 'error');
        }
    };

    const activeNotes = notes.filter(n => !n.completed);
    const completedNotes = notes.filter(n => n.completed);
    const noRepo = !repoId || repoId === 'empty-workspace';

    if (noRepo) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                <div className="p-4 rounded-2xl bg-[#1a1a1e] border border-white/10">
                    <FolderGit2 className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-sm font-semibold text-white">No Repository Selected</h3>
                <p className="text-xs text-zinc-500 max-w-sm">
                    Ingest a GitHub repository to create repo-scoped to-do items and audit tasks.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-purple-400" />
                    <h2 className="text-sm font-bold text-white tracking-tight">To-Do & Checklist</h2>
                </div>
                <div className="flex items-center gap-2">
                    {(['Active', 'Completed', 'All'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveFilter(tab)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                activeFilter === tab
                                    ? 'bg-[#232328] text-white border border-white/10 shadow-sm font-semibold'
                                    : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1e]'
                            }`}
                        >
                            {tab === 'All' ? 'All Tasks' : tab}
                        </button>
                    ))}
                </div>
            </div>

            <form onSubmit={handleAddNote} className="flex items-center gap-2">
                <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="+ Add to-do item or audit task..."
                    className="w-full bg-[#121215] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
                />
            </form>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-purple-400" size={20} />
                </div>
            ) : notes.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#121215] border border-white/5 text-center text-xs text-zinc-500">
                    No to-do items yet. Add one above to get started.
                </div>
            ) : (
                <>
                    {(activeFilter === 'Active' || activeFilter === 'All') && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs px-1">
                                <Circle className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-white font-semibold">To-Do Items</span>
                                <span className="text-zinc-500 font-mono text-[11px]">{activeNotes.length}</span>
                            </div>
                            <div className="space-y-1.5">
                                {activeNotes.map((note) => (
                                    <div
                                        key={note.id}
                                        onClick={() => toggleNote(note.id, note.completed)}
                                        className="group flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#141417] hover:bg-[#1c1c20] border border-white/[0.04] transition-all cursor-pointer text-xs"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <span className="text-purple-400/80 font-mono text-[11px] shrink-0">{note.code}</span>
                                            <Circle className="w-3.5 h-3.5 text-zinc-500 shrink-0 group-hover:text-purple-400 transition-colors" />
                                            <span className="text-zinc-200 group-hover:text-white font-normal truncate">{note.title}</span>
                                        </div>
                                        <span className="text-zinc-500 shrink-0 font-mono text-[11px]">{note.date}</span>
                                    </div>
                                ))}
                                {activeNotes.length === 0 && (
                                    <div className="p-4 rounded-xl border border-white/5 bg-[#121215] text-zinc-500 text-xs text-center">
                                        No active items.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {(activeFilter === 'Completed' || activeFilter === 'All') && completedNotes.length > 0 && (
                        <div className="space-y-3 pt-4">
                            <div className="flex items-center gap-2 text-xs px-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-white font-semibold">Completed</span>
                                <span className="text-zinc-500 font-mono text-[11px]">{completedNotes.length}</span>
                            </div>
                            <div className="space-y-1.5 opacity-60">
                                {completedNotes.map((note) => (
                                    <div
                                        key={note.id}
                                        onClick={() => toggleNote(note.id, note.completed)}
                                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#141417] border border-white/[0.04] cursor-pointer text-xs"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <span className="text-zinc-600 font-mono text-[11px]">{note.code}</span>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            <span className="text-zinc-400 line-through truncate">{note.title}</span>
                                        </div>
                                        <span className="text-zinc-600 font-mono text-[11px]">{note.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}