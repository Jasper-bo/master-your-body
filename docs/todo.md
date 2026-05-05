# Todo

Last updated: 2026-05-05

This file tracks the recommended next work based on the current codebase, not
only the broader PRD.

## P0: Highest priority

- [ ] Build real health checklist input for water and sleep
  Reason: dashboard and score logic already depend on this data, but users do
  not yet have a proper input flow.

- [ ] Add nutrition and training history management
  Reason: the app can create records, but long-term daily use needs better
  review, edit, and cleanup flows.

- [ ] Establish a baseline automated test suite
  Reason: there are currently no tests, and the existing logic is already
  complex enough to regress easily.

- [ ] Consolidate the plan/profile update flow
  Reason: registration, forced onboarding, and later plan edits currently use
  overlapping API surfaces.

## P1: Next after the core loop is stable

- [ ] Expand settings from placeholder content into a real control panel
  Scope should include at least profile access, local data explanation, and
  future backup/export hooks.

- [ ] Decide whether to implement captcha or reduce the docs to the current
  simpler auth model
  Reason: current docs and current implementation disagree in a visible way.

- [ ] Implement AI food photo recognition as an additive flow
  Reason: the schema and product docs anticipate it, but the manual path
  should remain the default baseline.

- [ ] Reconcile root docs with actual implementation
  Target files include `README.md`, `prd.md`, `interface.md`, and
  `state-machine.md` where they currently overstate shipped functionality.

## P2: Later stage work

- [ ] Add local backup, export, and restore flows for SQLite-backed user data

- [ ] Package the app for desktop distribution with Electron or Tauri

- [ ] Improve operational polish such as empty states, loading states, and
  failure recovery around auth, nutrition, and training flows

## Ongoing discipline

- [ ] When architecture changes, update `docs/project-memory.md`

- [ ] When priorities or trade-offs change, update `docs/decisions.md`

- [ ] When the roadmap changes, update this file in the same change

## Explicitly not the next priority

- [ ] Do not prioritize desktop packaging before the web MVP is more complete

- [ ] Do not make AI the only nutrition entry path

- [ ] Do not introduce cloud-first assumptions unless the product direction
  changes on purpose

