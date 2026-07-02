# CLAUDE.md — onboarding-proto

## What this is

A responsive, click-through HTML prototype for **The Upskilling Labs** — a public, browse-first
member experience, the participant onboarding flow, the signed-in app (Discover · Dashboard ·
Profile), the embedded **Triangulator** sensemaking tool, and the **Poderator** (`moderator.html`)
and **Admin** (`admin.html`) persona surfaces reached through the avatar "View as" menu. No framework, no Tailwind, no build
step, no backend. This prototype is the design source of truth for the production implementation
(see `docs/OLOS_BACKEND_CHANGES.md` for the backend plan it implies).

It is **mobile-first and fully responsive**: a phone-shaped experience on small screens
(bottom tab bar, full-screen steps, sticky CTAs) that expands into a real web app on desktop
(top nav, multi-column grids, centered auth sheets).

**Branch:** `claude/merge-repos-onboarding-proto-b3axjt` — push here.

> **Naming rule (hard):** the brand is **"The Upskilling Labs"**, shortened only to **"The Labs"** —
> never "TUL" or any other abbreviation. This applies to every user-facing string, label, title,
> and footer. (It's fine in prose/commits, never in rendered UI.)

---

## Repo layout

| Path | What it is |
|---|---|
| `index.html` | The member app — landing, onboarding, Discover · Dashboard · Profile |
| `triangulator.html` | The Triangulator — a full problem-framing tool (Kees Dorst Frame Creation), reskinned to this design system, embedded via iframe from `index.html`. Canonical upstream: the `triangles` repo; this copy is the reskinned/integrated adaptation. |
| `stories.html` | **Upskiller Spotlights** — public story page (tinder-swipe-stories model): filterable spotlight grid, expandable stories, `#s-{id}` deep links, "Share your story" modal → `STORY_SUBMISSIONS` |
| `font.css` | The single embedded Geologica `@font-face` (base64) — every HTML file links it; **no inline `@font-face` anywhere** |
| `tokens.css` | Brand primitives (palette, `--r`, shadows, `--grain`) — the single source of truth; per-file `:root`s hold only file-specific vocabulary |
| `shared.js` | Stateless helpers (`escHTML relDate avatarSm enhanceTappables ORB GRAD`, view-as persona contract) loaded before each file's inline script — no routing, no per-file state |
| `moderator.html` | The Poderator persona (never "moderator" in rendered copy) — pod switcher, journal-health bands + trend, at-risk nudges (mailto + dismiss), journal themes, copy-to-clipboard AI bundle (no in-app LLM), vote tallies, roster |
| `admin.html` | The Admin persona — Testing Controls (phase stepper that writes `olos.cycleState.v1`), cycle control, vote progress, invitations, participants + permissions stub, Entity Explorer stub |
| `docs/OLOS_BACKEND_CHANGES.md` | The backend planning doc — every schema/API change OLOS needs to serve this frontend |
| `assets/` | Used images (logos, sample photography, orb marks) |
| `archive/` | Superseded drafts (`old-index.html`, `prototype-v1.html`) and unused files |

Both HTML files have three editable regions: `<style>` in `<head>`, screen markup in `<body>`,
and a `<script>` at the end of `<body>` — plus the three shared files above.

---

## Design system

Brand primitives live in **`tokens.css`** (linked by every HTML file — never re-declare them in
a file's own `:root`). **Canonical brand palette**
(do not reintroduce the old `midnight`/`aqua` values):

| Token | Value | Use |
|---|---|---|
| `--ink` | `#00141B` | deepest navy — the logo background, nav bars, covers, footers |
| `--navy` | `#03232A` | primary brand navy |
| `--forest` | `#005F68` | deep teal-green, gradient endpoints |
| `--teal` | `#0094A0` | primary accent / CTAs / links |
| `--teal-deep` | `#007882` | hover / pressed / labels on light |
| `--red` | `#E11D2A` | high-priority CTAs (Create account, Register) and required markers only |
| `--paper` | `#F6F4EF` | **warm off-white — the only light page background** |
| `--white` | `#FFFFFF` | cards |
| `--charcoal` / `--slate` / `--meta` / `--meta-soft` | `#444` / `#4A5557` / `#748083` / `#A0ADB0` | text on light |
| `--od1/2/3` | `rgba(255,255,255,.95/.64/.40)` | text on dark |

Rules baked into the system:
- **One radius.** `--r: 14px` on every rectangular container — buttons included. No full pills.
  Genuine circles only (avatar, status dots, timeline pips, the orb, the Triangulator's modal-close).
- **Warm off-white only.** `--tint` (`#ECF3F4`) exists but is **not** used as a page background.
- **Light-first; dark is for "covers."** Dark `--ink`/gradient surfaces are reserved for the
  landing hero, the About hero, nav bars (logo always on navy), the ignition interstitial, and
  the open-source footer.
- **4px baseline grid.** Type line-heights and spacing are multiples of 4.
- **Type scale** classes: `.t-display .t-h1 .t-h2 .t-h3 .t-h4 .t-lede .t-body .t-small .lbl .idx .t-stat`.
- **Soft elevation:** `--shadow` / `--shadow-lg`; cards `.tappable` lift on hover (desktop only).
- **Grain:** `.grain` overlays an SVG-noise texture on dark surfaces.

Font: **Geologica** only (embedded base64 in `font.css` — no CDN, one fetch for the whole
suite). The Triangulator additionally
keeps its own functional/semantic colors (`--tier-1..6` ladder ramp, seven `--type-*` evidence
colors) — those are not brand palette and must stay recognizable.

---

## View architecture

Top-level screens are `<div class="view">` inside `#screens`; one is `.active` at a time,
toggled by **`showView(id)`**. The signed-in app is a single view (`#app-shell`) containing
its own **panels** (`.panel`), a sticky dark top nav, and a mobile bottom tab bar.

### Top-level views

| ID | Screen |
|---|---|
| `view-landing` | Public hybrid home — dark hero + browse sections + open-source footer |
| `view-about` | Scrollable explainer |
| `view-google-auth` | Google auth explainer (shows gate context) |
| `view-role-intent` | Role multi-select |
| `view-flow` | One-question-per-screen engine (signup / cycle / mentor / volunteer / profile / **survey**) |
| `view-mentor-explainer` | 2-step mentor briefing |
| `view-stub` | Generic "you're all set" |
| `view-survey-share` | Post-survey share screen (copy link; `?survey=` deep-links back into the flow) |
| `view-triangulator` | Slim chrome + same-origin `<iframe src="triangulator.html">` |
| `view-team-ignition` | Full-screen "Team initialized" interstitial (a project team reaches `projectMin` registrations) |
| `view-project-canvas` | Project instance mockup — roster from `CYCLE_PROJECTS[].members` (filled + open seats to `projectMax`) + case-study pending-approval UI |
| `app-shell` | Signed-in app — includes `panel-profile` (the public portfolio: trust badges, citation chips, updates feed, testimonials, case-study peer-approval) |

### Signed-in navigation: Discover · Dashboard · Profile

Top nav and bottom tab bar both carry exactly three destinations and **persist on every
signed-in page, profile included** (LinkedIn model — the profile is `panel-profile` inside the
shell, not a separate view; no bespoke back-bar). Your own profile highlights Profile; a
directory member's profile keeps Discover highlighted (`viewingMemberProfile`). **`panel-discover`** is the
single browse destination — cycle banner, events, library, community directory
(mentor-filterable chips), community updates, labs, saved. Every section renders from JS data
arrays (`EVENTS`, `RESOURCES`, `MEMBERS`, `LABS`) so production swaps the data source, not
markup. Legacy panels (`panel-cycles/events/event/labs/resources/bookmarks`) are retained as
"View all →" drill-ins only — no nav entries.

### Personas: one account, three lenses

Poderators and Admins register through the same path as everyone else. The avatar in the top
nav opens **`#avatar-menu`** (markup mirrored in all three pages; wiring in shared.js —
Esc/outside-click close, ArrowUp/Down cycle, `menuitemradio` semantics): Your profile · View
as **Upskiller / Poderator / Admin** (selected-dot on the current lens) · Sign out.
`viewAs(role)` persists `olos.viewAsRole.v1` and navigates; `moderator.html`/`admin.html`
boot-guards soft-redirect a stored `'upskiller'` lens back to `index.html` (click-through
convenience — real gating is server-side in OLOS). Both persona pages carry a dark nav,
persona pill, and "Exit to member view".

- **`admin.html`**: Testing Controls (the phase stepper — advancing into *tallied* runs the
  tally with the "✨ Naming projects…" beat and writes `olos.cycleState.v1`), cycle
  status/windows/threshold knobs (live — the tally reads them), aggregate vote progress
  (never per-voter), invitations (role presets incl. Poderator, copyable links,
  Resend/Revoke), participants table + permissions modal, Entity Explorer disabled stub.
- **`moderator.html`** (rendered copy says **Poderator**, never "moderator"): pod switcher
  (+ All-pods rollup), phase/countdown/journal-health band (`.status.watch`/`.status.risk`) +
  trend, at-risk nudge cards (mailto + session Dismiss; empty state), journal-themes card
  (pod-visible entries only), copy-to-clipboard AI bundle (no in-app LLM — matches OLOS),
  vote tallies, filterable/sortable roster.

**Formation (mirrors OLOS's real pipeline) — never Discover content.** All on `panel-cycles`,
cycle-scoped, phase-driven from `olos.cycleState.v1` (`CYCLE.formationPhase`, read at boot +
via the `storage` event; admin.html's Testing Controls step it):
- **Problem Situations** (`SITUATIONS`, `renderCycleSituations()`, Month 1 · Problem Sprint):
  read-only history — the problem statements this cycle voted in, mapped in the Triangulator
  ("Voting closed" badge; no actions).
- **Solution Proposals → Projects** (`SOLUTION_PROPOSALS` → `CYCLE_PROJECTS`,
  `renderCycleFormation()` dispatching per phase): **submission** (one proposal per member,
  UPSERT via `FLOWS('solutionProposal')`, edit re-enters pre-filled) → **voting**
  (`renderSolutionBallot()`: budget ballot — submitters 5 / others 3 votes, threshold 5 to
  form; ballot locks through `#ballot-confirm`) → **tallied** (`tallyAndFormProjects()` +
  deterministic `generateProjectName()` — the "✨ naming" beat; OLOS does this with an LLM) →
  **registration** (`renderProjectRegistration()`: self-serve `registerForProject()`, one
  project per member, teams real at `projectMin` 3, cap `projectMax` 5 — reaching min fires
  the ignition interstitial). Gating helpers: `inCycle()` (membership) and `inProject()`.

**The cycle's public rhythm is the six anchor events** (Kickoff Summit, Meet the Pods,
Hackathon, Meet the Projects, Showcase Summit) — they lead the `EVENTS` array (`anchor:true`,
`kind`), appear ✦-marked on the week rail, and drive `CYCLE.milestones`. Phases are
`Problem Sprint / Frame Sprint / Building`.

**`panel-dashboard`** is the admin view of your own presence, in this order: **setup checklist
first** (actionable rows carry visible "Start →" buttons — no hover-only affordances; the
whole section collapses to a "Setup · All done ✓" strip once complete), then the **Practice
Journal**, then the demoted public composer, then dismissible "Up next" cards.

### Journey rules (added in the UX-improvements pass — keep these invariants)

- **Auth guard:** `showView` routes any `APP_PANELS` id to the landing when
  `!userState.signedIn` — the app shell is unreachable signed-out. All exits are auth-aware:
  the survey-share exit and the Triangulator chrome exit (`exitSurveyShare()` /
  `exitTriangulator()`) read "Back to dashboard / ← Back to Dashboard" for members and
  "Back to The Labs" for anonymous visitors (→ landing).
- **Trust is earned, never default:** `renderBadges(earned)` — fresh members see locked
  badges (`.badge-locked`, dashed, with how-to-earn tooltips); established mock members show
  the earned pills. Citation chips anchor inline after the claims they substantiate
  (`bioWithCitations`), falling back to end-of-bio for custom text.
- **Post-ignition continuity:** when your registration tips a team past `projectMin`, the
  ignition interstitial fires (with a "Later — back to your cycle" escape), the team card
  flips to "Open the project canvas", and a non-dismissible "Your project" card pins first
  in Dashboard "Up next". Casting a ballot always passes through the `#ballot-confirm`
  sheet (ballots lock once cast) — never mutate votes directly.
- **Concept before pool:** `triangulator.html`'s `pickInitialScreen()` routes a pre-seeded
  first-timer to the concept screen (the method needs a named concept for evidence to push
  against); the pool waits behind it. Mobile (<700px) gets a one-time "canvas works best on
  a larger screen" toast on entering the board.
- **Landing browses free:** no gated "See all" links; section order is hero → **stories**
  (`#sec-stories` — a fit-to-width `.story-row` of `STORIES` cards, left-side ORB-gradient
  image placeholders, ending in the `.story-cta` card "Share your story or read more" /
  "Upskilling Stories →" into `stories.html`; overflow cards hide per breakpoint, the CTA
  never does) → cycles (+ prominent ungated survey CTA card) → workshops → library → labs.
- **Keyboard access:** dynamic card renderers call `enhanceTappables()` (tabindex/role +
  delegated Enter/Space handler); keep that call when adding new renderers.

### Key user flows

- **Create account:** Landing → `view-google-auth` → `view-role-intent` → signup flow
  (zip pre-suggests the lab; explicit profile-visibility choice step) → role branches →
  gate-return (if the funnel was entered from a gated card, signup returns there) or
  dashboard.
- **Survey → Triangulator:** survey flow (`FLOWS('survey')`, loops via "add another") →
  observations append to `localStorage['olos.surveyPool.v1']` (seeded from `SURVEY_SEED`, the
  Civic & Elections CSV) → `view-survey-share` (copy `?survey=` link; the link deep-links
  straight into the flow, no account needed) → `openTriangulator()` → the iframe ingests the
  pool on boot and live via the `storage` event. **Prototype limit (by design):** single-browser
  aggregation only — real cross-user pooling is the OLOS `survey_responses` API.
- **Formation (cycle members only):** submit one solution proposal (flow UPSERT) → budget-
  vote on the ballot (locks on cast) → admin tallies (winners named, become `CYCLE_PROJECTS`)
  → self-register for exactly one team; at `projectMin` (3) registrations the team ignites →
  `view-team-ignition` → `view-project-canvas` (frame/intervention/metrics/evidence + a
  "Request a mentor" JIT-support block). Caps: 3 min · 5 max per team, `maxProjects` 4.
- **Practice Journal (replaces the Pulse):** `#journal-card` on the dashboard — phase-evolving
  prompt (`JOURNAL_PROMPTS` keyed by `CYCLE.phase`), visibility Just me / My pod, optional
  "also post publicly" (a second, explicit write to `userState.updates`). Entries are never
  public by default. The public composer below it is the demoted, optional social layer.
- **Evidence precedes assistance:** `FLOWS('mentorRequest')` — required tried/evidence/
  challenge steps; entry points on the project canvas and the directory's mentor filter.
  Public event RSVPs are email-only (`#rsvp-modal`, `openRsvp()`) — never account-gated.
- **Mentor pathways (self-service marketplace):** role-intent keeps Mentor (recruited mentors
  use the same signup); signup asks "How did you hear about us?" (+ conditional "Who referred
  you?" → `userState.referral`); the profile's "I have experience to offer" card starts the
  mentor flow anytime (`#prof-mentor-cta`, owner-only, hidden once `completed.mentor`). The
  6-step mentor intake (expertise/engage/pods/tz/booking/artifact) **publishes immediately** —
  no review queue; the explainer says exactly where answers go. Staff can concierge, never
  gate.
- **Testimonials are requested, never self-written:** `testimonialBlockHTML()` — mentors
  request quotes from members (pending chips, cancellable), authors write them, mentors can
  only hide. Received quotes render with attribution on the mentor's profile and directory
  visitor view.
- **Follow + verified:** `toggleFollow(id,e)` / `isFollowing(id)`; follower counts on member
  meta lines, "N following" on the owner's; Discover's Community updates has All/Following
  chips (`updatesFilter`). `verified:true` mock mentors carry the admin-granted
  **"✓ Vouched by The Labs"** pill (profile) and ✓ (directory card), sort first under the
  mentor filter; never self-serve, no locked state — one explanatory line in the mentor
  detail card.
- **Directory:** Discover → member card → `showMemberProfile(id)` renders that member into
  `view-profile` in visitor mode ("Back to Discover" bar). Owner state is fully restored by
  `renderProfileView()` on next open.
- **Nominations (members surface talent; staff concierge, never gate):** "Nominate" ghost
  button on directory cards + "Recognize someone this week →" under the journal card →
  `FLOWS('nominate')` (nominee preloaded from the card; a name step appears via `step.when`
  when entered from the journal) → `userState.nominations[]` → stub confirmation.
- **Feedback (every screen, signed in or out):** the fixed circular launcher (`#fb-launcher`,
  a genuine-circle exception; offset above the mobile tabbar in index.html) opens `#fb-modal` —
  Bug/Idea/Confusing/Love-it chips + textarea → `FEEDBACK_LOG` entries carry
  `{category, body, at, screen}`. Mirrored on both persona pages and `stories.html`.
- **Upskiller Spotlights:** the landing row's cards and CTA deep-link into `stories.html`
  (public, no auth). `SPOTLIGHTS` (full set) renders a filterable grid (All/Builders/Mentors/
  Career changers); cards expand in place; `#s-{id}` hashes auto-expand; "Share your story"
  opens `#share-modal` → `STORY_SUBMISSIONS` (concierge-reviewed, never auto-published).

---

## Flow engine

`view-flow` is data-driven; flows come from `FLOWS(name)` for
`'signup' | 'cycle' | 'mentor' | 'volunteer' | 'profile' | 'survey'`. Step types:
`info | text | textarea | choice | checks | tags | consent`. Confirm-to-advance everywhere;
optional steps show Skip. The survey flow's `onComplete` loops back to the title step when the
user picks "add another" (resets `fstep`, calls `renderFlowStep()` directly).

```js
startFlow(name, backFn)  renderFlowStep()  flowAdvance()  renderFlowInput(step)
```

---

## Key JS state and functions (beyond the flow engine)

```js
userState                 // name, initials, fullName, roles, completed{}, saved[], updates[], lab
EVENTS / RESOURCES        // mock data shaped like Luma API / OLOS resources CMS responses
MEMBERS                   // mock directory
CYCLE_CONFIG / SOLUTION_PROPOSALS / CYCLE_PROJECTS  // formation data (submit → vote → tally → register)
SURVEY_SEED / SURVEY_POOL_KEY  // Civic & Elections seed + 'olos.surveyPool.v1'

renderDiscover()          // all Discover sections (called by showAppView('discover'))
renderCycleSituations() / renderCycleFormation()   // read-only situations + phase-dispatched formation
renderSolutionBallot() / voteStep() / confirmBallot()  // budget ballot (locks on cast)
tallyAndFormProjects() / generateProjectName()     // tally + the deterministic naming beat
renderProjectRegistration() / registerForProject(id) / openProjectCanvas(id)  // self-serve teams + ignition at min
inCycle() / inProject() / applyCycleState()        // gates + olos.cycleState.v1 (boot + storage event)
renderJournal() / saveJournalEntry()               // Practice Journal (phase-evolving prompts)
openRsvp(ctx,e) / submitRsvp()                     // email-only public event RSVP
toggleFollow(id,e) / isFollowing(id)               // follow system (updates feed filter payoff)
testimonialBlockHTML(list,owner) / requestTestimonial(id)  // requested-only testimonials
toggleSetupSection()                               // re-expand the collapsed setup strip
openEvent(id)             // data-driven event detail (EVENTS lookup; no id = static default)
renderBadges(earned) / bioWithCitations(text)      // trust states + anchored citations
exitSurveyShare() / exitTriangulator()             // auth-aware exits
deleteUpdate(at) / editUpdate(at)                  // owner controls on profile updates
enhanceTappables()        // keyboard access for dynamic cards
showMemberProfile(id)     // directory → visitor-mode profile (Discover stays highlighted)
postUpdate() / renderProfUpdates(list)             // social updates
seedTriangulatorPool() / appendSurveyObservation() // shared survey pool
openTriangulator()        // seeds pool, lazy-sets iframe src, shows view
showSurveyShare() / copySurveyLink(btn)
renderTodos() / dismissTodo(id)                    // dismissible "Up next" (phase-aware formation card)
startNominate(id,e) / nominateBtnHTML(m)           // nominations (FLOWS('nominate'))
STORIES / renderLandingStories()                   // landing hero-adjacent story row (CTA last)
openFeedback() / submitFeedback() / FEEDBACK_LOG   // feedback widget (mirrored in persona pages)
toggleAvatarMenu() / viewAs(role) / getViewAsRole()  // View-as menu (shared.js)
```

The prototype is otherwise no-persistence by design; `olos.surveyPool.v1` is the **only**
localStorage key `index.html` writes for data (it exists to hand data to the iframe).

**Full localStorage inventory (the only cross-file contracts):**

| Key | Written by | Read by | Shape / purpose |
|---|---|---|---|
| `olos.surveyPool.v1` | `index.html` (survey flow) | `triangulator.html` (boot + `storage` event) | array of survey observations |
| `olos.cycleState.v1` | `admin.html` (Testing Controls, Cycle control) | `index.html` (boot + `storage` event), `admin.html` | `{formationPhase, projects?, config?}` |
| `olos.viewAsRole.v1` | all three (via shared.js `setViewAsRole`) | `moderator.html` / `admin.html` boot guards | `'upskiller'│'poderator'│'admin'` |
| `olos.sensemaking.v2` | `triangulator.html` | `triangulator.html` | the Triangulator's own canvas state |

---

## triangulator.html conventions

- Reskin only — the canvas/sorting/classify/export engine is untouched from upstream `triangles`.
  `cssToken()` reads colors from CSS variables, so token changes propagate to the canvas.
- Keep `--tier-*` / `--type-*` colors and the export subsystem's separate `SITE_STYLE_CSS`
  template as-is.
- `ingestSurveyPool()` runs at boot (before `pickInitialScreen()`) and on `storage` events —
  survey observations arrive tagged `'Survey Response'`.
- Never reset the iframe's `src` mid-session — the tool guards unsaved work with `beforeunload`.

---

## Conventions for future changes

- Keep the three regions (CSS / screens / JS) coherent in each file.
- Respect the design rules: warm `--paper` only, single `--r`, dark for covers/nav only,
  baseline grid, **"The Labs" / never "TUL"**.
- New listings reuse `.card` + `.media`; dense collections use `.cards.dense`; sparse use
  `.cards.two`. New Discover content belongs in the data arrays, not hand-written markup.
- Honor `prefers-reduced-motion` and keep keyboard focus states visible.
- Mock data shapes are contracts: keep `EVENTS` Luma-shaped (anchor events carry `kind` +
  `anchor:true`) and `RESOURCES` CMS-shaped (commons items carry `from` provenance) so the
  production data-source swap stays a swap (see `docs/OLOS_BACKEND_CHANGES.md`).
