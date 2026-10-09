## 2026-10-09 - [Performance Optimization via useMemo]
**Learning:** Component metrics calculations, such as percentage mapping and categorizing lists using reduce, cause unnecessary performance overhead and UI jank in deep components if they aren't memoized. Unmemoized values recalculate on all state changes (e.g., hovering or copying values), which are triggered frequently.
**Action:** Always wrap heavy data transformations derived from props or static APIs (e.g. `map`, `reduce`, `filter`) inside `useMemo` hooks, specifically for deep component trees rendering dashboards or detailed stats.
