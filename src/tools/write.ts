import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { Tool } from "./definition.ts";

export const writeTool: Tool = {
	name: "write",
	description:
		"Write content to a file at the given path. Creates parent directories if they don't exist. Use relative paths from the current working directory or absolute paths.",
	parameters: {
		type: "object",
		properties: {
			path: { type: "string", description: "Path to the file to write" },
			content: { type: "string", description: "The full content to write to the file" },
		},
		required: ["path", "content"],
	},
	execute: async (args) => {
		const path = args.path as string;
		const content = args.content as string;
		if (!path) throw new Error("path is required");
		if (content === undefined || content === null) throw new Error("content is required");

		const dir = dirname(path);
		if (dir && dir !== ".") {
			await mkdir(dir, { recursive: true });
		}
		await writeFile(path, content, "utf-8");
		return `Wrote ${content.length} characters to ${path}`;
	},
};
