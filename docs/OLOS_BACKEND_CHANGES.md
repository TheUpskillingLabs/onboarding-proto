# OLOS Backend Changes — supporting the onboarding-proto frontend

**Audience:** the implementer adapting OLOS (Next.js 15 + Supabase) to serve the frontend
prototyped in this repo. This document plans backend work only — no code here, and no changes
land in the OLOS repo until implementation starts.

**Ground rules:**

- Build on OLOS's **actual** implementation, not `TUL_MVP_Spec.md`'s never-built FastAPI plan.
  Required pre-reading in the OLOS repo: `lib/auth/CLAUDE.md`, `supabase/CLAUDE.md`, `SCHEMA.md`,
  and `docs/OLOS-roadmap.md`.
- The roadmap already tracks an open decision this doc resolves (**D3**, mentors) and a backlog
  item this doc extends (**§4.6** Onboarding flow expansion). Reference those anchors so the work
  is traceable, not orphaned.
- ⚠️ **The May 2026 incident constraint (roadmap §3.7):** uncoordinated writes to
  `cycle_enrollments.status` from multiple code paths once combined with a buggy revocation cron
  to revoke ~75% of a live cohort. The fix is a single `reconcileEnrollmentActivation` helper as
  the only entry point for enrollment-activation writes. **Nothing in this document may add a
  second parallel path that writes participant/enrollment lifecycle state.** Route any
  lifecycle-adjacent write through the existing reconciler, or scope it to genuinely new tables
  that never touch `cycle_enrollments`.

**Frontend source of truth:** `index.html` (the prototype) and `triangulator.html` (the embedded
sensemaking tool) in this repo. Every mock data shape in `index.html` (`EVENTS`, `RESOURCES`,
`MEMBERS`, `FRAMES`, `SURVEY_SEED`, `userState.updates`) is deliberately shaped like the API
response the production endpoint should return — the production swap is a data-source change,
not a markup rewrite.

---

## 1. New database tables

Migrations are sequential SQL files under `supabase/migrations/`. Current head at time of writing
is `00030_revocation_warnings_and_idempotency.sql` — **confirm the actual next number via
`ls supabase/migrations | tail -1` at implementation time** (see `supabase/CLAUDE.md`'s
renumbering caution; there is a documented 00015→00028 lesson). Every migration carries its RLS
policies in the same file and a `SCHEMA.md` update in the same PR.

### 1.1 `metros` (local labs)

```
id, name, slug UK, status enum('active','forming','coming_soon'),
library_partner text, blurb text, display_order int, created_at
```

Backs the prototype's `LABS` map (DC active/flagship, Baltimore forming, Philadelphia coming
soon). Public SELECT (`USING (true)`), admin-only write. `cycles` gains a nullable `metro_id` FK
so a cycle can be scoped to a lab without forcing it.

### 1.2 `field_surveys`

```
id, cycle_id FK, problem_domain text, title, description,
share_slug UK, share_token uuid default gen_random_uuid(),
status enum('draft','open','closed'), allow_anonymous boolean default true,
created_by FK participants, created_at
```

One row per cycle's problem-domain instrument (e.g. "Civic & Elections"). The
`share_slug`/`share_token` pair mirrors the `invitations.token` shareable-UUID pattern already
in production.

### 1.3 `survey_responses`

```
id, field_survey_id FK, participant_id FK NULL, submitter_email text NULL,
title text, summary text, source_url text NULL,
is_public boolean default true,
moderation_status enum('pending','approved','rejected') default 'approved',
ip_hash text NULL, created_at
```

**The nullable `participant_id` is the load-bearing design choice** — it's what allows anonymous
public submitters arriving from a shared link (`?survey=` in the prototype; `/s/[share_slug]` in
production). Same nullable-FK precedent as `pulse_checks.cycle_id`. RLS: public INSERT allowed
only while the parent survey is `status='open'`; SELECT scoped to survey owner/admin unless
`is_public`.

### 1.4 `sensemaking_sessions` (Triangulator persistence)

