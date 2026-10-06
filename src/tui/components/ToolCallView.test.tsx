import { afterEach, expect, test } from "bun:test";
import { act } from "react";
import { createTwoFilesPatch } from "diff";
import { testRender } from "@opentui/react/test-utils";
import { ToolCallView } from "./ToolCallView.tsx";

let setup: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(async () => {
	if (setup) await act(async () => { setup?.renderer.destroy(); });
	setup = undefined;
});

test("write shows code by default, keeps failures visible, and can be collapsed", async () => {
	setup = await testRender(
		<ToolCallView name="write" args={JSON.stringify({ path: "example.ts", content: "const value = 42;" })} result="Error: permission denied" />,
		{ width: 100, height: 20 },
	);
	const frame = await setup.waitForFrame((frame) => frame.includes("const value = 42;"));
	expect(frame).toContain("write example.ts (1 line) (failed)");
	expect(frame).toContain("Error: permission denied");
	expect(frame).toContain("[click to collapse]");
	expect(frame).not.toContain('"content":');
	await act(async () => { await setup!.mockMouse.click(2, 0); });
	await setup.renderOnce();
	expect(setup.captureCharFrame()).not.toContain("const value = 42;");
	expect(setup.captureCharFrame()).toContain("[click to expand]");
});

test("read shows a short code preview until clicked, then renders the full file", async () => {
	const content = "const readOnly = 123;\n// second\n// third\n// fourth\nconst hidden = 456;\n// sixth";
	setup = await testRender(
		<ToolCallView name="read" args={JSON.stringify({ path: "example.ts" })} result={JSON.stringify({ path: "example.ts", lines: 6, content })} />,
		{ width: 100, height: 20 },
	);
	await setup.waitForFrame((frame) => frame.includes("const readOnly = 123;"));
	expect(setup.captureCharFrame()).toContain("read example.ts (6 lines)");
	expect(setup.captureCharFrame()).toContain("… 2 more lines");
	expect(setup.captureCharFrame()).not.toContain("const hidden");
	await act(async () => { await setup!.mockMouse.click(2, 0); });
	const frame = await setup.waitForFrame((frame) => frame.includes("const hidden = 456;"));
	expect(frame).not.toContain('"content":');
	expect(frame).toContain("File read");
	await act(async () => { await setup!.mockMouse.click(2, 0); });
	await setup.renderOnce();
	expect(setup.captureCharFrame()).toContain("const readOnly = 123;");
	expect(setup.captureCharFrame()).not.toContain("const hidden");
});

test("completed edits render a full-file diff with actual line numbers and change signs", async () => {
	const before = "// context\nconst value = 42;\n";
	const after = "// context\nconst value = 43;\n";
	setup = await testRender(
		<ToolCallView name="edit" args={JSON.stringify({ path: "example.ts", oldString: "42", newString: "43" })} result={JSON.stringify({ path: "example.ts", replacements: 1, diff: createTwoFilesPatch("example.ts", "example.ts", before, after) })} />,
		{ width: 100, height: 20 },
	);
	const frame = await setup.waitForFrame((frame) => frame.includes("const value = 43;"));
	expect(frame).toContain("// context");
	expect(frame).toMatch(/2\s+-\s+const value = 42;/);
	expect(frame).toMatch(/2\s+\+\s+const value = 43;/);
	expect(frame).toContain("Applied 1 replacement");
	expect(frame).not.toContain("Replacement preview");
});

test("shell and search show partial output and expand to their full details", async () => {
	setup = await testRender(
		<box flexDirection="column" gap={1}>
			<ToolCallView name="bash" args={JSON.stringify({ command: "bun run tsc --noEmit" })} result={JSON.stringify({ exitCode: 1, stdout: "checking types\nsecond line\nthird line\nlast output", stderr: "type error" })} />
			<ToolCallView name="grep" args={JSON.stringify({ pattern: "value", path: "src", include: "*.ts" })} result={JSON.stringify({ matches: "src/example.ts:2:const value = 42;\nmatch two\nmatch three\nmatch four\nlast match" })} />
		</box>,
		{ width: 100, height: 30 },
	);
	const frame = await setup.waitForFrame((frame) => frame.includes("bun run tsc --noEmit"));
	expect(frame).toContain("exit 1");
	expect(frame).toContain("checking types");
	expect(frame).not.toContain("last output");
	expect(frame).not.toContain("last match");
	expect(frame).toContain("[click to expand]");
	expect(frame).not.toContain('"stdout":');
	expect(frame).toContain("src/example.ts:2:");
	const searchRow = frame.split("\n").findIndex((line) => line.startsWith("grep "));
	await act(async () => { await setup!.mockMouse.click(2, searchRow); });
	await setup.renderOnce();
	expect(setup.captureCharFrame()).toContain("src/example.ts:2:const value = 42;");
	expect(setup.captureCharFrame()).toContain("Files: *.ts");
	expect(setup.captureCharFrame()).toContain("last match");
	await act(async () => { await setup!.mockMouse.click(2, 0); });
	const expanded = await setup.waitForFrame((frame) => frame.includes("last output"));
	expect(expanded).toContain("stderr");
	expect(expanded).toContain("type error");
});

test("generic tool previews bound long lines and preserve full output on expansion", async () => {
	const result = `first line\n${"x".repeat(200)}END\nthird\nfourth\nfifth`;
	setup = await testRender(
		<ToolCallView name="custom" args="{}" result={result} />,
		{ width: 100, height: 20 },
	);
	await setup.renderOnce();
	expect(setup.captureCharFrame()).toContain("first line");
	expect(setup.captureCharFrame()).toContain("… 1 more line");
	expect(setup.captureCharFrame()).not.toContain("END");
	expect(setup.captureCharFrame()).not.toContain("fifth");
	await act(async () => { await setup!.mockMouse.click(2, 0); });
	await setup.renderOnce();
	expect(setup.captureCharFrame()).toContain("END");
	expect(setup.captureCharFrame()).toContain("fifth");
});
