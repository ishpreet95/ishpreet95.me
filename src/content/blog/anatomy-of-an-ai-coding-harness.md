---
title: "The Space Between You and the Model"
description: "How much do you really know about the AI tools that sit between you and the models you use? Look a little closer, and you may be surprised by what’s there. Here’s what I learned."
date: 2026-04-19
tags: ["ai-harness", "ai-engineering", "developer-tools", "research"]
draft: false
---

I used to think Claude Code was a smart app - a nice UI with plugins wrapped around a powerful model. The model does the thinking, the app makes it pretty. Simple enough.

Then Claude Code's source code leaked - 512,000 lines of TypeScript, exposed via npm source maps. Theo's ["What even is an 'agent harness'?"](https://www.youtube.com/watch?v=I82j7AzMU80) broke down what Claude Code, Codex, and Cursor actually are under the hood. Thorsten Ball showed you can [build one in 400 lines of Go](https://ampcode.com/notes/how-to-build-an-agent). Mihail Eric went further - [200 lines of Python](https://www.mihaileric.com/The-Emperor-Has-No-Clothes/).

The core of Claude Code is a while loop. Not a neural network doing reasoning about reasoning. A while loop that calls the model, checks if it wants to use a tool, runs the tool, and calls the model again.

**The model forgets everything between turns.** Every time you send a message, the harness replays the entire conversation from scratch - system prompt, every previous message, every tool result. The model doesn't remember what happened two seconds ago. It processes the full history fresh on every turn.

I was underwhelmed, honestly. Billions of dollars, and the architecture is a while loop talking to a stateless API. But that simplicity is the point - and it's what makes these tools possible to understand and to build yourself.

I studied five harnesses: Claude Code, Codex CLI, OpenCode, Aider, and ForgeCode. They all look different on the surface. Underneath, they're all making the same five decisions.

---

## The loop

Every AI coding tool is a **harness** - a program that sits between you and a language model, managing the conversation, running tools on the model's behalf, and applying changes to your code.

The entire core in pseudocode:

```
response = llm_call(system_prompt + messages)

while response.stop_reason == "tool_use":
    result = execute(response.tool_call)
    messages.append(result)
    response = llm_call(system_prompt + messages)

print(response.text)
```

The model either wants to use a tool (keep looping) or wants to talk to the user (stop). Everything else - terminal UI, permissions, context management, sub-agents - is built on top of this.

Claude Code implements this as a single-threaded master loop. No DAGs, no classifiers, no routing. Anthropic's finding: a single powerful model in a simple loop outperforms elaborate orchestration.

ForgeCode, #1 on Terminal-Bench, takes the opposite approach - its loop includes pre-checking, self-critique, and post-processing phases wrapped around the core cycle. Aider doesn't use structured tool calling at all - the model outputs edit instructions as formatted text, and Aider parses them.

Same pattern. Radically different implementations.

---

## How does the model edit your code?

The most consequential choice a harness builder makes.

**Exact string matching** - Claude Code and OpenCode both use this. The model specifies an `old_string` to find and a `new_string` to replace it with. Must be unique in the file or the edit fails.

```json
{
  "tool": "Edit",
  "input": {
    "file_path": "/src/server.ts",
    "old_string": "const port = 3000;",
    "new_string": "const port = process.env.PORT || 3000;"
  }
}
```

No line numbers to get wrong. Fails loudly on ambiguity. The model must read the file first - which forces good behavior.

**Search/Replace blocks** - Aider's approach. The model outputs `<<<<<<< SEARCH` / `>>>>>>> REPLACE` markers directly in its response. No structured tool calling - which means Aider works with any LLM, even those without function calling support.

**Unified diffs** - More token-efficient but fragile. Line numbers drift if the file changed since the model last read it. Aider found diffs make models 3x less "lazy" than whole-file edits.

**Whole file replacement** - Simplest and most wasteful. The model outputs the entire file for a one-line change. Hard to get wrong, but burns tokens.

OpenCode adds a clever twist: it **auto-runs formatters** (Prettier, Black, gofmt) after every edit and feeds the formatted result back to the model. The model focuses on the logical change; the harness handles style.

| Strategy              | Token cost | Reliability | Used by               |
| --------------------- | ---------- | ----------- | --------------------- |
| Exact string match    | Medium     | High        | Claude Code, OpenCode |
| Search/Replace blocks | Medium     | High        | Aider                 |
| Unified diff          | Low        | Medium      | Aider (option)        |
| Whole file            | Very high  | High        | Fallback for most     |

---

## What tools does the model get?

A harness needs four capabilities at minimum: read files, write/edit files, run commands, search code. What you add beyond that defines the harness.

**Claude Code** - 8 native tools: `Bash`, `Read`, `Write`, `Edit`, `Grep`, `Glob`, `Task` (sub-agent spawning), `TodoWrite`. Follows a **"Search, Don't Index"** philosophy - Anthropic benchmarked semantic embeddings against ripgrep and found fast text search with an intelligent agent beats pre-computed vector indexes.

**OpenCode** - 13 tools, including a unique **LSP tool** giving the model direct access to `goToDefinition`, `findReferences`, `hover`, `callHierarchy`. The model follows type definitions and finds callers semantically, not by grepping. Neither Claude Code nor Codex CLI has this.

**Aider** - no structured tool calling. Supplements its text-based edit flow with a **repo map** - a tree-sitter outline of the codebase ranked by PageRank on the symbol graph. Codebase awareness without loading full files.

**ForgeCode** - 8 tools (`read`, `write`, `patch`, `shell`, `search`, `fetch`, `remove`, `undo`) plus a **tool-call correction layer** that catches model-specific errors before dispatch. The model makes a mistake; the harness silently fixes it.

**MCP (Model Context Protocol)** is becoming the standard for tool extensibility. Claude Code, OpenCode, ForgeCode, and Codex CLI all support it - external servers expose tools via JSON-RPC. Build once, works across harnesses.

---

## The model forgets everything. Now what?

Every turn, the harness replays the full conversation. Growth is quadratic - total tokens across N turns is roughly N(N+1)/2. At frontier pricing, a 14-token question costs \$0.0018 at turn 1 and **$2.41 at turn 260**. A 1,339x increase.

Each harness solves this differently:

**Claude Code: Compaction + prompt caching.** At ~60% of the context window, Claude Code compacts - summarizing older messages while preserving active files and recent actions. The leaked source revealed a 4-stage cascade: snip oversized tool outputs, microcompact message pairs, context collapse, and full autocompact.

The real trick is **prompt caching**. System prompt + tool definitions don't change between turns, so Anthropic caches the KV-cache server-side. **Cached tokens cost 90% less.** An 11.5-second prompt drops to 2.4 seconds. The cache expires after 5 minutes of inactivity, so everything in Claude Code's architecture maximizes prefix stability - CLAUDE.md is injected as a `<system-reminder>` tag on messages, not in the system prompt itself. Different projects would break the cache.

**ForgeCode: Parallel compaction.** Compaction runs alongside the main request using a cheaper model (Gemini Flash) while the frontier model handles the task. Three triggers: token threshold, message threshold, turn threshold. Claims 10x conversation extension.

**Aider: Repo maps.** Rather than compacting history, Aider minimizes what goes in. Its tree-sitter outline with PageRank relevance fits in ~1K tokens but gives enough structural understanding for the model to navigate large codebases.

**OpenCode: Two-phase pruning.** Strips old tool outputs first (the biggest bloat). If still over budget, runs LLM summarization focused on: Goal, Instructions, Discoveries, Accomplished.

**Codex CLI: Native model compaction.** GPT-5.4 has built-in compaction, so Codex CLI delegates the problem to the model. It also saves state as JSONL rollout files - you can resume or fork conversations.

---

## How do you keep it safe?

You're giving an AI the ability to read files, write code, and run shell commands. The permission system is the guardrail.

**Claude Code: Application-level hooks.** Three-tier permissions - deny, ask, allow - first match wins. The real enforcement is **hooks**: shell scripts at the harness level before and after every tool call. Unlike prompt-based rules (which the model can forget), hooks are guaranteed to run.

**Codex CLI: Kernel-level sandboxing.** The defining differentiator. macOS uses Apple Seatbelt; Linux uses Landlock + seccomp. OS-level policies restrict system calls - the agent **cannot** write outside the workspace or access the network unless policy permits. No application hook can match this because enforcement happens in the kernel.

**OpenCode: Permissions as UX.** Same allow/ask/deny model, but explicitly a "UX feature, not a security boundary." No OS-level sandboxing.

**Aider: Git is the undo button.** Every edit is automatically a commit. Model breaks something? `git revert`. No permission system needed - every action is reversible by design.

**ForgeCode: DoomLoop detection.** A DoomLoopDetector identifies when the model is stuck retrying the same failing edit and breaks the cycle. Aider caps this with `max_reflections=3`.

The biggest real threat isn't the model going rogue - it's **indirect prompt injection**. Malicious instructions in code files or READMEs can trick the model into harmful actions. Kernel sandboxing (Codex CLI) is the strongest defense. Hooks (Claude Code) are next. Git undo (Aider) is a safety net, not prevention.

---

## What stops it from looping forever?

The while loop has an obvious failure mode: what if the model never stops?

ForgeCode's **DoomLoopDetector** watches for repeated failure patterns. Aider's **`max_reflections=3`** caps autonomous retries - three failed attempts, then it asks the user. Claude Code relies on the model's judgment plus compaction. OpenCode uses token budget limits.

**Production harnesses need both a soft stop** (model decides it's done) **and a hard stop** (harness forces termination). Relying only on the model's judgment is how you get infinite loops and surprise API bills.

---

## Beyond the five decisions

Three more areas that shape the developer experience.

### Sub-agents: splitting the work

**Claude Code** spawns sub-agents via a `Task` tool - each gets its own context window. A sub-agent might burn 100K tokens exploring a codebase internally, but the parent only sees a 500-token summary. This is how harnesses handle tasks that would overflow a single context window.

**ForgeCode** has three agents: Forge (implementation), Muse (planning, read-only), and Sage (codebase research, invoked automatically behind the scenes). User switches Forge/Muse manually; Sage is invisible.

**Aider** doesn't use sub-agents. Its Architect/Editor split is sequential - one model plans, another edits. Simpler, can't parallelize.

**OpenCode** has Plan and Build agents, switched with Tab. Plan is read-only; Build has full access. No automatic routing.

### System prompts: the harness's personality

**Claude Code** - the most complex. ~50 instructions, 24 tool descriptions, 110+ prompt strings varying by context. CLAUDE.md rules injected as `<system-reminder>` tags to avoid breaking the prompt cache.

**Codex CLI** - uses **AGENTS.md**, an open standard backed by Sourcegraph, OpenAI, Google, Cursor, and Factory. One file, any tool can read it.

**Aider** - system prompt embedded in code. Includes repo map context and edit format instructions.

**ForgeCode** - `forge.yaml` for agent definitions, permissions, and workflow config.

Two harnesses with identical tools but different system prompts behave very differently. The prompt is where the personality lives.

### What they're built with

| Harness         | Language   | UI Framework                     | Notable                                 |
| --------------- | ---------- | -------------------------------- | --------------------------------------- |
| **Claude Code** | TypeScript | React + Ink (custom fork) + Yoga | ~512K lines. Virtual DOM for terminals. |
| **Codex CLI**   | Rust       | ratatui                          | ~95% Rust. Remote TUI mode.             |
| **OpenCode**    | TypeScript | OpenTUI (Zig rendering backend)  | Rewritten from Go + Bubble Tea.         |
| **Aider**       | Python     | Rich                             | Simple output. No TUI framework.        |
| **ForgeCode**   | Rust       | Minimal                          | Sub-50ms startup. LTO-optimized.        |

For building your own, you don't need any of this. A REPL with readline is enough to start.

### The enterprise outlier: Factory's Droid

**Droid** by Factory AI ($1.5B valuation, customers: Morgan Stanley, Ernst & Young) is architecturally different - a **background autonomous agent**. You assign tasks via Jira or GitHub; it works without supervision.

- **Multi-model**: different LLMs for different subtasks
- **HyperCode**: graph-based codebase understanding
- **ByteRank**: RAG for code-context retrieval
- **DroidShield**: static analysis before commits

Droid scores #6 on Terminal-Bench (77.3%) but it's closed-source. I can't verify these claims since the code isn't public. The ideas are worth knowing about - multi-model routing and RAG are patterns you could borrow.

---

## The landscape at a glance

|                  | Claude Code                  | Codex CLI             | OpenCode                    | Aider                 | ForgeCode              |
| ---------------- | ---------------------------- | --------------------- | --------------------------- | --------------------- | ---------------------- |
| **Language**     | TypeScript                   | Rust                  | TypeScript                  | Python                | Rust                   |
| **Loop**         | Single flat while            | Build-verify-fix      | While + Plan/Build          | Architect/Editor      | Multi-phase ReAct      |
| **Edits**        | Exact string match           | Filesystem in sandbox | Exact match + formatters    | Search/replace blocks | patch (str_replace)    |
| **Safety**       | App-level hooks              | Kernel sandboxing     | Permission UX               | Git is undo           | Permissions + DoomLoop |
| **Models**       | Claude only                  | OpenAI primary        | 75+ providers               | Any LLM               | 300+ via OpenRouter    |
| **Context**      | 4-stage compaction + caching | GPT-5.4 native        | Two-phase prune + summarize | Repo maps (PageRank)  | Parallel compaction    |
| **Sub-agents**   | Task tool (isolated)         | No                    | Plan/Build (manual)         | No (dual-model)       | Forge/Muse/Sage        |
| **Config**       | CLAUDE.md                    | AGENTS.md             | In-code                     | In-code               | forge.yaml             |
| **UI**           | React + Ink                  | ratatui               | OpenTUI (Zig)               | Rich                  | Minimal                |
| **MCP**          | Yes                          | Yes                   | Yes                         | No                    | Yes                    |
| **Open source**  | No                           | Yes (Apache 2.0)      | Yes                         | Yes                   | Yes (Apache 2.0)       |
| **GitHub stars** | -                            | ~75k                  | 140k                        | 42k                   | 6k                     |

---

## Do these decisions actually matter?

Terminal-Bench 2.0 is the most rigorous benchmark for terminal AI agents. 89 tasks - compilation, debugging, ML training, security, sysadmin - in Docker containers. Pass or fail.

Selected entries from the [123-entry leaderboard](https://www.tbench.ai/leaderboard/terminal-bench/2.0) (April 2026):

| Rank | Agent        | Model           | Score         |
| ---- | ------------ | --------------- | ------------- |
| 1    | ForgeCode    | GPT-5.4         | 81.8% ± 2.0   |
| 2    | ForgeCode    | Claude Opus 4.6 | 81.8% ± 1.7   |
| 3    | TongAgents   | Gemini 3.1 Pro  | 80.2% ± 2.6   |
| 4    | SageAgent    | GPT-5.3-Codex   | 78.4% ± 2.2   |
| 5    | ForgeCode    | Gemini 3.1 Pro  | 78.4% ± 1.8   |
| 6    | Droid        | GPT-5.3-Codex   | 77.3% ± 2.2   |
| 8    | Simple Codex | GPT-5.3-Codex   | 75.1% ± 2.4   |
| 28   | Codex CLI    | GPT-5.2         | 62.9% ± 3.0   |
| 39   | Claude Code  | Claude Opus 4.6 | 58.0% ± 2.9   |
| 51   | OpenCode     | Claude Opus 4.5 | 51.7%         |
| 56   | Gemini CLI   | Gemini 3 Flash  | 47.4% ± 3.0   |
| -    | Aider        | -               | Not submitted |

**ForgeCode owns 3 of the top 5** - with three different models. It scores 81.8% with both GPT-5.4 and Claude Opus 4.6. The harness ceiling is ~82% regardless of model. **The model isn't the bottleneck.**

**Claude Code at #39 is the surprise.** Opus 4.6 ties for #1 inside ForgeCode (81.8%) but only hits 58.0% in Anthropic's own harness. Nearly 24 points left on the table.

**"Simple Codex" (#8) is not Codex CLI (#28).** OpenAI submitted a benchmark-optimized agent alongside their actual product. The benchmark agent scores 12 points higher. Benchmark agents aren't products.

**Aider isn't on the board.** Millions of installs, [15 billion tokens per week](https://aider.chat/), and no Terminal-Bench submission. The most-used open-source coding agent doesn't chase leaderboards.

**OpenCode barely shows up.** 140k stars, 6.5M monthly users, one submission at #51. Popularity comes from developer experience, not benchmarks.

### Is the leaderboard the true picture?

Grain of salt. The top 5 are within ±2.6 points - statistically indistinguishable. Anthropic showed a 6-point swing from resource allocation alone.

But the real finding: **hold the model constant, change only the harness, and scores swing 20-30 points.** ForgeCode scores 78.4% with Gemini 3.1 Pro; Google's own Gemini CLI scores 47.4% with the same model family. A 31-point gap from harness quality alone. Swapping frontier models within the same harness? About 1-3 points.

**The harness is the bigger lever. By a lot.**

---

### References

- [Theo: "What even is an 'agent harness'?"](https://www.youtube.com/watch?v=I82j7AzMU80) - the video that started this
- [Thorsten Ball: "How to Build an Agent"](https://ampcode.com/notes/how-to-build-an-agent) - 400 lines of Go (Sourcegraph/Amp)
- [Mihail Eric: "The Emperor Has No Clothes"](https://www.mihaileric.com/The-Emperor-Has-No-Clothes/) - 200 lines of Python (Stanford)
- [Terminal-Bench 2.0 Leaderboard](https://www.tbench.ai/leaderboard/terminal-bench/2.0)
- [Anthropic: How the agent loop works](https://platform.claude.com/docs/en/agent-sdk/agent-loop)
- [Anthropic: Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [ForgeCode](https://forgecode.dev/) | [Codex CLI](https://github.com/openai/codex) | [OpenCode](https://opencode.ai/) | [Aider](https://aider.chat/)
- [UC Berkeley: How We Broke Top AI Agent Benchmarks](https://rdi.berkeley.edu/blog/trustworthy-benchmarks-cont/)
