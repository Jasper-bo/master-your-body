# Decisions

Last updated: 2026-05-10

This file captures active engineering and product decisions so they do not
have to be rediscovered from code alone.

## DEC-001: Cloud-hosted with Vercel + PostgreSQL

- Status: active
- Decision: production runtime is Vercel + PostgreSQL, and local development
  should also use PostgreSQL through `DATABASE_URL`
- Why: keeping one database provider prevents documentation drift, Prisma
  provider switching, and local/production behavior mismatches
- Consequence: new features should be built and verified against PostgreSQL;
  do not reintroduce SQLite-specific setup unless explicitly requested

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
- Decision: prioritize health checklist input, nutrition/training history
  management, minimal settings metadata, and test coverage before showcase
  features
- Why: the project already has the beginnings of a usable loop, but several
  important supporting flows are still missing
- Consequence: "can the user use this every day?" is a better priority filter
  than "does this look advanced in the PRD?"; desktop packaging is out of the
  current roadmap

## DEC-006: Preserve the hybrid auth model for now, but treat it as debt

- Status: superseded by DEC-009
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

## DEC-009: Use httpOnly cookies as the single browser auth source

- Status: active
- Decision: browser auth should rely on same-origin httpOnly access and
  refresh cookies, not localStorage bearer tokens
- Why: page rendering and middleware already depend on cookies, and the
  previous hybrid model could prefer stale localStorage tokens over current
  cookies
- Consequence: client API requests retry authenticated 401 responses through
  `/api/auth/refresh`, middleware redirects expired protected-page sessions
  through the refresh endpoint, and logout revokes only the current refresh
  cookie rather than all devices

## DEC-010: Do not implement captcha in the current auth flow

- Status: active
- Decision: keep registration and login as phone plus password without a
  graphical captcha
- Why: current product direction favors a simpler auth flow, and the existing
  code already has password failure lockout behavior
- Consequence: remove captcha from forward-looking docs and do not add
  `/api/auth/captcha` unless this decision is explicitly changed

## DEC-011: Use Qwen multimodal models for food photo recognition

- Status: active
- Decision: AI food photo recognition should use a server-side Qwen
  multimodal adapter instead of DeepSeek
- Why: the product still wants photo-assisted nutrition entry, but the model
  provider direction has changed
- Consequence: environment variables, API docs, UI copy, and failure handling
  should refer to Qwen; manual nutrition logging remains the fallback and
  baseline path

## DEC-012: Keep settings intentionally minimal

- Status: active
- Decision: the settings page should show only app version and publisher
  `贺俊博` for now
- Why: a larger control panel would distract from the core daily loop
- Consequence: remove planned settings scope such as release-note timelines,
  policy pages, units, themes, reminders, and backup controls unless
  separately requested later
