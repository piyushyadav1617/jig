import { expect, test } from "bun:test";
import { AgentLoop } from "./agent-loop.ts";
import { Bus } from "@/events/bus.ts";
import type { ModelManager } from "@/api/model-manager.ts";
import { withToolSignal } from "@/tools/execution.ts";

test("cancel waits for tools, suppresses late output, and permits a new prompt", async () => {
	const bus = new Bus();
	let calls = 0;
	let cleanedUp = false;
	const deltas: string[] = [];
	bus.on("agent:delta", ({ content }) => deltas.push(content));
	const manager = {
		defaultModel: "test",
		async streamText({ abortSignal }: { abortSignal: AbortSignal }) {
			calls++;
			return {
				stream: (async function* () {
					if (calls === 1) {
						const cleanup = withToolSignal(abortSignal, 1000, async (signal) => {
							await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }));
							await Bun.sleep(20);
							cleanedUp = true;
						});
						void cleanup.catch(() => {});
						bus.emit("user:cancel");
						yield { type: "text-delta", text: "late output" };
					} else {
						yield { type: "text-delta", text: "next response" };
					}
				})(),
				responseMessages: Promise.resolve([]),
				toolCalls: Promise.resolve([]),
			};
		},
	} as unknown as ModelManager;
	const agent = new AgentLoop({ bus, modelManager: manager });
	const ended = () => new Promise<void>((resolve) => bus.once("agent:task_end", resolve));
	const first = ended();
	bus.emit("user:input", "first");
	await first;
	expect(cleanedUp).toBe(true);
	expect(agent.isRunning).toBe(false);
	expect(deltas).toEqual([]);
	const second = ended();
	bus.emit("user:input", "second");
	await second;
	expect(deltas).toEqual(["next response"]);
	await agent.stop();
	bus.emit("user:input", "after shutdown");
	expect(calls).toBe(2);
});

test("exit aborts an active stream and shutdown waits for task completion", async () => {
	const bus = new Bus();
	let signal: AbortSignal | undefined;
	const manager = {
		defaultModel: "test",
		async streamText({ abortSignal }: { abortSignal: AbortSignal }) {
			signal = abortSignal;
			return {
				stream: (async function* () {
					if (!abortSignal.aborted) {
						await new Promise<void>((resolve) => abortSignal.addEventListener("abort", () => resolve(), { once: true }));
					}
				})(),
			};
		},
	} as unknown as ModelManager;
	const agent = new AgentLoop({ bus, modelManager: manager });
	bus.emit("user:input", "run");
	bus.emit("user:exit");
	await agent.stop();
	expect(signal?.aborted).toBe(true);
	expect(agent.isRunning).toBe(false);
});
