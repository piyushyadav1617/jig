import { afterEach, expect, test } from "bun:test";
import { act, createRef } from "react";
import type { TextareaRenderable } from "@opentui/core";
import { testRender } from "@opentui/react/test-utils";
import { PromptInput } from "./PromptInput.tsx";

let setup: Awaited<ReturnType<typeof testRender>> | undefined;
afterEach(async () => {
	if (setup) await act(async () => { setup?.renderer.destroy(); });
	setup = undefined;
});

test("prompt wraps, grows, resizes, caps its height, and shrinks after clearing", async () => {
	const ref = createRef<TextareaRenderable>();
	setup = await testRender(
		<box width="100%" height="100%" flexDirection="column">
			<box flexGrow={1} />
			<PromptInput inputRef={ref} focused onChange={() => {}} onSubmit={() => {}}>
				<text position="absolute" bottom="100%" marginBottom={1}>Commands</text>
			</PromptInput>
		</box>,
		{ width: 30, height: 30 },
	);
	await setup.flush();
	expect(ref.current?.height).toBe(1);
	expect(setup.captureCharFrame()).toContain("│ ask the agent");
	const text = "a long prompt that needs several lines to fit inside this narrow terminal";
	await act(async () => { await setup!.mockInput.typeText(text); });
	await setup.flush();
	expect(ref.current?.plainText).toBe(text);
	expect(ref.current!.height).toBeGreaterThan(1);
	expect(setup.captureCharFrame()).toContain("this narrow terminal");
	const commandRow = setup.captureCharFrame().split("\n").findIndex((line) => line.includes("Commands"));
	expect(commandRow).toBe(ref.current!.y - 2);
	await act(async () => { setup!.resize(100, 30); });
	await setup.flush();
	expect(ref.current?.height).toBe(1);
	await act(async () => { await setup!.mockInput.pasteBracketedText("\n" + "another line\n".repeat(20)); });
	await setup.flush();
	expect(ref.current?.height).toBe(8);
	await act(async () => { ref.current!.clear(); });
	await setup.flush();
	expect(ref.current?.height).toBe(1);
});

test("Shift+Enter inserts a newline and Enter submits the complete multiline prompt", async () => {
	const ref = createRef<TextareaRenderable>();
	let changed = "";
	let submitted = "";
	setup = await testRender(
		<PromptInput inputRef={ref} focused onChange={(text) => { changed = text; }} onSubmit={(text) => { submitted = text; }} />,
		{ width: 50, height: 24, kittyKeyboard: true },
	);
	await setup.flush();
	await act(async () => {
		await setup!.mockInput.typeText("first line");
		setup!.mockInput.pressEnter({ shift: true });
		await setup!.mockInput.typeText("second line");
	});
	await setup.flush();
	expect(changed).toBe("first line\nsecond line");
	expect(submitted).toBe("");
	expect(setup.captureCharFrame()).toContain("second line");
	await act(async () => { setup!.mockInput.pressEnter(); });
	expect(submitted).toBe("first line\nsecond line");
	expect(ref.current?.plainText).toBe(submitted);
});
