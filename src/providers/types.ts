import type { LanguageModel } from "ai";

export type ProviderId = string;

export type ModelDefinition = {
	id: string;
	displayName: string;
	description?: string;
};

export type ProviderDefinition = {
	id: ProviderId;
	displayName: string;
	description: string;
	models: readonly ModelDefinition[];
	createModel: (options: {
		modelId: string;
		apiKey: string;
	}) => LanguageModel;
};
