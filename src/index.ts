import { registerTool } from "@/tools/definition.ts";
import { writeTool } from "@/tools/write.ts";
import { readTool } from "@/tools/read.ts";
import { bus } from "@/ui/events.ts";
import { AgentLoop } from "@/agent/agent-loop.ts";
import { App } from "@/ui/app.tsx";

const MODEL = process.env.MODEL ?? "north-mini-code:free";

registerTool(writeTool);
registerTool(readTool);

const agentLoop = new AgentLoop({ bus, model: MODEL });
const app = new App({ bus, model: MODEL });

await app.start();
agentLoop.start();
