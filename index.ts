import { streamModel, type ModelMessage } from "./model.ts";

const MODEL = process.env.MODEL ?? "north-mini-code:free";

const messages: ModelMessage[] = [];

async function prompt(): Promise<string> {
  process.stdout.write("\n> ");
  const stdin = Bun.stdin.stream();
  const reader = stdin.getReader();
  const decoder = new TextDecoder();
  let line = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    line += decoder.decode(value);
    if (line.includes("\n")) {
      reader.releaseLock();
      return line.slice(0, line.indexOf("\n"));
    }
  }
  reader.releaseLock();
  return line;
}

async function chat(): Promise<void> {
  console.log(`Coding agent (model: ${MODEL})`);
  console.log('Type "exit" or "quit" to leave. "clear" to reset history.\n');

  while (true) {
    const input = (await prompt()).trim();
    if (!input) continue;
    if (input === "exit" || input === "quit") {
      console.log("bye.");
      break;
    }
    if (input === "clear") {
      messages.length = 0;
      console.log("(history cleared)");
      continue;
    }

    messages.push({ role: "user", content: input });

    process.stdout.write("\n");
    let assistant = "";
    try {
      for await (const chunk of streamModel({ model: MODEL, messages })) {
        assistant += chunk;
        process.stdout.write(chunk);
      }
    } catch (err) {
      console.error(`\n[error] ${(err as Error).message}`);
      messages.pop();
      continue;
    }

    messages.push({ role: "assistant", content: assistant });
    process.stdout.write("\n");
  }
}

await chat();
