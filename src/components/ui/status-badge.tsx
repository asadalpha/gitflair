'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function StatusBadge() {
    const [overall, setOverall] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/health')
            .then(r => r.json())
            .then(d => setOverall(d.overall))
            .catch(() => setOverall('down'));
    }, []);

    const label = overall === 'operational'
        ? '[ SYS_OK: OPERATIONAL ]'
        : overall === 'degraded'
            ? '[ SYS_WARN: DEGRADED ]'
            : overall
                ? '[ SYS_ERR: DOWN ]'
                : '[ CHECKING... ]';

    const colorClass = overall === 'operational'
        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'
        : overall === 'degraded'
            ? 'text-amber-400 border-amber-500/30 bg-amber-500/5'
            : 'text-red-400 border-red-500/30 bg-red-500/5';

    return (
        <Link
            href="/status"
            className={`inline-flex items-center gap-2 px-3 py-1 boxy-card font-mono-tech text-[10px] uppercase font-bold transition-all ${colorClass}`}
        >
            <span className="w-1.5 h-1.5 rounded-none bg-current animate-pulse" />
            <span>{label}</span>
        </Link>
    );
}
