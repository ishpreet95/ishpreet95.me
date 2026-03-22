---
title: "Understanding Claude Code Token Metrics: What the Numbers Actually Mean"
description: "I got 4 different token counts from the same usage data. After reverse-engineering the JSONL format and reading every tool's source code, here's what's actually going on."
date: 2026-03-22
tags: ["claude-code", "developer-tools", "metrics", "research"]
draft: false
---

I've been using Claude Code daily for 77 days. 298 sessions across 10 projects. When I ran `/stats`, it told me I'd used **9.4 million tokens**.

Then I installed claudelytics. It showed **8.2 billion tokens.**

Then I wrote a jq script to count manually. It said **2.36 million.**

Then I wrote a proper deduplication script. It said **7.26 million.**

Four tools, same data, four wildly different answers. I spent the next week reverse-engineering Claude Code's data format, reading every tool's source code, and figuring out what's actually happening. Here's what I found.

## The same data, measured four ways

Claude Code stores every conversation as JSONL files under `~/.claude/projects/`. Each assistant response includes detailed token usage — input tokens, output tokens, cache reads, cache writes. The data is rich. The problem is how tools interpret it.

| Method | Token Count | What it's measuring |
|---|---|---|
| claudelytics | ~8.2B | Every JSONL line, all token types summed, no deduplication |
| `/stats` | 9.4M | input + output only, excludes cache tokens |
| Our `requestId` dedup | 7.26M | Deduplicated input + output across all files |
| jq `unique_by(.uuid)` | 2.36M | Partially deduplicated, wrong key, misses subagents |

None of these are "wrong" — they measure different things. But none of them explain what they include, and the gaps between them are enormous.

## Why the numbers diverge: three mechanics you need to understand

### 1. Streaming chunks duplicate usage data

When Claude responds, the response is written as **multiple JSONL lines** — one per content block (thinking, text, tool_use). A typical response produces 3-6 lines. Each line has a unique `uuid`, but they all share the same `requestId`.

Here's the catch: each streaming chunk carries usage data, but only the **final chunk** (the one with `stop_reason != null`) has the real output token count. Intermediate chunks have placeholder values (~1-11 output tokens regardless of actual response length).

In my data: 87,684 raw JSONL lines collapse to 30,746 unique API requests. That's a **2.85x** inflation from streaming chunks alone.

If a tool deduplicates by `uuid` (unique per line), it still overcounts. If it deduplicates by `requestId` but keeps the first occurrence, it gets wrong output token numbers. The correct approach: deduplicate by `requestId`, keep the entry with `stop_reason != null`.

### 2. Cache tokens dwarf everything else

Every turn, Claude re-reads your files, system prompts, MCP tool descriptions, and conversation history. These are `cache_read_input_tokens` — and they dominate:

| Token type | Count | % of total |
|---|---|---|
| Cache read | 2.73 billion | 95.8% |
| Cache write | 118.88 million | 4.2% |
| Output | 6.12 million | 0.21% |
| Input (new context) | 1.14 million | 0.04% |

If a tool sums all four types into "total tokens," cache reads make the number enormous. That's what claudelytics does — and why it shows 8.2 billion.

`/stats` takes the opposite approach: it only counts input + output, completely excluding cache. That's why it shows 9.4M. I verified this against `~/.claude/stats-cache.json` — the math checks out exactly: 1,082,937 input + 8,279,640 output = 9,362,577 ≈ 9.4M.

### 3. Subagents are most of the work

87% of JSONL files on my machine (1,168 of 1,337) are **subagent** transcripts — spawned by the Agent tool for parallel tasks. All subagent messages are marked `isSidechain: true`.

Subagents account for 53% of API requests and **66% of input+output tokens**. Two-thirds of my "usage" was automated background work, not my direct conversations. No tool surfaces this distinction.

## How each tool actually counts (source-code verified)

I didn't trust documentation — I read the source code.

### ccusage (11.8k stars, TypeScript)

ccusage deduplicates by `message.id + requestId` — the correct key. But it uses **first-seen-wins**: it keeps the first streaming chunk and discards later ones. The first chunk has placeholder output tokens.

