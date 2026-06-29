# CLAUDE.md — onboarding-proto

## What this is

A single-file, responsive, click-through HTML prototype for **The Upskilling Labs** —
a public, browse-first member experience plus the participant onboarding flow. No framework,
no Tailwind, no build step required to run it, no persistence. Everything lives in `index.html`.

It is **mobile-first and fully responsive**: a phone-shaped experience on small screens
(bottom tab bar, full-screen steps, sticky CTAs) that expands into a real web app on desktop
(top nav, multi-column grids, centered auth sheets).

**Branch:** `claude/google-auth-onboarding-c5e6rr`
**PR:** https://github.com/TheUpskillingLabs/onboarding-proto/pull/4
Push to this branch to update the PR.

> **Naming rule (hard):** the brand is **"The Upskilling Labs"**, shortened only to **"The Labs"** —
> never "TUL" or any other abbreviation. This applies to every user-facing string, label, title,
> and footer. (It's fine in prose/commits, never in rendered UI.)

---

## File shape

`index.html` is self-contained and large (~600 KB) because the **Geologica** variable font is
embedded as a base64 `@font-face` data URI — no CDN, no network, CSP-safe, works offline.
It has three editable regions:

- `<style>` in `<head>` — all design tokens, components, and responsive rules (hand-written CSS, **not** Tailwind).
- screen markup in `<body>` — one `<div class="view">` per screen, inside `#screens`.
- `<script>` at the end of `<body>` — routing, the onboarding flow engine, and view logic.

The file was generated from small Python build scripts (CSS + screens + JS assembled separately);
if you keep those around, edit there and regenerate. Otherwise edit the three regions directly.

---

## Design system

Custom CSS variables in `:root`. **Canonical brand palette** (do not reintroduce the old
`midnight`/`aqua` values):

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
  Genuine circles only (avatar, status dots, timeline pips, the orb).
- **Warm off-white only.** `--tint` (`#ECF3F4`) exists but is **not** used as a page background.
- **Light-first; dark is for "covers."** Dark `--ink`/gradient surfaces are reserved for the
  landing hero, the About hero, nav bars (logo always on navy), and the open-source footer.
- **4px baseline grid.** Type line-heights and spacing are multiples of 4.
- **Type scale** (mobile → desktop via media query at 1024px), classes:
  `.t-display .t-h1 .t-h2 .t-h3 .t-h4 .t-lede .t-body .t-small .lbl` (uppercase eyebrow) `.idx` `.t-stat`.
- **Soft elevation:** `--shadow` / `--shadow-lg`; cards `.tappable` lift on hover (desktop only).
- **Grain:** `.grain` overlays an SVG-noise texture on dark surfaces.

Font: **Geologica** only (embedded). Surfaces: `.s-paper .s-white .s-ink .s-cover` (+ `.on-dark`
text mapping). Primary button `.btn.btn-red` / `.btn-teal`; ghost `.btn-ghost` / `.btn-ghost-teal`.
Media tiles: `.media` with `.m-teal/.m-forest/.m-navy` branded gradients + embedded orb (brand
stand-in for photography). Save toggle `.heart`. Category chips `.chip` (active = ink fill).

---

## View architecture

Top-level screens are `<div class="view">` inside `#screens`; one is `.active` at a time,
toggled by **`showView(id)`**. The signed-in app is a single view (`#app-shell`) containing
its own **panels** (`.panel`), a sticky dark top nav, and a mobile bottom tab bar.

### Top-level views

| ID | Screen |
|---|---|
| `view-landing` | Public hybrid home — dark hero with **Create account** + browse sections (cycles, workshops, labs) + open-source footer |
| `view-about` | Explainer (the old tour, recomposed as a scrollable narrative) |
| `view-google-auth` | Google auth explainer (shows gate context if arriving from a gated card) |
| `view-role-intent` | Role multi-select (Join a Cycle / Events / Volunteer / Mentor) |
| `view-flow` | **One-question-per-screen engine** — drives the signup, cycle-intake, and mentor-profile flows |
| `view-mentor-explainer` | 2-step mentor briefing |
| `view-stub` | Generic "you're all set" |
| `view-profile` | Public GitHub-like profile / portfolio (avatar, metro, stats, projects, activity) |
| `app-shell` | Signed-in app: dark top nav + panels + bottom tab bar |

### App panels (inside `#app-shell`, switched by `showAppView(id)`)

`panel-dashboard` · `panel-cycles` · `panel-events` · `panel-event` · `panel-labs` · `panel-resources`

Desktop top nav links: Dashboard · Cycles · Events · Labs · Library. Mobile bottom tabs:
Home · Cycles · Events · Labs (Library + Profile reached via top nav / avatar / dashboard links).
The **avatar opens the profile** (`showProfile()`); sign-out lives on the profile page.

### User flows

- **Create account (primary):** Landing `Create account` → `view-google-auth` → `view-role-intent`
  → signup flow (`view-flow`) → branch: mentor → `view-mentor-explainer` → mentor flow; else cycle
  → cycle flow; else → dashboard. The old forced 5-slide tour is gone; the explainer is at `/about`.
- **Returning:** Landing `Sign in` → `signinReturning()` → dashboard.
- **Browse → gate (Airbnb pattern):** public cycle/lab cards **expand inline** (`toggleExpand`);
  the deep action (Join / Save a spot) calls `gateCreateAccount(ctx)`, which routes into the
  create-account funnel and surfaces the context on the auth screen. Dense workshop tiles tap
  straight to the gate. Signed-in app views are ungated.

---

## One-question-per-screen flow engine

`view-flow` is data-driven. Each flow is `{ eyebrow, finalLabel, finalClass, onComplete, steps[] }`
returned by `FLOWS(name)` for `'signup' | 'cycle' | 'mentor'`. A step is
`{ id, type, q, help?, options?, required? }` where `type` ∈
`info | text | textarea | choice | checks | tags | consent`.

- **Confirm-to-advance everywhere** — selecting a single-choice option highlights it and enables
  **Continue**; it does **not** auto-advance. Multi-select (`checks`/`tags`) and text gate Continue
  on validity; optional steps show **Skip**.
- Top bar shows a back arrow, a segmented progress bar, and an `NN / NN` step counter.

```js
startFlow(name, backFn)   // sets the flow, step 0, back target; shows view-flow
renderFlowStep()          // renders eyebrow/question/help/progress/input for the current step
flowAdvance()             // next step, or flow.onComplete() on the last
renderFlowInput(step)     // builds the input + bottom actions per step.type
```

---

## Key JS state and functions

```js
const userState = { name:'Alex', initials:'AR', roles:[], isMentor:false };
let flow, fstep, fans;        // flow engine: current flow, step index, collected answers
let gateContext = '';         // label shown on auth when arriving from a gated browse card

showView(id) / goApp(id)      // top-level routing (goApp = app panels)
showAppView(id)               // switch panel + nav/tab active state
showProfile()                 // render activity + open view-profile (from the avatar)
scrollToSection(id)           // smooth-scroll landing nav

startCreateAccount()          // primary CTA → view-google-auth (clears gate context)
gateCreateAccount(ctx, e)     // browse gate → stash ctx, go to auth
toggleExpand(card, e)         // inline expand/collapse for cycle/lab cards
signinReturning()             // returning member → dashboard
continueWithGoogle()          // auth → role-intent
updateRoleBtn() / submitRoleIntent()
renderMentor() / mentorSlideNext()

toggleHeart(e, btn)           // save toggle on media cards
initEventCats()               // category chip scroller (Events)
initGallery()                 // event-detail swipe gallery + dots
renderActivity()              // profile contribution-style activity strip
tickChecklist(el) / renderTodos() / buildWeekRail()
logout()                      // → landing
```

---

## Dashboard structure

```
Header — greeting (personalized from signup) + lede
Setup checklist (#checklist-items, count in #checklist-count)
  - Allowlist our email domain (self-attested)
  - Slack invite sent (pre-checked, disabled)
  - Added to community calendar (pre-checked, disabled)
  - Set up your public profile (self-attested)
Up next (#todos-container, built by renderTodos())
Sidebar (desktop) — featured cycle media card + quick links (Labs / Library / your profile)
```

---

## Open-source positioning (ethos, not mechanics)

The brand is framed as "open by default — the Wikipedia of upskilling, built like open source."
This shows up as voice/visual cues only (no stars/forks/repos): the dark `.osfooter`
("Content under CC BY-SA · Built in the open"), `.open-tag` "public by default" labels, public
profiles/portfolios, and "Open" tags on projects and resources. Local **labs** (metro areas —
DC flagship/Active, Baltimore Forming, Philadelphia Coming soon) are browseable with `.status` pills.

---

## Conventions for future changes

- All changes go in `index.html`. Keep the three regions (CSS / screens / JS) coherent.
- Respect the design rules above: warm `--paper` only, single `--r`, dark for covers/nav only,
  baseline grid, and the **"The Labs" / never "TUL"** naming rule.
- New listings should reuse `.card` + `.media`; dense collections (many items, e.g. workshops)
  use `.cards.dense`; sparse collections (e.g. the ~4 cycles/year) use `.cards.two`.
- Honor `prefers-reduced-motion` (entrance + expand animations already gate on it) and keep
  keyboard focus states visible.
