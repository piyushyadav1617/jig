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
	"inclusionai/ling-3.0-flash-sante:free";
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

// Curated text/tool-calling catalogs, checked against provider sources on 2026-10-07.
// OpenAI: https://developers.openai.com/api/docs/models.md
const openAIModels: readonly ModelDefinition[] = [
	{
		id: "gpt-6-astra",
		displayName: "GPT-6 Astra",
		description: "Flagship model for demanding reasoning and coding; 1.05M context.",
	},
	{
		id: "gpt-6.1-sol",
		displayName: "GPT-6.1 Sol",
		description: "Near-Astra performance at lower cost; 1.05M context.",
	},
	{
		id: "gpt-6-luna",
		displayName: "GPT-6 Luna",
		description: "Efficient model for focused, high-volume tasks; 1.05M context.",
	},
	{
		id: "gpt-6-sol",
		displayName: "GPT-6 Sol",
		description: "Complex coding and agentic workflows.",
	},
	{
		id: "gpt-5.6-sol",
		displayName: "GPT-5.6 Sol",
		description: "Previous-generation flagship for complex professional work.",
	},
	{
		id: "gpt-5.6-terra",
		displayName: "GPT-5.6 Terra",
		description: "Balances intelligence and cost for everyday work.",
	},
	{
		id: "gpt-5.6-luna",
		displayName: "GPT-5.6 Luna",
		description: "Cost-sensitive workloads and fast responses.",
	},
	{
		id: "gpt-5.5",
		displayName: "GPT-5.5",
		description: "Coding and professional knowledge work.",
	},
	{
		id: "gpt-5.5-pro",
		displayName: "GPT-5.5 Pro",
		description: "Higher-compute GPT-5.5 for more precise responses.",
	},
	{
		id: "gpt-5.4",
		displayName: "GPT-5.4",
		description: "Affordable coding and professional work.",
	},
	{
		id: "gpt-5.4-mini",
		displayName: "GPT-5.4 Mini",
		description: "Compact model for coding, computer use, and subagents.",
	},
	{
		id: "gpt-5.4-pro",
		displayName: "GPT-5.4 Pro",
		description: "Higher-compute GPT-5.4 for difficult tasks.",
	},
	{
		id: "gpt-5.3-codex",
		displayName: "GPT-5.3 Codex",
		description: "Agentic coding; deprecated, available until April 1, 2027.",
	},
	{
		id: "gpt-5.2",
		displayName: "GPT-5.2",
		description: "Previous flagship reasoning model for professional work.",
	},
	{
		id: "gpt-5.2-pro",
		displayName: "GPT-5.2 Pro",
		description: "Higher-compute reasoning for professional work.",
	},
	{
		id: "gpt-5",
		displayName: "GPT-5",
		description: "Legacy reasoning model; scheduled retirement December 11, 2026.",
	},
	{
		id: "gpt-5-mini",
		displayName: "GPT-5 Mini",
		description: "Legacy compact model; scheduled retirement December 11, 2026.",
	},
	{
		id: "gpt-4.1",
		displayName: "GPT-4.1",
		description: "A capable OpenAI model for coding and analysis.",
	},
	{
		id: "gpt-4.1-mini",
		displayName: "GPT-4.1 Mini",
		description: "Smaller, faster non-reasoning model for coding and analysis.",
	},
	{
		id: "gpt-4o",
		displayName: "GPT-4o",
		description: "OpenAI's multimodal model.",
	},
	{
		id: "gpt-4o-mini",
		displayName: "GPT-4o Mini",
		description: "Affordable multimodal model for focused tasks.",
	},
];

