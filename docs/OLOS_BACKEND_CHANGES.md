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
sensemaking tool) in this repo. Every mock data shape in `index.html` (`EVENTS`, `RESOURCES`, `MEMBERS`,
`SITUATIONS`, `PROPOSALS`, `SURVEY_SEED`, `userState.journal`, `userState.updates`) is deliberately shaped like the API
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

Custom OLOS-native CMS — no third-party vendor. **Commons provenance:** add a nullable
`project_id FK` and `'playbook'` to `content_type` — project outputs (playbooks,
kits, case studies) return to the Living Library with visible provenance ("From the commons ·
BenefitsBot, Spring 2026 Cycle"). Publishing a project's approved case study to the library is
the flywheel's return path; the Showcase is the moment it happens.

**Forward-compat for basic courses (a later
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
id, participant_id FK, cycle_id FK NULL, journal_entry_id FK NULL,
body text, visibility enum('public','labs_only') default 'public', created_at
```

Backs the "Share a public update" composer and the profile activity feed. The nullable
`journal_entry_id` only logs which journal moment (if any) prompted the post — it is **not**
how content is sourced. See §6: journal entries are never public; a public post is always a
separate, explicit write to this table.

### 1.10 Team formation & governance (aligned to the live OLOS pipeline)

**Resolved (product decision, June 2026): the prototype's earlier stake-to-ignite mechanic is
deleted.** Formation uses OLOS's existing pipeline exactly as it runs today —
`solution_proposals → project_votes → tally (LLM-named via lib/llm/names.ts) → self-serve
registration` — with people joining **one pod**, and **projects forming within that pod**.
No `project_instances`, no `instance_members`, no commit/staking routes. This dissolves the
old "separate staking tables vs. `formed_via` column" question entirely: there is one
formation pipeline, and it already exists.

What remains to build:

- **`problem_situations`** (unchanged from earlier drafts) — `id, cycle_id FK, pod_id FK NULL,
  sensemaking_session_id FK NULL, problem_owner_id FK, title, messy_context text,
  status enum('open','adopted','archived'), created_at`. Cycle-specific, pod-scoped, created
  from the pod's Triangulator sensemaking (`sensemaking_sessions`, §1.4); the prototype renders
  them read-only with a "Voting closed" badge once the problem-statement vote settles. Problem
  Owners are *identified through stakeholder mapping*, not pre-assigned clients.
- **Four columns on the existing `solution_proposals`** — `frame text, intervention text,
  success_metrics text, evidence text`, plus `problem_situation_id FK NULL` for Triangulator
  provenance (the prototype's "From 'situation' · owner" card eyebrow). Born at the Hackathon;
  one proposal per member per cycle (the prototype UPSERTs on resubmit — mirror that with a
  unique `(cycle_id, participant_id)` constraint and upsert semantics on the submit route).
- **Project canvas fields** — the winning proposal's frame/intervention/metrics/evidence flow
  into the formed project's canvas view; no new storage beyond the proposal row the project
  already references.
- **`narrative_revisions`** — `id, project_id FK, author_id FK, proposed_text text,
  status enum('pending','approved','rejected'), created_at`. Backs peer-approved case-study
  edits. (References the existing `projects` table now — not a staking table.)
- **`citations`** — `id, participant_id FK, project_id FK, narrative_claim text,
  source_url, domain_verified boolean, created_at`. Backs the profile citation chips.

The lifecycle, end to end (prototype mirrors every step; admin Testing Controls step the
phases live via the demo-only `olos.cycleState.v1` key — in production the phase derives from
`cycle_config` window timestamps, **no new table needed**):

```
pod forms (existing mechanism, unchanged)
  → pod runs sensemaking (sensemaking_sessions, §1.4)
  → mapped situations become problem_situations (read-only history after the vote)
  → the Hackathon turns research into solution_proposals (+frame/intervention/metrics/evidence)
  → members budget-vote (existing project_votes; ballots lock on cast)
  → tally names winners (existing LLM naming, lib/llm/names.ts) and creates projects
  → members self-register for exactly one project (existing registration)
  → a project is "real" at project_min members — the prototype's ignition interstitial
```

**Eligibility choice (deliberate, easily flipped — confirm before shipping):** the prototype
lets *everyone in the pod* vote, with submitters getting the larger budget (5 votes vs. 3) —
mirroring how OLOS's problem-statement vote treats submitters. If production wants
submitters-only ballots or different budgets, it's one config change; see §2 for the knobs.

---

## 2. Confirmed sizing bands & formation logic

Two distinct tiers — **do not conflate them**:

| Tier | Min | Max | Notes |
|---|---|---|---|
| **Pods** (existing `pods`/`pod_memberships`) | **12** | **30** | unchanged |
| **Projects** (existing `projects`/`project_memberships`) | **3** | **5** | flat cap — the earlier "+2 facilitator-override seats" concept is deleted along with staking |

Configuration knobs (the prototype's `CYCLE_CONFIG`, editable live in admin.html's Cycle
control): `submitter_votes` (5), `non_submitter_votes` (3), `vote_threshold` (5),
`project_min` (3), `project_max` (5), `max_projects` (4 — also bounded by
`floor(pod_size / project_min)` at tally time). Before adding columns, verify which already
exist in `cycle_config` under other names — roadmap W2-006 references `project_min`/
`max_projects`, so at least some are live. Check `SCHEMA.md`/migrations first.

- **Ballot semantics:** one ballot per member per cycle; allocations are +/− integer votes
  against open proposals, capped at the member's budget; the ballot **locks on cast** (the
  prototype confirms through a modal stating exactly that). Aggregate tallies are visible;
  **no per-voter attribution is ever exposed** (admin and Poderator views show totals only).
- **Tally:** proposals at/above `vote_threshold`, ranked by votes, capped at `max_projects`,
  become projects; the existing LLM naming (lib/llm/names.ts) fires here — the prototype fakes
  the moment with a deterministic generator and a "✨ Naming projects…" beat in admin.
- **Registration:** `POST /api/projects/[id]/register` (existing route family) — one active
  project per member per cycle (unique constraint), reject at `project_max`, first
  registration past `project_min` flips the project into scoping (the prototype's ignition
  interstitial is the frontend for that moment).
- **Peer-approval route:** `POST /api/projects/[id]/revisions/[rev_id]/approve` — caller must
  be a project member and must not be `narrative_revisions.author_id`. At 2 approvals (1 for
  a 3-person team) set `status='approved'` and merge into the public case study. *Open
  question: confirm the threshold scales sensibly across 3–5-member teams.*
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
- **Event kinds:** add `events.kind enum('workshop','summit','meetup','showcase','cycle_anchor')`
  and a nullable `cycle_week int`. The six anchor events (Kickoff Summit, Meet the Pods,
  Hackathon, Meet the Projects, Showcase Summit) are first-class rows tied to cycle weeks —
  they are the institution's public rhythm, not ad-hoc calendar entries.
- **Public RSVP (email-only):** public programming is free, open, first come first served —
  RSVP must not require an account. New **`event_rsvps`** table: `id, event_id FK,
  participant_id FK NULL, email text, created_at` (nullable participant, same anonymous
  pattern as `survey_responses`), with `POST /api/events/[id]/rsvp` public and rate-limited
  (same `ip_hash` guidance as survey responses).
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
participant_id FK (1:1), status enum('active','inactive') default 'active',
expertise text[], availability_notes text,
pods_mentored text,
timezone text, booking_url text, artifact_url text,
verified_by_labs boolean default false, verified_at timestamp NULL
```

**Self-service publish:** completing the mentor intake creates the row `active` immediately —
no `pending` review gate, no application queue (`inactive` exists only for self-pausing; any
moderation is post-hoc). **`verified_by_labs`** is the admin-granted "Vouched by The Labs"
badge — settable only via `PATCH /api/admin/mentor-profiles/[id]` (`withAdminAuth`), never
self-serve, and never a precondition for appearing in the directory (verified mentors simply
sort first under the mentor filter). `outcome` and `testimonial` columns are intentionally
absent: outcomes live in project case studies, and testimonials are **never self-authored**
— see `mentor_testimonials` below.

**`mentor_testimonials`** — `id, mentor_participant_id FK, author_participant_id FK,
quote text NULL, status enum('requested','submitted','hidden'), created_at`, with a CHECK
that `author_participant_id != mentor_participant_id`. The mentor *requests* a testimonial
from a specific member (`POST /api/mentor-testimonials/requests`); the **author** submits the
quote (`PATCH /api/mentor-testimonials/[id]`, author-only for `quote`/`submitted`); the
mentor may only set `hidden`. Evidence about you, not by you.

(The field list mirrors the prototype's six-step `FLOWS('mentor')` intake: expertise, engage, pods-mentored, timezone, booking link, artifact link.) Rationale: mentorship is a
public-facing offering/intent, not an elevated-permission grant like `user_roles` /
`participant_permissions` model — it doesn't belong in the `Role` union in `lib/auth/roles.ts`.
If a route guard ever needs "is this user a mentor," derive it cheaply
(`EXISTS in mentor_profiles WHERE status='active'`) inside `resolveUserRoles()`'s output rather
than overloading `Role`. **Flag in the PR that this closes roadmap row D3.**

---

## 6. The Practice Journal — replaces the weekly Pulse (institutional-model decision)

The institutional model **retires the weekly Pulse in favor of a guided Practice Journal**.
This supersedes the earlier "extend the pulse-check form" design in previous drafts of this
document. The journal serves three audiences — yourself, your pod, and OLOS synthesis — and
its prompts evolve with the cycle phase (Discovery → Investigation → Reframing → Building →
Integration).

- **`journal_entries`** — `id, participant_id FK, cycle_id FK, phase text, prompt_key text,
  body text, visibility enum('private','pod') default 'private', created_at`. Never public;
  a public post is a *separate, explicit* write to `profile_updates` (the prototype's
  "also post publicly" checkbox performs exactly this second write).
- **Migration path from `pulse_checks`:** keep the table and its history; new cycles write
  `journal_entries` instead. The pulse cadence infrastructure (reminder cron, moderator
  review surfaces) adapts: reminders point at the journal; the poderator dashboard reads
  pod-visible entries (`visibility='pod'`) in place of pulse responses.
- **OLOS synthesis layer (new scope):** the platform synthesizes hundreds of journals to
  surface recurring themes, shared paradoxes, stalled investigations, and promising
  connections between pods. Follow the existing precedent that **no LLM runs inside OLOS**
  (per the poderator dashboard's AI-summary pattern): v1 bundles pod-visible entries plus a
  stored prompt for a facilitator to run in their own AI tool; a served synthesis is a later
  decision.
- Routes: `POST /api/journal-entries` (self-only), `GET /api/journal-entries/me`,
  `GET /api/pods/[pod_id]/journal` (pod-visible entries, pod members + moderators),
  `GET /api/moderator/journal-synthesis/[cycle_id]` (the bundled-prompt export).
- `profile_updates` (§1.9) is unchanged — it remains the optional public social layer.

## 6a. Just-in-time mentorship — evidence precedes assistance

Mentors are not assigned and not booked cold. Participants investigate, try, document,
reflect — *then* request, with evidence attached. New table:

- **`mentor_requests`** — `id, requested_by FK participants, project_id FK NULL,
  pod_id FK NULL, tried text, evidence text, challenge_question text, expertise_needed text[],
  status enum('open','matched','closed'), matched_mentor_id FK NULL, created_at`.
- Routes: `POST /api/mentor-requests` (validation **requires** `tried`, `evidence`, and
  `challenge_question` — the evidence-first principle is enforced at the API, not just the UI),
  `GET /api/mentor-requests` (mentors/facilitators browse open requests),
  `PATCH /api/mentor-requests/[id]` (match/close).
- The mentor directory remains for community browsing, but the *help pathway* runs through
  requests, not booking links.

**The two-sided marketplace:** supply = self-published mentor profiles (above); demand =
evidence-backed `mentor_requests`; matching = **mentor-claimed by default**
(`PATCH /api/mentor-requests/[id]` by the mentor). Staff have visibility (entity-explorer
registration + admin surfaces) and **may concierge** — match a request or make an
introduction when useful — an ability, not a workflow step anything waits on.

**`follows`** — compound PK `(follower_id FK, followed_id FK)`, `created_at`, CHECK
`follower_id != followed_id`. Routes: `POST/DELETE /api/follows/[participant_id]`
(authenticated, self-only); follower/following counts join the public profile payload; the
updates feed endpoint gains `?following=true`. Following is the marketplace's attention
primitive — follow mentors and builders, see their work first.

**Mentor recruitment path (product decision):** recruited, known-experienced mentors register
through the **same signup as everyone else** — the role-intent step keeps its Mentor option,
and the signup flow's "How did you hear about us? / Who referred you?" step lands in two new
`participants` columns (`referral_source text`, `referred_by text`) so the org can connect
recruited mentors to their recruiter. Any member can also raise their hand later via the
profile's "I have experience to offer" path (the same mentor-profile flow). Leadership grows
from within; the door is the same door.

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
`GET /api/pods/[pod_id]/situations`, `POST /api/pods/[pod_id]/situations`, and
`POST /api/situations/[id]/proposals` (pod members — situations and proposals are pod-scoped,
never public), the existing proposal-submit/vote/register routes (§2; pod members only),
`POST /api/mentor-requests` + `GET /api/mentor-requests` (see §6a),
`POST /api/journal-entries` + pod/moderator journal reads (see §6),
`POST /api/projects/[id]/revisions/[rev_id]/approve`,
`POST /api/profiles/citations`, plus admin CRUD for metros / resources / events /
mentor-profiles.

**New roles:**

- **Delivery Facilitator** — exclusive permission to set `qa_verified` on `projects`
  and authorize the 6th/7th seat. *Open question: new role, or a new permission grant on the
  existing pod-scoped `moderator_assignments` concept? OLOS already has pod moderators; prefer
  hanging the permission there over inventing a parallel role.*
- **Client Sponsor** — limited-access external stakeholder, scoped only to `projects`
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
7. `profile_updates` + `journal_entries` + RLS
8. `problem_situations` + the four `solution_proposals` columns (`frame`, `intervention`,
   `success_metrics`, `evidence`) + `solution_proposals.problem_situation_id` + RLS — no new
   formation tables (§1.10 resolved: the existing voting pipeline is the formation mechanism)
9. `narrative_revisions` + `citations` + RLS
10. `mentor_requests` + `event_rsvps` + `events.kind`/`cycle_week` + `participants.referral_source`/`referred_by`
11. `follows` + `mentor_testimonials` + `mentor_profiles.verified_by_labs`/`verified_at`

---

## 10. Open questions (product decisions needed before implementation)

1. ~~Project-formation storage~~ **Resolved (§1.10):** the existing
   `solution_proposals → project_votes → projects` pipeline is the formation mechanism;
   staking tables are deleted from this plan. Remaining sub-question: ballot eligibility —
   the prototype lets every pod member vote with submitters on the larger budget (5 vs. 3);
   confirm, or flip to submitters-only, before the Hackathon window ships.
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
10. Nominations + feedback intake (prototype §7 surfaces): where do `nominations` and
    member feedback land — ops tables + notification, or an external tool first?
11. Peer-approval threshold scaling across 3–5-member teams.

---

*This work extends roadmap §4.6 "Onboarding flow expansion" — reference that anchor from
implementation issues.*
