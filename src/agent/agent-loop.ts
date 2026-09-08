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

type TaskContext = {
	transcript: ModelMessage[];
	controller: AbortController;
};

function cloneMessages(messages: ModelMessage[]): ModelMessage[] {
	return messages.map((message) => {
		if (message.role !== "assistant" || !message.toolCalls) {
			return { ...message };
		}

		return {
			...message,
			toolCalls: message.toolCalls.map((toolCall) => ({
				...toolCall,
				function: { ...toolCall.function },
			})),
		};
	});
}

function formatError(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	if (error === undefined) return "Unknown error";
	return String(error);
}

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
	private activeTask?: TaskContext;

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
			if (this.running) return;

			this.resetHistory();
			this.bus.emit("agent:status", { status: "history cleared" });
		});
		this.bus.on("user:exit", () => {
			this.activeTask?.controller.abort();
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
		// TODO: User can send commands or extra messages for interruption or some other action
		// So no need to return immediately while the agent is running, we can perform side tasks
		const trimmed = input.trim();
		if (!trimmed) return;

		const task: TaskContext = {
			transcript: cloneMessages(this.messages),
			controller: new AbortController(),
		};
		task.transcript.push({ role: "user", content: trimmed });

		this.running = true;
		this.activeTask = task;
		this.commitTask(task);
		this.bus.emit("agent:task_start", { input: trimmed });

		try {
			await this.runTask(task);
		} catch (err) {
			if (!task.controller.signal.aborted) {
				this.bus.emit("agent:error", { error: formatError(err) });
			}
		} finally {
			this.running = false;
			this.activeTask = undefined;
			this.bus.emit("agent:task_end");
		}
	}

	private commitTask(task: TaskContext): void {
		this.messages.length = 0;
		this.messages.push(...cloneMessages(task.transcript));
	}

	private async runTask(task: TaskContext): Promise<void> {
		let turn = 0;

		while (turn < this.maxTurns) {
			if (task.controller.signal.aborted) return;
			this.bus.emit("agent:turn_start", { turn });

			let assistantText = "";
			const toolCallMap = new Map<
				number,
				{ id: string; name: string; arguments: string }
			>();

			for await (const chunk of streamModel({
				model: this.model,
				messages: task.transcript,
				tools: getToolDefinitions(),
				signal: task.controller.signal,
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
			if (task.controller.signal.aborted) return;

			const toolCalls = [...toolCallMap.values()];

			if (toolCalls.length === 0) {
				task.transcript.push({ role: "assistant", content: assistantText });
				this.commitTask(task);
				this.bus.emit("agent:turn_end", { turn });
				return;
			}

			const assistantToolCalls: ToolCall[] = toolCalls.map((tc) => ({
				id: tc.id,
				type: "function" as const,
				function: { name: tc.name, arguments: tc.arguments },
			}));
			task.transcript.push({
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
						result = `Error: ${formatError(err)}`;
					}
				}
				this.bus.emit("agent:tool_result", {
					id: tc.id,
					name: tc.name,
					result,
				});
				task.transcript.push({
					role: "tool",
					content: result,
					toolCallId: tc.id,
				});
			}

			this.commitTask(task);
			this.bus.emit("agent:turn_end", { turn });
			turn++;
		}

		if (task.controller.signal.aborted) return;
		this.bus.emit("agent:error", {
			error: `reached max turns (${this.maxTurns}), stopping`,
		});
	}

	get isRunning(): boolean {
		return this.running;
	}
}
