'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export type ToastType = 'error' | 'success';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

let toastId = 0;
let addToastFn: ((message: string, type: ToastType) => void) | null = null;

/** Call this from anywhere to show a toast */
export function showToast(message: string, type: ToastType = 'error') {
    addToastFn?.(message, type);
}

export default function ToastProvider() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        addToastFn = (message: string, type: ToastType) => {
            const id = ++toastId;
            setToasts(prev => [...prev, { id, message, type }]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 4000);
        };
        return () => { addToastFn = null; };
    }, []);

    const dismiss = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 max-w-sm">
            <AnimatePresence>
                {toasts.map(toast => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, x: 60, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 60, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl ${toast.type === 'error'
                                ? 'bg-red-950/80 border-red-500/20 text-red-200'
                                : 'bg-emerald-950/80 border-emerald-500/20 text-emerald-200'
                            }`}
                    >
                        {toast.type === 'error'
                            ? <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                            : <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        }
                        <p className="text-sm leading-snug flex-1">{toast.message}</p>
                        <button onClick={() => dismiss(toast.id)} className="text-zinc-500 hover:text-white transition-colors">
                            <X size={14} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
