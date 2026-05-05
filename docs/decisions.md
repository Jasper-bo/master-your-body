# Decisions

Last updated: 2026-05-05

This file captures active engineering and product decisions so they do not
have to be rediscovered from code alone.

## DEC-001: Keep the product local-first

- Status: active
- Decision: the primary runtime remains a local web app backed by SQLite
- Why: this matches the current implementation, avoids cloud complexity, and
  keeps iteration fast for a single-user prototype
- Consequence: features should not assume remote sync, shared state, or
  managed infrastructure unless explicitly requested

## DEC-002: `my-app/` is the only runtime application

- Status: active
- Decision: treat `my-app/` as the executable product root
- Why: the rest of the repository currently acts as product and architecture
  documentation plus visual references
- Consequence: all new runtime code should be placed under `my-app/` unless a
  different structure is intentionally introduced

## DEC-003: Current code beats aspirational docs when they conflict

- Status: active
- Decision: when `prd.md`, `interface.md`, or `state-machine.md` diverge from
  reality, use current code plus `docs/project-memory.md` as the working
  truth
- Why: the root docs are broader than what is already shipped
- Consequence: update the memory docs first, then reconcile broader docs when
  practical

## DEC-004: Manual logging is the current baseline experience

- Status: active
- Decision: nutrition and training must remain fully usable without AI
- Why: manual nutrition and quick training are the only complete input flows
  today
- Consequence: AI food recognition is an enhancement, not a replacement for
  the manual path

## DEC-005: Close the daily-use loop before adding showcase features

- Status: active
- Decision: prioritize health checklist input, history management, settings
  completion, and test coverage before desktop packaging
- Why: the project already has the beginnings of a usable loop, but several
  important supporting flows are still missing
- Consequence: "can the user use this every day?" is a better priority filter
  than "does this look advanced in the PRD?"

## DEC-006: Preserve the hybrid auth model for now, but treat it as debt

- Status: active with follow-up
- Decision: keep the current cookie plus localStorage auth approach until a
  dedicated simplification pass is scheduled
- Why: middleware and SSR rely on cookies, while the current client request
  layer relies on browser storage
- Consequence: session-related changes should be made carefully, and auth
  simplification belongs on the roadmap

## DEC-007: Plan/profile updates need eventual API consolidation

- Status: active with follow-up
- Decision: accept the current split between `PATCH /api/users/me` and
  `PUT /api/users/me/plan` as temporary, not final
- Why: both surfaces currently touch overlapping plan data
- Consequence: future work should converge on one clear profile/plan update
  contract

## DEC-008: No major expansion without basic regression coverage

- Status: active
- Decision: add baseline automated tests before or alongside the next major
  feature wave
- Why: current functionality is already large enough that undocumented
  regressions are likely
- Consequence: tests for validators, nutrition math, dashboard aggregation,
  and core API flows should be treated as foundational work

