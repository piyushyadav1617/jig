<p align="center">
  <img src="./logo.png" alt="jig logo" width="240" />
</p>

# jig

`jig` is a terminal coding agent that uses an LLM to inspect and modify a
repository. It can read files, search a codebase, edit files, write new files,
and run shell commands through a streaming OpenRouter conversation.

> jig is experimental software. Run it only in a working directory where you
> are comfortable allowing an AI agent to operate.

## Features

- Interactive terminal UI built with [OpenTUI](https://github.com/anomalyco/opentui)
- Streaming model responses through [OpenRouter](https://openrouter.ai/)
- Multi-step tool execution for coding tasks
- File reading, writing, exact-string editing, and regular-expression search
- In-memory conversation history for the current session
- `clear`, `exit`, and `quit` commands

## Requirements

- [Bun](https://bun.sh/) 1.3 or newer
- An OpenRouter API key

## Installation

Clone the repository and install dependencies:

```bash
bun install
```

Set the required environment variable:

```bash
export OPENROUTER_API_KEY="your-api-key"
```

You can also put configuration in a `.env` file at the project root:

```dotenv
OPENROUTER_API_KEY=your-api-key
MODEL=north-mini-code:free
```

`MODEL` is optional. The default model is `north-mini-code:free`.

## Usage

Start jig with:

```bash
bun run start
```

Start in watch mode during development:

```bash
bun run dev
```

Then enter a task at the prompt, for example:

```text
Read src/index.ts and explain how the application starts.
```

Built-in input commands:

| Command | Action |
| --- | --- |
| `clear` | Clear the current conversation history |
| `exit` | Exit jig |
| `quit` | Exit jig |

## Available Tools

| Tool | Description |
| --- | --- |
| `read` | Read a file and return its contents |
| `write` | Create or replace a file, including missing parent directories |
| `edit` | Replace an exact string in an existing file |
| `grep` | Search files with a regular expression |
| `bash` | Run a shell command and return its exit code, stdout, and stderr |

## How It Works

Each user request is handled as one turn. A turn can contain multiple model
steps:

```text
User request
    |
    v
Model response -> Tool call -> Tool result
    ^                          |
    |__________________________|
    |
    v
Final model response
```

The agent keeps the conversation in memory, sends the current messages and tool
definitions to the model, executes requested tools, and feeds each result back
into the next model step.

## Project Structure

```text
src/
  agent/           Agent loop and conversation state
  providers/       LLM provider adapters
  tools/           Tool implementations and registry
  ui/              OpenTUI application and components
  system-prompt.ts System prompt construction
logo.png           Project logo
plan.md            Development roadmap
```

## Development Commands

| Command | Description |
| --- | --- |
| `bun install` | Install dependencies |
| `bun run start` | Run jig |
| `bun run dev` | Run jig with file watching |

## Safety Notes

The current prototype gives the model access to shell execution and filesystem
tools. Commands and paths are not yet fully sandboxed, and destructive actions
do not have an approval prompt. Use a trusted repository and review changes
before committing them.

## Roadmap

Planned improvements include safer tool permissions, workspace path validation,
context compaction, cancellation and timeouts, provider abstraction, retries,
cost tracking, and persistent session history.