'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Copy, Check, ExternalLink } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { showToast } from '@/components/ui/toast';

interface FileInspectorProps {
    filePath: string | null;
    repoId: string;
    repoUrl: string;
    userId?: string;
    onClose: () => void;
}

function getFileLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const mapping: Record<string, string> = {
        js: 'javascript',
        jsx: 'javascript',
        ts: 'typescript',
        tsx: 'typescript',
        py: 'python',
        java: 'java',
        go: 'go',
        cpp: 'cpp',
        c: 'c',
        cs: 'csharp',
        rb: 'ruby',
        php: 'php',
        swift: 'swift',
        kt: 'kotlin',
        rs: 'rust',
        md: 'markdown',
        html: 'html',
        css: 'css',
        json: 'json',
        yaml: 'yaml',
        yml: 'yaml',
        sh: 'shell',
        sql: 'sql'
    };
    return mapping[ext] || 'text';
}

export default function FileInspector({ filePath, repoId, repoUrl, userId = '', onClose }: FileInspectorProps) {
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);

    useEffect(() => {
        if (!filePath) return;
        const currentPath = filePath;

        async function fetchFileContent() {
            setIsLoading(true);
            setContent('');
            try {
                const res = await fetch(`/api/files?repositoryId=${repoId}&path=${encodeURIComponent(currentPath)}&userId=${userId}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setContent(data.content || '');
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Could not fetch file content';
                showToast(msg, 'error');
                onClose();
            } finally {
                setIsLoading(false);
            }
        }

        fetchFileContent();
    }, [filePath, repoId, userId, onClose]);

    const handleCopy = () => {
        if (!content) return;
        navigator.clipboard.writeText(content);
        setCopied(true);
        showToast('File copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    const githubLink = filePath
        ? `${repoUrl.replace(/\.git$/, '').replace(/\/$/, '')}/blob/main/${filePath}`
        : '';

    return (
        <AnimatePresence>
            {filePath && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black z-40"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                        className="fixed top-0 right-0 h-screen w-full md:w-[600px] lg:w-[750px] bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md">
                            <div className="min-w-0">
                                <h3 className="text-sm font-mono text-zinc-300 truncate font-medium">
                                    {filePath}
                                </h3>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 font-sans">
                                    File Inspector
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {content && (
                                    <button
                                        onClick={handleCopy}
                                        className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                                        title="Copy File"
                                    >
                                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                    </button>
                                )}
                                <a
                                    href={githubLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors flex items-center justify-center"
                                    title="Open on GitHub"
                                >
                                    <ExternalLink size={14} />
                                </a>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden relative">
                            {isLoading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 bg-zinc-950">
                                    <Loader2 className="animate-spin text-blue-400 mb-2" size={24} />
                                    <span className="text-xs">Loading code...</span>
                                </div>
                            ) : (
                                <div className="h-full overflow-y-auto bg-zinc-950 p-4 scroll-smooth">
                                    <SyntaxHighlighter
                                        language={getFileLanguage(filePath)}
                                        style={atomDark}
                                        customStyle={{
                                            margin: 0,
                                            padding: '16px',
                                            fontSize: '12px',
                                            lineHeight: '1.6',
                                            background: 'transparent',
                                            fontFamily: 'var(--font-mono, monospace)'
                                        }}
                                        showLineNumbers
                                    >
                                        {content || '// No code found in file'}
                                    </SyntaxHighlighter>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
