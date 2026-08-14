import { OpenRouter } from "@openrouter/sdk";
import type { ToolDefinition } from "@/tools/definition.ts";

export type ToolCall = {
	id: string;
	type: "function";
	function: { name: string; arguments: string };
};

export type ModelMessage =
	| { role: "system"; content: string }
	| { role: "user"; content: string }
	| { role: "assistant"; content: string; toolCalls?: ToolCall[] }
	| { role: "tool"; content: string; toolCallId: string };

export type ToolCallDelta = {
	index: number;
	id?: string;
	name?: string;
	arguments?: string;
};

export type StreamChunk =
	| { type: "text"; content: string }
	| { type: "tool_calls"; toolCalls: ToolCallDelta[] };

export type StreamModelOptions = {
	apiKey?: string;
	model: string;
	messages: ModelMessage[];
	tools?: ToolDefinition[];
};

const client = new OpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

export async function* streamModel({
	model,
	messages,
	tools,
}: StreamModelOptions): AsyncGenerator<StreamChunk, void, unknown> {
	const result = await client.chat.send({
		chatRequest: {
			messages: messages as never,
			model,
			stream: true,
			tools: tools && tools.length > 0 ? (tools as never) : undefined,
		},
	});

	if (!(result instanceof ReadableStream)) {
		throw new Error("Expected a streaming response");
	}

	for await (const chunk of result) {
		const delta = chunk.choices?.[0]?.delta;
		if (!delta) continue;

		if (delta.content) {
			yield { type: "text", content: delta.content };
		}

		if (delta.toolCalls && delta.toolCalls.length > 0) {
			yield {
				type: "tool_calls",
				toolCalls: delta.toolCalls.map((tc) => ({
					index: tc.index,
					id: tc.id,
					name: tc.function?.name,
					arguments: tc.function?.arguments,
				})),
			};
		}
	}
}
