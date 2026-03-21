# Design System: The Moonlit Library

## Creative North Star

A digital sanctuary for technical reading. Not a standard dark-mode dev blog — a high-end editorial experience that treats technical content as contemplative space.

**Core principles:**
- Content-first, design-invisible
- Ocular comfort over visual impact
- Tonal depth over borders and shadows
- Editorial authority through typography
- No AI slop (no glassmorphism, no gradient buttons, no frosted glass)

---

## Typography

The system pairs a high-character serif for editorial voice with a functional sans-serif for technical legibility.

| Role | Font | Usage |
|------|------|-------|
| Display & Headlines | **Newsreader** | Article titles, hero text, section breaks |
| Body & UI | **Inter** | Paragraphs, navigation, labels, metadata |
| Code & Data | **Geist Mono** | Code blocks, inline code, timestamps, metrics |

### Scale

| Token | Size | Usage |
|-------|------|-------|
| `display-lg` | 3.5rem | Hero titles, page headers |
| `headline-md` | 1.75rem | Article sub-headers |
| `headline-sm` | 1.25rem | Section labels (in secondary color) |
| `body-lg` | 1.125rem | Article body text |
| `body-md` | 1rem | UI text, navigation |
| `body-sm` | 0.875rem | Captions, metadata, code blocks |

### Rules

- Body line-height: **1.7** minimum
- Paragraph max-width: **70ch** (prevents horizontal eye fatigue)
- Headings use Newsreader; everything else uses Inter
- Code always uses Geist Mono regardless of context

---

## Color System

### Dark Theme (Default)

The palette is rooted in low-light environments — warm-tinted darks, never pure black.

#### Surface Hierarchy

| Token | Value | Role |
|-------|-------|------|
| `background` | `#0c0e10` | Page base (the deep night) |
| `surface` | `#0c0e10` | Same as background |
| `surface-container-low` | `#111416` | Section backgrounds |
| `surface-container` | `#171a1d` | Cards, containers |
| `surface-container-high` | `#1e2225` | Sidebar, recessed areas |
| `surface-bright` | `#282d31` | Floating elements, hover states |

#### Content Colors

| Token | Value | Role |
|-------|-------|------|
| `primary` | `#bbcbbb` | Links, actions, highlights (Sage) |
| `on-surface` | `#e2e6eb` | Primary text (soft off-white) |
| `on-surface-variant` | `#a8abb0` | Secondary text, captions, metadata |
| `accent` | `#ffd6d6` | High-impact alerts, special accents (Dusty Rose) |
| `code-bg` | `#050607` | Code block background |
| `tag-bg` | tinted from primary | Tag/chip background |
| `tag-text` | tinted from primary | Tag/chip text |

### Light Theme

Warm off-whites that avoid the harsh pure-white problem. Desaturated sage carries through.

#### Surface Hierarchy

| Token | Value | Role |
|-------|-------|------|
| `background` | `#f8f9fa` | Page base |
| `surface` | `#f8f9fa` | Same as background |
| `surface-container-low` | `#f1f4f5` | Section backgrounds |
| `surface-container` | `#eaedee` | Cards |
| `surface-container-high` | `#e5e9eb` | Sidebar, recessed areas |
| `surface-container-highest` | `#dde1e3` | Heavy contrast areas |

#### Content Colors

| Token | Value | Role |
|-------|-------|------|
| `primary` | `#48655f` | Links, actions, highlights (Sage) |
| `on-primary` | `#ffffff` | Text on primary buttons |
| `on-surface` | `#2d3335` | Primary text |
| `on-surface-variant` | `#5a5f62` | Secondary text, captions, metadata |
| `code-bg` | `#eef1f3` | Code block background |
| `tag-bg` | `#e2ebe8` | Tag/chip background |
| `tag-text` | `#3d5550` | Tag/chip text |

---

## Structural Rules

### The "No-Line" Rule

**Do not use 1px solid borders to section content.** Boundaries are created through background color shifts only. To separate a sidebar from a main feed, transition from `surface` to `surface-container-low`. The transition itself defines the edge.

### Tonal Layering (No Shadows)

Depth is achieved by placing lighter surfaces on darker surfaces — a "paper-on-table" effect. Cards don't "pop" with drop shadows; they reveal themselves by being a slightly different shade than their parent.

- **Exception — floating elements (modals, popovers):** Use an ambient shadow: `0px 24px 48px -12px` with `on-surface` at 6% opacity. Never use pure black shadows.

### The "Ghost Border" Fallback

If a boundary is needed for accessibility, use `outline-variant` at **15% opacity**. It should be felt, not seen.

### Negative Space

Generous spacing between sections. If a page feels "empty," it's working. Use `spacing-16` (5.5rem) and `spacing-20` (7rem) between major article sections.

---

## Components

### Buttons

| Type | Style |
|------|-------|
| Primary | Solid `primary` background, `on-primary` text, `rounded-md` (0.375rem), no shadow |
| Secondary | Transparent background, ghost-border, `primary` text |
| Tertiary | Text-only `primary` with 2px underline |

### Cards & Lists

- **No divider lines.** Separate list items with `spacing-5` (1.7rem) vertical whitespace
- For card groups, use alternating background shifts between surface levels
- Cards use tonal lift, not shadows

### Tags & Chips

- Pill shape (`rounded-full`)
- `tag-bg` background with `tag-text` color
- Consistent across both themes using the sage palette family

### Code Blocks

- Background: `code-bg` token (dark: `#000000`, light: `#eef1f3`)
- Corner radius: `xl` (0.75rem)
- Font: Geist Mono at `body-sm` size
- Syntax highlighting: pastel palette (sage, rose, lavender tones in dark; standard in light)
- Line numbers enabled

### Input Fields

- Unfocused: minimal underline or soft well (`surface-container-low` background)
- Focused: underline transitions to `primary` with soft 2px glow at 30% opacity

### Reading Progress Rail (Signature)

A vertical 2px line in the left margin using a gradient from `primary` to `transparent`, tracking scroll position. Utility without clutter.

---

## Layout Principles

### Editorial Asymmetry

- Main text column aligns left-center with a wider right margin
- Right margin can hold "marginalia" — notes, citations, small chips
- Article metadata (author, date, reading time) offsets to the left of the main column

### Responsive Behavior

- Below ~1024px: collapse to single-column layout, marginalia moves inline
- Mobile: full-width content with standard padding
- Navigation: remains top-bar, no hamburger menu on tablet+

### Content Width

- Article body: max `70ch`
- Page container: max `1200px`
- Code blocks: can extend slightly beyond body width for readability

---

## Do's and Don'ts

### Do

- Tint all greys with a hint of blue or green (use the provided tokens)
- Embrace negative space — focus over noise
- Use Newsreader for display, Inter for body, Geist Mono for code — no exceptions
- Let background shifts define boundaries
- Test real article titles at display sizes (not aspirational placeholder copy)

### Don't

- Use pure `#000000` or `#FFFFFF` for text or backgrounds (except code-bg in dark theme)
- Use 1px solid borders for sectioning
- Use glassmorphism, backdrop-filter blur, or gradient buttons
- Use drop shadows for cards (use tonal layering)
- Crowd the text — maintain buffer zones around body content
- Use sharp corners on large containers (prefer `md` and `lg` radius)

---

## Theme Switching

- **Default:** Dark theme
- **Toggle:** Stores preference in `localStorage`
- **CSS implementation:** `class="light"` toggled on `<html>` (dark is default, no class needed)
- **First visit:** Respects `prefers-color-scheme` system preference
- **Transition:** Smooth color transitions on theme switch (150ms ease)
