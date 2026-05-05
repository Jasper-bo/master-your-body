# Project Agent Guide

This file is the repository-specific memory layer for this project.
It complements global Codex and OMX instructions with facts about the
current product, repo layout, and update rules.

## Read First

Before making substantive product, architecture, or priority changes,
read these files:

- `docs/project-memory.md`
- `docs/decisions.md`
- `docs/todo.md`

## Project Snapshot

- Product name: VitalPulse / Stitch Body Health Insight Tracker
- Product shape: local-first health management prototype
- Runtime app: `my-app/`
- Current stack: Next.js 15, React 19, TypeScript 5, Prisma, SQLite, Tailwind
- Current core loop: register/login -> generate plan -> dashboard -> manual nutrition -> quick training -> health score view

## Source Of Truth

- When root design docs and current code disagree, trust current code plus
  `docs/project-memory.md` until the broader docs are updated.
- Treat `README.md` as the quick-start entrypoint.
- Treat `prd.md`, `interface.md`, and `state-machine.md` as broader product
  intent, not guaranteed current implementation.

## Working Agreements

- Preserve the local-first architecture unless the user explicitly asks for
  a cloud or sync design.
- Prefer extending existing patterns in `my-app/src/app/api` and
  `my-app/src/lib/server` before introducing new abstractions.
- Do not add new dependencies without an explicit request.
- If a change affects architecture, product scope, or engineering
  priorities, update the relevant memory file in `docs/` as part of the
  same change.
- When application code changes, verify with at least `lint` and `build`
  when feasible.

## Areas That Need Extra Care

- Auth is currently split across httpOnly cookies for middleware/SSR and
  localStorage tokens for client-side API requests.
- Profile and plan updates currently exist through more than one API
  surface, so flow changes should be consolidated carefully.
- Health score accuracy depends on nutrition, workout, and checklist data
  staying internally consistent.

