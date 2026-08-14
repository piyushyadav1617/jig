import { EventEmitter } from "node:events";

export type AgentEventMap = {
	"user:input": [input: string];
	"user:exit": [];
	"user:clear": [];

	"agent:turn_start": [{ input: string }];
	"agent:delta": [{ content: string }];
	"agent:tool_call": [{ id: string; name: string; arguments: string }];
	"agent:tool_result": [{ id: string; name: string; result: string }];
	"agent:turn_end": [{ turn: number }];
	"agent:done": [];
	"agent:error": [{ error: string }];
	"agent:status": [{ status: string }];
};

export class Bus extends EventEmitter {
	override emit<K extends keyof AgentEventMap>(
		event: K,
		...args: AgentEventMap[K]
	): boolean {
		return super.emit(event, ...args);
	}

	override on<K extends keyof AgentEventMap>(
		event: K,
		listener: (...args: AgentEventMap[K]) => void,
	): this {
		return super.on(event, listener as (...args: unknown[]) => void);
	}

	override once<K extends keyof AgentEventMap>(
		event: K,
		listener: (...args: AgentEventMap[K]) => void,
	): this {
		return super.once(event, listener as (...args: unknown[]) => void);
	}

	override off<K extends keyof AgentEventMap>(
		event: K,
		listener: (...args: AgentEventMap[K]) => void,
	): this {
		return super.off(event, listener as (...args: unknown[]) => void);
	}
}

export const bus = new Bus();
