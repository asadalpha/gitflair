'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import GitPixel from '@/components/ui/git-pixel';
import { 
    ExternalLink, 
    Layers, 
    ShieldAlert, 
    Cpu, 
    Sparkles, 
    FileCode, 
    CheckCircle2, 
    Copy, 
    Check, 
    Code2,
    Database,
    Workflow,
    LayoutGrid,
    Info as InfoIcon,
    BarChart2,
    Shield,
    Clock,
    TrendingUp
} from 'lucide-react';

interface Improvement {
    title: string;
    desc: string;
    files: string[];
    type?: 'SECURITY' | 'REFACTOR' | 'PERFORMANCE' | 'ARCHITECTURE';
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface RepoAnalyzerProps {
    repoId?: string;
    repoName: string;
    repoUrl: string;
    languages: Record<string, number> | null;
    analysis: {
        summary: string;
        architecture: string;
        improvements: Improvement[];
    } | null;
    onFileClick: (path: string) => void;
}

const LANGUAGE_COLORS: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Python: '#3572a5',
    Rust: '#dea584',
    Go: '#00add8',
    'C++': '#f34b7d',
    C: '#555555',
    Java: '#b07219',
    Ruby: '#701516',
    PHP: '#4f5d95',
    Swift: '#ffac45',
    Kotlin: '#F18E33',
    Shell: '#89e051',
    SQL: '#e38c00',
    FastAPI: '#059669',
    'Next.js': '#6366f1',
    JSON: '#292929',
};

const DEFAULT_STACK = [
    { name: 'Python', percentage: 44, color: '#3572a5', lines: '4,210 lines' },
    { name: 'TypeScript', percentage: 32, color: '#3178c6', lines: '2,890 lines' },
    { name: 'FastAPI', percentage: 14, color: '#059669', lines: '1,420 lines' },
    { name: 'SQL / Vector', percentage: 10, color: '#e38c00', lines: '980 lines' },
];

