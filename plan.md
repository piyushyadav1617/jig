# Coding Agent — Build Plan

## Vision

A CLI coding agent (like Claude Code / OpenCode lite) that takes a task prompt, invokes LLM in a loop, and acts on the filesystem using tools. Runs in your terminal, operates on your repo.

## Architecture

```
┌──────────────────────────────────────────────┐
│                  Agent Loop                    │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│  │  User     │──>│  LLM     │──>│  Tool    │  │
│  │  Input    │   │  Call    │   │  Exec    │  │
│  └──────────┘   └──────────┘   └──────────┘  │
│                      │              │          │
│                      v              v          │
│               ┌──────────┐   ┌──────────┐     │
│               │  Context  │   │  Memory  │     │
│               │  Builder │   │  (Chat   │     │
│               │          │   │  History)│     │
│               └──────────┘   └──────────┘     │
│                      │                        │
│                      v                        │
│               ┌──────────┐                    │
│               │Guardrails│                    │
│               │(pre/post)│                    │
│               └──────────┘                    │
└──────────────────────────────────────────────┘
```

## Phases

### Phase 0 — Skeleton (single file: `index.ts`)

One file, minimal wiring:

- **LLM client** — call OpenRouter API (model name + API key from env).
- **Chat loop** — read stdin, stream LLM response, repeat.
- **System prompt** — instruct the model to respond with structured tool calls.
- **Tool scaffold** — a `Tool` interface and a simple registry. Start with `read`, `write`, `bash`.
- **Tool result loop** — parse tool calls from LLM output, execute tools, feed results back.

Goal: `bun run index.ts` starts a REPL where you can ask it to read files or run commands.

### Phase 1 — Tools (separate module `tools/`)

Extract tools into their own modules. Add:
- `glob`, `grep`, `edit` (file patching)
- `Task` (sub-agent delegation)
- `webSearch`, `webFetch`

Tool schema: JSON Schema for each tool so the LLM gets a spec.

### Phase 2 — Memory & Context

- **Chat history** — structured message log with token budget management (truncate oldest when exceeding limit).
- **Context builder** — assemble system prompt + recent history + file contents into the LLM request.
- **Token counting** — rough `tiktoken` or heuristic to stay under model limit.

### Phase 3 — Guardrails

- **Pre-tool validation** — reject dangerous commands (e.g., `rm -rf /`) before execution.
- **Post-tool filtering** — strip secrets from responses before feeding back to LLM.
- **Confirmation prompts** — ask user before destructive operations.

### Phase 4 — Models & Configuration

- Switch model via OpenRouter (`--model anthropic/claude-sonnet-4`, etc.).
- Config file (`opencode.json` equivalent) — model, API key, tool allowlist.
- `--model`, `--temperature` CLI flags.

### Phase 5 — Polish

- Streaming output to terminal.
- Colored / formatted output.
- Error recovery (LLM retries on malformed tool calls).
- Cost tracking per session.

## Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Runtime | Bun | Already set up, fast TS execution, built-in fetch |
| LLM provider | OpenRouter (`https://openrouter.ai/api/v1`) | Single key to many models; OpenAI-compatible API |
| Tool calling | Structured JSON in LLM response (no function-calling API) | Simple, portable, no vendor lock-in |
| State | In-memory + optional file persistence | Avoids DB complexity at this stage |
| Single file start | Yes (`index.ts`) | Faster iteration, refactor later |

## First Session: Phase 0

1. Define types (`Tool`, `Message`, `ToolCall`).
2. Write `LLM` client (fetch wrapper).
3. Write `read`, `write`, `bash` tool implementations.
4. Write the agent loop (read → LLM → parse → execute → repeat).
5. Write system prompt explaining the tool format.
