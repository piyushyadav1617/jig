import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export type AnthropicModelOptions = {
	apiKey: string;
	model: string;
};

export function getAnthropicModel({
	apiKey,
	model,
}: AnthropicModelOptions): LanguageModel {
	const anthropic = createAnthropic({ apiKey });
	return anthropic(model);
}