export default function RepoAnalyzer({ repoName, repoUrl, languages, analysis, onFileClick }: RepoAnalyzerProps) {
    const [selectedImprovement, setSelectedImprovement] = useState<number | null>(null);
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [copiedSummary, setCopiedSummary] = useState(false);
    const [copiedItem, setCopiedItem] = useState<number | null>(null);

    // Calculate language percentages or fallback
    const langDetails = languages ? Object.entries(languages) : [];
    const totalLines = langDetails.reduce((sum, [, val]) => sum + val, 0);
    const languagesSorted = totalLines > 0
        ? langDetails
            .map(([name, lines]) => ({
                name,
                lines: `${lines.toLocaleString()} bytes`,
                percentage: (lines / totalLines) * 100,
                color: LANGUAGE_COLORS[name] || '#8b5cf6',
            }))
            .sort((a, b) => b.percentage - a.percentage)
        : DEFAULT_STACK;

    const copyToClipboard = (text: string, type: 'summary' | number) => {
        navigator.clipboard.writeText(text);
        if (type === 'summary') {
            setCopiedSummary(true);
            setTimeout(() => setCopiedSummary(false), 2000);
        } else {
            setCopiedItem(type);
            setTimeout(() => setCopiedItem(null), 2000);
        }
    };

    if (!analysis) {
        return (
            <div className="rounded-xl border border-white/[0.08] bg-[#121215] p-12 text-center text-zinc-400 min-h-[300px] flex flex-col items-center justify-center space-y-3">
                <Sparkles className="w-5 h-5 text-zinc-400 animate-pulse" />
                <h3 className="text-xs font-medium text-zinc-200">Analyzing Repository Architecture...</h3>
                <p className="text-[11px] text-zinc-500 max-w-sm">Indexing directory tree and compiling architecture overview.</p>
            </div>
        );
    }

    const formatArchText = (text: string) => {
        if (!text) return 'Architecture analysis pending...';
        const parts = text.split(/(`[^`]+`)/g);
        return parts.map((part, idx) => {
            if (part.startsWith('`') && part.endsWith('`')) {
                const code = part.slice(1, -1);
                return (
                    <code
                        key={idx}
                        onClick={() => onFileClick(code)}
                        className="px-1.5 py-0.5 mx-1 rounded bg-[#1c1c21] hover:bg-[#25252b] text-zinc-200 hover:text-white font-mono text-[11px] border border-white/[0.08] cursor-pointer transition-colors inline-flex items-center gap-1"
                        title="Click to inspect file"
                    >
                        <FileCode className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span>{code}</span>
                    </code>
                );
            }
            return <span key={idx}>{part}</span>;
        });
    };

    const rawImprovements = analysis.improvements && analysis.improvements.length > 0
        ? analysis.improvements
        : [
            {
                title: 'Implement Sliding-Window Rate Limiting on Public Auth Endpoints',
                desc: 'Prevent credential brute-forcing by wrapping FastAPI routers in backend/app/api with Redis or sliding-window rate limiters.',
                files: ['backend/app/api/auth.py', 'backend/app/main.py'],
                type: 'SECURITY' as const,
                priority: 'HIGH' as const,
            },
            {
                title: 'Enforce Cosine Similarity & Vector Dimension Alignment',
                desc: 'Validate PostgreSQL vector(384) embedding dimensions in Supabase queries prior to similarity execution.',
                files: ['backend/app/services/vector.py', 'db/schema.sql'],
                type: 'REFACTOR' as const,
                priority: 'MEDIUM' as const,
            },
            {
                title: 'Optimize Temporal Workflow Retries and Exception Handling',
                desc: 'Configure exponential backoff execution policies for long-running OrderSupervisorWorkflows during external LLM API outages.',
                files: ['backend/app/temporal/workflows.py', 'backend/app/temporal/activities.py'],
                type: 'PERFORMANCE' as const,
                priority: 'HIGH' as const,
            },
        ];

    const filteredImprovements = rawImprovements.filter((imp) => {
        if (filterCategory === 'ALL') return true;
        const category = imp.type || (rawImprovements.indexOf(imp) % 2 === 0 ? 'SECURITY' : 'REFACTOR');
        return category === filterCategory;
    });

    const categories = [
        { name: 'Code defect', accepted: 30, posted: 70 },
        { name: 'Stability and availability', accepted: 75, posted: 95 },
        { name: 'Security', accepted: 45, posted: 80 },
        { name: 'Performance', accepted: 85, posted: 100 },
        { name: 'Maintainability', accepted: 35, posted: 55 },
        { name: 'Code quality', accepted: 70, posted: 90 },
        { name: 'Functional correctness', accepted: 90, posted: 98 },
        { name: 'Data integrity and integration', accepted: 65, posted: 72 },
    ];

    return (
        <div className="space-y-6 font-sans text-zinc-100 pb-8 max-w-7xl mx-auto">
            {/* Executive Header Banner - Linear SaaS Aesthetic */}
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-xl bg-[#0f0f13] border border-white/[0.08] flex flex-col md:flex-row items-start md:items-center gap-5 shadow-sm"
            >
                <div className="p-2.5 bg-[#18181c] rounded-xl border border-white/[0.08] shrink-0">
                    <GitPixel seed={repoName} size={56} />
                </div>

                <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-white tracking-tight truncate">{repoName}</h2>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Active Workspace
                            </span>
                        </div>

                        <a
                            href={repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#222228] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 shrink-0"
                        >
                            <span>GitHub</span>
                            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                        </a>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#18181c] border border-white/[0.06] text-xs text-zinc-300 leading-relaxed font-normal">
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/[0.06]">
                            <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                                Key Summary
                            </span>
                            <button
                                onClick={() => copyToClipboard(analysis.summary, 'summary')}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 text-[11px]"
                            >
                                {copiedSummary ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                            </button>
                        </div>
                        <p className="text-zinc-300 text-xs leading-relaxed">
                            {analysis.summary || 'Production-ready architecture monitored with vector intelligence and agent execution.'}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Top KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
                <MetricCard title="MERGED PULL REQUESTS" value="145" unit="PULL REQUESTS" />
                <MetricCard title="ACTIVE USERS" value="86" unit="USERS" />
                <MetricCard title="MEDIAN TIME TO LAST COMMIT" value="1.7" unit="HOURS" />
                <MetricCard title="REVIEW TIME SAVED" value="1.2" unit="DAYS" />
            </div>

            {/* Visual Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 1. Radar Chart: Review Comments by Severity */}
                <div className="rounded-xl bg-[#0f0f13] border border-white/[0.08] p-5 space-y-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                            REVIEW COMMENTS BY SEVERITY
                        </span>
                        <InfoIcon className="w-3.5 h-3.5 text-zinc-600" />
                    </div>

                    <div className="flex items-center justify-center py-2 relative">
                        <svg className="w-56 h-48" viewBox="0 0 200 180">
                            <polygon points="100,20 20,150 180,150" fill="none" stroke="#26262f" strokeWidth="1" strokeDasharray="3 3" />
                            <polygon points="100,50 45,135 155,135" fill="none" stroke="#1f1f27" strokeWidth="1" />
                            <polygon points="100,80 70,120 130,120" fill="none" stroke="#1c1c23" strokeWidth="1" />
                            <polygon points="100,45 40,140 150,130" fill="#6366f1" fillOpacity="0.25" stroke="#6366f1" strokeWidth="1.5" />
                            <polygon points="100,65 60,135 140,125" fill="#10b981" fillOpacity="0.35" stroke="#10b981" strokeWidth="1.5" />
                            <text x="100" y="12" fill="#a1a1aa" fontSize="10" fontFamily="monospace" textAnchor="middle">Critical</text>
                            <text x="15" y="165" fill="#a1a1aa" fontSize="10" fontFamily="monospace" textAnchor="middle">Major</text>
                            <text x="185" y="165" fill="#a1a1aa" fontSize="10" fontFamily="monospace" textAnchor="middle">Minor</text>
                        </svg>
                    </div>

                    <div className="flex items-center justify-center gap-6 font-mono text-[11px]">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                            <span className="text-zinc-300">Accepted</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                            <span className="text-zinc-300">Posted</span>
                        </div>
                    </div>
                </div>

                {/* 2. Suggestions Breakdown Stacked Bars */}
                <div className="rounded-xl bg-[#0f0f13] border border-white/[0.08] p-5 lg:col-span-2 space-y-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                        <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                            SUGGESTIONS BREAKDOWN
                        </span>
                        <InfoIcon className="w-3.5 h-3.5 text-zinc-600" />
                    </div>

                    <div className="space-y-2.5 font-mono text-xs">
                        {categories.slice(0, 5).map((cat) => (
                            <div key={cat.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className="text-zinc-400 text-[11px] w-52 shrink-0 truncate">{cat.name}</span>
                                <div className="flex-1 h-4 rounded bg-[#16161b] overflow-hidden flex p-0.5 border border-white/5">
                                    <div className="h-full bg-emerald-500 rounded-sm" style={{ width: `${cat.accepted}%` }} />
                                    <div className="h-full bg-indigo-500/80 rounded-sm ml-1" style={{ width: `${cat.posted - cat.accepted}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-6 font-mono text-[11px] pt-1">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                            <span className="text-zinc-300">Accepted</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                            <span className="text-zinc-300">Posted</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid: Tech Stack & System Architecture */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="p-5 rounded-xl bg-[#0f0f13] border border-white/[0.08] space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-zinc-400" />
                                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Tech Stack</h3>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500">
                                {languagesSorted.length} modules
                            </span>
                        </div>

                        <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-[#1a1a1e] border border-white/[0.06] p-0.5 gap-0.5">
                            {languagesSorted.map((l) => (
                                <div
                                    key={l.name}
                                    style={{
                                        width: `${l.percentage}%`,
                                        backgroundColor: l.color,
                                    }}
                                    className="h-full rounded-sm transition-opacity hover:opacity-80"
                                    title={`${l.name}: ${l.percentage.toFixed(1)}%`}
                                />
                            ))}
                        </div>

                        <div className="space-y-1.5 pt-1">
                            {languagesSorted.map((l) => (
                                <div
                                    key={l.name}
                                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#18181c] border border-white/[0.04] hover:border-white/[0.08] transition-all"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                                        <span className="text-zinc-300 font-medium text-xs truncate">{l.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">{l.lines}</span>
                                        <span className="text-zinc-400 font-mono text-[11px]">{l.percentage.toFixed(1)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
                        <span>Indexed Vector Store</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                </div>

                <div className="p-5 rounded-xl bg-[#0f0f13] border border-white/[0.08] lg:col-span-2 space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                            <div className="flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-zinc-400" />
                                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">System Architecture & Patterns</h3>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500">
                                Spec Overview
                            </span>
                        </div>

                        <div className="p-4 rounded-lg bg-[#18181c] border border-white/[0.06] text-xs text-zinc-300 leading-relaxed space-y-2">
                            <p className="leading-relaxed text-zinc-300 text-xs">{formatArchText(analysis.architecture)}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-3 rounded-lg bg-[#18181c] border border-white/[0.06] space-y-1">
                                <div className="flex items-center gap-1.5 text-zinc-200 text-xs font-semibold">
                                    <LayoutGrid className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>Frontend App</span>
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-normal">Next.js App Router with responsive Tailwind components</p>
                            </div>

                            <div className="p-3 rounded-lg bg-[#18181c] border border-white/[0.06] space-y-1">
                                <div className="flex items-center gap-1.5 text-zinc-200 text-xs font-semibold">
                                    <Code2 className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>Backend Service</span>
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-normal">FastAPI REST controllers & Pydantic typed settings</p>
                            </div>

                            <div className="p-3 rounded-lg bg-[#18181c] border border-white/[0.06] space-y-1">
                                <div className="flex items-center gap-1.5 text-zinc-200 text-xs font-semibold">
                                    <Workflow className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>Orchestration</span>
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-normal">Temporal Python SDK workflows for stateful execution</p>
                            </div>

                            <div className="p-3 rounded-lg bg-[#18181c] border border-white/[0.06] space-y-1">
                                <div className="flex items-center gap-1.5 text-zinc-200 text-xs font-semibold">
                                    <Database className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>Data & Vectors</span>
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-normal">Supabase PostgreSQL for vector search & persistent logs</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actionable Improvements List */}
            <div className="p-5 rounded-xl bg-[#0f0f13] border border-white/[0.08] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-purple-400" />
                        <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Prioritized Action Items</h3>
                        <span className="text-[10px] font-mono text-zinc-500 px-2 py-0.5 rounded bg-white/5 font-semibold">
                            {filteredImprovements.length} items
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-[#16161b] p-1 rounded-lg border border-white/5 text-[11px]">
                        {(['ALL', 'SECURITY', 'REFACTOR', 'PERFORMANCE'] as const).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilterCategory(cat)}
                                className={`px-2.5 py-1 rounded-md font-mono font-medium transition-all ${
                                    filterCategory === cat
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    {filteredImprovements.map((imp, idx) => (
                        <div
                            key={idx}
                            onClick={() => setSelectedImprovement(selectedImprovement === idx ? null : idx)}
                            className="p-4 rounded-xl bg-[#141418] hover:bg-[#1a1a20] border border-white/5 hover:border-white/15 transition-all cursor-pointer space-y-2"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">{imp.title}</span>
                                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                                        imp.type === 'SECURITY' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                        imp.type === 'PERFORMANCE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    }`}>
                                        {imp.type || 'REFACTOR'}
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-500">{imp.priority || 'HIGH'} PRIORITY</span>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">{imp.desc}</p>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {imp.files.map((f, fi) => (
                                    <button
                                        key={fi}
                                        onClick={(e) => { e.stopPropagation(); onFileClick(f); }}
                                        className="px-2 py-0.5 rounded bg-black/40 hover:bg-black/80 text-zinc-300 hover:text-white text-[11px] font-mono border border-white/5 flex items-center gap-1"
                                    >
                                        <FileCode className="w-3 h-3 text-zinc-500" />
                                        <span>{f}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, unit }: { title: string; value: string; unit?: string }) {
    return (
        <div className="rounded-xl bg-[#0f0f13] border border-white/[0.08] p-4 space-y-2 flex flex-col justify-between font-mono">
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{title}</span>
                <InfoIcon className="w-3.5 h-3.5 text-zinc-600" />
            </div>
            <div className="space-y-0.5">
                <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
                {unit && <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{unit}</span>}
            </div>
        </div>
    );
}
