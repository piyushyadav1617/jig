import {
	streamText,
	type ModelMessage,
	type ToolSet,
} from "ai";
import { CredentialManager } from "@/credentials/manager.ts";
import { providerRegistry, OPENROUTER_DEFAULT_MODEL } from "@/providers/registry.ts";

type StreamTextOptions = Omit<
	Parameters<typeof streamText>[0],
	"model" | "prompt"
> & {
	model?: string;
	messages: ModelMessage[];
};

export class ModelManager {
	private readonly credentials: CredentialManager;
	private readonly providers = providerRegistry;
	readonly defaultModel: string;

	constructor(options: { credentials?: CredentialManager; model?: string } = {}) {
		this.credentials = options.credentials ?? new CredentialManager();
		this.defaultModel =
			options.model ??
			process.env.MODEL ??
			`openrouter/${OPENROUTER_DEFAULT_MODEL}`;
	}

	listProviders() {
		return this.providers.list();
	}

	async isAuthenticated(providerId: string): Promise<boolean> {
		return (await this.credentials.get(providerId)) !== undefined;
	}

	async login(providerId: string, key: string): Promise<void> {
		await this.credentials.login(providerId, { type: "api_key", key });
	}

	async logout(providerId: string): Promise<void> {
		await this.credentials.logout(providerId);
	}

	async getModel(reference = this.defaultModel) {
		const { providerId, modelId } =
			this.providers.parseModelReference(reference);
		const provider = this.providers.get(providerId);
		const credential = await this.credentials.require(providerId);

		if (credential.type !== "api_key") {
			throw new Error(
				`provider "${providerId}" does not support ${credential.type} credentials yet`,
			);
		}

		return provider.createModel({ modelId, apiKey: credential.key });
	}

	async streamText(options: StreamTextOptions) {
		const { model, ...request } = options;
		return this.getModel(model).then((languageModel) =>
			streamText({
				...request,
				model: languageModel,
			}),
		);
	}
}

export type { ModelMessage, ToolSet };
