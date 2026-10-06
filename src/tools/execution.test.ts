import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyPatch } from "diff";
import { bashTool } from "./bash.ts";
import { editTool } from "./edit.ts";
import { grepTool } from "./grep.ts";
import { readTool } from "./read.ts";
import { writeTool } from "./write.ts";
import { waitForToolExecutions, withToolSignal } from "./execution.ts";

const options = (abortSignal?: AbortSignal) => ({
	toolCallId: "test", messages: [], abortSignal, context: {},
});

test("deadline aborts an operation and waits for its cleanup", async () => {
	let cleanedUp = false;
	const execution = withToolSignal(undefined, 10, async (signal) => {
		await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }));
		await Bun.sleep(10);
		cleanedUp = true;
	});
	await expect(execution).rejects.toMatchObject({ name: "TimeoutError" });
	expect(cleanedUp).toBe(true);
	await waitForToolExecutions();
});

test("edit returns a full-file diff covering every applied replacement", async () => {
	const directory = await mkdtemp(join(tmpdir(), "jig-edit-"));
	const path = join(directory, "example.ts");
	const original = "// context\nconst first = 42;\nconst second = 42;\n";
	await writeFile(path, original);
	try {
		const result = await editTool.execute!({ path, oldString: "42", newString: "43", replaceAll: true }, options());
		const output = JSON.parse(result as string);
		expect(output.replacements).toBe(2);
		expect(applyPatch(original, output.diff)).toBe(await readFile(path, "utf-8"));
		expect(output.diff).toContain(" // context");
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("all file tools reject pre-cancelled calls without modifying files", async () => {
	const directory = await mkdtemp(join(tmpdir(), "jig-tools-"));
	const path = join(directory, "file.txt");
	await writeFile(path, "original");
	const controller = new AbortController();
	controller.abort();
	try {
		const calls = [
			readTool.execute!({ path }, options(controller.signal)),
			writeTool.execute!({ path, content: "changed" }, options(controller.signal)),
			editTool.execute!({ path, oldString: "original", newString: "changed" }, options(controller.signal)),
			grepTool.execute!({ path, pattern: "original" }, options(controller.signal)),
		];
		const outcomes = await Promise.allSettled(calls);
		for (const outcome of outcomes) {
			expect(outcome.status).toBe("rejected");
			if (outcome.status === "rejected") expect(outcome.reason).toMatchObject({ name: "AbortError" });
		}
		expect(await readFile(path, "utf-8")).toBe("original");
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("bash preserves normal results and enforces its timeout", async () => {
	const result = await bashTool.execute!({ command: "printf hello" }, options());
	expect(JSON.parse(result as string)).toMatchObject({ exitCode: 0, stdout: "hello" });
	await expect(bashTool.execute!({ command: "sleep 30", timeout: 30 }, options()))
		.rejects.toMatchObject({ name: "TimeoutError" });
});

test("bash cancellation kills descendants before they can perform side effects", async () => {
	const directory = await mkdtemp(join(tmpdir(), "jig-bash-"));
	const ready = join(directory, "ready");
	const late = join(directory, "late");
	const controller = new AbortController();
	const execution = Promise.resolve(bashTool.execute!({
		command: `touch '${ready}'; (sleep 0.3; touch '${late}') & wait`,
	}, options(controller.signal)));
	// Attach a rejection handler before cancelling.
	const outcome = execution.catch((error: unknown) => error);
	try {
		for (let i = 0; i < 100 && !await Bun.file(ready).exists(); i++) await Bun.sleep(10);
		expect(await Bun.file(ready).exists()).toBe(true);
		controller.abort();
		expect(await outcome).toMatchObject({ name: "AbortError" });
		await waitForToolExecutions();
		await Bun.sleep(400);
		expect(await Bun.file(late).exists()).toBe(false);
	} finally {
		controller.abort();
		await outcome;
		await rm(directory, { recursive: true, force: true });
	}
});

test("grep can be cancelled during a large search", async () => {
	const directory = await mkdtemp(join(tmpdir(), "jig-grep-"));
	const path = join(directory, "large.txt");
	await writeFile(path, "searchable line\n".repeat(100_000));
	const controller = new AbortController();
	const execution = Promise.resolve(grepTool.execute!({ path, pattern: "searchable" }, options(controller.signal)));
	const outcome = execution.catch((error: unknown) => error);
	try {
		await Bun.sleep(5);
		controller.abort();
		expect(await outcome).toMatchObject({ name: "AbortError" });
	} finally {
		controller.abort();
		await outcome;
		await rm(directory, { recursive: true, force: true });
	}
});
