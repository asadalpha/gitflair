'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Github, Sparkles } from 'lucide-react';
import { signIn } from '@/lib/auth-client';
import { showToast } from '@/components/ui/toast';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
}

export default function AuthModal({
    isOpen,
    onClose,
    title = 'Sign in to GitFlair Workspace',
    subtitle = 'Authenticate with Google or GitHub to access repositories, AI Chat, and architecture specs.',
}: AuthModalProps) {
    if (!isOpen) return null;

    const handleGoogleAuth = async () => {
        try {
            const res = await signIn.social({ provider: 'google', callbackURL: window.location.href });
            if (res && (res as any).error) {
                showToast((res as any).error.message || 'Google Sign-in failed', 'error');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Google Sign-in failed';
            showToast(msg, 'error');
        }
    };

    const handleGithubAuth = async () => {
        try {
            const res = await signIn.social({ provider: 'github', callbackURL: window.location.href });
            if (res && (res as any).error) {
                showToast((res as any).error.message || 'GitHub Sign-in failed', 'error');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'GitHub Sign-in failed';
            showToast(msg, 'error');
        }
    };

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
                    className="bg-[#121215] border border-white/10 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-6 font-sans relative overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
                                <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* OAuth Action Buttons */}
                    <div className="space-y-3 pt-2">
                        <button
                            onClick={handleGoogleAuth}
                            className="w-full p-3.5 rounded-xl bg-[#1a1a1e] hover:bg-white hover:text-black border border-white/10 flex items-center justify-center gap-3 transition-all font-semibold text-xs text-white shadow-sm group cursor-pointer"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            <span>Continue with Google</span>
                        </button>

                        <button
                            onClick={handleGithubAuth}
                            className="w-full p-3.5 rounded-xl bg-[#1a1a1e] hover:bg-white hover:text-black border border-white/10 flex items-center justify-center gap-3 transition-all font-semibold text-xs text-white shadow-sm group cursor-pointer"
                        >
                            <Github className="w-4 h-4" />
                            <span>Continue with GitHub</span>
                        </button>
                    </div>

                    <div className="pt-2 border-t border-white/5 text-center">
                        <p className="text-[11px] text-zinc-500 font-mono flex items-center justify-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            <span>Secured with BetterAuth OAuth 2.0</span>
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
