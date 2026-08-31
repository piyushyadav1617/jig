import { readFile, writeFile } from "node:fs/promises";
import type { Tool } from "./definition.ts";

export const editTool: Tool = {
	name: "edit",
	description: "Replace an exact string in an existing file.",
	parameters: {
		type: "object",
		properties: {
			path: { type: "string", description: "Path to the file to edit" },
			oldString: { type: "string", description: "Exact text to replace" },
			newString: { type: "string", description: "Replacement text" },
			replaceAll: {
				type: "boolean",
				description: "Replace every match instead of requiring one unique match",
			},
		},
		required: ["path", "oldString", "newString"],
	},
	execute: async (args) => {
		const path = args.path as string;
		const oldString = args.oldString as string;
		const newString = args.newString as string;
		const replaceAll = args.replaceAll === true;
		if (!path) throw new Error("path is required");
		if (!oldString) throw new Error("oldString is required");
		if (newString === undefined || newString === null) {
			throw new Error("newString is required");
		}

		const content = await readFile(path, "utf-8");
		const matches = content.split(oldString).length - 1;
		if (matches === 0) throw new Error("oldString was not found");
		if (!replaceAll && matches > 1) {
			throw new Error(`oldString matched ${matches} times; provide a unique string or set replaceAll`);
		}

		const updated = replaceAll
			? content.replaceAll(oldString, newString)
			: content.replace(oldString, newString);
		await writeFile(path, updated, "utf-8");

		return JSON.stringify({ path, replacements: replaceAll ? matches : 1 });
	},
};
