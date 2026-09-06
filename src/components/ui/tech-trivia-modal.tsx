'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ChevronRight, ChevronLeft, BookOpen, Terminal, Cpu, Flame, Trophy, CheckCircle2 } from 'lucide-react';

interface TechTriviaModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CHAPTERS = [
    {
        id: 1,
        title: 'The Vacuum Tube Spark (1943–1952)',
        subtitle: 'ENIAC, Punch Cards & The First Literal Computer Bug',
        era: '1940s',
        icon: <Cpu className="w-5 h-5 text-amber-400" />,
        color: 'from-amber-500/20 to-orange-500/20',
        borderColor: 'border-amber-500/40',
        content: `In 1946, the ENIAC (Electronic Numerical Integrator and Computer) occupied a massive 1,800 square feet room with 17,468 vacuum tubes. Programming meant physically rewiring 6,000 multi-position switches!

In September 1947, computer pioneer Grace Hopper and her team were working on the Harvard Mark II computer when it suddenly stopped working. Upon opening the machine, they discovered an actual live moth trapped inside Relay #70. Hopper taped the moth into the logbook with the caption: "First actual case of bug being found." Thus, "debugging" became computer history legend!`,
        trivia: {
            question: 'What was the literal bug found inside the Harvard Mark II in 1947?',
            options: ['A beetle', 'A moth', 'A spider', 'A cockroach'],
            answer: 1,
        },
    },
    {
        id: 2,
        title: 'The Birth of Unix & C (1969–1972)',
        subtitle: 'Bell Labs, Dennis Ritchie & Ken Thompson',
        era: '1970s',
        icon: <Terminal className="w-5 h-5 text-blue-400" />,
        color: 'from-blue-500/20 to-cyan-500/20',
        borderColor: 'border-blue-500/40',
        content: `In 1969, AT&T Bell Labs researchers Ken Thompson and Dennis Ritchie wanted a simple operating system to run a game called "Space Travel" on a surplus PDP-7 computer. They designed Unix around the core philosophy: "Do one thing and do it well."

To make Unix portable across different hardware architectures, Dennis Ritchie created the C programming language in 1972. Nearly every modern OS—macOS, Linux, Android, iOS, Windows NT kernel—is directly powered by C and Unix principles designed over 50 years ago!`,
        trivia: {
            question: 'Which programming language was created by Dennis Ritchie in 1972 to rewrite Unix?',
            options: ['B Language', 'Assembly', 'C Language', 'Pascal'],
            answer: 2,
        },
    },
    {
        id: 3,
        title: 'The Linux Hobby That Changed Everything (1991)',
        subtitle: 'Linus Torvalds & The Free Software Revolution',
        era: '1990s',
        icon: <Flame className="w-5 h-5 text-emerald-400" />,
        color: 'from-emerald-500/20 to-teal-500/20',
        borderColor: 'border-emerald-500/40',
        content: `On August 25, 1991, a 21-year-old Finnish university student named Linus Torvalds posted an iconic message on the comp.os.minix Usenet newsgroup:

"Hello everybody out there using minix... I'm doing a (free) operating system (just a hobby, won't be big and professional like gnu) for 386(486) AT clones..."

That "hobby" project became Linux. Today, Linux powers 100% of the world's top 500 supercomputers, 96.3% of the top 1 million web servers, Android smartphones, space rovers on Mars, and the cloud servers running GitFlair right now!`,
        trivia: {
            question: 'What platform did Linus Torvalds post his famous 1991 Linux announcement on?',
            options: ['Usenet (comp.os.minix)', 'IRC Channel #linux', 'Slashdot', 'ARPANET Email'],
            answer: 0,
        },
    },
    {
        id: 4,
        title: 'The Birth of Git out of Pure Rage (2005)',
        subtitle: '10 Days of Coding That Revolutionized Version Control',
        era: '2000s',
        icon: <BookOpen className="w-5 h-5 text-rose-400" />,
        color: 'from-rose-500/20 to-pink-500/20',
        borderColor: 'border-rose-500/40',
        content: `In April 2005, the Linux kernel community lost its free license to BitKeeper (the commercial version control tool they used). Linus Torvalds was furious. Existing tools like CVS and Subversion were painfully slow and centralized.

Linus disappeared for 10 days and wrote the initial version of Git from scratch in C. He designed Git as a content-addressable filesystem using SHA-1 hashes to make branch merging instantaneous. When asked why he named it "Git" (British slang for an unpleasant person), Linus joked: "I'm an egotistical bastard, so I name all my projects after myself. First Linux, now Git!"`,
        trivia: {
            question: 'How long did it take Linus Torvalds to write the initial working version of Git in 2005?',
            options: ['10 days', '3 months', '1 year', '48 hours'],
            answer: 0,
        },
    },
    {
        id: 5,
        title: 'The Web & AI Transformer Era (2017–Present)',
        subtitle: 'Attention Is All You Need, Neural Vectors & Autonomous Agents',
        era: '2020s',
        icon: <Sparkles className="w-5 h-5 text-purple-400" />,
        color: 'from-purple-500/20 to-indigo-500/20',
        borderColor: 'border-purple-500/40',
        content: `In 2017, Google researchers published the landmark paper "Attention Is All You Need", introducing the Transformer neural network architecture. Unlike RNNs, Transformers process entire sequences simultaneously using self-attention mechanisms.

Today, LLMs combined with high-dimensional vector embeddings (like 384-dim MiniLM used in GitFlair) enable AI coding agents to instantly index codebase semantics, reason about system architecture, and generate autonomous code solutions!`,
        trivia: {
            question: 'What landmark 2017 research paper introduced the Transformer neural network architecture?',
            options: ['Deep Residual Learning', 'Attention Is All You Need', 'Mastering the Game of Go', 'Generative Adversarial Nets'],
            answer: 1,
        },
    },
];

