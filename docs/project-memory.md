# Project Memory

Last updated: 2026-05-05

## Purpose

This file records the current reality of the project so future work is
grounded in what is actually implemented, not only what earlier product
documents describe.

## Project Identity

- Working name: VitalPulse / Stitch Body Health Insight Tracker
- Current product form: cloud-hosted full-stack web app (Vercel + PostgreSQL), with local SQLite dev mode
- Runtime location: `my-app/`
- Primary goal: make a daily health loop usable by multiple users via web browser

## Current Source Of Truth Hierarchy

1. Current code in `my-app/`
2. This file and the other `docs/` memory files
3. `README.md`
4. Broader design docs such as `prd.md`, `interface.md`, and `state-machine.md`

Reason: the broader docs describe a fuller target product, while the code
currently implements a smaller MVP/prototype slice.

## Current Product Reality

### Implemented now

- Phone and password registration
- Phone and password login
- JWT access and refresh token flow
- Forced profile/plan modal after registration
- Dashboard with BMI, BMR, TDEE, nutrition progress, health score, and 7-day trend
- Manual nutrition logging from predefined food categories
- Quick training logging from a predefined exercise library
- PostgreSQL persistence through Prisma (local dev uses SQLite)
- Protected routes for dashboard, nutrition, training, and settings

### Partially implemented or placeholder

- Settings page exists but is still mostly informational
- Dashboard shows health checklist status, but the user does not yet have a
  real flow for recording water and sleep
- Profile update exists, but the update flow is spread across multiple API
  surfaces
- Data models exist for AI food photo recognition and app settings, but the
  user-facing flows are not complete

### Not implemented yet

- Captcha flow described in PRD and interface docs
- DeepSeek food photo upload and recognition flow
- Desktop packaging with Electron or Tauri
- Automated test suite
- Backup/export and restore flows for local data

## Architecture Snapshot

### Frontend and backend shape

- The app is a Next.js App Router project under `my-app/`
- UI pages and API routes live in the same app
- Server logic is mostly concentrated under `my-app/src/lib/server`
- Client API helpers and token storage live under `my-app/src/lib/client`

### Auth model

- Server responses set httpOnly cookies for access and refresh tokens
- Middleware uses the access-token cookie to protect SSR/navigation flows
- Client-side API requests also store access and refresh tokens in
  `localStorage`
- This hybrid model works today, but it is more complex than a single-source
  session design

### Data model shape

Important implemented tables and models:

- `User`
- `UserProfile`
- `DailyNutrition`
- `MealRecord` and `MealFood`
- `WorkoutRecord` and related exercise models
- `HealthChecklist`
- `HealthScore`
- `RefreshToken`

Models that exist but are not yet fully surfaced in the UI:

- `FoodPhoto`
- `AppSetting`

### Score calculation behavior

- Health score is calculated server-side
- It uses nutrition totals, workout duration, sleep hours, and water intake
- The score is upserted into the database during dashboard aggregation
- Because the score is derived data, checklist inputs and aggregation logic
  must stay aligned

## Repo Map

- `my-app/`: executable application
- `README.md`: current quick-start and honest high-level summary
- `prd.md`: larger product vision and expected roadmap
- `interface.md`: intended API contract
- `state-machine.md`: intended frontend state model
- `docs/project-memory.md`: current implementation memory
- `docs/decisions.md`: engineering and product decisions log
- `docs/todo.md`: prioritized next work

## Known Mismatches And Risks

### Documentation vs implementation drift

- PRD and interface docs mention captcha and AI recognition, but current code
  does not expose those flows
- State-machine documentation is more detailed than the actual current UI
  behavior
- Settings scope in docs is larger than the current page implementation

### Flow inconsistencies

- Registration shows a forced plan modal after token issuance
- Plan updates can be reached through both `PUT /api/users/me/plan` and
  `PATCH /api/users/me`
- This should eventually be consolidated so plan ownership is clearer

### Quality risks

- There are currently no automated tests in the repo
- As more behavior is added, regression risk will rise quickly
- The hybrid auth storage model increases the chance of subtle session bugs

## Current Development Assumptions

- The project should continue as a cloud-hosted application with local dev fallback
- The next most valuable work is to close the daily-use loop and complete the Vercel deployment pipeline
- Manual logging must remain a first-class path even after AI features exist
- Future contributors should update these memory files whenever the real
  product state changes

