import { bashTool } from "@/tools/bash.ts";
import { registerTool } from "@/tools/definition.ts";
import { editTool } from "@/tools/edit.ts";
import { grepTool } from "@/tools/grep.ts";
import { readTool } from "@/tools/read.ts";
import { writeTool } from "@/tools/write.ts";
import { bus } from "@/events/bus";
import { AgentLoop } from "@/agent/agent-loop.ts";
import { App } from "@/tui/app.tsx";
import { ModelManager } from "@/api/model-manager.ts";

const modelManager = new ModelManager();
const MODEL = modelManager.defaultModel;

registerTool("bash", bashTool);
registerTool("edit", editTool);
registerTool("grep", grepTool);
registerTool("write", writeTool);
registerTool("read", readTool);

const agentLoop = new AgentLoop({ bus, model: MODEL, modelManager });
const app = new App({
	bus,
	model: MODEL,
	modelManager,
	onModelChange: (model) => agentLoop.setModel(model),
});

await app.start();
agentLoop.start();
