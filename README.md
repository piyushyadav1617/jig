<p align="center">
  <img src="./logo.png" alt="jig logo" width="200" />
</p>

# jig

An AI coding agent for your terminal. Give it a task and watch it read files,
make changes, and run commands in your project.

[Website / demo ↗](https://piyushyadav1617.github.io/jig/)

## Install

On macOS or Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/piyushyadav1617/jig/main/install.sh | sh
```

## Use

Open your project and start jig:

```sh
cd your-project
jig
```

Type what you need and press Enter. For example:

- “Explain how this project works.”
- “Fix the failing tests.”
- “Add a health check endpoint.”

Use the included model, or type `/providers` to connect your own provider with
an API key. Review the changes and ask a follow-up.

## Commands

| Command | What it does |
| --- | --- |
| `/models` | Choose a model |
| `/providers` | Connect a provider |
| `/clear` | Start a fresh conversation |
| `/esc` | Stop the current task |
| `/exit` | Close jig |

You can also press **Esc** to stop a task. Changes already made are kept.

## Development

Requires [Bun](https://bun.sh/).

```sh
bun install
bun run dev
```

Run checks with `bun run typecheck` and `bun test`.
