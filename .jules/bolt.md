## 2024-05-15 - [Initial setup]
**Learning:** This repo is Next.js with Drizzle. Memory states to document critical performance patterns here.
**Action:** Always measure React list rendering and cache expensive DB queries.

## 2024-05-15 - [ReactMarkdown Re-render Optimization]
**Learning:** `ReactMarkdown` is computationally expensive to render and can cause noticeable lag in chat interfaces if mapped inside a list that frequently updates (e.g., streaming responses or user typing).
**Action:** Always wrap `ReactMarkdown` or other expensive parsing components in `React.memo` when rendering them inside a list array to prevent full list re-renders.
