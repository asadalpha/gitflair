'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RepoInput from '@/components/RepoInput';
import ChatInterface from '@/components/ChatInterface';
import HistoryPanel from '@/components/HistoryPanel';
import StatusBadge from '@/components/StatusPage';
import { getAnonymousUserId } from '@/lib/user';
import { showToast } from '@/components/Toast';
import {
  Sparkles, Search, Zap,
  CheckCircle2, GitBranch, ArrowLeft, Database
} from 'lucide-react';

interface Repo {
  id: string;
  full_name: string;
  url: string;
  indexed_at: string;
}

export default function Home() {
  const [repo, setRepo] = useState<Repo | null>(null);
  const [savedRepos, setSavedRepos] = useState<Repo[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState('');

  // Initialize anonymous user
  useEffect(() => {
    const id = getAnonymousUserId();
    setUserId(id);
  }, []);

  // Load previously indexed repos for this user
  useEffect(() => {
    if (!userId) return;
    async function loadRepos() {
      try {
        const res = await fetch(`/api/repos?userId=${userId}`);
        const data = await res.json();
        if (Array.isArray(data)) setSavedRepos(data);
      } catch {

        console.error('Failed to load repos');
      }
    }
    loadRepos();
  }, [userId]);

  const handleIngest = async (url: string) => {
    // Validate GitHub URL
    const githubPattern = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;
    if (!githubPattern.test(url.trim())) {
      showToast('Please enter a valid GitHub repository URL (e.g. https://github.com/user/repo)', 'error');
      return;
    }

    setIsIngesting(true);
    setError(null);
    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, userId }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
      const fullName = match ? match[1].replace('.git', '') : url;
      const newRepo: Repo = {
        id: data.repoId,
        full_name: fullName,
        url: url,
        indexed_at: new Date().toISOString(),
      };
      setRepo(newRepo);
      showToast('Repository indexed successfully!', 'success');
      setSavedRepos(prev => {
        const exists = prev.find(r => r.id === newRepo.id);
        return exists ? prev : [newRepo, ...prev];
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during indexing';
      showToast(msg, 'error');
      setError(msg);
    } finally {
      setIsIngesting(false);
    }
  };

  const selectRepo = (r: Repo) => {
    setRepo(r);
    setError(null);
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      <AnimatePresence mode="wait">
        {!repo ? (
          /* ───── Landing View ───── */
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 py-20"
          >
            <div className="max-w-4xl mx-auto text-center mb-16">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-semibold mb-6 tracking-wider uppercase"
              >
                <Sparkles size={12} />
                <span>AI Q&A for codebases</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-6xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500 mb-6"
              >
                GitFlair
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-zinc-400 text-lg md:text-xl font-light max-w-2xl mx-auto mb-12"
              >
                Your personal AI expert for any public codebase.
                Index in seconds, ask in English, get answers with proof.
              </motion.p>

              <RepoInput onIngest={handleIngest} isLoading={isIngesting} />

              {error && (
                <p className="text-red-400 mt-4 text-sm">{error}</p>
              )}
            </div>

            {/* ── Previously Indexed Repos ── */}
            {savedRepos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="max-w-3xl mx-auto mb-20"
              >
                <div className="flex items-center gap-2 text-zinc-500 mb-4">
                  <Database size={14} />
                  <h2 className="text-xs font-medium uppercase tracking-widest">Indexed Repositories</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedRepos.map((r, i) => (
                    <motion.button
                      key={r.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                      onClick={() => selectRepo(r)}
                      className="glass-card p-4 text-left hover:bg-white/5 hover:border-zinc-600 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <GitBranch size={16} className="text-zinc-600 mt-0.5 group-hover:text-blue-400 transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                            {r.full_name}
                          </p>
                          <p className="text-[10px] text-zinc-600 mt-1 flex items-center gap-1">
                            <CheckCircle2 size={10} className="text-emerald-600" />
                            Indexed {new Date(r.indexed_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Feature Cards ── */}
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <FeatureCard
                icon={<Search className="text-purple-400" />}
                title="Code-Grounded Q&A"
                description="Answers directly linked to specific files and line ranges."
              />
              <FeatureCard
                icon={<Zap className="text-amber-400" />}
                title="Fast Ingestion"
                description="Parallel chunking and processing for massive repositories."
              />
            </div>

            {/* ── Status Badge ── */}
            <div className="max-w-4xl mx-auto flex justify-center">
              <StatusBadge />
            </div>
          </motion.div>
        ) : (
          /* ───── Chat View ───── */
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-6 max-w-4xl mx-auto"
          >
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setRepo(null)}
                className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-3">
                <GitBranch size={14} className="text-zinc-600" />
                <h2 className="text-lg font-semibold text-white">{repo.full_name}</h2>
                <span className="flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={10} />
                  Indexed
                </span>
              </div>

              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-blue-400 transition-colors"
              >
                GitHub ↗
              </a>
            </div>

            <ChatInterface repoId={repo.id} repoUrl={repo.url} userId={userId} />
            <HistoryPanel repoId={repo.id} userId={userId} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-5 glass-card hover:bg-white/[0.03] transition-all group">
      <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center mb-3 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
        {icon}
      </div>
      <h3 className="text-white font-medium text-sm mb-1.5">{title}</h3>
      <p className="text-zinc-500 text-xs leading-relaxed">{description}</p>
    </div>
  );
}
