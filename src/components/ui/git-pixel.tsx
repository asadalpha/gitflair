'use client';

import { useMemo } from 'react';

interface GitPixelProps {
    seed: string;
    size?: number;
}

function djb2Hash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

export default function GitPixel({ seed, size = 120 }: GitPixelProps) {
    const grid = useMemo(() => {
        const hash = djb2Hash(seed);
        const cells: boolean[][] = Array(8).fill(null).map(() => Array(8).fill(false));

        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 4; x++) {
                // Determine pixel presence based on hash bit
                const bitIndex = (y * 4 + x) % 32;
                const active = ((hash >> bitIndex) & 1) === 1;
                cells[y][x] = active;
                cells[y][7 - x] = active; // Symmetric horizontal mirroring
            }
        }
        return cells;
    }, [seed]);

    const colors = useMemo(() => {
        const hash = djb2Hash(seed);
        const hue = hash % 360;
        const saturation = 70 + (hash % 20); // 70% to 90%
        const lightness = 45 + (hash % 15); // 45% to 60%

        return {
            background: `hsl(${(hue + 180) % 360}, 20%, 8%)`, // complementary dark background
            foreground: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
            glow: `hsl(${hue}, ${saturation}%, ${lightness}%, 0.4)`,
        };
    }, [seed]);

    const pixelSize = size / 8;

    return (
        <div
            className="rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center select-none shadow-lg shrink-0"
            style={{
                width: size,
                height: size,
                background: colors.background,
                boxShadow: `0 0 20px -5px ${colors.glow}`,
            }}
        >
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <filter id={`glow-${djb2Hash(seed)}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <g filter={`url(#glow-${djb2Hash(seed)})`}>
                    {grid.map((row, y) =>
                        row.map((active, x) => {
                            if (!active) return null;
                            return (
                                <rect
                                    key={`${x}-${y}`}
                                    x={x * pixelSize}
                                    y={y * pixelSize}
                                    width={pixelSize}
                                    height={pixelSize}
                                    fill={colors.foreground}
                                    rx={size > 60 ? 1.5 : 0.5} // slightly rounded pixels for premium feel
                                />
                            );
                        })
                    )}
                </g>
            </svg>
        </div>
    );
}
