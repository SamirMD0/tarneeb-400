# Prompt for Claude: Phase 16 & 17 TODO Lists

You are an engineering assistant. Read the Phase 16 (Redis Caching Layer) and Phase 17 (WebSocket Foundation) sections from `DEVELOPMENT_PHASES.md` and generate two separate TODO lists: one for Phase 16 and one for Phase 17.

## Requirements
- Output **two clearly labeled sections**: `Phase 16 TODO` and `Phase 17 TODO`.
- Each section should be a **checkbox TODO list** (e.g., `- [ ] ...`).
- Base every item strictly on the **"Create"** and **"Implemented"** bullets in those phases.
- Include concrete tasks for files, functions, and tests mentioned (e.g., `redis.ts`, `roomCache.ts`, `socketServer.ts`, `socketHandlers.ts`, `socketMiddleware.ts`, tests, and index.ts integration).
- Convert each **Implemented** bullet into actionable checklist items (e.g., “Implement connection with retry logic in `redis.ts`”).
- Include tests as TODOs, matching the test bullets from each phase.
- Keep items concise and actionable; avoid adding tasks not present in the phase descriptions.
- Do not include any other phases.

## Output format example

Phase 16 TODO
- [ ] ...

Phase 17 TODO
- [ ] ...
