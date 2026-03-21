# UI Specifications

Detailed component specs, page layouts, and responsive behavior for ishpreet95.me.

Extends [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) with implementation-ready specifications.

---

## Accessibility Baseline

These apply globally, before any component specs:

- **Skip link:** First DOM element: `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>`
- **Focus-visible:** All interactive elements must show a `2px` outline in `primary` color with `2px` offset on `:focus-visible`. No outline on `:focus` (mouse clicks).
- **Reading progress rail:** `aria-hidden="true"` — decorative only, not announced to screen readers.
- **Color contrast:** All text meets WCAG AA minimum. Body text meets AAA (ratios verified in DESIGN-SYSTEM.md Phase 3 critique).
- **Reduced motion:** Wrap all transitions in `@media (prefers-reduced-motion: no-preference)`.
- **Code block dark bg:** Use `#050607` instead of pure `#000000` to maintain "no pure black" rule.

---

## Component Specifications

### 1. Navigation Bar

**Structure:**
```
[Site Name (Newsreader, italic)]  [Home] [Blog] [About] [Projects]  [Theme Toggle]
```

**Behavior:**
- Fixed position, full-width
- Background: `surface` at full opacity (no blur, no glass)
- Height: `64px` desktop, `56px` mobile
- Site name: Newsreader italic, `body-lg` size, links to `/`
- Nav links: Inter, `body-md`, `on-surface-variant` color
- Active link: `on-surface` color with 2px underline in `primary`
- Hover: transition to `on-surface` color (150ms ease)
- Theme toggle: sun/moon icon, `24px`, `on-surface-variant`

**Responsive:**
- Desktop (>1024px): horizontal nav, all links visible
- Tablet (768-1024px): same layout, tighter spacing
- Mobile (<768px): site name left, hamburger right, slide-out menu

**States:**
| State | Style |
|-------|-------|
| Default | `on-surface-variant` text |
| Hover | `on-surface` text, 150ms transition |
| Active/Current | `on-surface` text, 2px `primary` underline |
| Focus-visible | 2px `primary` outline, 2px offset |

---

### 2. Article Card (Blog Listing)

**Structure:**
```
[TAG pill]  ·  [DATE]
[Title (Newsreader, headline-md)]
[Description (Inter, body-md, on-surface-variant, 2-line clamp)]
[Reading time (body-sm, on-surface-variant)]
```

**Sizing:**
- Max width: `680px` (matches article body width)
- Vertical spacing between cards: `spacing-5` (1.7rem) — no divider lines
- Padding: `spacing-4` (1.25rem) on all sides when on alternate background

**Background:**
- Even cards: `surface` (transparent, sits on page background)
- Odd cards: `surface-container-low` (subtle alternation, optional)

**States:**
| State | Style |
|-------|-------|
| Default | As described |
| Hover | Title color transitions to `primary` (150ms) |
| Focus-visible | 2px `primary` outline around entire card, 4px offset |

**Responsive:**
- Same layout at all breakpoints, full-width on mobile with standard padding

---

### 3. Tag / Chip

**Structure:** Pill shape, inline element

**Sizing:**
- Padding: `4px 12px`
- Font: Inter, `body-sm`, uppercase, letter-spacing `0.05em`
- Border-radius: `9999px` (full pill)

**Colors:**
- Dark: `tag-bg` (tinted from primary), `tag-text` (tinted from primary)
- Light: `#e2ebe8` background, `#3d5550` text

**States:**
| State | Style |
|-------|-------|
| Default | As described |
| Hover (if clickable) | Background darkens slightly (10% shift) |
| Focus-visible | 2px `primary` outline |

---

### 4. Theme Toggle

**Structure:** Icon button — sun icon (light mode active) / moon icon (dark mode active)

**Sizing:** `40px` touch target, `24px` icon

**Behavior:**
- Click toggles `class="dark"` on `<html>`
- Stores preference in `localStorage` key `theme`
- First visit: respects `prefers-color-scheme`
- Color transition: all colors transition 150ms ease (behind `prefers-reduced-motion`)
- Icon crossfade: 200ms

**States:**
| State | Style |
|-------|-------|
| Default | `on-surface-variant` icon color |
| Hover | `on-surface` icon color |
| Focus-visible | 2px `primary` outline, `rounded-full` |

---

### 5. Code Block

