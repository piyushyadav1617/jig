import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

export type OpenRouterModelOptions = {
	apiKey: string;
	model: string;
};

export function getOpenRouterModel({
	apiKey,
	model,
}: OpenRouterModelOptions): LanguageModel {
	const openrouter = createOpenRouter({
		apiKey,
	});

	return openrouter.chat(model);
}
