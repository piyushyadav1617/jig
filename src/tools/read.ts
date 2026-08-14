import { readFile } from "node:fs/promises";
import type { Tool } from "./definition.ts";

export const readTool: Tool = {
	name: "read",
	description: "Read the full contents of a file at the given path.",
	parameters: {
		type: "object",
		properties: {
			path: { type: "string", description: "Path to the file to read" },
		},
		required: ["path"],
	},
	execute: async (args) => {
		const path = args.path as string;
		if (!path) throw new Error("path is required");
		const content = await readFile(path, "utf-8");
		return content;
	},
};
