'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STATUS_COLOR: Record<string, string> = {
    operational: '#22c55e',
    degraded: '#f59e0b',
    down: '#ef4444',
};

export default function StatusBadge() {
    const [overall, setOverall] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/health')
            .then(r => r.json())
            .then(d => setOverall(d.overall))
            .catch(() => setOverall('down'));
    }, []);

    const color = overall ? STATUS_COLOR[overall] : STATUS_COLOR.down;
    const label = overall === 'operational'
        ? 'All systems go'
        : overall === 'degraded'
            ? 'Partial issues'
            : overall
                ? 'Disruption'
                : 'Checking…';

    return (
        <Link
            href="/status"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 transition-all group"
        >
            <span className="relative flex h-2 w-2">
                {overall && (
                    <span
                        className="absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping"
                        style={{ backgroundColor: color }}
                    />
                )}
                <span
                    className="relative inline-flex h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                />
            </span>
            <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                {label}
            </span>
        </Link>
    );
}