```
id, cycle_id FK, participant_id FK, field_survey_id FK NULL,
state jsonb NOT NULL, schema_version int, created_at, updated_at
```

**Recommendation: single JSONB blob per session, not normalized rows.** The Triangulator's
`cards[]`/`childIds` graph is client-owned and mid-evolution — its localStorage schema is
already on v2 (`olos.sensemaking.v2`) with an in-client auto-migration path. Normalizing now
means re-implementing graph invariants server-side for a still-changing shape. The DB is dumb
storage plus a save/load boundary; the client stays the single source of truth for graph
semantics (matching how `pulse_checks.survey_responses jsonb` is already treated). Revisit
normalization only if moderators need to query into individual cards server-side.

Upsert key: `(participant_id, cycle_id)` unique constraint, mirroring the `solution_proposals`
pattern.

### 1.5 Onboarding checklist

- **`onboarding_tasks`** (lookup: `task_key PK, title, description, display_order, active`)
- **`participant_onboarding_progress`** (junction: `participant_id FK, task_key FK,
  completed_at timestamp NULL, self_attested boolean`)

Backs the dashboard setup checklist. Follows the `option_lists`/`participant_options`
lookup-plus-junction pattern. These tables never touch `cycle_enrollments` — see the §3.7
constraint above.

### 1.6 `events` (Luma cache)

```
id, luma_event_id UK, name, description, start_at, end_at, cover_image_url,
location_type enum('in_person','virtual'), location_address, luma_url,
cycle_id FK NULL, synced_at
```

A **cache, not a source of truth** — Luma stays authoritative. Exists so the public Discover
feed queries Postgres instead of hitting Luma's rate limit per page view. See §3 for the sync
design. Column names are a best-effort match to Luma's documented API — **confirm exact fields
against docs.luma.com's List Events reference before the migration lands** (the reference page
403'd automated fetching during planning).

### 1.7 `resources` (Learning Library CMS)

```
id, title, content_type enum('guide','recording','template'),
summary, body text NULL, external_url NULL, tags text[],
status enum('draft','published','archived') default 'draft',
author_id FK participants, published_at, created_at, updated_at
```

Custom OLOS-native CMS — no third-party vendor. **Forward-compat for basic courses (a later
phase, not built now):** `content_type` is an extensible enum (adding `'course'` is one
migration), and nothing may assume a resource is a single flat item — if courses need structure,
that's a follow-on `course_modules` table referencing `resources` by FK.

### 1.8 Public-profile fields on `participants` (no new table)

```
handle text UK NULL   -- unique index on LOWER(handle), mirroring participants_email_lower_idx
bio text
public_profile_visible boolean default false
metro_id FK NULL
```

1:1, low column count — follows the `00011_extend_participants_legacy_fields.sql` precedent of
batch-adding columns rather than a satellite table. Reuses the existing `profile_image_url`.

### 1.9 `profile_updates` (social layer)

```
id, participant_id FK, cycle_id FK NULL, pulse_check_id FK NULL,
body text, visibility enum('public','labs_only') default 'public', created_at
```

Backs the "Share an update" composer and the profile activity feed. The nullable
`pulse_check_id` only logs which pulse-check moment (if any) prompted the post — it is **not**
how content is sourced. See §6 for why this is a separate table from `pulse_checks`.

### 1.10 Team formation & governance (selected Open Labs OS elements)

- **`problem_frames`** — `id, cycle_id FK, client_sponsor_id FK, title, messy_context text,
  status enum('open','matched','archived'), created_at`. Source object for Discover's staking
  cards (`FRAMES` in the prototype).
- **`project_instances`** — `id, problem_frame_id FK,
  status enum('scoping','executing','delivered'), qa_verified boolean default false, created_at`.
- **`instance_members`** — compound PK `(project_instance_id, participant_id)`, plus
  `intent enum('builder','dri','mentor'), joined_at`.
- **`narrative_revisions`** — `id, project_instance_id FK, author_id FK, proposed_text text,
  status enum('pending','approved','rejected'), created_at`. Backs peer-approved case-study
  edits.
