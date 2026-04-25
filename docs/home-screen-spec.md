# Babylon Wealth — Home Screen Spec

> Reference doc for building the River tab (home screen). Based on Diego's wireframe sketch + blueprint.

---

## Layout Overview

Two-column layout on desktop, stacked on mobile. Divided by a subtle vertical separator.

```
┌─────────────────────────┬──────────────────────────┐
│     NET WORTH (left)    │     RIVER (right)        │
│                         │                          │
│  Hello, Diego           │  Today's River Strength  │
│  Net Worth: $XX,XXX     │  [River oval animation]  │
│  [Liquid toggle]        │                          │
│                         │  [Stick figure + bucket] │
│  [Robinhood-style chart]│                          │
│                         │  [See Optimal River btn] │
└─────────────────────────┴──────────────────────────┘
         [Bottom nav: Home | Accounts | Real Estate | …]
```

---

## Left Panel — Net Worth

### Header
- Greeting: `Hello, Diego` — use the user's first name from profile
- Net Worth label with **Liquid / Total toggle** (pill toggle, not a dropdown)
  - Liquid = cash + investments − all debts
  - Total = Liquid + property equity
- `Today's Net Worth: $XX,XXX` — large, prominent number, updates when toggle changes

### Robinhood-Style Sliding Chart

Behavior mirrors the Robinhood portfolio chart exactly:

- **Chart type:** Recharts `AreaChart` with a single line (or two lines if Total is toggled on)
- **Scrubbing:** On mouse drag / touch slide, a vertical crosshair follows the pointer
  - The net worth number at the top **animates in real time** to show the value at the hovered point
  - A tooltip bubble shows: `+$20,000 · May 10, 2021 · [annotation note if any]`
  - On release, number snaps back to today's value with a smooth transition
- **Annotation markers:** Snapshots with notes render a small vertical tick mark on the line; hovering reveals the note text
- **Date axis:** Shows at the bottom — `Date →`
- **Time range selector:** Tabs below the chart — `3M | 6M | 1Y | All`
- **Colors:**
  - Line/fill: gold (`#C9A84C`) when net worth is positive; red/amber when negative
  - Fill gradient: gold at line fading to transparent at baseline
  - Crosshair: thin white vertical line

#### Implementation Notes
```tsx
// Recharts: use onMouseMove on the chart to track activeTooltipIndex
// Update a useState(hoveredValue) on every mouse move
// Display hoveredValue ?? currentNetWorth in the header number
// Use framer-motion's AnimatePresence to animate the number change
// Custom ActiveDot: render nothing; custom Cursor: render the vertical line
// Custom Tooltip: render the floating bubble (suppress default tooltip)
```

---

## Right Panel — River

### Header
- Label: `River`
- Sub-label: `Today's River Strength: [tier label]` — e.g., "Strong Current", "First Drop", "Desert"

### River Visualization

The river is shown **top-down / aerial view** as nested oval rings (as sketched), not a side-profile wave. This is distinct from the tier background — this panel always shows the aerial river regardless of net worth tier.

**River ring system:**
- The oval rings represent the river's width/strength
- Number of visible rings and their size scale with net worth tier
- At negative net worth: no rings — show cracked earth SVG in the oval area
- At $0–$25k: one thin ring (dry streambed)
- At $25k–$50k: two rings, slightly animated
- At $50k–$100k: three rings, animated water shimmer
- At $100k+: four+ rings, full animated river with a blue/teal glow

**Animation:**
- Rings slowly expand and contract (CSS `scale` keyframe, ~4s loop, subtle — 1.0 to 1.03)
- Inner ring has a slight shimmer/ripple CSS animation
- Color: deep teal/blue, semi-transparent layers

**Stick figure + bucket (the "you" character):**
- Positioned below the river oval
- Stick figure holds a bucket (the paycheck bucket)
- The bucket fills and empties on a loop — animated water level inside it
- Emoji character overlaid on or near the figure matches the current tier (😭 → 🥳)

**River Strength label:**
- Maps directly to net worth tier name from `constants/tiers.ts`
- Displayed prominently below the river oval

### "See Optimal River" Button

- Positioned below the river oval + stick figure
- Style: outlined gold button, not filled — secondary action
- On click: opens a **modal or slide-up panel** (not a separate tab)

#### Optimal River Modal Content
A visual explainer — no user data, purely educational:

```
┌────────────────────────────────────────┐
│  ✦  The Optimal River                  │
│                                        │
│  [Large animated river oval — full]    │
│                                        │
│  ↓ River (Passive Income)              │
│       ├──→ Liabilities (lifestyle)     │
│       └──→ Reinvestment (more assets)  │
│                                        │
│  Arkad's goal: passive income ≥        │
│  all lifestyle expenses.               │
│                                        │
│  Your ratio: [X]% ← only if user      │
│  has InvestmentIncome data             │
│                                        │
│  [Close]                               │
└────────────────────────────────────────┘
```