**Structure:**
```
[Language label (top-right, body-sm, on-surface-variant)]
[Line numbers (Geist Mono, on-surface-variant at 50%)] | [Code (Geist Mono, body-sm)]
```

**Sizing:**
- Background: `#050607` (dark) / `#eef1f3` (light)
- Corner radius: `xl` (0.75rem)
- Padding: `spacing-4` (1.25rem)
- Max width: `calc(70ch + 4rem)` — slightly wider than body text
- Overflow-x: `auto` with styled scrollbar

**Syntax Highlighting:**
- Engine: Shiki (server-side, zero JS)
- Dark theme: custom pastel palette (sage, rose, lavender tones)
- Light theme: standard Shiki light theme, adjusted to match palette

**Line Numbers:**
- Color: `on-surface-variant` at 50% opacity
- Right border: ghost border (15% opacity) separating numbers from code
- Padding-right on numbers: `spacing-3`

---

### 6. Inline Code

**Style:**
- Font: Geist Mono, same size as surrounding text
- Background: `surface-container` (dark) / `surface-container-high` (light)
- Padding: `2px 6px`
- Border-radius: `sm` (0.25rem)
- No border

---

### 7. Blockquote

**Structure:**
```
[2px left border in primary at 40% opacity]
  [Quote text (Inter, body-lg, italic, on-surface-variant)]
```

**Sizing:**
- Left border: `2px` solid `primary` at 40% opacity
- Padding-left: `spacing-4` (1.25rem)
- Margin: `spacing-6` (2rem) vertical

---

### 8. Data Table

**Structure:** Standard markdown table, styled

**Style:**
- Header row: `surface-container-low` background, Inter `body-sm` uppercase, `on-surface-variant`
- Body rows: alternating `surface` / `surface-container-low`
- Cell padding: `12px 16px`
- No vertical borders, no horizontal borders between rows (background shift only)
- Numbers/data: Geist Mono
- Text alignment: left for text, right for numbers

---

### 9. Footer

**Structure:**
```
[Social links: GitHub · X · LinkedIn]
[© 2026 Ishpreet · RSS]
```

**Style:**
- Background: `surface-container-low`
- Text: Inter, `body-sm`, `on-surface-variant`
- Social links: icon + text, `on-surface-variant`, hover → `on-surface`
- Padding: `spacing-8` (2.75rem) vertical
- Top separation: background shift only (no border)

---

### 10. Reading Progress Rail

**Structure:** Vertical line in left margin, tracks scroll position

**Style:**
- Width: `2px`
- Color: gradient from `primary` to `transparent`
- Position: fixed, left margin
- Height: proportional to scroll progress
- `aria-hidden="true"`

**Responsive:**
- Desktop only (>1024px) — hidden on mobile/tablet where margins collapse

---

### 11. Search Input (Blog Page)

**Structure:**
```
[Search icon (on-surface-variant)] [Input text]
```

**Style:**
- Background: `surface-container-low`
- Border: none (unfocused)
- Focus: 2px ghost border in `primary` at 40% opacity
- Corner radius: `md` (0.375rem)
- Padding: `12px 16px 12px 44px` (icon space)
- Font: Inter, `body-md`
- Placeholder: `on-surface-variant` at 60% opacity

---

### 12. Primary Button

**Style:**
- Background: `primary` (solid, no gradient)
- Text: `on-primary`, Inter `body-md`, font-weight 500
- Padding: `12px 24px`
- Border-radius: `md` (0.375rem)
- No shadow, no border

**States:**
| State | Style |
|-------|-------|
| Default | As described |
| Hover | Background lightens 10% |
| Active | Background darkens 5% |
| Focus-visible | 2px outline in `primary`, 2px offset |
| Disabled | 40% opacity, cursor not-allowed |

---

## Page Layouts

### Page: Home (`/`) — "Featured Investigation" Pattern