- **`citations`** — `id, participant_id FK, project_instance_id FK, narrative_claim text,
  source_url, domain_verified boolean, created_at`. Backs the profile citation chips.

⚠️ **Highest-risk open question in this document — resolve before writing these migrations.**
`problem_frames → project_instances → instance_members` overlaps conceptually with the
in-production Pod Layer (`problem_statements → pods → pod_memberships`) and Project Layer
(`solution_proposals → projects → project_memberships`). The new tables model a *different
mechanism* (threshold-triggered staking with immediate auto-ignition) versus the live
voting-and-registration-window mechanism. Decide explicitly:

- **(a)** a separate, lighter-weight formation flow coexisting with the formal
  Cycle→Pod→Project pipeline (an early interest-testing layer that feeds a Pod later), or
- **(b)** map the new concepts onto existing tables (`problem_frames`≈`problem_statements`,
  `project_instances`≈`projects`, `instance_members`≈`project_memberships`) to avoid two
  parallel team-formation systems.

The confirmed sizing bands (§2 below) put Projects at exactly the same tier the existing
`projects` table models, which strengthens option (b) — but confirm whether committing to a
`problem_frame` requires prior Pod membership (does staking sit *inside* a Pod, or can any
cycle-enrolled member commit directly?) before finalizing. Default to (a) only if staking is
genuinely meant to bypass Pods.

---

## 2. Confirmed sizing bands & ignition logic

Two distinct tiers — **do not conflate them**:

| Tier | Min | Max | Override |
|---|---|---|---|
| **Pods** (existing `pods`/`pod_memberships`) | **12** | **30** | — |
| **Projects** (`project_instances`/`instance_members`) | **3** | **5** | **+2 admin-override seats (hard ceiling 7)** |

Before adding config columns, verify whether size bounds already exist in `cycle_config` under
other names — roadmap W2-006 notes reference `project_min`/`max_projects` and "Pod full" copy,
so at least the Project side may already be configured. Check `cycle_config`'s actual columns
in `SCHEMA.md`/migrations first.

- **Ignition trigger:** `POST /api/frames/[id]/commit` inserts an `instance_members` row, then
  counts members for that frame. At `count == 3` (Project minimum) the handler auto-provisions
  the `project_instances` row (`status='scoping'`). The prototype's ignition interstitial
  (`view-team-ignition`) is the frontend for this moment.
- **Capacity limits:** reject inserts at `count >= 5` unless the request carries a Delivery
  Facilitator override, which permits growth to 7 (5 + 2 override seats); reject unconditionally
  beyond 7. Implement in the route handler (the override needs a role check the DB can't express
  alone), backed by a defensive DB constraint at 7.
- **Peer-approval route:** `POST /api/projects/[id]/revisions/[rev_id]/approve` — caller must be
  an `instance_members` row for the project and must not be `narrative_revisions.author_id`.
  At 2 approvals (1 for a 3-person instance) set `status='approved'` and merge into the public
  case study. *Open question: confirm the threshold scales sensibly toward 7-member teams.*
- **Citation whitelist:** a shared validation utility on `POST /api/profiles/citations`
  rejecting any `source_url` whose domain isn't in an explicit allowlist (e.g. `github.com`,
  `figma.com`, `olos.app`). Keep the allowlist in a single exported constant.

---

## 3. Luma events integration (server-side only)

- New server module (e.g. `lib/integrations/luma.ts`) holding `LUMA_API_KEY` as a
  **server-only env var** — the key must never reach the client, which is why the prototype
  ships mock data instead of calling Luma directly.
- Endpoint: `GET https://public-api.luma.com/v1/calendar/list-events`, header
  `x-luma-api-key`, calendar-scoped, 200 req/min rate limit.
- **Blocking non-engineering prerequisite:** the org's Luma calendar needs an active
  **Luma Plus subscription** for API access at all — confirm before scoping engineering time.
- **Do not call Luma per page view.** Sync into the `events` cache on a schedule via a new
  `app/api/cron/sync-luma-events/route.ts`, following the existing `cron/pulse-check-reminder`
  / `cron/revocation-check` pattern and `vercel.json` cron registration.
