export interface Tool {
	name: string;
	description: string;
	parameters: Record<string, unknown>;
	execute: (args: Record<string, unknown>) => Promise<string>;
}

export type ToolDefinition = {
	type: "function";
	function: {
		name: string;
		description: string;
		parameters: Record<string, unknown>;
	};
};

const registry = new Map<string, Tool>();

export function registerTool(tool: Tool): void {
	registry.set(tool.name, tool);
}

export function getTool(name: string): Tool | undefined {
	return registry.get(name);
}

export function getTools(): Tool[] {
	return [...registry.values()];
}

export function getToolDefinitions(): ToolDefinition[] {
	return getTools().map((t) => ({
		type: "function" as const,
		function: {
			name: t.name,
			description: t.description,
			parameters: t.parameters,
		},
	}));
}
