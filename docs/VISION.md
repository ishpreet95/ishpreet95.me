# ishpreet95.me — Personal Website

## Purpose

A personal website for publishing technical research, deep dives, and investigations. The first post is the Claude Code token metrics study. Future posts will cover developer tooling, AI engineering, and systems thinking.

The site also serves as a foundation for launching tools — linking research to the products that come out of it.

## Design Principles

- **Clean and minimal** — content-first, no visual clutter
- **Fast** — static generation, no client-side bloat
- **Dark mode by default** — developer audience
- **Good typography** — Newsreader for headlines, Inter for body, Geist Mono for code
- **Mobile responsive** — works on any device
- **SEO-friendly** — proper meta tags, Open Graph images, RSS feed

## Content Types

1. **Articles** — long-form technical research (like the token metrics study)
2. **Notes** — shorter observations and findings (post-MVP)
3. **Projects** — pages for tools/projects that come out of the research (e.g., cctrue)

## Pages

- `/` — Home: tagline + featured investigation + archive
- `/blog` — Article listing
- `/blog/[slug]` — Individual article (rendered from MDX/Markdown)
- `/about` — Who you are, what you write about
- `/projects` — List of projects/tools

## Features

### MVP (Implemented)
- [x] Static site with markdown/MDX blog posts
- [x] Dark mode default, light mode toggle
- [x] Newsreader + Inter + Geist Mono typography
- [x] Syntax highlighting for code blocks (Shiki dual-theme, with line numbers)
- [x] Responsive layout (4 breakpoints)
- [x] SEO meta tags + Open Graph
- [x] RSS feed
- [x] Reading time estimate (computed from word count)
- [x] Date and tags on articles
- [x] Footer with social links (GitHub, X, LinkedIn)
- [x] Reading progress rail (desktop)
- [x] Skip-to-content link + focus-visible styles
- [x] Featured investigation homepage pattern

### Post-MVP
- [ ] Table of contents sidebar for long articles
- [ ] Newsletter signup (simple email capture)
- [ ] View count (privacy-friendly, no cookies)
- [ ] Article series support (part 1 of N)
- [ ] Search
- [ ] Comments (GitHub Discussions-based or giscus)
- [ ] Open Graph image auto-generation (via satori/og)

## Tech Stack

- **Framework:** Astro 6 (static, zero JS by default)
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite`
- **Typography:** `@tailwindcss/typography` for prose styling
- **Content:** Markdown/MDX content collections (built-in)
- **Syntax highlighting:** Shiki (built-in, dual-theme)
- **Fonts:** Newsreader, Inter, Geist Mono (self-hosted via fontsource)
- **RSS:** `@astrojs/rss`
- **Sitemap:** `@astrojs/sitemap`
- **Hosting:** Vercel (free tier, auto-deploys from git)

### Why Astro over Next.js
- Site is content-first, not app-first
- Zero JS shipped by default (Next.js ships React runtime)
- Content collections are purpose-built for blogs
- Simpler mental model for a static site
- Can always add interactive islands later if needed

## Deployment

- **Host:** Vercel (free tier, auto-deploys from git)
- **Domain:** `ishpreet95.me`
- **CI:** Push to main = auto-deploy

## Content Plan

### First Post
**Title:** "Understanding Claude Code Token Metrics: What the Numbers Actually Mean"
**Tone:** Educational, not accusatory. "Here's what I found" not "tools are lying"

### Future Posts (ideas)
- "Building cctrue: A Correct Claude Code Usage Tracker"
- Deep dives from other research
- Tool announcements and changelogs

## Branding Notes

- **Site name:** Ishpreet (not "The Moonlit Library" — that's the design system codename)
- **Tagline:** "A developer who can't leave well enough alone."
- Keep it personal — this is your site, not a company
- Tone: curious, rigorous, direct
- No AI slop aesthetics (gradient blobs, generic hero images)
- Let the content speak — good research doesn't need decoration
