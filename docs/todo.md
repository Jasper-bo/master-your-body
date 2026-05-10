# Todo

Last updated: 2026-05-11

This file tracks the recommended next work based on the current codebase, not
only the broader PRD.

## P0: Highest priority

- [x] Build real health checklist input for water and sleep
  Result: dashboard users can now record water intake and sleep duration, and
  those values feed the health score aggregation path.

- [x] Add nutrition and training history management MVP
  Reason: the app can now review and delete historical nutrition and training
  records. Full edit-in-place flows remain a later extension.

- [ ] Expand the baseline automated test suite
  Reason: auth request refresh and logout policy now have focused tests, but
  validators, nutrition, training, and dashboard aggregation still need
  coverage.

- [ ] Consolidate the plan/profile update flow
  Reason: registration, forced onboarding, and later plan edits currently use
  overlapping API surfaces.

## P1: Next after the core loop is stable

- [ ] Add edit-in-place support for nutrition and training history
  Scope: allow correcting historical meal items and workout sets while keeping
  `daily_nutrition`, `health_checklist.exercise_done`, and health scores in
  sync.

- [ ] Simplify settings into a small app information page
  Scope: show app version and publisher `贺俊博`. Do not expand it into a
  general control panel unless product scope changes.

- [ ] Implement Qwen food photo recognition as an additive flow
  Reason: the schema and product docs anticipate it, but the manual path
  should remain the default baseline. The provider direction is Qwen
  multimodal, not DeepSeek.

- [ ] Reconcile root docs with actual implementation
  Target files include `README.md`, `prd.md`, `interface.md`, and
  `state-machine.md` where they currently overstate shipped functionality.

## P2: Later stage work

- [ ] Complete PostgreSQL-backed local and Vercel deployment pipeline
  Reason: the project should now use PostgreSQL in both local and production
  modes, including clear setup steps for another computer and production
  environment verification.

- [ ] Improve operational polish such as empty states, loading states, and
  failure recovery around auth, nutrition, and training flows

## Ongoing discipline

- [ ] When architecture changes, update `docs/project-memory.md`

- [ ] When priorities or trade-offs change, update `docs/decisions.md`

- [ ] When the roadmap changes, update this file in the same change

## Explicitly not the next priority

- [ ] Do not plan Electron/Tauri desktop packaging in the current roadmap

- [ ] Do not make AI the only nutrition entry path

- [ ] Deploy to Vercel with PostgreSQL as the standard production path

- [ ] Do not implement graphical captcha in the current auth flow

- [ ] Do not use DeepSeek for food photo recognition; use Qwen multimodal
