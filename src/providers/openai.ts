import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type OpenAIModelOptions = {
	apiKey: string;
	model: string;
};

export function getOpenAIModel({
	apiKey,
	model,
}: OpenAIModelOptions): LanguageModel {
	const openai = createOpenAI({ apiKey });
	return openai.responses(model);
}
