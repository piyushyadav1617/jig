import { tool } from "ai";
import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { createTwoFilesPatch } from "diff";
import { FILE_TOOL_TIMEOUT_MS, withToolSignal } from "./execution.ts";

export const editTool = tool({
	description: "Replace an exact string in an existing file.",
	inputSchema: z.object({
		path: z.string().describe("Path to the file to edit"),
		oldString: z.string().describe("Exact text to replace"),
		newString: z.string().describe("Replacement text"),
		replaceAll: z
			.boolean()
			.optional()
			.describe("Replace every match instead of requiring one unique match"),
	}),
	execute: async ({ path, oldString, newString, replaceAll = false }, { abortSignal }) => withToolSignal(abortSignal, FILE_TOOL_TIMEOUT_MS, async (signal) => {
		if (!path) throw new Error("path is required");
		if (!oldString) throw new Error("oldString is required");
		if (newString === undefined || newString === null) {
			throw new Error("newString is required");
		}

		const content = await readFile(path, { encoding: "utf-8", signal });
		const matches = content.split(oldString).length - 1;
		if (matches === 0) throw new Error("oldString was not found");
		if (!replaceAll && matches > 1) {
			throw new Error(`oldString matched ${matches} times; provide a unique string or set replaceAll`);
		}

		const updated = replaceAll
			? content.replaceAll(oldString, newString)
			: content.replace(oldString, newString);
		signal.throwIfAborted();
		await writeFile(path, updated, { encoding: "utf-8", signal });

		return JSON.stringify({
			path,
			replacements: replaceAll ? matches : 1,
			diff: createTwoFilesPatch(path, path, content, updated),
		});
	}),
});
