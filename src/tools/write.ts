import { tool } from "ai";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";

export const writeTool = tool({
	description:
		"Write content to a file at the given path. Creates parent directories if they don't exist. Use relative paths from the current working directory or absolute paths.",
	inputSchema: z.object({
		path: z.string().describe("Path to the file to write"),
		content: z.string().describe("The full content to write to the file"),
	}),
	execute: async ({ path, content }) => {
		if (!path) throw new Error("path is required");
		if (content === undefined || content === null) throw new Error("content is required");

		const dir = dirname(path);
		if (dir && dir !== ".") {
			await mkdir(dir, { recursive: true });
		}
		await writeFile(path, content, "utf-8");
		const lines = content.split("\n").length;
		return JSON.stringify({ path, lines, content });
	},
});