- Public reads: `GET /api/events` (backs the landing and Discover feeds) and
  `GET /api/events/[id]`.
- Admin: `POST/PATCH /api/admin/events` for manual annotation of synced events (e.g. tagging
  one to a cycle).

---

## 4. Learning Library CMS API + admin

- `GET /api/resources` (public, `status='published'` only) and `GET /api/resources/[id]`.
- Admin CRUD `POST/PUT/DELETE /api/admin/resources` behind `withAdminAuth`.
- Register `resources` (and every other admin-browsable new table: `metros`, `field_surveys`,
  `survey_responses`, `mentor_profiles`) in `lib/entity-explorer/registry.ts` — it is a
  hand-maintained allowlist; nothing appears there automatically. The generic entity explorer
  is the day-one admin UI; a purpose-built resource editor is a fast-follow. *Open question:
  confirm whether non-engineering staff need the real editor on day one.*

---

## 5. Mentors — resolves roadmap D3

`docs/OLOS-roadmap.md` §5 D3 (OPEN): "Mentors: separate `mentors` table, or unify into
`participants` with `participant_type` enum?" — blocking §2.8.

**Recommendation: a separate `mentor_profiles` table.**

```
participant_id FK (1:1), status enum('pending','active','inactive'),
expertise text[], availability_notes text,
pods_mentored text, outcome text, testimonial text,
timezone text, booking_url text, artifact_url text
```

