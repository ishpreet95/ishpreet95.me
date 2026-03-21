---
title: "Claude Code Token Metrics: Technical Appendix"
description: "Source code verification, data model reference, pricing tables, reproduction scripts, and the full format evolution timeline behind our token metrics investigation."
date: 2026-03-22
tags: ["claude-code", "developer-tools", "metrics", "research"]
draft: false
---

This is the technical companion to [Understanding Claude Code Token Metrics](/blog/understanding-claude-code-token-metrics). Everything below is the evidence and methodology behind the main post's findings.

## Data Model Reference

### Directory structure

```
~/.claude/
  projects/
    {encoded-path}/                          # path with / replaced by -
      {session-uuid}.jsonl                   # main conversation log
      {session-uuid}/subagents/
        agent-{id}.jsonl                     # subagent conversations
  sessions/
    {pid}.json                               # pid -> sessionId, cwd, startedAt
  stats-cache.json                           # precomputed daily stats
  history.jsonl                              # input history (no token data)
```

### Message types in session JSONL

| Type | Purpose | Has usage data? |
|---|---|---|
| `progress` | Hook/plugin lifecycle events | No |
| `user` | User messages and tool results | No |
| `assistant` | Model responses (streaming chunks) | **Yes** |
| `system` | Turn duration, local commands | No |
| `file-history-snapshot` | File state for undo/restore | No |

### The usage object (on `type: "assistant"` messages)

```json
{
  "message": {
    "usage": {
      "input_tokens": 241,
      "output_tokens": 168,
      "cache_creation_input_tokens": 492,
      "cache_read_input_tokens": 49336,
      "cache_creation": {
        "ephemeral_5m_input_tokens": 0,
        "ephemeral_1h_input_tokens": 492
      },
      "service_tier": "standard",
      "speed": "standard",
      "inference_geo": "",
      "server_tool_use": {
        "web_search_requests": 0,
        "web_fetch_requests": 0
      }
    },
    "model": "claude-opus-4-6",
    "id": "msg_01...",
    "stop_reason": "end_turn"
  },
  "requestId": "req_...",
  "uuid": "unique-per-streaming-chunk",
  "isSidechain": false,
  "parentUuid": "previous-message-uuid",
  "sessionId": "session-uuid",
  "timestamp": "2026-03-22T...",
  "version": "2.1.76"
}
```

### Field reference for tool builders

| Field | Purpose | Cost relevance |
|---|---|---|
| `input_tokens` | New context sent to model | Base input price |
| `output_tokens` | Generated response | ~5x input price |
| `cache_creation_input_tokens` | Context being cached | 1.25x or 2x input |
| `cache_read_input_tokens` | Reused cached context | 0.1x input price |
| `ephemeral_5m_input_tokens` | 5-minute cache creation | 1.25x input |
| `ephemeral_1h_input_tokens` | 1-hour cache creation | 2x input |
| `service_tier` | Standard vs enterprise | Different rate limits |
| `speed` | Standard vs fast | Fast = 6x (Opus 4.6) |
| `inference_geo` | Where inference ran | US-only = 1.1x |
| `server_tool_use` | Web search/fetch counts | $10 per 1k searches |
| `uuid` | Per-streaming-chunk ID | NOT a dedup key |
| `requestId` | Per-API-request ID | **Correct dedup key** |
| `message.id` | Per-message ID | 1:1 with requestId |
| `isSidechain` | Subagent vs main thread | Separate for attribution |
| `stop_reason` | null (intermediate) or "end_turn"/"tool_use" (final) | Final chunk has real output_tokens |

### Streaming chunk behavior

A single API response writes 2-10+ JSONL lines, one per content block:

```
Line 1: thinking block   → uuid: "aaa", requestId: "req_123", output_tokens: 9,   stop_reason: null
Line 2: text block       → uuid: "bbb", requestId: "req_123", output_tokens: 10,  stop_reason: null
Line 3: tool_use block   → uuid: "ccc", requestId: "req_123", output_tokens: 269, stop_reason: "tool_use"
```

- `uuid` is unique per line — deduplicating by uuid treats each chunk as a separate response
- `requestId` is shared — deduplicating by requestId correctly groups them as one response
- Input tokens and cache tokens are consistent across chunks
- **Output tokens differ:** intermediate chunks have placeholder values (~1-11), only the final chunk (with `stop_reason != null`) has the real total
- `jq unique_by` keeps the **first** occurrence, so it gets the placeholder output_tokens

