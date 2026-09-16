<p align="center">
  <img src="./logo.png" alt="jig logo" width="240" />
</p>

# jig

`jig` is a terminal coding agent that uses an LLM to inspect and modify a
repository. It can read, search, edit, and write files, and run shell commands
through a streaming conversation.

> Experimental software. Run jig only in a working directory where you are
> comfortable allowing an AI agent to operate.

## Requirements

- `curl` on macOS or Linux
- An API key for [OpenAI](https://platform.openai.com/),
  [Anthropic](https://console.anthropic.com/), or
  [OpenRouter](https://openrouter.ai/)

## Install

```sh
curl -fsSL https://raw.githubusercontent.com/piyushyadav1617/jig/main/install.sh | sh
```

## Run

```sh
jig
```

For development from the source repository, install
[Bun](https://bun.sh/) and run:

```sh
bun install
bun run start

# Watch for source changes
bun run dev
```

On first use, enter `/providers` to connect a provider with an API key. Keys
are stored in `~/.config/jig/auth.json`. Set `JIG_AUTH_FILE` to use a different
file, or set `XDG_CONFIG_HOME` to change the config directory.

The default model is `openrouter/inclusionai/ling-3.0-flash-fin:free`. Override
it with `MODEL`:

```bash
MODEL=openai/gpt-5 jig
```

## Commands

| Command | Action |
| --- | --- |
| `/providers` | Connect or switch providers |
| `/models` | Choose a model |
| `/clear` | Clear conversation history |
| `/exit` | Exit jig |

`exit` and `quit` are also supported as aliases for `/exit`.

## Tools

- `read` Read a file
- `write` Create or replace a file
- `edit` Replace an exact string in a file
- `grep` Search files with a regular expression
- `bash` Run a shell command

## Development

```bash
bun run typecheck
```
