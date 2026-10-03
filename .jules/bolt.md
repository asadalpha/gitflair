## 2026-10-03 - Memoizing Array Operations in React components
**Learning:** Found an opportunity to use `useMemo` on derived array data (mapping, filtering, reducing). Doing this on every render can be expensive, especially with large codebases analyzed by LLMs.
**Action:** When working with LLM responses mapping to arrays (like `analysis.improvements`), use `useMemo` to cache derived states. Make sure hooks appear before early returns.
