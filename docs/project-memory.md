# Project Memory

Last updated: 2026-05-11

## Purpose

This file records the current reality of the project so future work is
grounded in what is actually implemented, not only what earlier product
documents describe.

## Project Identity

- Working name: VitalPulse / Stitch Body Health Insight Tracker
- Current product form: cloud-hosted full-stack web app (Vercel + PostgreSQL), with local development also using a configured PostgreSQL database
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
- Health checklist input for water intake and sleep duration
- Nutrition history review and deletion
- Training history review and deletion
- PostgreSQL persistence through Prisma
- Protected routes for dashboard, nutrition, training, and settings

### Partially implemented or placeholder

- Settings page exists but should stay intentionally simple: app version and
  publisher `贺俊博`
- Nutrition and training history support viewing and deleting records; editing
  historical meal items or workout sets is not implemented yet
- Profile update exists, but the update flow is spread across multiple API
  surfaces
- Data models exist for AI food photo recognition and app settings, but the
  user-facing flows are not complete. The AI provider direction is Qwen
  multimodal models, not DeepSeek.

### Not implemented yet

- Nutrition and training history edit-in-place flows
- Qwen food photo upload and recognition flow
- Automated test suite

## Architecture Snapshot

### Frontend and backend shape

- The app is a Next.js App Router project under `my-app/`
- UI pages and API routes live in the same app
- Server logic is mostly concentrated under `my-app/src/lib/server`
- Client API helpers and token storage live under `my-app/src/lib/client`

### Auth model

- Server responses set httpOnly cookies for access and refresh tokens
- Middleware uses the access-token cookie to protect SSR/navigation flows and
  redirects through the refresh endpoint when only the refresh cookie remains
  valid
- Client-side API requests rely on same-origin httpOnly cookies and retry once
  through `/api/auth/refresh` after an authenticated `401`
- Legacy localStorage token keys are only cleared after login/register/logout;
  they are no longer an authentication source

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
- `AppSetting` (only needed for minimal app metadata if a static settings page
  is insufficient)

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

- Historical product direction included captcha and DeepSeek. Current direction
  is no captcha and Qwen-based AI recognition.
- State-machine documentation is more detailed than the actual current UI
  behavior
- Settings scope should remain small: app version plus publisher `贺俊博`

### Flow inconsistencies

- Registration shows a forced plan modal after token issuance
- Plan updates can be reached through both `PUT /api/users/me/plan` and
  `PATCH /api/users/me`
- This should eventually be consolidated so plan ownership is clearer

### Quality risks

- A small Node test suite covers auth request refresh behavior and logout
  revocation policy
- As more behavior is added, regression risk will rise quickly
- Broader baseline tests are still needed for validators, nutrition,
  training, and dashboard aggregation

## Current Development Assumptions

- The project should continue as a cloud-hosted application backed by PostgreSQL
  in both local and production modes
- The next most valuable work is to close the daily-use loop and complete the Vercel deployment pipeline
- Manual logging must remain a first-class path even after AI features exist
- Do not implement captcha unless the product direction changes explicitly
- Do not prioritize Electron/Tauri desktop packaging in the current roadmap
- AI food recognition should use Qwen multimodal models through a server-side
  adapter so the frontend never sees provider API keys
- Future contributors should update these memory files whenever the real
  product state changes
