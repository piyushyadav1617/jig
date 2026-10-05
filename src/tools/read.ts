import { tool } from "ai";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { FILE_TOOL_TIMEOUT_MS, withToolSignal } from "./execution.ts";

export const readTool = tool({
	description: "Read the full contents of a file at the given path.",
	inputSchema: z.object({
		path: z.string().describe("Path to the file to read"),
	}),
	execute: async ({ path }, { abortSignal }) => withToolSignal(abortSignal, FILE_TOOL_TIMEOUT_MS, async (signal) => {
		if (!path) throw new Error("path is required");
		const content = await readFile(path, { encoding: "utf-8", signal });
		const lines = content.split("\n").length;
		return JSON.stringify({ path, lines, content });
	}),
});