```
┌─────────────────────────────────────────────────────────┐
│  Nav: [Ishpreet]  Home  Blog  About  Projects  ☀/☾    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Identity — small, stays out of the way]               │
│  Body-lg (Newsreader, italic, on-surface-variant):      │
│  "A developer who can't leave well enough alone."       │
│                                                         │
│  [Featured Investigation — surface background]          │
│                                                         │
│     Headline-sm (Inter, uppercase, on-surface-variant): │
│     "CURRENT RESEARCH"                                  │
│                                                         │
│     [TAG] · [DATE] · [READ TIME]                        │
│                                                         │
│     Display-lg (Newsreader):                            │
│     "Understanding Claude Code Token Metrics"           │
│                                                         │
│     Body-lg (Inter, on-surface-variant):                │
│     "A deep investigation into how token usage          │
│      tools count — and miscount — your activity."       │
│                                                         │
│     [Read the investigation → (primary text link)]      │
│                                                         │
│  [Archive — surface-low section, only if 2+ posts]     │
│                                                         │
│     Headline-sm: "ARCHIVE"                              │
│     [Article Card 1]                                    │
│     [Article Card 2]                                    │
│     [View all articles →]                               │
│                                                         │
│  [Footer]                                               │
└─────────────────────────────────────────────────────────┘
```

**Notes:**
- Latest article gets magazine-cover editorial treatment (large serif title)
- Archive section only appears when there are 2+ published posts
- No hero image, no illustration, no gradient background
- Reading time computed from word count, not hardcoded

---

### Page: Blog Listing (`/blog`)

```
┌─────────────────────────────────────────────────────────┐
│  Nav                                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Headline-md (Newsreader): "Blog"                       │
│                                                         │
│  [Search input]                                         │
│                                                         │
│  spacing-8 gap                                          │
│                                                         │
│  [Optional: Tag filter row — horizontally scrollable]   │
│  [All] [claude-code] [research] [developer-tools] ...   │
│                                                         │
│  spacing-8 gap                                          │
│                                                         │
│  [Article Card] with tag, date, title, desc, read time  │
│  spacing-5 gap                                          │
│  [Article Card]                                         │
│  spacing-5 gap                                          │
│  [Article Card]                                         │
│  ...                                                    │
│                                                         │
│  [Footer]                                               │
└─────────────────────────────────────────────────────────┘
```

**Notes:**
- Cards are full-width within the content column (max 680px)
- Tag filter is post-MVP but spec it now for layout planning
- No pagination needed initially — static site, all posts render

---

