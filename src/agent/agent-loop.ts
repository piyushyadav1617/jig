import {
	streamModel,
	type ModelMessage,
	type ToolCall,
} from "@/providers/openrouter.ts";
import {
	getTool,
	getToolDefinitions,
} from "@/tools/definition.ts";
import { buildSystemPrompt } from "@/system-prompt.ts";
import type { Bus } from "@/ui/events.ts";

export interface AgentLoopOptions {
	bus: Bus;
	model?: string;
	maxTurns?: number;
	cwd?: string;
}

export class AgentLoop {
	private readonly bus: Bus;
	private readonly model: string;
	private readonly maxTurns: number;
	private readonly cwd: string;
	private readonly messages: ModelMessage[] = [];
	private running = false;

	constructor(options: AgentLoopOptions) {
		this.bus = options.bus;
		this.model = options.model ?? process.env.MODEL ?? "";
		this.maxTurns = options.maxTurns ?? 10;
		this.cwd = options.cwd ?? process.cwd();
		this.resetHistory();
		this.bindUserEvents();
	}

	start(): void {
		this.bus.emit("agent:status", { status: "ready" });
	}

	private bindUserEvents(): void {
		this.bus.on("user:input", (input) => {
			void this.handleUserInput(input);
		});
		this.bus.on("user:clear", () => {
			this.resetHistory();
			this.bus.emit("agent:status", { status: "history cleared" });
		});
		this.bus.on("user:exit", () => {
			this.bus.emit("agent:status", { status: "bye" });
		});
	}

	private resetHistory(): void {
		this.messages.length = 0;
		this.messages.push({
			role: "system",
			content: buildSystemPrompt({
				tools: getToolDefinitions(),
				cwd: this.cwd,
			}),
		});
	}

	private async handleUserInput(input: string): Promise<void> {
		if (this.running) return;
		const trimmed = input.trim();
		if (!trimmed) return;

		this.running = true;
		this.bus.emit("agent:turn_start", { input: trimmed });
		this.messages.push({ role: "user", content: trimmed });

		try {
			await this.runStep(0);
		} catch (err) {
			this.messages.pop();
			this.bus.emit("agent:error", {
				error: (err as Error).message,
			});
		} finally {
			this.running = false;
			this.bus.emit("agent:done");
		}
	}

	private async runStep(turn: number): Promise<void> {
		if (turn >= this.maxTurns) {
			this.bus.emit("agent:error", {
				error: `reached max turns (${this.maxTurns}), stopping`,
			});
			this.bus.emit("agent:turn_end", { turn });
			return;
		}

		let assistantText = "";
		const toolCallMap = new Map<
			number,
			{ id: string; name: string; arguments: string }
		>();

		for await (const chunk of streamModel({
			model: this.model,
			messages: this.messages,
			tools: getToolDefinitions(),
		})) {
			if (chunk.type === "text") {
				assistantText += chunk.content;
				this.bus.emit("agent:delta", { content: chunk.content });
			} else {
				for (const tc of chunk.toolCalls) {
					const existing = toolCallMap.get(tc.index) ?? {
						id: "",
						name: "",
						arguments: "",
					};
					if (tc.id) existing.id = tc.id;
					if (tc.name) existing.name = tc.name;
					if (tc.arguments) existing.arguments += tc.arguments;
					toolCallMap.set(tc.index, existing);
				}
			}
		}

		const toolCalls = [...toolCallMap.values()];

		if (toolCalls.length === 0) {
			this.messages.push({ role: "assistant", content: assistantText });
			this.bus.emit("agent:turn_end", { turn });
			return;
		}

		const assistantToolCalls: ToolCall[] = toolCalls.map((tc) => ({
			id: tc.id,
			type: "function" as const,
			function: { name: tc.name, arguments: tc.arguments },
		}));
		this.messages.push({
			role: "assistant",
			content: assistantText,
			toolCalls: assistantToolCalls,
		});

		for (const tc of toolCalls) {
			this.bus.emit("agent:tool_call", {
				id: tc.id,
				name: tc.name,
				arguments: tc.arguments,
			});

			let args: Record<string, unknown> = {};
			try {
				args = tc.arguments ? JSON.parse(tc.arguments) : {};
			} catch {
				args = {};
			}

			const tool = getTool(tc.name);
			let result: string;
			if (!tool) {
				result = `Error: unknown tool "${tc.name}"`;
			} else {
				try {
					result = await tool.execute(args);
				} catch (err) {
					result = `Error: ${(err as Error).message}`;
				}
			}

			this.bus.emit("agent:tool_result", {
				id: tc.id,
				name: tc.name,
				result,
			});
			this.messages.push({
				role: "tool",
				content: result,
				toolCallId: tc.id,
			});
		}

		this.bus.emit("agent:turn_end", { turn });
		await this.runStep(turn + 1);
	}

	get isRunning(): boolean {
		return this.running;
	}
}
