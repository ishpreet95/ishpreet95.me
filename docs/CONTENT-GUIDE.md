# Content Guide

## Voice & Tone

### Who you are (to the reader)
A developer who digs deeper than most. You don't just use tools — you open the source, read the data, and figure out what's actually happening.

### Tone
- **Curious, not cynical** — "here's what I found" not "everything is broken"
- **Rigorous, not academic** — show your work, but don't write a paper
- **Direct, not aggressive** — state facts, let the reader draw conclusions
- **Generous to other builders** — when someone's tool has a bug, explain why it happened, don't mock them

### What NOT to do
- Don't use "lying to you" or similar accusatory language about other tools or developers
- Don't use clickbait anger-hooks
- Don't explain things the reader already knows (respect their intelligence)
- Don't pad articles with filler — if it's 1,500 words, it's 1,500 words

## Article Structure

### Frontmatter
```yaml
---
title: "Understanding Claude Code Token Metrics"
description: "A deep investigation into how token usage tools count — and miscount — your Claude Code activity"
date: 2026-03-22
tags: ["claude-code", "developer-tools", "metrics"]
draft: false
---
```

### Anatomy of a good post
1. **Hook (2-3 sentences)** — the surprising thing you found, stated plainly
2. **Context** — why this matters, who it affects
3. **The investigation** — what you did, what you found, with evidence
4. **Why it happened** — the explanation (not blame, understanding)
5. **What this means** — implications, what the reader should do
6. **Appendix (optional)** — reproduction scripts, data tables, methodology details

### Code blocks
- Always specify language for syntax highlighting
- Include file path as a comment when relevant: `// src/parser.ts`
- Keep examples short — show the relevant 5 lines, not the whole file
- Use line highlighting for the key lines when possible

### Data tables
- Use markdown tables for comparisons
- Bold the key column/row
- Include units (tokens, $, %, etc.)
- Source your numbers — link to where the data came from

### Links
- Link to GitHub issues by number and title (not just URL)
- Link to source code with file path and line numbers when possible
- Link to official docs, not blog posts about docs

## Tags Taxonomy

Use consistent tags across posts:

- `claude-code` — anything about Claude Code CLI
- `developer-tools` — tools, CLIs, dev experience
- `metrics` — measurement, analytics, observability
- `ai-engineering` — building with AI, AI infrastructure
- `rust` — Rust-specific content
- `typescript` — TypeScript-specific content
- `research` — investigations and deep dives
- `announcement` — tool launches, updates

## Images

- Prefer terminal screenshots over UI mockups
- Use actual data, not placeholder content
- Dark terminal theme (matches site design)
- Alt text on every image
- Compress to < 200KB per image

## Article Checklist (before publishing)

- [ ] Title is specific, not generic ("Understanding X" not "My thoughts on X")
- [ ] Description is one sentence that makes you want to read more
- [ ] Every claim has evidence (data, source code, link)
- [ ] Tone is educational, not accusatory
- [ ] Code examples run correctly
- [ ] All links work
- [ ] Tags are from the taxonomy
- [ ] Reading time is reasonable (5-15 min for articles, 2-5 min for notes)
- [ ] Open Graph description is compelling
