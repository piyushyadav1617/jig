import { getAnthropicModel } from "@/providers/anthropic.ts";
import { getJigModel } from "@/providers/jig.ts";
import { getOpenAIModel } from "@/providers/openai.ts";
import { getOpenRouterModel } from "@/providers/openrouter.ts";
import type {
	ModelDefinition,
	ProviderDefinition,
	ProviderId,
} from "@/providers/types.ts";

export const OPENROUTER_DEFAULT_MODEL =
	"inclusionai/ling-3.0-flash-fin:free";
export const JIG_DEFAULT_MODEL = `jig/${OPENROUTER_DEFAULT_MODEL}`;

const jigModels: readonly ModelDefinition[] = [
	{
		id: "inclusionai/ling-3.0-flash-vl:free",
		displayName: "Ling 3.0 Flash VL",
		description: "Multimodal coding and reasoning model.",
	},
	{
		id: "inclusionai/ling-3.0-flash-sante:free",
		displayName: "Ling 3.0 Flash Sante",
		description: "Fast text model with tool calling.",
	},
	{
		id: "nex-agi/nex-n2.5-mini:free",
		displayName: "Nex-N2.5-Mini",
		description: "Agentic coding model with tool calling.",
	},
	{
		id: "nex-agi/nex-n2.5-pro:free",
		displayName: "Nex-N2.5-Pro",
		description: "More capable agentic coding model with tool calling.",
	},
	{
		id: "nvidia/nemotron-3.5-lightning:free",
		displayName: "Nemotron 3.5 Lightning",
		description: "Fast text model with tool calling.",
	},
	{
		id: "inclusionai/ling-3.0-flash-fin:free",
		displayName: "Ling 3.0 Flash Fin",
		description: "Fast text model with tool calling.",
	},
	{
		id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
		displayName: "Nemotron 3 Nano Omni",
		description: "Multimodal reasoning model with tool calling.",
	},
];

const openAIModels: readonly ModelDefinition[] = [
	{
		id: "gpt-5",
		displayName: "GPT-5",
		description: "OpenAI's general-purpose flagship model.",
	},
	{
		id: "gpt-5-mini",
		displayName: "GPT-5 Mini",
		description: "A faster, lower-cost OpenAI model.",
	},
	{
		id: "gpt-4.1",
		displayName: "GPT-4.1",
		description: "A capable OpenAI model for coding and analysis.",
	},
	{
		id: "gpt-4o",
		displayName: "GPT-4o",
		description: "OpenAI's multimodal model.",
	},
];

const anthropicModels: readonly ModelDefinition[] = [
	{
		id: "claude-opus-4-6",
		displayName: "Claude Opus 4.6",
		description: "Anthropic's most capable model for complex reasoning.",
	},
	{
		id: "claude-sonnet-4-6",
		displayName: "Claude Sonnet 4.6",
		description: "A balanced Anthropic model for coding and analysis.",
	},
	{
		id: "claude-haiku-4-5",
		displayName: "Claude Haiku 4.5",
		description: "A fast, efficient Anthropic model.",
	},
];

const openRouterModels: readonly ModelDefinition[] = [
	{
		id: OPENROUTER_DEFAULT_MODEL,
		displayName: "Ling 3.0 Flash Fin",
		description: "Default OpenRouter model for jig.",
	},
];

export const providerDefinitions: readonly ProviderDefinition[] = [
	{
		id: "jig",
		displayName: "Jig Hosted",
		description: "Use Jig's hosted OpenRouter proxy.",
		models: jigModels,
		requiresAuthentication: false,
		createModel: ({ modelId }) => getJigModel(modelId),
	},
	{
		id: "openai",
		displayName: "OpenAI",
		description: "Use OpenAI models with your own API key.",
		models: openAIModels,
		createModel: ({ modelId, apiKey }) =>
			getOpenAIModel({ model: modelId, apiKey }),
	},
	{
		id: "anthropic",
		displayName: "Anthropic",
		description: "Use Claude models with your own API key.",
		models: anthropicModels,
		createModel: ({ modelId, apiKey }) =>
			getAnthropicModel({ model: modelId, apiKey }),
	},
	{
		id: "openrouter",
		displayName: "OpenRouter",
		description: "Access models from multiple providers through OpenRouter.",
		models: openRouterModels,
		createModel: ({ modelId, apiKey }) =>
			getOpenRouterModel({ model: modelId, apiKey }),
	},
];

export class ProviderRegistry {
	private readonly providers = new Map<ProviderId, ProviderDefinition>(
		providerDefinitions.map((provider) => [provider.id, provider]),
	);

	list(): readonly ProviderDefinition[] {
		return [...this.providers.values()];
	}

	get(providerId: ProviderId): ProviderDefinition {
		const provider = this.providers.get(providerId);
		if (!provider) throw new Error(`unknown provider "${providerId}"`);
		return provider;
	}

	parseModelReference(reference: string): {
		providerId: ProviderId;
		modelId: string;
	} {
		const separator = reference.indexOf("/");
		if (separator === -1 || !this.providers.has(reference.slice(0, separator))) {
			return { providerId: "openrouter", modelId: reference };
		}

		return {
			providerId: reference.slice(0, separator),
			modelId: reference.slice(separator + 1),
		};
	}
}

export const providerRegistry = new ProviderRegistry();