(The field list mirrors the prototype's `FLOWS('mentor')` answers.) Rationale: mentorship is a
public-facing offering/intent, not an elevated-permission grant like `user_roles` /
`participant_permissions` model — it doesn't belong in the `Role` union in `lib/auth/roles.ts`.
If a route guard ever needs "is this user a mentor," derive it cheaply
(`EXISTS in mentor_profiles WHERE status='active'`) inside `resolveUserRoles()`'s output rather
than overloading `Role`. **Flag in the PR that this closes roadmap row D3.**

---

## 6. Social updates — "an extension of the pulse check"

**Shared UX moment, not a shared schema.** `pulse_checks` content is a private
wellbeing/engagement check-in reviewed by moderators; mixing a public social post into that
table would either leak private content or force per-field visibility logic onto an already
complex table. Design:

- `pulse_checks` unchanged.
- Extend the pulse-check form UI (`app/(dashboard)/pulse-check/pulse-check-form.tsx`) with an
  optional final step — "share a quick public update?" — which performs a **second, independent
  write** to `profile_updates`, stamping `pulse_check_id` only as a backreference.
- `profile_updates` is also writable standalone via `POST /api/profile-updates` (self-only,
  zod-validated body), matching the prototype's anytime Dashboard composer.
- RLS: public SELECT scoped to `visibility='public'`; INSERT restricted to the owning
  participant.

---

## 7. Directory + public profiles

The upskiller directory is a **query, not a content table**: `GET /api/directory` joins
`participants` (`public_profile_visible = true`) with `mentor_profiles` (mentor filter/badge)
and the existing expertise-tag source (`participant_options`), paginated, filterable by
`role=mentor`, metro, and tag. No profile data is duplicated anywhere.

- `GET /api/profiles/[handle]/public` — public profile payload.
- `GET /api/profiles/[handle]/updates` — paginated public updates.
- *Open question: are public profiles directory-listed by default (opt-out) or only after
  explicit completion (opt-in)? Affects the `public_profile_visible` default.*

---

## 8. Routes, auth posture, and public pages

**Proxy nuance — don't over-build:** `proxy.ts`'s `publicPaths` already covers `/api/` wholesale;
API auth is enforced per-route via `withAuth`/`withAdminAuth`/`withOwnerAuth`. New public API
routes need **zero** proxy changes — just don't wrap them. What **does** need `publicPaths`
additions is each new public **page**:

| Public page | Purpose |
|---|---|
| `/` | Real browse-first landing, replacing `app/page.tsx`'s hard redirect to `/login` |
| `/discover` | Signed-in Discover (largely shares the landing's sections/data) |
| `/labs` | Metro browse |
| `/s/[share_slug]` | Public survey response page (the `?survey=` deep link in the prototype) |
| `/u/[handle]` | Public member profile |

The `/` change is **the single highest-risk item to audit** — it is OLOS's first genuinely
public page; verify no server component on that path assumes a session.

**Public (unauthenticated) API routes:** `GET /api/labs`, `GET /api/cycles/[cycle_id]/public`,
`GET /api/surveys/[survey_id]`, `POST /api/surveys/[survey_id]/responses` (zod-validated via a
new `lib/validations/survey-responses.ts`; accepts session participant **or** anonymous),
`GET /api/events`, `GET /api/resources`, `GET /api/directory`,
`GET /api/profiles/[handle]/public`, `GET /api/profiles/[handle]/updates`.

**Authenticated:** `GET/PUT /api/sensemaking-sessions/[cycle_id]`,
`GET /api/surveys/[survey_id]/responses` (moderator/admin review),
`PUT /api/onboarding/checklist`, `POST /api/profile-updates`,
`POST /api/frames/[id]/commit`, `POST /api/projects/[id]/revisions/[rev_id]/approve`,
`POST /api/profiles/citations`, plus admin CRUD for metros / resources / events /
mentor-profiles.

**New roles:**

- **Delivery Facilitator** — exclusive permission to set `qa_verified` on `project_instances`
  and authorize the 6th/7th seat. *Open question: new role, or a new permission grant on the
  existing pod-scoped `moderator_assignments` concept? OLOS already has pod moderators; prefer
  hanging the permission there over inventing a parallel role.*
- **Client Sponsor** — limited-access external stakeholder, scoped only to `project_instances`
  whose `problem_frame.client_sponsor_id` matches: read + final signature/acceptance, nothing
  else. Genuinely new; nothing in today's role model covers an external non-participant.

**Spam/rate-limiting call-out (pre-launch blocker for the share link):** OLOS has **no**
rate-limiting or CAPTCHA infrastructure anywhere today. Minimum bar before any public survey
link ships: the `ip_hash` column plus a per-IP/time-window check in the response route handler.

---

## 9. Migration sequencing

Confirm the head number first (see §1 preamble), then land in this order:

1. `metros` + `cycles.metro_id`
2. `field_surveys` + `survey_responses` + RLS
3. `sensemaking_sessions` + RLS
4. `mentor_profiles` + `participants` public-profile columns + `onboarding_tasks` +
   `participant_onboarding_progress`
5. `events` (Luma cache)
6. `resources` (CMS)
7. `profile_updates` + RLS
8. `problem_frames` + `project_instances` + `instance_members` + RLS — **only after §1.10's
   overlap question is resolved**
9. `narrative_revisions` + `citations` + RLS — same gate as (8)

---

## 10. Open questions (product decisions needed before implementation)

1. **Pod/Project overlap (§1.10)** — separate staking flow vs. mapping onto existing tables.
   Highest priority; gates migrations 8–9.
2. Raw survey response → Triangulator `title+summary` card mapping: direct 1:1, manual
   curation, or AI-assisted? Affects whether `survey_responses` needs a "promoted to pool"
   workflow state.
3. Moderation for public survey responses — `moderation_status` exists in the schema but
   nothing consumes it yet.
4. Multi-tenancy: confirm `sensemaking_sessions.field_survey_id` scoping keeps each cycle's
   pool isolated.
5. Data retention/privacy for anonymous (`participant_id IS NULL`) submissions — no policy
   exists today; needed before `allow_anonymous` ships to prod.
6. Luma Plus subscription confirmed? Exact `list-events` response fields confirmed?
7. Resources CMS: real admin editor on day one, or entity-explorer stopgap?
8. Directory default: opt-out vs. opt-in listing.
9. Social updates moderation posture (none / post-hoc / pre-publish) before free-text public
   content ships at scale.
10. Delivery Facilitator: new role vs. permission on existing pod moderators.
11. Peer-approval threshold scaling beyond 3-person teams.

---

*This work extends roadmap §4.6 "Onboarding flow expansion" — reference that anchor from
implementation issues.*
