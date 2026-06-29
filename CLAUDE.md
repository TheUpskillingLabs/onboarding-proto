# CLAUDE.md — onboarding-proto

## What this is

A single-file, click-through HTML prototype for **The Upskilling Labs** participant onboarding flow. No framework, no build step, no persistence. Everything lives in `index.html`.

**Branch:** `claude/google-auth-onboarding-c5e6rr`  
**PR:** https://github.com/TheUpskillingLabs/onboarding-proto/pull/4  
Push to this branch to update the PR.

---

## Design system

OLOS dark theme, inlined via Tailwind CDN config:

| Token | Value |
|---|---|
| `midnight` | `#2a3142` — page background |
| `ink` | `#343c4e` — elevated surface |
| `teal` | `#0094a0` — primary accent / CTAs |
| `aqua` | `#4dbbc2` — highlight / secondary accent |
| `shadow-teal` | `#006b73` — avatar bg |
| `cloud` | `#e6e6e6` — body text |
| `whisper` | `rgba(255,255,255,0.07)` — hairline borders |
| `red` | `#ee1c25` — required field marker |

Font: **Geologica** (Google Fonts). Transitions use `ease-spring` (`cubic-bezier(0.32, 0.72, 0, 1)`).

Surface pattern: `rounded-lg border border-whisper bg-white/[0.02] p-8`  
Primary button: `rounded-md bg-teal px-6 py-3 text-base font-semibold tracking-tight text-white shadow-[0_1px_4px_rgba(0,148,160,0.2)] hover:bg-teal/80`  
Ghost button: `rounded-full border border-white/[0.12] bg-white/[0.04] hover:border-aqua/40 hover:bg-white/[0.07] hover:shadow-[0_0_24px_rgba(77,187,194,0.18)]`  
Selected card state: `has-[:checked]:border-teal/40 has-[:checked]:bg-teal/[0.06]`

---

## View architecture

Views toggle with `.view` / `.view.active` CSS classes via `showView(id)`.  
The sticky app header (`#app-header`) is shown/hidden based on `CHROME_VIEWS`.

### View order in HTML

| ID | Screen |
|---|---|
| `view-login` | Landing — hero + "See how it works" + "Already a member? Sign in →" |
| `view-tour` | 5-slide carousel intro |
| `view-google-auth` | Cozy Google auth explainer |
| `view-role-intent` | Role selection (Join a Cycle / Events / Volunteer / Mentor) |
| `view-form` | Profile form (name, email, zip, work situation, consents) |
| `view-mentor-explainer` | 2-slide mentor briefing (inside CHROME_VIEWS) |
| `view-mentor-form` | Mentor profile fields (inside CHROME_VIEWS) |
| `view-cycle-intake` | Cycle registration long-form (inside CHROME_VIEWS) |
| *(app-header)* | Sticky nav — visible on CHROME_VIEWS only |
| `view-dashboard` | Home — checklist + role-based to-dos + calendar placeholder |
| `view-cycles` | Cycles explore page with 13-week timeline |
| `view-events` | Events listing stub |
| `view-event` | Event detail stub |
| `view-resources` | Resource library stub |
| `view-stub` | Generic "you're all set" stub |

### User flows

**First-time:** Landing → Tour (5 slides) → Google Auth → Role Intent (≥1 required) → Profile Form → Dashboard  
**Returning:** Landing → "Already a member?" → Google Auth → Dashboard (skips role/form)

Routing is handled by `continueWithGoogle()` checking `userState.returning`.

---

## Key JS state and functions

```js
const userState = {
    roles: [],                        // populated by submitRoleIntent()
    returning: false,                 // set by signinReturning()
    checklistDone: { email: false, intro: false },
    mentorDone: false,
    cycleRegistered: false,
};

const CHROME_VIEWS = ['dashboard', 'cycles', 'events', 'event', 'resources', 'stub', 'mentor-explainer', 'mentor-form', 'cycle-intake'];

showView(id)          // switch active view; toggles header; resets mentor slides on re-entry
signinReturning()     // sets returning=true, goes to google-auth
continueWithGoogle()  // routes to role-intent (new) or dashboard (returning)
updateRoleIntentButton()  // enables Continue button when ≥1 checkbox checked
submitRoleIntent()    // saves roles to userState, goes to form
submitForm(e)         // sets greeting name, calls renderTodos(), goes to dashboard
tickChecklist(key)    // toggles checklistDone, hides #onboarding-checklist when both done
renderTodos()         // rebuilds #todos-container based on roles + completion flags
mentorSlideNext/Back()
submitMentorForm(e)   // sets mentorDone=true, re-renders todos, goes to dashboard
submitCycleIntake(e)  // sets cycleRegistered=true, re-renders todos, goes to dashboard
```

---

## Dashboard structure

```
Section A — #onboarding-checklist (disappears when both user items checked)
  - cl-email: "Allowlist our email domain" (self-attested)
  - Slack invite sent (pre-checked, disabled, opacity-50)
  - Added to Luma calendar (pre-checked, disabled, opacity-50)
  - cl-intro: "Introduce yourself in #introductions" (self-attested)

Section B — To-dos (#todos-container, populated by renderTodos())
  - cycle + !cycleRegistered → "Join Spring 2026 at Pod Formation" card → cycle-intake
  - mentor + !mentorDone → "Complete your mentor profile" card → mentor-explainer
  - neither → quiet empty state text

Section C — Calendar placeholder (always visible)
  - Dashed border panel, Luma embed placeholder copy
```

---

## Pending task

Import and implement designs from the Claude Design project:  
`https://claude.ai/design/p/019e2fe9-903e-795a-802b-9af1192a5e7d`

Use the **DesignSync MCP tool** to read the project:

```js
DesignSync({ method: "list_files", projectId: "019e2fe9-903e-795a-802b-9af1192a5e7d" })
DesignSync({ method: "get_file", projectId: "...", path: "<path>" })
```

Then implement the designs into `index.html`, following the design system patterns above. All changes go in `index.html` only.

After implementing, commit and push to `claude/google-auth-onboarding-c5e6rr`.

---

## Slide pattern

Tour slides and mentor explainer both use `.slide` / `.slide.active`.  
`tourGoto(n)` manages tour navigation. `mentorSlideNext/Back()` manages mentor slides.  
`showView('mentor-explainer')` always resets to slide 1.
