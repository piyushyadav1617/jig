import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Tool } from "./definition.ts";

function globToRegExp(glob: string): RegExp {
	const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`^${escaped.replace(/\*/g, ".*").replace(/\?/g, ".")}$`);
}

export const grepTool: Tool = {
	name: "grep",
	description: "Search file contents with a regular expression.",
	parameters: {
		type: "object",
		properties: {
			pattern: { type: "string", description: "Regular expression to search for" },
			path: {
				type: "string",
				description: "File or directory to search. Defaults to the current directory",
			},
			include: {
				type: "string",
				description: "Optional glob of files to include, such as *.ts",
			},
		},
		required: ["pattern"],
	},
	execute: async (args) => {
		const pattern = args.pattern as string;
		const path = (args.path as string | undefined) ?? ".";
		const include = args.include as string | undefined;
		if (!pattern) throw new Error("pattern is required");

		const expression = new RegExp(pattern);
		const includePattern = include ? globToRegExp(include) : undefined;
		const files: string[] = [];

		async function collectFiles(currentPath: string): Promise<void> {
			const info = await stat(currentPath);
			if (info.isFile()) {
				if (!includePattern || includePattern.test(basename(currentPath))) {
					files.push(currentPath);
				}
				return;
			}
			if (!info.isDirectory()) return;

			for (const entry of await readdir(currentPath, { withFileTypes: true })) {
				const entryPath = join(currentPath, entry.name);
				if (entry.isDirectory()) {
					await collectFiles(entryPath);
				} else if (entry.isFile() && (!includePattern || includePattern.test(entry.name))) {
					files.push(entryPath);
				}
			}
		}

		await collectFiles(path);
		const matches: string[] = [];
		for (const file of files) {
			const content = await readFile(file, "utf-8");
			for (const [index, line] of content.split("\n").entries()) {
				expression.lastIndex = 0;
				if (expression.test(line)) matches.push(`${file}:${index + 1}:${line}`);
			}
		}

		return JSON.stringify({ pattern, path, matches: matches.join("\n") });
	},
};
