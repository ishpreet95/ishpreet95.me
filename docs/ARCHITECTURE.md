# Architecture

## Directory Structure

```
ishpreet95.me/
  docs/                          # Project documentation (you are here)
    VISION.md                    # Product vision, features, design principles
    ARCHITECTURE.md              # Technical architecture (this file)
    CONTENT-GUIDE.md             # Writing style, tone, formatting rules
    DESIGN-SYSTEM.md             # Design system: colors, typography, rules
    UI-SPECS.md                  # Component specs, page layouts, responsive
  src/
    components/                  # Astro components
      Header.astro               # Navigation bar + mobile menu
      Footer.astro               # Social links, copyright
      ArticleCard.astro          # Blog listing card
      ThemeToggle.astro          # Dark/light mode switch
      ReadingProgress.astro      # Scroll progress rail (desktop only)
      SEO.astro                  # Meta tags, OG, Twitter Cards, RSS link
    layouts/
      Base.astro                 # HTML shell (head, body, fonts, skip-link)
    pages/
      index.astro                # Home: tagline + featured investigation
      about.astro                # About page
      projects.astro             # Projects listing
      blog/
        index.astro              # Blog listing (all posts)
        [...slug].astro          # Dynamic article pages (3-column grid)
      rss.xml.ts                 # RSS feed endpoint
    styles/
      global.css                 # Tailwind config, design tokens, prose overrides
    content/
      blog/                      # Markdown/MDX blog posts
        understanding-claude-code-token-metrics.md
  src/content.config.ts          # Content collection schema (Astro v6)
  public/
    favicon.svg                  # Site favicon (moon icon)
    og-default.png               # Default Open Graph image
  astro.config.mjs               # Astro + Shiki + sitemap + MDX config
  package.json
  tsconfig.json
```

## Key Technical Decisions

### Content Collections (Astro v6)
- Blog posts live in `src/content/blog/` as Markdown or MDX files
- Schema defined in `src/content.config.ts` using `loader: glob()` pattern
- Post identifier is `id` (not `slug`) — auto-generated from filename
- Rendering via `render(post)` (not `post.render()`)
- Queried with `getCollection('blog')` — type-safe, sorted, filtered
- Draft posts filtered via `({ data }) => !data.draft`

### Styling
- Tailwind CSS v4 via `@tailwindcss/vite` Vite plugin (not `@astrojs/tailwind`)
- CSS-first config: no `tailwind.config.mjs` — all config in `global.css`
- `@theme` for static values (fonts), `@theme inline` for dynamic values (colors via CSS vars)
- `@plugin "@tailwindcss/typography"` for prose styling
- CSS variables for theming (dark/light), switched via `html.light` class

### Typography
- **Newsreader** (variable) — display & headlines (serif editorial voice)
- **Inter** (variable) — body text, navigation, UI
- **Geist Mono** — code blocks, inline code, data
- Loaded via `@fontsource-variable/newsreader`, `@fontsource-variable/inter`, `@fontsource/geist-mono`
- Self-hosted (bundled by Vite), no external font requests

### Syntax Highlighting
- Shiki (built into Astro) — server-side highlighting, zero JS
- Dual themes: `github-dark` + `github-light` via CSS variables
- `defaultColor: false` — theme switching controlled by `html.light` class
- Line numbers via CSS counters

### Dark Mode
- Default: dark (no class on `<html>`)
- Light mode: `class="light"` added to `<html>`
- Toggle stores preference in `localStorage` key `theme`
- Flash prevention: inline script in `<head>` reads localStorage before render
- Respects `prefers-color-scheme` on first visit
- Smooth 150ms color transition (behind `prefers-reduced-motion`)

### SEO
- `<title>` and `<meta description>` per page
- Open Graph tags (title, description, image, type)
- Twitter Card tags
- Canonical URLs
- Sitemap (via `@astrojs/sitemap`)
- RSS feed (via `@astrojs/rss`)

### Performance
- Zero external JS bundles — all scripts are inline
- ~48KB CSS (includes Tailwind utilities + typography + font declarations)
- Self-hosted fonts (no CDN requests)
- Static site generation — all pages pre-rendered at build time

## Deployment

```
git push origin main
  → Vercel auto-detects Astro
  → Builds static site
  → Deploys to edge CDN
  → Available at ishpreet95.me
```

## Dependencies

```json
{
  "astro": "^6.0.8",
  "@astrojs/mdx": "^5.0.2",
  "@astrojs/sitemap": "^3.7.1",
  "@astrojs/rss": "^4.0.17",
  "@tailwindcss/vite": "^4.0.0",
  "@tailwindcss/typography": "^0.5.0",
  "tailwindcss": "^4.0.0",
  "@fontsource-variable/newsreader": "^5.0.0",
  "@fontsource-variable/inter": "^5.0.0",
  "@fontsource/geist-mono": "^5.0.0"
}
```