export default function TechTriviaModal({ isOpen, onClose }: TechTriviaModalProps) {
    const [chapterIdx, setChapterIdx] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [score, setScore] = useState(0);

    if (!isOpen) return null;

    const activeChapter = CHAPTERS[chapterIdx];
    const isAnswered = selectedAnswers[activeChapter.id] !== undefined;

    const handleSelectOption = (optIdx: number) => {
        if (isAnswered) return;
        const correct = optIdx === activeChapter.trivia.answer;
        setSelectedAnswers((prev) => ({ ...prev, [activeChapter.id]: optIdx }));
        if (correct) setScore((prev) => prev + 1);
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
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-[#121215] border border-white/10 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col font-sans max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Top Bar */}
                    <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#16161a]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                                    <span>Tech History & Trivia Chronicles</span>
                                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                                        EPIC TALE
                                    </span>
                                </h3>
                                <p className="text-xs text-zinc-400">Chapter {chapterIdx + 1} of {CHAPTERS.length}: {activeChapter.era}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-semibold">
                                <Trophy className="w-3.5 h-3.5" />
                                <span>{score}/{CHAPTERS.length} Quiz Score</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 overflow-y-auto space-y-6 flex-1">
                        {/* Chapter Hero Title Card */}
                        <div className={`p-5 rounded-2xl bg-gradient-to-r ${activeChapter.color} border ${activeChapter.borderColor} space-y-2`}>
                            <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-300">
                                {activeChapter.icon}
                                <span>{activeChapter.era} Era</span>
                            </div>
                            <h2 className="text-xl font-extrabold text-white tracking-tight">{activeChapter.title}</h2>
                            <p className="text-xs text-zinc-300 font-medium">{activeChapter.subtitle}</p>
                        </div>

                        {/* Story Text */}
                        <div className="p-5 rounded-xl bg-[#18181c] border border-white/5 text-xs text-zinc-300 leading-relaxed font-normal whitespace-pre-line space-y-2">
                            {activeChapter.content}
                        </div>

                        {/* Interactive Quiz Box */}
                        <div className="p-5 rounded-xl bg-[#161619] border border-white/10 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-white">
                                <Trophy className="w-4 h-4 text-amber-400" />
                                <span>Chapter Trivia Quiz:</span>
                            </div>
                            <p className="text-xs text-zinc-300">{activeChapter.trivia.question}</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {activeChapter.trivia.options.map((opt, oIdx) => {
                                    const selected = selectedAnswers[activeChapter.id] === oIdx;
                                    const isCorrect = oIdx === activeChapter.trivia.answer;
                                    let btnStyle = 'bg-[#1e1e22] text-zinc-300 border-white/5 hover:border-white/20';

                                    if (isAnswered) {
                                        if (isCorrect) btnStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold';
                                        else if (selected) btnStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/50';
                                    }

                                    return (
                                        <button
                                            key={oIdx}
                                            onClick={() => handleSelectOption(oIdx)}
                                            className={`p-3 rounded-xl border text-xs text-left transition-all flex items-center justify-between ${btnStyle}`}
                                        >
                                            <span>{opt}</span>
                                            {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Navigation */}
                    <div className="p-4 border-t border-white/5 bg-[#16161a] flex items-center justify-between">
                        <button
                            disabled={chapterIdx === 0}
                            onClick={() => setChapterIdx((prev) => Math.max(0, prev - 1))}
                            className="px-4 py-2 rounded-xl bg-[#1e1e22] text-xs font-medium text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 hover:bg-[#25252b] transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Previous Chapter</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                            {CHAPTERS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setChapterIdx(i)}
                                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                                        i === chapterIdx ? 'bg-purple-400 scale-125' : 'bg-white/20 hover:bg-white/40'
                                    }`}
                                />
                            ))}
                        </div>

                        <button
                            disabled={chapterIdx === CHAPTERS.length - 1}
                            onClick={() => setChapterIdx((prev) => Math.min(CHAPTERS.length - 1, prev + 1))}
                            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-all shadow-md"
                        >
                            <span>Next Chapter</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
