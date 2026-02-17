'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Server, Database, Cpu, RefreshCw, ArrowLeft } from 'lucide-react';

interface ServiceStatus {
    status: 'operational' | 'degraded' | 'down';
    latency: number;
    details?: string;
}

interface HealthData {
    overall: 'operational' | 'degraded' | 'down';
    timestamp: string;
    services: {
        backend: ServiceStatus;
        database: ServiceStatus;
        llm: ServiceStatus;
    };
}

const SERVICE_META = {
    backend: { label: 'Backend', icon: Server, desc: 'Next.js API Server' },
    database: { label: 'Database', icon: Database, desc: 'Supabase · PostgreSQL + pgvector' },
    llm: { label: 'LLM', icon: Cpu, desc: 'Google Gemini API' },
} as const;

const STATUS_COLOR: Record<string, string> = {
    operational: '#22c55e',
    degraded: '#f59e0b',
    down: '#ef4444',
};

export default function StatusPage() {
    const [data, setData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastChecked, setLastChecked] = useState('');

    const fetchHealth = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/health');
            const json = await res.json();
            setData(json);
            setLastChecked(new Date().toLocaleTimeString());
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30_000);
        return () => clearInterval(interval);
    }, [fetchHealth]);

    const overallColor = data ? STATUS_COLOR[data.overall] : STATUS_COLOR.down;
    const overallLabel = data
        ? data.overall === 'operational'
            ? 'All Systems Operational'
            : data.overall === 'degraded'
                ? 'Partial Degradation'
                : 'Service Disruption'
        : 'Checking…';

    return (
        <main className="min-h-screen px-4 py-12">
            <div className="max-w-xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors"
                    >
                        <ArrowLeft size={14} />
                        <span>Back</span>
                    </Link>

                    <button
                        onClick={fetchHealth}
                        disabled={loading}
                        className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 text-xs transition-colors disabled:opacity-40"
                    >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>

                {/* Overall status */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <span className="relative flex h-3 w-3">
                            <span
                                className="absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping"
                                style={{ backgroundColor: overallColor }}
                            />
                            <span
                                className="relative inline-flex h-3 w-3 rounded-full"
                                style={{ backgroundColor: overallColor }}
                            />
                        </span>
                        <h1 className="text-lg font-semibold text-zinc-200">{overallLabel}</h1>
                    </div>
                    {lastChecked && (
                        <p className="text-[10px] text-zinc-600">Last checked at {lastChecked}</p>
                    )}
                </motion.div>

                {/* Service cards */}
                <div className="space-y-3">
                    {data &&
                        (Object.keys(SERVICE_META) as (keyof typeof SERVICE_META)[]).map((key, i) => {
                            const svc = data.services[key];
                            const meta = SERVICE_META[key];
                            const Icon = meta.icon;
                            return (
                                <motion.div
                                    key={key}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    className="glass-card px-5 py-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                                            <Icon size={14} className="text-zinc-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-zinc-200">{meta.label}</p>
                                            <p className="text-[10px] text-zinc-600 truncate">{meta.desc}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 shrink-0">
                                        <span className="text-[10px] text-zinc-600 tabular-nums font-mono">
                                            {svc.latency}ms
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: STATUS_COLOR[svc.status] }}
                                            />
                                            <span
                                                className="text-[11px] font-medium capitalize"
                                                style={{ color: STATUS_COLOR[svc.status] }}
                                            >
                                                {svc.status}
                                            </span>
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                </div>

                {/* Footer */}
                <p className="text-center text-[10px] text-zinc-700 mt-10">
                    Auto-refreshes every 30 seconds
                </p>
            </div>
        </main>
    );
}