[Issue #888](https://github.com/ryoppippi/ccusage/issues/888) measured this on real data: first-seen showed 130,785 output tokens, while latest-seen (correct) showed 648,562. **A ~5x undercount on output tokens.** This bug is still open.

ccusage also doesn't distinguish 5-minute from 1-hour cache writes ([Issue #899](https://github.com/ryoppippi/ccusage/issues/899)), causing a ~19% underestimate on cache costs. And it doesn't filter `isSidechain` — the schema doesn't even parse that field.

### claudelytics (70 stars, Rust)

claudelytics prioritizes simplicity and broad scanning over granular accounting — it doesn't deduplicate streaming chunks. The `UsageRecord` struct doesn't parse `uuid`, `requestId`, or `message.id` at all. Every JSONL line that has usage data gets counted. It sums all four token types — `input + output + cache_read + cache_creation` — into one number. No streaming chunk handling.

This fully explains the 8.2 billion figure: no dedup + cache_read inclusion + recursive subagent scanning.

### `/stats` (built-in)

Verified from `stats-cache.json`: `/stats` shows `input_tokens + output_tokens` only. Cache tokens are tracked in a separate `modelUsage` section but excluded from the "Total tokens" display.

This is actually the **least misleading** metric — it measures productive tokens without cache overhead. It just never explains what it includes, shows no breakdown, and its comparisons ("428x The Little Prince") treat the number as raw volume.

### ccost (6 stars, Rust, inactive)

The only tool that independently documented `requestId`-priority deduplication — 9 months before anyone else. It had an intense initial development sprint in June 2025 (82 commits in 13 days) but has had no activity since, doesn't scan subagent directories, and doesn't distinguish cache write tiers. 6 stars, 1 open issue. Correctness without visibility.

### Other notable tools

The landscape is broader than the tools analyzed above. **tokscale** ([junhoyeo/tokscale](https://github.com/junhoyeo/tokscale), 1.3k stars) tracks usage across multiple platforms including Claude Code, Codex, Gemini, and Cursor with a Rust-powered TUI. **par_cc_usage** ([paulrobello/par_cc_usage](https://github.com/paulrobello/par_cc_usage), 84 stars) is a Python tool that correctly deduplicates by request ID and adds real-time monitoring with burn rate tracking. Neither tool currently distinguishes 5-minute from 1-hour cache write tiers, but both represent meaningful efforts in this space.

## The cost illusion

The cost differences are the most consequential. Cache read tokens cost **1/10th** of regular input, and cache writes cost **1.25x-2x** depending on the tier (5-minute vs 1-hour). Applying the wrong rates produces phantom costs:

| Calculation | Amount |
|---|---|
| **Real cost** (cache-aware, per-model pricing) | **$2,184** |
| Naive cost (all tokens at input rate) | $12,487 |
| Worst case (all tokens at output rate) | $62,433 |

The $10,303 gap between real and naive is money that doesn't exist — generated by multiplying cheap cache reads at expensive input rates. For subscription users on Pro/Max plans, per-token cost is theoretical anyway, but the phantom numbers create real anxiety.

Anthropic's pricing also has dimensions no tool accounts for: fast mode (6x for Opus 4.6), data residency (1.1x for US-only), long context (2x for >200k input on Sonnet), and web search ($10/1k searches).

## How this happened

This isn't a story about bad tools. It's about a data format that evolved faster than its ecosystem.

**Early 2025:** Claude Code JSONL files had a `costUSD` field. One line = one message = one cost. Simple.

**June 2025:** Anthropic [removed `costUSD`](https://github.com/ryoppippi/ccusage/issues/4). Tools had to calculate costs from tokens.

**Mid-2025:** Thinking blocks were added. One response became 3-6+ JSONL lines. **This is when counting broke** — but the numbers still looked plausible, so nobody noticed immediately.

**Mid-2025:** Subagents were added, writing to nested `subagents/` directories. Tools [didn't scan these](https://github.com/ryoppippi/ccusage/issues/313). Users reported hitting limits while tools showed plenty of headroom.

**Late 2025-2026:** Cache pricing split into 5-minute (1.25x) and 1-hour (2x) tiers. The JSONL data includes both (`ephemeral_5m_input_tokens`, `ephemeral_1h_input_tokens`). No tool distinguishes them.

People noticed symptoms — [Issue #389](https://github.com/ryoppippi/ccusage/issues/389) (double counting), [Issue #313](https://github.com/ryoppippi/ccusage/issues/313) (missing subagents), [Issue #22686](https://github.com/anthropics/claude-code/issues/22686) (wrong output tokens). But nobody connected the dots into a complete picture. Each issue describes a symptom. The disease is format evolution outpacing tooling.

## What this means for you

If you use Claude Code and care about understanding your usage:

**`/stats` is your best bet for a quick overview.** It shows input + output tokens, no cache inflation. The number is reasonable even if it's not broken down.

**Don't trust cost estimates from third-party tools.** Unless a tool explicitly separates cache reads (0.1x), 5-minute cache writes (1.25x), and 1-hour cache writes (2x), its cost number is wrong.

**Your cache efficiency is probably excellent.** Mine is 95.8% — meaning almost all context is being reused from cache rather than reprocessed. This is by design and it's what makes Claude Code affordable at scale.

**Most of your tokens go to subagents.** If you use the Agent tool, expect 50-66% of your usage to be automated background work. This is real API consumption but not your direct interaction.

## The server-side alternative

If you're on an organizational API billing plan, Anthropic provides a [Usage and Cost API](https://docs.anthropic.com/en/docs/build-with-claude/track-token-usage) that gives authoritative server-side token counts without any JSONL parsing. It reports aggregate usage at hourly/daily granularity, grouped by model, workspace, and API key.

For organizational cost reconciliation, this is the canonical source — it's what Anthropic uses for billing. However, it doesn't provide per-request or per-session granularity, can't distinguish main thread from subagent usage, requires Admin API keys (unavailable to individual Claude Max subscribers), and has a ~5 minute data delay.

JSONL parsing remains necessary for per-request analysis, subagent vs. main-thread attribution, offline/instant metrics, and anyone on the Max plan without API billing. The two approaches are complementary, not competing.

## For tool builders

If you're building or maintaining a Claude Code usage tool, here's what correct parsing requires:

1. **Deduplicate by `requestId`** (or `message.id` — they're 1:1). Not `uuid`.
2. **Keep the last chunk** per `requestId` (the one with `stop_reason != null`). The first chunk has placeholder output tokens.
3. **Scan recursively** including `subagents/` directories.
4. **Separate main thread** (`isSidechain: false`) from subagent usage.
5. **Distinguish 5 token types:** input, output, cache_read, cache_write_5m, cache_write_1h.
6. **Apply per-model, per-type pricing** from [Anthropic's published rates](https://platform.claude.com/docs/en/about-claude/pricing).

A correct Python parser is about 20 lines:

```python
import json, glob, os

files = glob.glob(os.path.expanduser('~/.claude/projects/**/*.jsonl'), recursive=True)
by_request = {}
for f in files:
    with open(f) as fh:
        for line in fh:
            try:
                d = json.loads(line)
            except (json.JSONDecodeError, ValueError):
                continue
            if d.get('type') != 'assistant':
                continue
            usage = d.get('message', {}).get('usage', {})
            rid = d.get('requestId', '')
            stop = d.get('message', {}).get('stop_reason')
            if rid and (rid not in by_request or stop):
                by_request[rid] = usage

print(f"Unique requests: {len(by_request)}")
print(f"Input: {sum(u.get('input_tokens',0) for u in by_request.values()):,}")
print(f"Output: {sum(u.get('output_tokens',0) for u in by_request.values()):,}")
print(f"Cache read: {sum(u.get('cache_read_input_tokens',0) for u in by_request.values()):,}")
print(f"Cache write: {sum(u.get('cache_creation_input_tokens',0) for u in by_request.values()):,}")
```

**Caveat:** [Issue #22686](https://github.com/anthropics/claude-code/issues/22686) reports that on some systems, the final streaming chunk (with `stop_reason` set) is never written to JSONL — only intermediate chunks with `output_tokens: 1` are saved. In my data (Claude Code v2.1.79), final chunks are present in 98.6% of multi-chunk requests, so the parser works correctly. If your data is affected, the fallback (keeping the last entry by line order) still produces better results than first-seen or no dedup, but output token counts may be understated.

> **Disclosure:** I'm building a tool in this space ([ccmetrics](https://github.com/ishpreet95/ccmetrics)). The analysis above was completed independently before development started, but you should know I have skin in the game.

## What's next

I'm working on a tool that gets this right — correct deduplication, disaggregated metrics, cache-aware cost estimates, published methodology. More on that soon.

The JSONL format will keep evolving. Any tool built today will face the same drift the current tools did. The only defense is publishing your methodology so users can verify the numbers themselves.

---

## Methodology

> **Scope:** All analysis performed on local `~/.claude/` data from a single user over 77 active days (Jan 5 – Mar 22, 2026), 298 sessions, 10 projects. These ratios (95.8% cache, 87% subagent files, 2.85x streaming inflation) reflect one power user's workflow with aggressive subagent usage. **Your numbers will differ** — a user running simple Q&A sessions without subagents would see much lower cache ratios and minimal streaming inflation. The mechanisms are universal; the ratios are personal.
>
> **Verification:** Tool versions: ccusage v18.0.10, claudelytics v0.5.2, ccost v0.2.0. Pricing verified against [Anthropic's published rates](https://platform.claude.com/docs/en/about-claude/pricing) on 2026-03-22. Every source-code claim was verified by reading the actual code, not documentation. Full technical appendix available [here](/blog/claude-code-token-metrics-appendix).