### Page: Article (`/blog/[slug]`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Nav                                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────────────────────────────┐  ┌───────────┐ │
│  │ Progress  │  │ Article Header                   │  │ Marginalia│ │
│  │ Rail (2px)│  │                                  │  │ (empty    │ │
│  │           │  │ [TAG] · [DATE] · [READ TIME]     │  │  gutter   │ │
│  │ ▏        │  │                                  │  │  for now) │ │
│  │ ▏        │  │ Display-lg (Newsreader):          │  │           │ │
│  │ ▏        │  │ "Understanding Claude Code        │  │           │ │
│  │ ▏        │  │  Token Metrics"                   │  │           │ │
│  │ ▏        │  │                                  │  │           │ │
│  │ ▏        │  │ Body-md (Inter, on-surface-var):  │  │           │ │
│  │ ▏        │  │ "A deep investigation into..."    │  │           │ │
│  │           │  │                                  │  │           │ │
│  │           │  │ ─── (spacing-12 gap) ───         │  │           │ │
│  │           │  │                                  │  │           │ │
│  │           │  │ [Article body — prose styled]     │  │           │ │
│  │           │  │ Max width: 70ch                   │  │           │ │
│  │           │  │ Line-height: 1.7                  │  │           │ │
│  │           │  │                                  │  │           │ │
│  │           │  │ ## Subheading (Newsreader)        │  │           │ │
│  │           │  │ Body text (Inter)...              │  │           │ │
│  │           │  │ ```code block (Geist Mono)```     │  │           │ │
│  │           │  │ | data | table |                  │  │           │ │
│  │           │  │                                  │  │           │ │
│  │           │  │ ─── (spacing-16 gap) ───         │  │           │ │
│  │           │  │                                  │  │           │ │
│  │           │  │ [Tags row]                        │  │           │ │
│  │           │  │ [← Previous / Next → nav]         │  │           │ │
│  └──────────┘  └──────────────────────────────────┘  └───────────┘ │
│                                                                     │
│  [Footer]                                                           │
└─────────────────────────────────────────────────────────────────────┘
```

**3-column grid (desktop >1200px):**
- Left: `80px` — reading progress rail
- Center: `min(70ch, 100%)` — article content
- Right: `1fr` — marginalia gutter (empty for MVP, future: TOC, notes)

**Responsive collapse:**
- Tablet (768-1200px): 2-column, drop right marginalia
- Mobile (<768px): single column, hide progress rail

**Article prose styling (Tailwind Typography overrides):**
- Headings: Newsreader, `headline-md`
- Body: Inter, `body-lg`, line-height 1.7
- Links: `primary` color, underline on hover
- Images: full content-width, `rounded-lg`, alt text required
- Horizontal rules: `surface-container-high` background, 1px height, `spacing-12` margin

---

### Page: About (`/about`)

```
┌─────────────────────────────────────────────────────────┐
│  Nav                                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Display-lg (Newsreader): "About"                       │
│                                                         │
│  [Prose content — same styling as article body]         │
│  Max width: 70ch                                        │
│                                                         │
│  Who you are, what you write about, what drives         │
│  the research. Keep it to 3-4 paragraphs.               │
│                                                         │
│  [Optional: small photo, rounded-lg, max 200px wide]    │
│                                                         │
│  [Social links inline or as a small row]                │
│                                                         │
│  [Footer]                                               │
└─────────────────────────────────────────────────────────┘
```

---

### Page: Projects (`/projects`)

```
┌─────────────────────────────────────────────────────────┐
│  Nav                                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Display-lg (Newsreader): "Projects"                    │
│                                                         │
│  Body-md (Inter, on-surface-variant):                   │
│  "Tools and projects that come out of the research."    │
│                                                         │
│  spacing-8 gap                                          │
│                                                         │
│  [Project Card]                                         │
│  ┌─────────────────────────────────────────────┐        │
│  │ surface-container background                │        │
│  │                                             │        │
│  │ Headline-sm (Newsreader): "cctrue"          │        │
│  │ Body-md (Inter, on-surface-variant):        │        │
│  │ "A correct Claude Code usage tracker"       │        │
│  │                                             │        │
│  │ [GitHub →] [Read the research →]            │        │
│  │ (tertiary buttons)                          │        │
│  └─────────────────────────────────────────────┘        │
│                                                         │
│  spacing-5 gap                                          │
│                                                         │
│  [Project Card 2...]                                    │
│                                                         │
│  [Footer]                                               │
└─────────────────────────────────────────────────────────┘
```

**Notes:**
- Initially may be empty or have 1 project — that's fine
- Project cards use tonal lift (surface-container on surface)
- Links to GitHub repo and related blog post

---

## Responsive Breakpoints

| Breakpoint | Name | Layout |
|------------|------|--------|
| <768px | Mobile | Single column, hamburger nav, no progress rail |
| 768-1024px | Tablet | Single column, horizontal nav, no progress rail |
| 1024-1200px | Desktop-sm | 2-column article (content + rail), no marginalia |
| >1200px | Desktop | 3-column article (rail + content + marginalia) |

### Content widths per breakpoint:

| Breakpoint | Container max | Content max | Padding |
|------------|---------------|-------------|---------|
| Mobile | 100% | 100% | `16px` sides |
| Tablet | `768px` | `680px` | `24px` sides |
| Desktop-sm | `960px` | `680px` | `32px` sides |
| Desktop | `1200px` | `680px` (70ch) | `32px` sides |

---

## Motion & Transitions

All behind `@media (prefers-reduced-motion: no-preference)`:

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Theme switch | all colors | 150ms | ease |
| Link hover | color | 150ms | ease |
| Nav active underline | width | 200ms | ease-out |
| Theme toggle icon | opacity, transform | 200ms | ease |
| Card title hover | color | 150ms | ease |
| Focus outline | outline-offset | 100ms | ease |

No scroll animations. No fade-in-on-scroll. No parallax. Content appears immediately.

---

## Font Loading Strategy

Self-hosted via fontsource packages (no external network requests):

```
@fontsource-variable/newsreader (variable weight, includes italic)
@fontsource-variable/inter (variable weight)
@fontsource/geist-mono (400)
```

- `font-display: swap` — show fallback immediately, swap when loaded
- Fallback stack: `Newsreader, Georgia, 'Times New Roman', serif`
- Fallback stack: `Inter, system-ui, -apple-system, sans-serif`
- Fallback stack: `'Geist Mono', 'SF Mono', 'Fira Code', monospace`
- Preload the 3 primary weights in `<head>` for instant rendering
