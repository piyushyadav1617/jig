import type { ToolDefinition } from "@/tools/definition.ts";

export interface BuildSystemPromptOptions {
	tools: ToolDefinition[];
	cwd: string;
}

export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
	const { tools, cwd } = options;
	const promptCwd = cwd.replace(/\\/g, "/");

	const toolList =
		tools.length > 0
			? tools.map((t) => `- ${t.function.name}: ${t.function.description}`).join("\n")
			: "(none)";

	const prompt =  `You are an expert coding assistant operating inside jig, a terminal-based coding agent. You help users by reading files, writing files, running commands, and editing code.

Available tools:
${toolList}

Guidelines:
- When a task requires creating or modifying files, call the appropriate tool instead of just describing what to do.
- After receiving tool results, briefly confirm the outcome and continue if more steps are needed.
- Be concise. Do not output unnecessary explanations.
- Use relative paths from the current working directory unless an absolute path is needed.

Current working directory: ${promptCwd}`;
return prompt
}
