## 2024-10-14 - [Optimize GitPixel Component Render]
**Learning:** `GitPixel` component was recalculating SVG grids and colors dynamically. Using `React.memo` stops re-renders on unchanged props, and optimizing `djb2Hash` to cache `hash` via `useMemo` avoids duplicated hash loop evaluations.
**Action:** Always verify if expensive UI operations like hash-based loops and maps inside stateless functional components are wrapped with `useMemo` and `React.memo` to limit redundant render cycles.
