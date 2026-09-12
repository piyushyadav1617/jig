import {
	isStepCount,
	type ModelMessage
} from "ai";
import { ModelManager } from "@/api/model-manager.ts";
import {
	getToolDefinitions,
	getTools,
} from "@/tools/definition.ts";
import { buildSystemPrompt } from "@/prompts/system-prompt";
import type { Bus } from "@/events/bus";

type TaskContext = {
	transcript: ModelMessage[];
	controller: AbortController;
};

function cloneMessages(messages: ModelMessage[]): ModelMessage[] {
	return structuredClone(messages);
}

function formatError(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	if (error === undefined) return "Unknown error";
	return String(error);
}

function stringifyValue(value: unknown): string {
	if (typeof value === "string") return value;
	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		return String(value);
	}
}

export interface AgentLoopOptions {
	bus: Bus;
	model?: string;
	modelManager?: ModelManager;
	maxTurns?: number;
	cwd?: string;
}

export class AgentLoop {
	private readonly bus: Bus;
	private model: string;
	private readonly modelManager: ModelManager;
	private readonly maxTurns: number;
	private readonly cwd: string;
	private readonly messages: ModelMessage[] = [];
	private running = false;
	private activeTask?: TaskContext;

	constructor(options: AgentLoopOptions) {
		this.bus = options.bus;
		this.modelManager =
			options.modelManager ?? new ModelManager({ model: options.model });
		this.model = options.model ?? this.modelManager.defaultModel;
		this.maxTurns = options.maxTurns ?? 20;
		this.cwd = options.cwd ?? process.cwd();
		this.resetHistory();
		this.bindUserEvents();
	}

	start(): void {
		this.bus.emit("agent:status", { status: "ready" });
	}

	setModel(model: string): boolean {
		if (this.running) return false;
		this.model = model;
		this.bus.emit("agent:status", { status: `model: ${model}` });
		return true;
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

			let streamError: unknown;
			const result = await this.modelManager.streamText({
				model: this.model,
				messages: task.transcript,
				// The system prompt is created locally by jig and is trusted.
				allowSystemInMessages: true,
				tools: getTools(),
				// Keep one model step per outer agent turn. The SDK executes any
				// tool calls from that step and returns them in responseMessages.
				stopWhen: isStepCount(1),
				abortSignal: task.controller.signal,
				onToolExecutionStart: ({ toolCall }) => {
					this.bus.emit("agent:tool_call", {
						id: toolCall.toolCallId,
						name: toolCall.toolName,
						arguments: stringifyValue(toolCall.input),
					});
				},
				onToolExecutionEnd: ({ toolCall, toolOutput }) => {
					const toolResult =
						toolOutput.type === "tool-error"
							? `Error: ${formatError(toolOutput.error)}`
							: stringifyValue(toolOutput.output);
					this.bus.emit("agent:tool_result", {
						id: toolCall.toolCallId,
						name: toolCall.toolName,
						result: toolResult,
					});
				},
			});

			for await (const chunk of result.stream) {
				if (chunk.type === "text-delta") {
					this.bus.emit("agent:delta", { content: chunk.text });
				} else if (chunk.type === "error") {
					streamError = chunk.error;
				}
			}
			if (streamError) throw streamError;
			if (task.controller.signal.aborted) return;

			const responseMessages = await result.responseMessages;
			task.transcript.push(...responseMessages);

			this.commitTask(task);
			const toolCalls = await result.toolCalls;
			this.bus.emit("agent:turn_end", { turn });
			if (toolCalls.length === 0) return;
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
