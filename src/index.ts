import { bashTool } from "@/tools/bash.ts";
import { registerTool } from "@/tools/definition.ts";
import { editTool } from "@/tools/edit.ts";
import { grepTool } from "@/tools/grep.ts";
import { readTool } from "@/tools/read.ts";
import { writeTool } from "@/tools/write.ts";
import { bus } from "@/ui/events.ts";
import { AgentLoop } from "@/agent/agent-loop.ts";
import { App } from "@/ui/app.tsx";

const MODEL = process.env.MODEL ?? "z-ai/glm-5.3-flash";

registerTool(bashTool);
registerTool(editTool);
registerTool(grepTool);
registerTool(writeTool);
registerTool(readTool);

const agentLoop = new AgentLoop({ bus, model: MODEL });
const app = new App({ bus, model: MODEL });

await app.start();
agentLoop.start();
