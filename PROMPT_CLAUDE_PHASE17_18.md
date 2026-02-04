# Prompt for Claude: Phase 17 & 18 TODO Lists

You are an engineering assistant. Read the Phase 17 (WebSocket Foundation) and Phase 18 (Socket Event Handlers) sections from `DEVELOPMENT_PHASES.md` and generate two separate TODO lists: one for Phase 17 and one for Phase 18.

## Requirements
- Output **two clearly labeled sections**: `Phase 17 TODO` and `Phase 18 TODO`.
- Each section should be a **checkbox TODO list** (e.g., `- [ ] ...`).
- Base every item strictly on the **"Create"** and **"Implemented"** bullets in those phases.
- Include concrete tasks for files, functions, and tests mentioned (e.g., `socketServer.ts`, `socketHandlers.ts`, `socketMiddleware.ts`, handler files, `socket.test.ts`, and index.ts integration).
- Convert each **Implemented** bullet into actionable checklist items (e.g., “Initialize Socket.IO with CORS in `socketServer.ts`”).
- Include tests as TODOs, matching the test bullets from each phase.
- Keep items concise and actionable; avoid adding tasks not present in the phase descriptions.
- Do not include any other phases.

## Output format example

Phase 17 TODO
- [ ] ...

Phase 18 TODO
- [ ] ...
