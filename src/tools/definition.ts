import type { Tool, ToolSet } from "ai";

export type ToolDefinition = {
	name: string;
	description: string;
};

const registry: ToolSet = {};

export function registerTool(name: string, tool: Tool): void {
	registry[name] = tool;
}

export function getTool(name: string): Tool | undefined {
	return registry[name];
}

export function getTools(): ToolSet {
	return registry;
}

export function getToolDefinitions(): ToolDefinition[] {
	return Object.entries(registry).map(([name, tool]) => ({
		name,
		description:
			tool && typeof tool.description === "string" ? tool.description : "",
	}));
}
