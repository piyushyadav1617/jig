import { expect, test } from "bun:test";
import { JIG_DEFAULT_MODEL, providerRegistry } from "./registry.ts";

test("returns context window metadata for known models", () => {
	expect(
		providerRegistry.getContextWindowTokens("openrouter/apodex/apodex-1.1-mini:free"),
	).toBe(262_144);
	expect(providerRegistry.getContextWindowTokens(JIG_DEFAULT_MODEL)).toBe(262_144);
	expect(providerRegistry.getContextWindowTokens("openrouter/unknown-model")).toBeUndefined();
});
