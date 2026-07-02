# CLAUDE.md — onboarding-proto

## What this is

A responsive, click-through HTML prototype for **The Upskilling Labs** — a public, browse-first
member experience, the participant onboarding flow, the signed-in app (Discover · Dashboard ·
Profile), and the embedded **Triangulator** sensemaking tool. No framework, no Tailwind, no build
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
| `index.html` | The main prototype — CSS + screens + JS, self-contained (embedded Geologica font) |
| `triangulator.html` | The Triangulator — a full problem-framing tool (Kees Dorst Frame Creation), reskinned to this design system, embedded via iframe from `index.html`. Canonical upstream: the `triangles` repo; this copy is the reskinned/integrated adaptation. |
| `docs/OLOS_BACKEND_CHANGES.md` | The backend planning doc — every schema/API change OLOS needs to serve this frontend |
| `assets/` | Used images (logos, sample photography, orb marks) |
| `archive/` | Superseded drafts (`old-index.html`, `prototype-v1.html`) and unused files |

Both HTML files have three editable regions: `<style>` in `<head>`, screen markup in `<body>`,
and a `<script>` at the end of `<body>`.

---

## Design system

Custom CSS variables in `:root` (same tokens in both HTML files). **Canonical brand palette**
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

Font: **Geologica** only (embedded base64 in both files — no CDN). The Triangulator additionally
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
| `view-profile` | Public portfolio profile — trust badges, citation chips, updates feed, case-study peer-approval banner |
| `view-survey-share` | Post-survey share screen (copy link; `?survey=` deep-links back into the flow) |
| `view-triangulator` | Slim chrome + same-origin `<iframe src="triangulator.html">` |
| `view-team-ignition` | Full-screen "Team initialized" interstitial (staking threshold reached) |
| `view-project-canvas` | Project instance mockup — 5-seat roster + 2 locked facilitator-override seats + case-study pending-approval UI |
| `app-shell` | Signed-in app |

### Signed-in navigation: Discover · Dashboard · Profile

Top nav and bottom tab bar both carry exactly three destinations. **`panel-discover`** is the
single browse destination — cycle banner, events, library, community directory
(mentor-filterable chips), community updates, labs, saved. Every section renders from JS data
arrays (`EVENTS`, `RESOURCES`, `MEMBERS`, `LABS`) so production swaps the data source, not
markup. Legacy panels (`panel-cycles/events/event/labs/resources/bookmarks`) are retained as
"View all →" drill-ins only — no nav entries.

**Problem frames are NOT Discover content.** They are cycle-specific, pod-scoped, and born
from the pod's Triangulator sensemaking (each frame is a mapped Problem Situation). They live
on `panel-cycles` (`#cycle-frames`, rendered by `renderCycleFrames()`), show a provenance line
("Mapped in the Triangulator · Pod 4 sensemaking"), and staking is gated on cycle membership
(`inPod()`): non-members see the frames with a "register for the cycle" note instead of
commit buttons.

**`panel-dashboard`** is the admin view of your own presence: condensed identity header
(avatar + greeting + "View your full profile"), the **update composer** (posts to your profile's
activity feed), setup checklist, and dismissible "Up next" cards — the field survey and the
Triangulator lead that list (prominent but skippable, never a gate).

### Key user flows

- **Create account:** Landing → `view-google-auth` → `view-role-intent` → signup flow → role
  branches → dashboard.
- **Survey → Triangulator:** survey flow (`FLOWS('survey')`, loops via "add another") →
  observations append to `localStorage['olos.surveyPool.v1']` (seeded from `SURVEY_SEED`, the
  Civic & Elections CSV) → `view-survey-share` (copy `?survey=` link; the link deep-links
  straight into the flow, no account needed) → `openTriangulator()` → the iframe ingests the
  pool on boot and live via the `storage` event. **Prototype limit (by design):** single-browser
  aggregation only — real cross-user pooling is the OLOS `survey_responses` API.
- **Staking → ignition (pod members only):** on the Cycles panel, commit to one of your pod's
  problem frames as builder or lead (buttons, not swipe); at 3 commits the frame ignites →
  `view-team-ignition` → `view-project-canvas` (back arrow returns to Cycles). Caps: 3 min,
  5 max, +2 facilitator-override seats (7 absolute). Frames are produced by the pod's
  Triangulator sensemaking — never hand-authored, never public.
- **Directory:** Discover → member card → `showMemberProfile(id)` renders that member into
  `view-profile` in visitor mode ("Back to Discover" bar). Owner state is fully restored by
  `renderProfileView()` on next open.

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
MEMBERS / FRAMES          // mock directory + problem frames (staking)
SURVEY_SEED / SURVEY_POOL_KEY  // Civic & Elections seed + 'olos.surveyPool.v1'

renderDiscover()          // all Discover sections (called by showAppView('discover'))
renderCycleFrames()       // pod problem frames on panel-cycles (called by showAppView('cycles'))
inPod() / commitToFrame(id,intent,e) / openProjectCanvas()   // membership gate + staking + ignition
showMemberProfile(id)     // directory → visitor-mode profile
postUpdate() / renderProfUpdates(list)             // social updates
seedTriangulatorPool() / appendSurveyObservation() // shared survey pool
openTriangulator()        // seeds pool, lazy-sets iframe src, shows view
showSurveyShare() / copySurveyLink(btn)
renderTodos() / dismissTodo(id)                    // dismissible "Up next"
```

The prototype is otherwise no-persistence by design; `olos.surveyPool.v1` is the **only**
localStorage key `index.html` writes (it exists to hand data to the iframe). `triangulator.html`
keeps its own `olos.sensemaking.v2` state key.

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
- Mock data shapes are contracts: keep `EVENTS` Luma-shaped and `RESOURCES` CMS-shaped so the
  production data-source swap stays a swap (see `docs/OLOS_BACKEND_CHANGES.md`).