// Anthropic: https://platform.claude.com/docs/en/models/overview
const anthropicModels: readonly ModelDefinition[] = [
	{
		id: "claude-opus-5-5",
		displayName: "Claude Opus 5.5",
		description: "Recommended for agentic coding and knowledge work; 1M context.",
	},
	{
		id: "claude-fable-5-1",
		displayName: "Claude Fable 5.1",
		description: "Demanding reasoning and long-horizon agentic work; 1M context.",
	},
	{
		id: "claude-sonnet-5-5",
		displayName: "Claude Sonnet 5.5",
		description: "Latest balance of speed and intelligence; 1M context.",
	},
	{
		id: "claude-haiku-4-5",
		displayName: "Claude Haiku 4.5",
		description: "Fast, efficient model with near-frontier intelligence; 200K context.",
	},
	{
		id: "claude-fable-5",
		displayName: "Claude Fable 5",
		description: "Previous Fable generation for demanding agentic work.",
	},
	{
		id: "claude-opus-5",
		displayName: "Claude Opus 5",
		description: "Previous Opus generation for coding and knowledge work.",
	},
	{
		id: "claude-sonnet-5",
		displayName: "Claude Sonnet 5",
		description: "Previous Sonnet generation for fast coding and analysis.",
	},
	{
		id: "claude-opus-4-8",
		displayName: "Claude Opus 4.8",
		description: "Earlier Opus model for complex reasoning and coding.",
	},
	{
		id: "claude-opus-4-7",
		displayName: "Claude Opus 4.7",
		description: "Earlier Opus model with long-context reasoning.",
	},
	{
		id: "claude-opus-4-6",
		displayName: "Claude Opus 4.6",
		description: "Earlier Opus model for complex reasoning.",
	},
	{
		id: "claude-sonnet-4-6",
		displayName: "Claude Sonnet 4.6",
		description: "A balanced Anthropic model for coding and analysis.",
	},
	{
		id: "claude-opus-4-5-20251101",
		displayName: "Claude Opus 4.5",
		description: "Pinned earlier Opus model for coding and analysis.",
	},
];

