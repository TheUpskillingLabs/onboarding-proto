# onboarding-proto

A single-file, responsive, click-through HTML prototype for **The Upskilling Labs** — a public, browse-first member experience and participant onboarding flow.

## Overview

This prototype covers the full user journey:

- **Public landing** — dark hero with browse sections (cycles, workshops, labs) and open-source footer
- **Auth gate** — Google auth explainer, surfaced inline when a visitor tries to act on a gated card
- **Onboarding flow** — role intent → one-question-per-screen signup, cycle intake, and mentor-profile flows
- **Signed-in app** — dashboard, cycles, events, labs, library, and a public GitHub-style profile

The experience is **mobile-first and fully responsive**: a phone-shaped layout on small screens (bottom tab bar, full-screen steps, sticky CTAs) that expands to a desktop app (top nav, multi-column grids, centered auth sheets).

## Running it

No build step, no dependencies. Just open `index.html` in a browser.

```
open index.html
```

Or serve it locally for hot reload:

```
npx serve .
```

## File structure

```
index.html          — the entire prototype (CSS + screens + JS, self-contained)
assets/             — static assets (images, icons, exported design files)
old-index.html      — archived previous version
prototype-v1.html   — original v1 prototype
```

`index.html` is large (~600 KB) because the **Geologica** variable font is embedded as a base64 `@font-face` data URI — no CDN, no network required, CSP-safe, works offline.

The file has three editable regions:

| Region | Location | Contents |
|---|---|---|
| `<style>` | `<head>` | Design tokens, components, responsive rules |
| Screen markup | `<body>#screens` | One `<div class="view">` per screen |
| `<script>` | end of `<body>` | Routing, flow engine, view logic |

## Design system

Custom CSS variables in `:root`. Brand palette:

| Token | Value | Use |
|---|---|---|
| `--ink` | `#00141B` | Deepest navy — logo bg, nav bars, covers, footers |
| `--navy` | `#03232A` | Primary brand navy |
| `--teal` | `#0094A0` | Primary accent / CTAs / links |
| `--red` | `#E11D2A` | High-priority CTAs (Create account, Register) |
| `--paper` | `#F6F4EF` | Warm off-white — the only light page background |
| `--white` | `#FFFFFF` | Cards |

Key rules:
- **One radius:** `--r: 14px` on every rectangular container; no pills
- **Warm off-white only** for page backgrounds
- **Dark surfaces** (`--ink` / gradient) reserved for hero, nav bars, and footer
- **4 px baseline grid** throughout
- Font: **Geologica** only (embedded)

## Naming

The brand is **"The Upskilling Labs"**, shortened only to **"The Labs"** — never "TUL" or any other abbreviation in any rendered UI.

## Key screens and flows

| View ID | Screen |
|---|---|
| `view-landing` | Public hybrid home |
| `view-about` | Scrollable explainer / about |
| `view-google-auth` | Google auth gate |
| `view-role-intent` | Role multi-select |
| `view-flow` | One-question-per-screen flow engine |
| `view-mentor-explainer` | 2-step mentor briefing |
| `view-profile` | Public portfolio profile |
| `app-shell` | Signed-in app shell |

## Contributing

All changes go in `index.html` — keep the three regions (CSS / screens / JS) coherent. Static assets (images, icons, exported files) go in `assets/`.
