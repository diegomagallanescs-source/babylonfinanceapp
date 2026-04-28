# Home Screen Architecture — Babylon Wealth

> This document covers the design decisions, component structure, theming system, and styling conventions behind the River (Home) page. Read this before touching `RiverPage.tsx`, `NetWorthChart.tsx`, `Layout.tsx`, or `globals.css`.

---

## Table of Contents

1. [The Concept](#the-concept)
2. [Page Layout](#page-layout)
3. [Component Tree](#component-tree)
4. [Left Panel — Net Worth](#left-panel--net-worth)
5. [Right Panel — The River](#right-panel--the-river)
6. [NetWorthChart Component](#networthchart-component)
7. [Modals](#modals)
8. [SVG Scene System](#svg-scene-system)
9. [Data & Hooks](#data--hooks)
10. [Design System & Color Tokens](#design-system--color-tokens)
11. [Light / Dark Mode](#light--dark-mode)
12. [Navigation & Layout Shell](#navigation--layout-shell)
13. [Animation Conventions](#animation-conventions)
14. [File Map](#file-map)

---

## The Concept

The home screen is built around a single metaphor drawn from *The Richest Man in Babylon*:

- **Bucket** = active income. You work to fill it. When you stop working, it empties.
- **River** = investments and assets. Once flowing, it runs on its own.
- **Goal** = make the river large enough to fill the bucket without you lifting it.

Every visual on this screen answers one question: **is your river growing?**

The left panel shows the financial data (net worth, chart, stats). The right panel shows the river — an animated SVG scene whose complexity scales with the user's net worth tier.

---

## Page Layout

**File:** `src/pages/River/RiverPage.css`

```css
.river-page {
  display: grid;
  grid-template-columns: 11fr 1px 9fr;
  min-height: calc(100vh - 58px);
  padding: 0 56px;
}
```

- Two columns separated by a 1px gradient divider line.
- Left column is intentionally wider (`11fr` vs `9fr`) because it contains denser data.
- No `max-width` — the layout fills the full viewport. Padding of `56px` on each side provides breathing room without being the old centered-box approach.
- The `1px` center column is `.river-page__divider`, styled as a vertical gradient line that fades at top and bottom.

---

## Component Tree

```
<RiverPage>
  ├── <NetWorthPanel>                    // Left column — all financial data
  │     ├── Greeting (Hello, {name})
  │     ├── Liquid / Total toggle        // Only rendered if hasProperties
  │     ├── Scrub date label
  │     ├── Net worth value (big number)
  │     ├── Delta row (+$X / %)
  │     ├── Annotation callout           // Only when scrubbing a flagged point
  │     ├── <NetWorthChart />
  │     ├── Period selector + Add Note
  │     ├── <AddNoteModal />             // Inline, AnimatePresence controlled
  │     ├── Stats chips (Assets / Liabilities / Credit)
  │     └── Annual summary callout
  │
  └── <RiverPanel>                       // Right column — river visualization
        ├── River strength header (mph)
        ├── Tier label + advice quote
        ├── <FlowingRiverScene />        // Pan/zoom SVG canvas
        ├── Character overlay            // Sticky cartoon with bucket
        ├── Button row
        │     ├── "What does the river mean?" → <RiverMeaningModal />
        │     └── "See Optimal River"   → <OptimalRiverModal />
        └── Modals (AnimatePresence)
```

---

## Left Panel — Net Worth

### Greeting

The "Hello, {name}" heading has two layered effects:

**1. Animated blue wave inside the text** — implemented via a moving gradient background clipped to the text:
```css
.nw-panel__hello {
  background: linear-gradient(90deg,
    #1A6EFF 0%, #4A9EFF 14%, #90CAFF 28%, #D6EEFF 42%,
    #90CAFF 57%, #4A9EFF 71%, #1A6EFF 85%, #4A9EFF 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: helloWave 5s linear infinite;
}
```

**2. Gold ambient glow behind the text** — via `::before` on the wrapper:
```css
.nw-panel__hello-wrap::before {
  content: '';
  position: absolute;
  inset: -6px -14px;
  background:
    radial-gradient(ellipse at 12% 55%, rgba(240,180,41,0.28) 0%, transparent 55%),
    radial-gradient(ellipse at 88% 45%, rgba(240,180,41,0.20) 0%, transparent 50%);
  filter: blur(12px);
  animation: helloGlowPulse 3.5s ease-in-out infinite;
}
```

The outer div `.nw-panel__hello-wrap` must be `position: relative; display: inline-block` for the pseudo-element to be sized correctly.

### Net Worth Value

The big number is plain white (`color: var(--color-text)`), 58px Space Grotesk. Gold was intentionally moved off the value to avoid fighting with the greeting animation. The value uses Framer Motion for a quick opacity fade on change — not `AnimatePresence` with a full exit because the number updates on every scrub frame.

### Scrubbing & Delta

`scrubbedIndex` lives in `NetWorthPanel` state. It is passed down to `NetWorthChart` as a prop, and the chart calls `onScrubIndex` via Recharts `onMouseMove`. This means the panel owns the interaction state and the chart is a pure display component.

Delta computation:
- **Scrubbing active:** `displayValue − historyData[0][displayKey]` (change from period start)
- **At rest:** `currentValue − historyData[historyData.length - 2][displayKey]` (change from previous snapshot)

`accentColor` for the chart line is computed from this delta — green (`#00E676`) when up, red (`#FF4458`) when down. This is recalculated on every render so the line color responds immediately when switching periods.

### Period Selector

Seven options: `1W | 1M | 3M | 6M | 1Y | ALL`. Active pill uses green (not gold) because it is semantically tied to the chart line color. Switching period resets `scrubbedIndex` to `null`.

### Annotation Callout

When `scrubbedIndex` points to a history point where `annotation !== null`, a callout box fades in below the delta row showing the note text. This is the only place annotation text is surfaced in the UI — the chart only shows the flag icon.

### Annual Summary

Powered by `useAnnualSummary(currentYear - 1)`. This hook derives the summary client-side: it fetches spending trend data and active income sources for the prior year, then computes `netSavings = totalIncome − totalSpending`. No dedicated backend endpoint exists for this — it is assembled from two existing queries in parallel.

Positive year → green left border, phrased as "Your river grew $X last year."
Negative year → red left border, phrased as "River shrank by $X last year."

---

## Right Panel — The River

### River Strength Display

The "mph" display is a creative representation of net worth as river flow speed. The computation happens in `formatRiverSpeed()` from `src/constants/tiers.ts`. The actual unit label and multiplier prefix are parsed from the returned string with a regex so they can be styled independently.

The value is white (`var(--color-text)`) in both modes. Negative values override to `var(--color-negative)` (red). The old teal gradient was removed — it fought with the river scene behind it.

### Tier Advice Quote

The tier advice text lives in the right panel, directly below the tier label, not on the left. This keeps the left panel clean and puts the Arkad wisdom next to the visual it describes. It uses `AnimatePresence` keyed on `tier.advice` so it cross-fades when the tier changes.

### Character Overlay

The cartoon character is not embedded in the SVG — it lives in `.river-character-overlay`, which is absolutely positioned over `.river-scene-wrap`. This avoids SVG coordinate system complexity and lets the character be styled independently. Size: 61×82px (20% smaller than the original 76×102px spec).

```css
.river-character-overlay {
  position: absolute;
  bottom: 6%;
  right: 7%;
  pointer-events: none;
  z-index: 2;
}
```

The Framer Motion `y` bounce animation runs on the wrapping `motion.div` inside `CartoonCharacter`.

---

## NetWorthChart Component

**File:** `src/components/NetWorthChart.tsx`

This is a **pure display component** — it owns no state and makes no API calls. All data flows in as props.

### Props

```typescript
interface Props {
  data: NetWorthHistoryPointDto[];   // Already fetched history points
  isLoading: boolean;
  hasProperties: boolean;            // Controls whether second line renders
  displayKey: 'liquidNetWorth' | 'totalNetWorth';  // Which value the scrub dot tracks
  accentColor: string;               // '#00E676' (up) or '#FF4458' (down) — computed by parent
  period: TimePeriod;                // For x-axis label formatting only
  scrubbedIndex: number | null;      // Controlled from parent
  onScrubIndex: (i: number | null) => void;
}
```

### Two-Line System

Both lines always render if data exists:
- **Liquid NW** — solid line, 2px, `accentColor`
- **Total NW** — dashed line (5 3 pattern), 1.5px, `#00E5CC` teal — only rendered when `hasProperties` is true

The `displayKey` prop controls which line's scrub dot is active and tracks the cursor. The toggle on the parent panel controls this — it does not hide/show lines, only changes which value is highlighted and shown in the big number display above.

### Custom Dot with Annotation Flags

`CustomDot` handles three cases:
1. Last point — always shows a dot (shows current position)
2. Active/scrubbed point — shows a dot
3. Annotated point (`payload.annotation !== null`) — shows a gold flag pole and pennant above the dot

Annotation flag rendering:
```tsx
<line x1={cx} y1={cy - 2} x2={cx} y2={cy - 20} stroke="#F0B429" strokeWidth={1.5} />
<path d={`M ${cx} ${cy - 20} L ${cx + 11} ${cy - 16} L ${cx} ${cy - 12}`} fill="#F0B429" />
```

### Y-Axis Domain

The domain is computed from the actual data values, not Recharts `'auto'`. This prevents the line from being compressed in the middle of the chart when the value range is narrow:

```typescript
const vals = data.flatMap(d =>
  hasProperties ? [d.liquidNetWorth, d.totalNetWorth] : [d.liquidNetWorth]
);
const dMin = Math.min(...vals);
const dMax = Math.max(...vals);
const pad  = Math.abs(dMax - dMin) * 0.06 || Math.abs(dMax) * 0.05;
// domain: [dMin - pad, dMax + pad]
```

The 6% padding ensures the line never touches the top or bottom edge.

---

## Modals

All modals use the same `modal-backdrop` class and Framer Motion `AnimatePresence`. The backdrop is always `motion.div` so the fade-in/out is controlled by the parent's `AnimatePresence`, not just the inner panel.

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 56px 24px;  /* top/bottom breathing room — prevents full-screen takeover */
  overflow-y: auto;    /* scroll if content is taller than viewport */
}
```

### OptimalRiverModal

Slide-up animation (`y: 80 → 0`). Contains:
1. Full 5-ring `FlowingRiverScene` with `sid="modal"` — the `sid` prop is critical to prevent SVG `<defs>` ID conflicts with the main panel's scene
2. Rule banner: `Passive Income ≥ All Lifestyle Expenses`
3. Three-node flow diagram: `[Bucket] → [River] → [Freedom]` using `BucketSVG`, `RiverMiniSVG`, `FreedomFaceSVG`
4. Asset vs. liability contrast rows
5. Arkad quote

Width: `max-width: 560px` (wider than default modals to give the river scene room).

### RiverMeaningModal

Scale + fade spring animation. Contains:
1. Title + intro paragraph explaining the Babylon metaphor
2. Three steps with animated SVG icons in bordered cards
3. "Got it" close button

The intro paragraph is the first thing after the title — it sets context before the steps.

### Add Note Modal

Inline state in `NetWorthPanel` (`showAddNote`, `noteText`, `noteSaving`). Uses `useMutation` from TanStack Query — on success it calls `queryClient.invalidateQueries({ queryKey: ['networth', 'history'] })` which causes the chart to refetch and the new annotation flag to appear immediately.

---

## SVG Scene System

**All scene files live in `RiverPage.tsx`** — the scenes are complex enough that splitting them into separate files would require prop-drilling `sid` through multiple layers with no reuse benefit.

### The `sid` Prop

Every scene component takes a `sid: string` prop. This is used to namespace SVG `<defs>` IDs:

```tsx
<radialGradient id={`dryAtmos-${sid}`} ... />
```

Without this, when the main panel and the modal both render a 5-ring river scene simultaneously, their `<defs>` IDs collide and the second scene inherits the gradients from the first. Always pass `sid="main"` for the panel scene and `sid="modal"` for the modal scene.

### Scene Selection by Ring Count

```
rings = 0  →  DryBedContent  (cracked earth, desert, sun, vultures, cactus)
rings = 1  →  PuddleContent  (night sky, moon, puddles, frogs, fireflies)
rings 2–5  →  RiverContent   (circular rivers, ring count scales scene complexity)
```

### Zoom / Pan

`SceneCanvas` manages zoom and pan via React state and a non-passive wheel event listener (`{ passive: false }`). The transform is applied as:

```
translate(CX + pan.x, CY + pan.y) scale(zoom) translate(-CX, -CY)
```

This zooms toward the center of the canvas. Zoom range: 0.4–3.0. Pan is bounded loosely by the zoom level. All tier scenes (including rings 0 and 1) go through the same `SceneCanvas`, so zoom/pan works universally.

### Money Flowing in the River

For ring levels 2–5, the river channels carry animated value symbols:
- **Gold coins** — count scales with ring level
- **Money bills** — green rectangles with line detail
- **Diamonds** — blue polygon shapes with shimmer
- **Gold bars** — solid gold rectangles
- **Ruby gems** — red polygon

All use SVG `<animateMotion>` along the elliptical river path. The motion path is the same oval used for the river channel itself, ensuring items flow exactly along the water.

---

## Data & Hooks

### Hook Responsibilities

| Hook | Source | Cache Key | Stale Time |
|------|--------|-----------|------------|
| `useNetWorth()` | `GET /networth/current` | `['networth']` | 30s |
| `useNetWorthHistory(period)` | `GET /networth/history` | `['networth', 'history', period]` | 60s |
| `useAnnualSummary(year)` | derived (spending + income) | `['annual-summary', year]` | 60s |
| `useAuth()` | AuthContext | — | session |

### API Layer (`src/api/networth.ts`)

```typescript
fetchNetWorthCurrent()                           // GET /networth/current
fetchNetWorthHistory(from: Date, to: Date)       // GET /networth/history
annotateNetWorth(snapshotDate, annotation)       // POST /networth/annotate
```

`annotateNetWorth` takes `snapshotDate` as an ISO date string and `annotation` as plain text. After a successful mutation, invalidate `['networth', 'history']` to refresh the chart.

### DTO Shapes

```typescript
interface NetWorthHistoryPointDto {
  snapshotDate: string;
  liquidNetWorth: number;
  totalNetWorth: number;
  annotation: string | null;   // null = no flag; non-null = show pennant on chart
}

interface NetWorthResponseDto {
  liquidNetWorth: number;
  totalNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  creditUtilizationPercent: number | null;
  hasProperties: boolean;
  // ... other fields
}
```

---

## Design System & Color Tokens

**File:** `src/styles/globals.css`

All colors, radii, shadows, and fonts are CSS custom properties on `:root`. Never hardcode hex values in component CSS — use the tokens.

### Color Palette

| Token | Dark Value | Purpose |
|-------|-----------|---------|
| `--color-bg` | `#07080F` | Page background |
| `--color-bg-card` | `#111520` | Card / modal backgrounds |
| `--color-bg-elevated` | `#161B2C` | Elevated surfaces, chips |
| `--color-gold` | `#F0B429` | Primary accent — buttons, icons, borders |
| `--color-gold-hover` | `#FFD047` | Hover state for gold |
| `--color-river` | `#00E5CC` | River teal — tier badges, river scene |
| `--color-text` | `#EEF0FF` | Primary text (warm off-white) |
| `--color-text-muted` | `#4E5A7A` | Labels, eyebrows, secondary info |
| `--color-text-sub` | `#7B8DB5` | Body copy inside cards |
| `--color-positive` | `#00E676` | Assets, gains, up delta |
| `--color-negative` | `#FF4458` | Liabilities, losses, down delta |
| `--color-border` | `rgba(255,255,255,0.07)` | Card and input borders |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-display` | `'Space Grotesk'` | All large headings, numbers, badges |
| `--font-body` | `'Inter'` | All body text, labels, inputs |

Base font size is `15px` on `html`. Component-level sizes are in `px` not `rem` — this is intentional to avoid compounding effects.

### Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `8px` | Chips, inputs, small cards |
| `--radius-md` | `14px` | Chart wrap, dropdown |
| `--radius-lg` | `20px` | River scene, main cards |
| `--radius-xl` | `28px` | Modals |

### Shadow Tokens

```css
--shadow-card:       0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
--shadow-glow-gold:  0 0 40px rgba(240, 180, 41, 0.2);
--shadow-glow-teal:  0 0 40px rgba(0, 229, 204, 0.2);
```

---

## Light / Dark Mode

Theme is controlled by `data-theme` attribute on `<html>`. The `ThemeToggle` component in `Layout.tsx` writes this attribute and persists the choice to `localStorage`.

```typescript
// ThemeToggle effect
document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
localStorage.setItem('theme', isDark ? 'dark' : 'light');
```

Default is dark mode (no `data-theme` attribute = dark). Light mode activates when `data-theme="light"`.

### Light Mode Overrides (`globals.css`)

```css
[data-theme="light"] {
  --color-bg:           #F7F8FC;
  --color-bg-surface:   #EEEEF5;
  --color-bg-card:      #E6E7F0;
  --color-bg-elevated:  #DCDDE8;
  --color-text:         #0D1017;
  --color-text-muted:   #3A4260;
  --color-text-sub:     #1E2840;
  --color-river:        #007A6B;    /* darkened — #00E5CC is invisible on light bg */
  --color-river-deep:   #005E53;
  --color-river-glow:   rgba(0, 122, 107, 0.2);
  --color-border:       rgba(0, 0, 0, 0.09);
}
```

**Key decisions:**
- Gold stays the same in both modes — it reads well on both light and dark.
- `--color-positive` (`#00E676`) stays the same globally in light mode, **except** for specific overrides where bright green is unreadable on light surfaces.
- `--color-river` is darkened significantly because the bright teal `#00E5CC` has near-zero contrast on `#F7F8FC`.

### Component-Level Light Mode Overrides

Some elements need targeted overrides beyond the global tokens:

```css
/* Header background */
[data-theme="light"] .app-header {
  background: rgba(247, 248, 252, 0.92);
}

/* Theme toggle hover */
[data-theme="light"] .theme-toggle:hover {
  background: rgba(0, 0, 0, 0.06);
}

/* Asset chip value — bright green unreadable on light card */
[data-theme="light"] .stat-chip--pos .stat-chip__value {
  color: #1A8040;
}

/* "Assets" label inside the River Meaning modal */
[data-theme="light"] .meaning-asset-label {
  color: #1A8040;
}
```

**Rule for adding new light mode overrides:** only override at the component level when the global token change would be too broad. Always prefer updating a token in `[data-theme="light"]` over adding a new component-level rule.

---

## Navigation & Layout Shell

**Files:** `src/components/Layout.tsx`, `src/components/Layout.css`

### Header Structure

```
[✦ Babylon]          [Home] [Accounting] [Money In] [Money Out] [Investing] [Real Estate]          [☀] [D]
   brand (left)                    nav (absolute center)                             theme toggle + profile (right)
```

The nav is centered using `position: absolute; left: 50%; transform: translateX(-50%)` on `.app-header__nav`. This means the brand and right controls can be any width without affecting the nav centering — they are independent flex items.

```css
.app-header {
  display: flex;
  align-items: center;
  /* brand: natural left position */
  /* nav: absolute center */
  /* right: margin-left: auto */
}

.app-header__nav {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.app-header__right {
  margin-left: auto;
}
```

This pattern only works reliably when the brand and right section are roughly the same width. If the nav items overflow into the brand or right controls on narrow viewports, add a `min-width` to the header or switch to a grid approach.

### Active Nav State

Active links get a gold underline via `::after`:
```css
.header-nav-item--active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: var(--color-gold);
}
```

The `-1px` bottom value makes the underline sit on top of the header's bottom border, creating a connected look.

---

## Animation Conventions

### Framer Motion

Used for:
- Modal enter/exit (scale + fade + y translate)
- Value display changes (opacity fade)
- Tier badge appearance (scale in)
- Annotation callout (y slide + fade)

Always wrap modals in `AnimatePresence` in the parent, not inside the modal component. This ensures exit animations fire before the component unmounts.

### CSS Keyframe Animations

Used for anything that runs continuously (not triggered by interaction):

| Animation | Element | Duration | Behavior |
|-----------|---------|----------|---------|
| `helloWave` | Greeting text | 5s linear infinite | Blue gradient sweeps left-to-right |
| `helloGlowPulse` | Gold glow behind greeting | 3.5s ease-in-out infinite | Opacity 0.8 → 1.0 |
| `bucketSplash` | Bucket water fill | 2.2s ease-in-out infinite | Height/position oscillation |
| `chartShimmer` | Loading skeleton | 1.6s linear infinite | Background position sweep |
| `rippleOut` | River ripple rings | 2.2s ease-out infinite | Radius + opacity expand |
| `sparkleFlash` | Chart sparkle particles | 1.4s ease-in-out infinite | Opacity + radius pulse |
| `dustFloat` | Desert dust particles | 2.8–4s infinite | Translate + opacity |

### SVG-Native Animations

River scene elements use SVG `<animate>`, `<animateTransform>`, and `<animateMotion>` rather than CSS. This is intentional — SVG animations compose better inside complex `<g>` transforms and don't require converting between SVG and DOM coordinate systems.

```xml
<!-- Coins flowing along the river oval -->
<animateMotion dur="6s" repeatCount="indefinite">
  <mpath href="#riverPath-rv3-0" />
</animateMotion>
```

---

## File Map

```
src/
├── pages/
│   └── River/
│       ├── RiverPage.tsx       // Full home screen — 1,600+ lines
│       └── RiverPage.css       // Home screen styles — ~1,100 lines
│
├── components/
│   ├── NetWorthChart.tsx       // Pure chart canvas component
│   ├── NetWorthChart.css       // Chart skeleton, empty state, canvas
│   ├── Layout.tsx              // App shell, nav, ThemeToggle, ProfileMenu
│   └── Layout.css              // Header, nav, profile, theme toggle styles
│
├── hooks/
│   ├── useNetWorth.ts          // Current NW (30s stale)
│   ├── useNetWorthHistory.ts   // History by period (60s stale)
│   ├── useAnnualSummary.ts     // Prior year summary (derived, 60s stale)
│   └── useMoneyFlow.ts         // Monthly in/out flow (used by other pages)
│
├── api/
│   └── networth.ts             // fetchNetWorthCurrent, fetchNetWorthHistory, annotateNetWorth
│
├── styles/
│   └── globals.css             // CSS tokens (:root + [data-theme="light"])
│
├── constants/
│   └── tiers.ts                // 127 tier levels, getTier(), formatRiverSpeed()
│
└── types/
    └── netWorth.ts             // NetWorthResponseDto, NetWorthHistoryPointDto, AnnualSummaryDto
```

---

## Common Pitfalls

**Don't duplicate SVG gradient IDs.** If you add a new gradient to the river scene, suffix the `id` with `-${sid}`. The modal and main panel render simultaneously when open.

**Don't fetch data inside `NetWorthChart`.** The chart is a pure component. All fetching belongs in `NetWorthPanel`. The chart only receives `data: NetWorthHistoryPointDto[]`.

**Don't hardcode hex colors in CSS.** Use the token from `globals.css`. Add a new token to `:root` if nothing fits rather than hardcoding.

**Don't forget `[data-theme="light"]` when adding a new green or teal.** The global teal token is darkened in light mode, but `--color-positive` is not — check both modes when using green.

**Don't change `accentColor` inside `NetWorthChart`.** The chart line color is computed by `NetWorthPanel` from the delta sign and passed in as a prop. The chart must remain color-agnostic.

**Don't put business logic in `RiverPanel`.** The tier label, advice, and river ring count all derive from `getTier(netWorth)`. `RiverPanel` receives `netWorth: number` and calls `getTier()` itself — it does not receive a tier object as a prop, keeping the prop surface minimal.
