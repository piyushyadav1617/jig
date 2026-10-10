import { afterEach, expect, test } from "bun:test";
import { act } from "react";
import { testRender } from "@opentui/react/test-utils";
import type { ModelManager } from "@/api/model-manager.ts";
import { providerRegistry } from "@/providers/registry.ts";
import { ProviderDialog } from "./ProviderDialog.tsx";

let setup: Awaited<ReturnType<typeof testRender>> | undefined;
afterEach(async () => {
	if (setup) await act(async () => { setup?.renderer.destroy(); });
	setup = undefined;
});

test("model navigation scrolls within long groups, across providers, and back after filtering", async () => {
	const providers = providerRegistry.list();
	const manager = {
		listProviders: () => providers,
		isAuthenticated: async () => true,
	} as unknown as ModelManager;
	let selected = "";
	await act(async () => { setup = await testRender(
		<ProviderDialog
			modelManager={manager}
			initialScreen="models"
			onClose={() => {}}
			onModelChange={(model) => { selected = model; return false; }}
		/>,
		{ width: 80, height: 24 },
	); });
	const view = setup!;
	await view.flush();
	expect(view.captureCharFrame()).toContain(providers[0]!.models[0]!.displayName);
	const move = async (key: "down" | "up", count: number) => {
		for (let index = 0; index < count; index++) {
			await act(async () => { setup!.mockInput.pressArrow(key); });
			await setup!.flush();
		}
	};
	await move("down", providers[0]!.models.length - 1);
	expect(view.captureCharFrame()).toContain(providers[0]!.models.at(-1)!.displayName);
	await move("down", 1);
	expect(view.captureCharFrame()).toContain(providers[1]!.models[0]!.displayName);
	await move("up", 1);
	expect(view.captureCharFrame()).toContain(providers[0]!.models.at(-1)!.displayName);
	await move("down", providers[1]!.models.length + providers[2]!.models.length);
	expect(view.captureCharFrame()).toContain(providers[2]!.models.at(-1)!.displayName);
	await act(async () => { setup!.mockInput.pressEnter(); });
	expect(selected).toBe(`${providers[2]!.id}/${providers[2]!.models.at(-1)!.id}`);
	await act(async () => { view.mockInput.pressTab(); });
	await view.flush();
	await act(async () => { await view.mockInput.typeText("gpt-6-astra"); });
	await view.flush();
	expect(view.captureCharFrame()).toContain("GPT-6 Astra");
	expect(view.captureCharFrame()).not.toContain("Auto Router");
});
