# onboarding-proto

A responsive, click-through HTML prototype for **The Upskilling Labs** — the public browse-first
experience, participant onboarding, the signed-in app (Discover · Dashboard · Profile), and the
embedded **Triangulator** problem-framing tool.

## Overview

The prototype covers the full member journey:

- **Public landing** — dark hero, browse sections (cycles, workshops, library, labs), open-source footer
- **Auth gate** — Google auth explainer, surfaced inline when a visitor acts on a gated card
- **Onboarding** — role intent → one-question-per-screen signup, cycle intake, mentor and volunteer flows
- **Field survey** — a shareable observation survey (`?survey=` deep link, no account needed) that
  feeds the community observation pool
- **The Triangulator** — a full sensemaking instrument (sort observations → triangulate signals →
  map the problem situation), embedded via iframe and pre-loaded with the survey pool
- **Signed-in app** — three nav destinations:
  - **Discover** — cycle, events, learning library, community directory (mentor-filterable),
    community updates, labs
  - **Dashboard** — your identity header, update composer, setup checklist, dismissible "Up next"
  - **Profile** — public portfolio with trust badges, sourced citation chips, an updates feed,
    and peer-approved case-study editing
- **Upskiller Spotlights** — public member stories: a fit-to-width row under the landing hero
  that deep-links into `stories.html` (filterable grid, expandable stories, share-your-story modal)
- **Formation** — on the Cycles panel, mirroring OLOS's real pipeline: submit a solution
  proposal → budget-vote (ballots lock on cast) → tally names the winners → self-register for
  one team (real at 3 members, cap 5); admin.html's Testing Controls step the phases live

Mobile-first and fully responsive: bottom tab bar and full-screen steps on phones, top nav and
multi-column grids on desktop.

## Running it

No build step, no dependencies:

```
npx serve .
```

(Or open `index.html` directly — serving is recommended so the Triangulator iframe, the shared
CSS/JS files, and `?survey=` links behave like production.)

**GitHub Pages ready:** every path is relative and every internal link uses an explicit
`.html` filename, so the suite works from a `user.github.io/repo/` subpath as-is. `.nojekyll`
is checked in; the embedded font means no external requests. Point Pages at the repo root.

## Repo structure

```
index.html                     — the member app (landing, onboarding, Discover · Dashboard · Profile)
triangulator.html              — the Triangulator, reskinned to the design system, iframe-embedded
stories.html                   — Upskiller Spotlights: public story page + share-your-story modal
moderator.html                 — the Poderator persona: pod health, nudges, journal themes, tallies
admin.html                     — the Admin persona: Testing Controls (phase stepper), invites, participants
font.css                       — the embedded Geologica font (base64) — fetched once, shared by all pages
tokens.css                     — brand primitives (palette, radius, shadows) — the single source of truth
shared.js                      — stateless helpers shared by all pages
docs/OLOS_BACKEND_CHANGES.md   — the backend plan: everything OLOS needs to serve this frontend
assets/                        — images (logos, sample photography, orb marks)
archive/                       — superseded drafts and unused files
```

The **Geologica** font is embedded as a base64 `@font-face` data URI in `font.css` — no CDN,
works offline, CSP-safe, and the browser caches one copy for the whole suite.

## Design system

Brand palette (`tokens.css`): `--ink #00141B` (dark covers/nav), `--teal #0094A0`
(primary accent), `--red #E11D2A` (high-priority CTAs), `--paper #F6F4EF` (the only light page
background), `--white` (cards). One radius everywhere (`--r: 14px`), 4px baseline grid,
light-first with dark reserved for covers. See `CLAUDE.md` for the full system and conventions.

## Naming

The brand is **"The Upskilling Labs"**, shortened only to **"The Labs"** — never "TUL" or any
other abbreviation in rendered UI.

## Data notes

- Discover renders from mock data arrays shaped like their production APIs: `EVENTS` matches
  Luma's list-events response (OLOS proxies Luma server-side; no API key exists in this repo),
  `RESOURCES` matches the planned OLOS resources CMS, `MEMBERS`/`SOLUTION_PROPOSALS` match the
  directory and formation schemas in `docs/OLOS_BACKEND_CHANGES.md`.
- The survey pool lives at `localStorage['olos.surveyPool.v1']` and is shared with the
  Triangulator iframe (same origin). **Prototype limit:** single-browser aggregation only —
  real cross-user pooling is the OLOS `survey_responses` API.