// OpenRouter: https://openrouter.ai/api/v1/models
// Only text-output models advertising tool support; no batch-only variants.
const openRouterModels: readonly ModelDefinition[] = [
	{
		id: OPENROUTER_DEFAULT_MODEL,
		displayName: "Ling 3.0 Flash Sante (Free)",
		description: "Free · Default OpenRouter model; fast text and tool calling.",
	},
	{
		id: "openrouter/free",
		displayName: "Free Models Router (Free)",
		description: "Free · Automatically routes to available free models.",
	},
	{
		id: "apodex/apodex-1.1-mini:free",
		displayName: "Apodex 1.1 Mini (Free)",
		description: "Free · Compact text model with tools; 262K context.",
	},
	{
		id: "dots-studio/dots-3-note-preview:free",
		displayName: "Dots3-Note Preview (Free)",
		description: "Free · Preview text model with tools; 512K context.",
	},
	{
		id: "nvidia/nemotron-3.5-lightning:free",
		displayName: "Nemotron 3.5 Lightning (Free)",
		description: "Free · Fast text model with tools; 1M context.",
	},
	{
		id: "nvidia/nemotron-3-ultra-550b-a55b:free",
		displayName: "Nemotron 3 Ultra (Free)",
		description: "Free · Large reasoning model with tools; 1M context.",
	},
	{
		id: "nvidia/nemotron-3-super-120b-a12b:free",
		displayName: "Nemotron 3 Super (Free)",
		description: "Free · Reasoning and tool calling; 262K context.",
	},
	{
		id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
		displayName: "Nemotron 3 Nano Omni (Free)",
		description: "Free · Multimodal reasoning and tools; 256K context.",
	},
	{
		id: "thinkingmachines/inkling:free",
		displayName: "Inkling (Free)",
		description: "Free · Text model with tool calling; 1M context.",
	},
	{
		id: "thinkingmachines/inkling-small:free",
		displayName: "Inkling Small (Free)",
		description: "Free · Smaller text model with tools; 1M context.",
	},
	{
		id: "poolside/laguna-s-2.1:free",
		displayName: "Laguna S 2.1 (Free)",
		description: "Free · Coding and tool calling; 262K context.",
	},
	{
		id: "poolside/laguna-xs-2.1:free",
		displayName: "Laguna XS 2.1 (Free)",
		description: "Free · Compact coding model with tools; 262K context.",
	},
	{
		id: "cohere/north-mini-code:free",
		displayName: "North Mini Code (Free)",
		description: "Free · Compact coding model with tools; 256K context.",
	},
	{
		id: "google/gemma-4-31b-it:free",
		displayName: "Gemma 4 31B (Free)",
		description: "Free · Open-weight model with tools; 262K context.",
	},
	{
		id: "google/gemma-4-26b-a4b-it:free",
		displayName: "Gemma 4 26B A4B (Free)",
		description: "Free · Efficient open-weight model with tools; 262K context.",
	},
	{
		id: "liquid/lfm-2.5-2.6b:free",
		displayName: "LFM2.5 2.6B (Free)",
		description: "Free · Lightweight text model with tools; 65K context.",
	},
	{
		id: "inclusionai/ling-3.1-flash",
		displayName: "Ling 3.1 Flash (Free)",
		description: "Free · Latest Ling Flash with tools; 262K context.",
	},
	{
		id: "openai/gpt-6-astra",
		displayName: "GPT-6 Astra (Paid)",
		description: "Paid · Flagship reasoning and coding; 1.05M context.",
	},
	{
		id: "openai/gpt-6.1-sol",
		displayName: "GPT-6.1 Sol (Paid)",
		description: "Paid · Near-Astra intelligence at lower cost; 1.05M context.",
	},
	{
		id: "openai/gpt-6-luna",
		displayName: "GPT-6 Luna (Paid)",
		description: "Paid · Efficient high-volume model; 1.05M context.",
	},
	{
		id: "openai/gpt-6-sol",
		displayName: "GPT-6 Sol (Paid)",
		description: "Paid · Complex coding and agentic work; 1.05M context.",
	},
	{
		id: "openai/gpt-5.5",
		displayName: "GPT-5.5 (Paid)",
		description: "Paid · Coding and professional work; 1.05M context.",
	},
	{
		id: "openai/gpt-5.4-mini",
		displayName: "GPT-5.4 Mini (Paid)",
		description: "Paid · Compact coding and agentic model; 400K context.",
	},
	{
		id: "anthropic/claude-opus-5.5",
		displayName: "Claude Opus 5.5 (Paid)",
		description: "Paid · Agentic coding and knowledge work; 1M context.",
	},
	{
		id: "anthropic/claude-fable-5.1",
		displayName: "Claude Fable 5.1 (Paid)",
		description: "Paid · Demanding reasoning and long-horizon agents; 1M context.",
	},
	{
		id: "anthropic/claude-sonnet-5.5",
		displayName: "Claude Sonnet 5.5 (Paid)",
		description: "Paid · Balanced speed and intelligence; 1M context.",
	},
	{
		id: "anthropic/claude-haiku-4.5",
		displayName: "Claude Haiku 4.5 (Paid)",
		description: "Paid · Fast and efficient Claude model; 200K context.",
	},
	{
		id: "anthropic/claude-opus-4.6",
		displayName: "Claude Opus 4.6 (Paid)",
		description: "Paid · Earlier Opus reasoning model; 1M context.",
	},
	{
		id: "anthropic/claude-sonnet-4.6",
		displayName: "Claude Sonnet 4.6 (Paid)",
		description: "Paid · Earlier balanced Claude model; 1M context.",
	},
	{
		id: "google/gemini-3.7-flash",
		displayName: "Gemini 3.7 Flash (Paid)",
		description: "Paid · Latest Gemini Flash with tools; 1M context.",
	},
	{
		id: "google/gemini-3.1-pro-preview",
		displayName: "Gemini 3.1 Pro Preview (Paid)",
		description: "Paid · Preview reasoning and multimodal model; 1M context.",
	},
	{
		id: "google/gemini-3.5-flash-lite",
		displayName: "Gemini 3.5 Flash Lite (Paid)",
		description: "Paid · Lightweight Gemini with tools; 1M context.",
	},
	{
		id: "deepseek/deepseek-v4-pro-0813",
		displayName: "DeepSeek V4 Pro 0813 (Paid)",
		description: "Paid · Long-context reasoning and coding; 1M context.",
	},
	{
		id: "deepseek/deepseek-v4-flash-0731",
		displayName: "DeepSeek V4 Flash 0731 (Paid)",
		description: "Paid · Fast reasoning and tool calling; 1M context.",
	},
	{
		id: "deepseek/deepseek-v3.2",
		displayName: "DeepSeek V3.2 (Paid)",
		description: "Paid · Earlier reasoning and coding model; 163K context.",
	},
	{
		id: "qwen/qwen3.8-flash",
		displayName: "Qwen3.8 Flash (Paid)",
		description: "Paid · Latest fast Qwen model with tools; 1M context.",
	},
	{
		id: "qwen/qwen3.8-2.4t-a95b",
		displayName: "Qwen3.8 2.4T A95B (Paid)",
		description: "Paid · Large Qwen model with tools; 1M context.",
	},
	{
		id: "qwen/qwen3-coder-next",
		displayName: "Qwen3 Coder Next (Paid)",
		description: "Paid · Coding-focused Qwen model; 262K context.",
	},
	{
		id: "qwen/qwen3-coder-plus",
		displayName: "Qwen3 Coder Plus (Paid)",
		description: "Paid · Long-context coding and tool calling; 1M context.",
	},
	{
		id: "moonshotai/kimi-k3",
		displayName: "Kimi K3 (Paid)",
		description: "Paid · Latest Kimi model with tools; 1M context.",
	},
	{
		id: "moonshotai/kimi-k2.7-code",
		displayName: "Kimi K2.7 Code (Paid)",
		description: "Paid · Coding-focused Kimi model; 262K context.",
	},
	{
		id: "z-ai/glm-5.3",
		displayName: "GLM 5.3 (Paid)",
		description: "Paid · Latest GLM model with tools; 1M context.",
	},
	{
		id: "z-ai/glm-5.3-flash",
		displayName: "GLM 5.3 Flash (Paid)",
		description: "Paid · Fast GLM model with tools; 1M context.",
	},
	{
		id: "minimax/minimax-m3",
		displayName: "MiniMax M3 (Paid)",
		description: "Paid · Latest MiniMax model with tools; 1M context.",
	},
	{
		id: "x-ai/grok-4.6",
		displayName: "Grok 4.6 (Paid)",
		description: "Paid · Latest Grok model with tools; 500K context.",
	},
	{
		id: "mistralai/mistral-medium-3-5",
		displayName: "Mistral Medium 3.5 (Paid)",
		description: "Paid · General-purpose model with tools; 262K context.",
	},
	{
		id: "mistralai/devstral-2512",
		displayName: "Devstral 2 (Paid)",
		description: "Paid · Agentic software engineering model; 262K context.",
	},
	{
		id: "meta/muse-spark-1.2",
		displayName: "Muse Spark 1.2 (Paid)",
		description: "Paid · Meta model with tool calling; 1M context.",
	},
	{
		id: "openrouter/auto",
		displayName: "Auto Router (Paid)",
		description: "Paid · Automatically selects a model for your prompt.",
	},
];

export const providerDefinitions: readonly ProviderDefinition[] = [
	// {
	// 	id: "jig",
	// 	displayName: "Jig Hosted",
	// 	description: "Use Jig's hosted OpenRouter proxy.",
	// 	models: jigModels,
	// 	requiresAuthentication: false,
	// 	createModel: ({ modelId }) => getJigModel(modelId),
	// },
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
