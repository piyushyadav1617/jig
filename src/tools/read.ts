import { tool } from "ai";
import { readFile } from "node:fs/promises";
import { z } from "zod";

export const readTool = tool({
	description: "Read the full contents of a file at the given path.",
	inputSchema: z.object({
		path: z.string().describe("Path to the file to read"),
	}),
	execute: async ({ path }) => {
		if (!path) throw new Error("path is required");
		const content = await readFile(path, "utf-8");
		const lines = content.split("\n").length;
		return JSON.stringify({ path, lines, content });
	},
});