- Two animated arrows flow from the river into two channels
- The lifestyle channel shows a stick figure spending (bucket draining out)
- The reinvestment channel shows coins going back into a growing river
- If `InvestmentIncome` data exists for the user, overlay their current passive/expenses ratio vs the ideal 100%
- No API call needed if ratio is pre-fetched with the main net worth hook

---

## Bottom Navigation

- Tabs: `Home (River) | Accounts | Income | Spending | Real Estate | Wisdom`
- Active tab: gold underline indicator
- On mobile: icon + label, fixed to bottom of screen
- On desktop: left sidebar or top tab bar

---

## Data Dependencies

All data for this screen comes from a single composite hook call on mount:

| Data | Source | Hook |
|---|---|---|
| Current net worth (liquid + total) | `GET /api/v1/networth/current` | `useNetWorth` |
| Snapshot history for chart | `GET /api/v1/networth/history` | `useNetWorthHistory` |
| Annotations | `GET /api/v1/networth/annotations` | bundled with history |
| Passive income ratio (for Optimal River overlay) | `GET /api/v1/investmentincome/summary` | `usePassiveIncome` |
| User profile (name, photo) | `GET /api/v1/users/me` (cached in AuthContext) | `useAuth` |

---

## Component Tree

```
<RiverTab>
  ├── <NetWorthPanel>
  │     ├── <UserGreeting />                  // "Hello, Diego"
  │     ├── <NetWorthToggle />                // Liquid | Total pill
  │     ├── <NetWorthDisplay value={hovered ?? current} />
  │     └── <NetWorthChart>
  │           ├── Recharts AreaChart
  │           ├── <ScrubCrosshair />          // custom cursor component
  │           └── <AnnotationTick />          // per snapshot with note
  │
  └── <RiverPanel>
        ├── <RiverStrengthLabel />            // tier name
        ├── <AerialRiverScene tier={tier} />  // nested SVG ovals
        ├── <StickFigureWithBucket />         // animated character
        └── <OptimalRiverButton>
              └── <OptimalRiverModal />       // slide-up panel
```

---

## Key Implementation Details

### Scrubbing number animation
```tsx
const [scrubbedValue, setScrubbedValue] = useState<number | null>(null);
const displayValue = scrubbedValue ?? currentNetWorth;

// In Recharts onMouseMove:
const handleMouseMove = (state: any) => {
  if (state.isTooltipActive && state.activePayload) {
    setScrubbedValue(state.activePayload[0].value);
  }
};
const handleMouseLeave = () => setScrubbedValue(null);

// Animate the number with framer-motion:
<motion.span key={displayValue} animate={{ opacity: 1 }} initial={{ opacity: 0.6 }}>
  {formatCurrency(displayValue)}
</motion.span>
```

### Aerial river SVG rings
```tsx
// Each ring is an SVG ellipse, layered with decreasing opacity outward
// Ring count and rx/ry scale with tier index
const rings = Array.from({ length: ringCount }, (_, i) => ({
  rx: 80 + i * 28,
  ry: 55 + i * 20,
  opacity: 0.9 - i * 0.18,
  animationDelay: `${i * 0.4}s`,
}));
```

### Tier → ring count mapping
```ts
// constants/tiers.ts — add riverRings to each tier object
{ label: 'Scorched', minNW: -Infinity, maxNW: -50000, emoji: '😭', riverRings: 0 },
{ label: 'Desert',   minNW: -50000,   maxNW: 0,       emoji: '😟', riverRings: 0 },
{ label: 'Dry Bed',  minNW: 0,        maxNW: 10000,   emoji: '😐', riverRings: 1 },
{ label: 'Stream',   minNW: 10000,    maxNW: 25000,   emoji: '🙂', riverRings: 2 },
{ label: 'River',    minNW: 25000,    maxNW: 50000,   emoji: '😊', riverRings: 3 },
{ label: 'Strong River', minNW: 50000, maxNW: 100000, emoji: '😄', riverRings: 4 },
{ label: 'Mighty River', minNW: 100000, maxNW: Infinity, emoji: '🥳', riverRings: 5 },
```

---

## Aesthetic Direction

- **Theme:** Dark background (`#0D0D0D`), gold accents (`#C9A84C`), river teal (`#1B7A6E`)
- **Typography:** Display numbers in a condensed serif or tabular mono for the net worth figure; body in a clean sans-serif
- **Chart fill:** Gold gradient, 20% opacity at bottom
- **River ovals:** Teal with a subtle CSS radial gradient shimmer on the innermost ring
- **Stick figure:** Simple SVG, minimal, charming — not clip art
- **Button:** `See Optimal River` — gold outline, hover fills with gold, text goes dark

---

*Babylon Wealth — Home Screen Spec v1.0*
