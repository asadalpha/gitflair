'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Trash2, Loader2, BookOpen } from 'lucide-react';
import { showToast } from '@/components/ui/toast';

interface PageDoc {
    id: string;
    title: string;
    content: string;
    updatedAt: string;
}

interface NotesPagesViewProps {
    repoId?: string;
    userId?: string;
}

export default function NotesPagesView({ repoId, userId }: NotesPagesViewProps) {
    const [pages, setPages] = useState<PageDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPageId, setSelectedPageId] = useState<string>('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const fetchPages = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (userId) params.set('userId', userId);
            if (repoId) params.set('repoId', repoId);
            const res = await fetch(`/api/pages?${params.toString()}`);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                setPages(data);
                setSelectedPageId(data[0].id);
                setTitle(data[0].title);
                setContent(data[0].content);
            } else {
                setPages([]);
                setSelectedPageId('');
            }
        } catch {
            console.error('Failed to load pages');
        } finally {
            setLoading(false);
        }
    }, [userId, repoId]);

    useEffect(() => {
        fetchPages();
    }, [fetchPages]);

    const handleSelectPage = (page: PageDoc) => {
        setSelectedPageId(page.id);
        setTitle(page.title);
        setContent(page.content);
    };

    const handleAddPage = async () => {
        try {
            const res = await fetch('/api/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, repoId, title: 'Untitled Page', content: '' }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            const newPage: PageDoc = {
                id: data.id,
                title: data.title,
                content: data.content,
                updatedAt: 'Just now',
            };
            setPages(prev => [newPage, ...prev]);
            handleSelectPage(newPage);
            showToast('New page created!', 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to create page', 'error');
        }
    };

    const handleDeletePage = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await fetch(`/api/pages?pageId=${id}`, { method: 'DELETE' });
            const updated = pages.filter(p => p.id !== id);
            setPages(updated);
            if (selectedPageId === id && updated.length > 0) {
                handleSelectPage(updated[0]);
            } else if (updated.length === 0) {
                setSelectedPageId('');
                setTitle('');
                setContent('');
            }
            showToast('Page deleted', 'info');
        } catch {
            showToast('Failed to delete page', 'error');
        }
    };

    const updatePage = async (pageId: string, updates: { title?: string; content?: string }) => {
        try {
            await fetch('/api/pages', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageId, ...updates }),
            });
            setPages(prev => prev.map(p => p.id === pageId ? { ...p, ...updates, updatedAt: 'Just now' } : p));
        } catch {
            console.error('Failed to save page');
        }
    };

    const handleTitleChange = (newTitle: string) => {
        setTitle(newTitle);
        if (selectedPageId) updatePage(selectedPageId, { title: newTitle });
    };

    const handleContentChange = (newContent: string) => {
        setContent(newContent);
        if (selectedPageId) updatePage(selectedPageId, { content: newContent });
    };

    const selectedPage = pages.find(p => p.id === selectedPageId);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-pink-400" size={24} />
            </div>
        );
    }

    if (pages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                <div className="p-4 rounded-2xl bg-[#1a1a1e] border border-white/10">
                    <BookOpen className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-sm font-semibold text-white">No Pages Yet</h3>
                <p className="text-xs text-zinc-500 max-w-sm">
                    Create pages to document architecture decisions, security specs, or project notes.
                </p>
                <button
                    onClick={handleAddPage}
                    className="px-5 py-2.5 rounded-xl bg-[#5e6ad2] hover:bg-[#4b57c6] text-white text-xs font-semibold flex items-center gap-2 transition-all"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create First Page</span>
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-6rem)] font-sans bg-[#0c0c0e] text-zinc-300 p-4 sm:p-8 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-64 space-y-4 shrink-0 border-b md:border-b-0 md:border-r border-white/5 pr-0 md:pr-6 pb-4 md:pb-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <FileText className="w-4 h-4 text-pink-400" />
                        <span>Pages & Notes</span>
                    </div>
                    <button
                        onClick={handleAddPage}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white text-white hover:text-black text-xs font-medium transition-all flex items-center gap-1"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New</span>
                    </button>
                </div>
                <div className="space-y-1">
                    {pages.map((p) => (
                        <div
                            key={p.id}
                            onClick={() => handleSelectPage(p)}
                            className={`p-3 rounded-xl cursor-pointer text-xs flex items-center justify-between transition-all group ${
                                selectedPageId === p.id
                                    ? 'bg-[#202026] text-white font-semibold shadow-sm border border-white/10'
                                    : 'text-zinc-400 hover:text-white hover:bg-[#141417]'
                            }`}
                        >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <FileText className={`w-3.5 h-3.5 shrink-0 ${selectedPageId === p.id ? 'text-pink-400' : 'text-zinc-500'}`} />
                                <span className="truncate">{p.title || 'Untitled Page'}</span>
                            </div>
                            <button
                                onClick={(e) => handleDeletePage(p.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity shrink-0"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 space-y-4 max-w-3xl">
                {selectedPage ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                placeholder="Page title..."
                                className="w-full bg-transparent text-xl font-bold text-white placeholder-zinc-600 focus:outline-none tracking-tight"
                            />
                            <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                                Updated {selectedPage.updatedAt}
                            </span>
                        </div>
                        <textarea
                            value={content}
                            onChange={(e) => handleContentChange(e.target.value)}
                            placeholder="Write your notes, documentation, or specifications here..."
                            rows={16}
                            className="w-full bg-[#141417] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-zinc-500 focus:outline-none leading-relaxed resize-none font-mono"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-500 text-xs">
                        <FileText className="w-8 h-8 mb-2 opacity-40" />
                        <span>Select or create a page to view content</span>
                    </div>
                )}
            </div>
        </div>
    );
}