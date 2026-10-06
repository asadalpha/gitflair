
## 2026-10-06 - [Optimize Sequential API Calls]
**Learning:** External API fetches in dashboard endpoints can cause severe bottlenecks when awaited sequentially.
**Action:** Always check if multiple independent async operations can be run concurrently with `Promise.all` to reduce total response time.
