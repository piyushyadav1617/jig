import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

const JIG_PROXY_URL = "https://jig.piyushyadav.com/v1";
const JIG_PROXY_SECRET = "jig-secret-key";

export function getJigModel(model: string): LanguageModel {
	const jig = createOpenAI({
		apiKey: "jig-proxy",
		baseURL: JIG_PROXY_URL,
		headers: {
			"x-proxy-secret": JIG_PROXY_SECRET,
		},
	});

	return jig.chat(model);
}