**Correct approach:** group by `requestId`, keep the entry with `stop_reason != null`.

### Dataset statistics

| Metric | Value |
|---|---|
| Active days | 77 (of 77 calendar days with data) |
| Sessions | 298 |
| Projects | 10 |
| Main session JSONL files | 169 |
| Subagent JSONL files | 1,168 |
| Total JSONL files | 1,337 |
| Raw assistant JSONL lines | 87,684 |
| Unique API requests (requestId dedup) | 30,746 |
| Streaming chunk ratio | 2.85x |
| Models used | Opus 4.6, Haiku 4.5, Sonnet 4.6, Sonnet 4.5, Opus 4.5 |

---

## Source Code Verification

### ccusage v18.0.10 (TypeScript, 11.8k stars)

**Dedup implementation** — `apps/ccusage/src/data-loader.ts`, line 530:

```typescript
export function createUniqueHash(data: UsageData): string | null {
    const messageId = data.message.id;
    const requestId = data.requestId;
    if (messageId == null || requestId == null) {
        return null;
    }
    return `${messageId}:${requestId}`;
}
```

A `Set<string>` called `processedHashes` tracks seen combinations. Entries with null `message.id` or `requestId` are never deduplicated (always counted).

| Behavior | Status | Impact |
|---|---|---|
| Dedup key: `message.id:requestId` | Correct | Prevents streaming chunk double-counting |
| First-seen-wins (keeps first chunk) | **Wrong** | Undercounts output tokens ~5x ([#888](https://github.com/ryoppippi/ccusage/issues/888), open) |
| Entries with null identifiers | **Not deduped** | Older JSONL entries always counted |
| Scans subagent directories | Yes (via `**/*.jsonl`) | Includes subagent usage |
| Filters isSidechain | **No** | Schema doesn't parse this field |
| 5m vs 1h cache writes | **Not distinguished** | ~19% cost underestimate ([#899](https://github.com/ryoppippi/ccusage/issues/899), open) |
| Fast mode pricing (6x) | Yes | Added March 2026 |
| Tiered pricing (>200k) | Yes | Supports above-200k rates |
| Session-level dedup | **No** | `loadSessionUsageById` has no dedup |

### claudelytics v0.5.2 (Rust, 70 stars)

**Token aggregation** — `src/models.rs`, line 57:

```rust
pub fn total_tokens(&self) -> u64 {
    self.input_tokens + self.output_tokens +
    self.cache_creation_tokens + self.cache_read_tokens
}
```

| Behavior | Status | Impact |
|---|---|---|
| Dedup | **None** | `UsageRecord` doesn't parse uuid, requestId, or message.id |
| "Dedup" keyword search | Zero hits in Rust source | Confirmed structurally impossible |
| Total tokens formula | input + output + cache_read + cache_creation | Cache reads inflate number by orders of magnitude |
| Scans subagent directories | Yes (WalkDir, no depth limit) | Includes all nested files |
| Streaming chunk handling | **None** | Every JSONL line with usage gets counted |
| Type filtering | **None** | Schema doesn't include `type` field |

### `/stats` (Claude Code built-in)

**Verified from `~/.claude/stats-cache.json`:**

```
Total tokens = inputTokens + outputTokens
```

| Field | Value | In "Total tokens"? |
|---|---|---|
| inputTokens | 1,082,937 | Yes |
| outputTokens | 8,279,640 | Yes |
| **Sum** | **9,362,577 ≈ 9.4M** | **Yes — exact match** |
| cacheReadInputTokens | 5,046,513,967 | No |
| cacheCreationInputTokens | 234,307,960 | No |

`stats-cache.json` also contains `dailyModelTokens` with per-day, per-model breakdowns. Summing all `tokensByModel` entries = 9,362,577 — confirming the formula.

### ccost v0.2.0 (Rust, 6 stars, abandoned)

| Behavior | Status |
|---|---|
| Dedup key: `message.id + requestId` | Correct (hash-prefixed: "req:", "session:") |
| Fallback: `message.id + sessionId` | Yes (when requestId absent) |
| Which chunk kept | Unknown — predates thinking blocks |
| 5m vs 1h cache writes | Not distinguished |
| Subagent scanning | No |
| isSidechain filtering | No |
| Last commit | June 21, 2025 |

---

## Dedup Strategy Comparison

All strategies applied to the same dataset (1,337 files, 87,684 raw assistant lines):

| Strategy | Unique entries | Input tokens | Output tokens | In+Out |
|---|---|---|---|---|
| No dedup (raw lines) | 87,684 | — | — | massively inflated |
| `uuid` (jq script) | 34,806 | 564,560 | 5,656,160 | 6,220,720 |
| **`requestId` (correct)** | **17,698** | **175,022** | **3,731,324** | **3,906,346** |
| `message.id` | 17,737 | 175,022 | 3,731,324 | 3,906,346 |

Note: `requestId` and `message.id` produce identical results — they are 1:1 across all sampled data.

### With subagent/sidechain separation (requestId dedup)

| Category | Requests | Input | Output | In+Out |
|---|---|---|---|---|
| All | 30,746 | 1,137,873 | 6,120,448 | 7,258,321 |
| Main thread only | 14,555 | 135,435 | 2,353,601 | 2,489,036 |
| Subagent only | 16,191 | 1,002,438 | 3,766,847 | 4,769,285 |

### Per-model breakdown (requestId dedup, all files)

| Model | Requests | Input | Output | Cache Read | Cache Write |
|---|---|---|---|---|---|
| Opus 4.6 | 23,078 | 508,793 | 5,045,798 | 2,304,573,999 | 83,429,791 |
| Haiku 4.5 | 7,134 | 608,866 | 1,060,818 | 402,681,376 | 32,470,119 |
| Sonnet 4.6 | 534 | 20,214 | 13,832 | 23,919,789 | 2,982,040 |

---

## Pricing Reference

Source: [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) (verified 2026-03-22)

### Per-model rates ($ per million tokens)

| Model | Input | 5m Cache Write | 1h Cache Write | Cache Read | Output |
|---|---|---|---|---|---|
| Opus 4.6 | $5.00 | $6.25 | $10.00 | $0.50 | $25.00 |
| Opus 4.5 | $5.00 | $6.25 | $10.00 | $0.50 | $25.00 |
| Sonnet 4.6 | $3.00 | $3.75 | $6.00 | $0.30 | $15.00 |
| Sonnet 4.5 | $3.00 | $3.75 | $6.00 | $0.30 | $15.00 |
| Haiku 4.5 | $1.00 | $1.25 | $2.00 | $0.10 | $5.00 |

### Pricing multipliers

| Factor | Multiplier | Notes |
|---|---|---|
| 5-minute cache write | 1.25x base input | Default cache tier |
| 1-hour cache write | 2x base input | Extended cache |
| Cache read (hit) | 0.1x base input | Massive discount |
| Fast mode (Opus 4.6) | 6x all rates | Beta |
| Data residency (US-only) | 1.1x all rates | Opus 4.6+ |
| Long context (>200k input) | 2x input, 1.5x output | Sonnet 4.5/4 only |
| Batch API | 0.5x all rates | Async processing |

### Cost analysis from our dataset

| Model | Real cost (cache-aware) | Naive cost (all @ input rate) |
|---|---|---|
| Opus 4.6 | $2,059 | $11,954 |
| Haiku 4.5 | $96 | $437 |
| Sonnet 4.6 | $19 | $70 |
| Others | $10 | $25 |
| **Total** | **$2,184** | **$12,487 (5.7x)** |

Worst case (all tokens at output rate): **$62,433** (29x overcounting).

---

## Format Evolution Timeline

### Phase 1: The Simple Era (pre-June 2025)
JSONL files had a `costUSD` field. One line = one message = one cost.

### Phase 2: costUSD Removed (June 2025, v1.0.9)
[ccusage #4](https://github.com/ryoppippi/ccusage/issues/4): Tools pivoted to token-based cost calculation via LiteLLM.

### Phase 3: Thinking Blocks (mid-2025)
One response became 3-6+ JSONL lines (thinking, text, tool_use). Each has unique `uuid`, shared `requestId`. **Counting broke silently.**

### Phase 4: Subagents (mid-2025)
Agent tool introduced, writing to `subagents/` directories. [ccusage #313](https://github.com/ryoppippi/ccusage/issues/313): tools didn't scan these. Users [hit limits while tools showed plenty of headroom](https://github.com/ryoppippi/ccusage/issues/313).

### Phase 5: Output Token Bug Surfaced (Feb 2026)
[Claude Code #22686](https://github.com/anthropics/claude-code/issues/22686): intermediate chunks have placeholder output_tokens. Known since [#10259](https://github.com/anthropics/claude-code/issues/10259) (mid-2025).

### Phase 6: Cache Pricing Split (2025-2026)
Two tiers introduced: 5-minute (1.25x) and 1-hour (2x). JSONL includes both. No tool distinguishes them ([ccusage #899](https://github.com/ryoppippi/ccusage/issues/899)).

---

## Verification Results

Each claim was independently verified by a separate analysis agent against raw data:

| Claim | Verdict | Method |
|---|---|---|
| Streaming chunks share requestId | **PASS** | 3 session files, 2-6 chunks per requestId |
| Intermediate chunks have placeholder output_tokens | **PASS** | ~8-11 on non-final vs real values on final |
| uuid overcounts vs requestId (2-6x) | **PASS** | 6x overcounting demonstrated; 2.85x corpus average |
| requestId and message.id are 1:1 | **PASS** | All sampled data, no exceptions |
| Cache read = ~95.8% of total | **PLAUSIBLE** | 0% on first turn, 98% on subsequent; aggregate plausible |
| `unique_by(.uuid)` is wrong | **PASS** | 6x overcounting + wrong output_tokens |
| isSidechain clean split | **PASS** | 11 files (6 subagent, 5 main), no exceptions |
| `/stats` = input + output only | **PASS** | stats-cache.json math matches exactly |
| ccusage first-seen-wins bug | **PASS** | Source code confirmed, matches [#888](https://github.com/ryoppippi/ccusage/issues/888) |
| claudelytics zero dedup | **PASS** | Source code: no HashSet, no dedup logic |

---

## Reproduction Scripts

### Correct dedup count (Python)

```python
import json, glob, os

files = glob.glob(os.path.expanduser('~/.claude/projects/**/*.jsonl'), recursive=True)
by_request = {}
for f in files:
    with open(f) as fh:
        for line in fh:
            try:
                d = json.loads(line)
            except:
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

### Incorrect jq approach (for comparison)

```bash
cat ~/.claude/projects/*/*.jsonl | \
jq -R 'fromjson? | .. | objects | select(.usage) | \
  {uuid: (.uuid // .id), in: (.usage.input_tokens // 0), out: (.usage.output_tokens // 0)}' | \
jq -s 'unique_by(.uuid) | {
  total_input: (map(.in) | add // 0),
  total_output: (map(.out) | add // 0),
  total_combined: ((map(.in) | add // 0) + (map(.out) | add // 0))
}'
```

Problems: overcounts ~1.6x (uuid is per-chunk), misses subagents (no recursive glob), gets wrong output_tokens (keeps first/placeholder value).

---

## Remaining Open Questions

- How do compacted sessions (`/compact`, `/clear`) affect JSONL structure and dedup?
- What are `<synthetic>` model messages? (65 found in dataset)
- How does context window overflow/truncation affect logged usage data?
- Does Anthropic's internal billing match the JSONL usage objects exactly?

---

## Sources

### GitHub Issues (ccusage)
- [#888: Output tokens undercounted ~5x (first-seen-wins)](https://github.com/ryoppippi/ccusage/issues/888)
- [#899: 5m vs 1h cache writes not distinguished](https://github.com/ryoppippi/ccusage/issues/899)
- [#389: Potential double counting of tokens](https://github.com/ryoppippi/ccusage/issues/389)
- [#313: Subagent token tracking missing](https://github.com/ryoppippi/ccusage/issues/313)
- [#288: Live token count incorrect](https://github.com/ryoppippi/ccusage/issues/288)
- [#4: costUSD field removed](https://github.com/ryoppippi/ccusage/issues/4)

### GitHub Issues (Claude Code)
- [#24147: Cache read tokens consume 99.93% of quota](https://github.com/anthropics/claude-code/issues/24147)
- [#22686: Output tokens incorrectly recorded in JSONL](https://github.com/anthropics/claude-code/issues/22686)
- [#22575: Context token count incorrect from first chunk](https://github.com/anthropics/claude-code/issues/22575)
- [#10259: Output token usage in logs incorrect](https://github.com/anthropics/claude-code/issues/10259)
- [#16856: Excessive token usage 4x faster](https://github.com/anthropics/claude-code/issues/16856)

### Tools
- [ccusage](https://github.com/ryoppippi/ccusage) — 11.8k stars, TypeScript
- [claudelytics](https://github.com/nwiizo/claudelytics) — 70 stars, Rust
- [ccost](https://github.com/carlosarraes/ccost) — 6 stars, Rust

### Official
- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

### Community
- [HN: Excessive token usage in Claude Code](https://news.ycombinator.com/item?id=47096937)
- [The Register: Claude devs complain about usage limits](https://www.theregister.com/2026/01/05/claude_devs_usage_limits/)
