import { tool } from "ai";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { z } from "zod";
import { FILE_TOOL_TIMEOUT_MS, withToolSignal } from "./execution.ts";

function globToRegExp(glob: string): RegExp {
	const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`^${escaped.replace(/\*/g, ".*").replace(/\?/g, ".")}$`);
}

export const grepTool = tool({
	description: "Search file contents with a regular expression.",
	inputSchema: z.object({
		pattern: z.string().describe("Regular expression to search for"),
		path: z
			.string()
			.optional()
			.describe("File or directory to search. Defaults to the current directory"),
		include: z
			.string()
			.optional()
			.describe("Optional glob of files to include, such as *.ts"),
	}),
	execute: async ({ pattern, path = ".", include }, { abortSignal }) => withToolSignal(abortSignal, FILE_TOOL_TIMEOUT_MS, async (signal) => {
		if (!pattern) throw new Error("pattern is required");

		const expression = new RegExp(pattern);
		const includePattern = include ? globToRegExp(include) : undefined;
		const files: string[] = [];

		async function collectFiles(currentPath: string): Promise<void> {
			signal.throwIfAborted();
			const info = await stat(currentPath);
			if (info.isFile()) {
				if (!includePattern || includePattern.test(basename(currentPath))) {
					files.push(currentPath);
				}
				return;
			}
			if (!info.isDirectory()) return;

			for (const entry of await readdir(currentPath, { withFileTypes: true })) {
				signal.throwIfAborted();
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
			signal.throwIfAborted();
			const content = await readFile(file, { encoding: "utf-8", signal });
			for (const [index, line] of content.split("\n").entries()) {
				if (index % 256 === 0) {
					await new Promise<void>((resolve) => setImmediate(resolve));
					signal.throwIfAborted();
				}
				expression.lastIndex = 0;
				if (expression.test(line)) matches.push(`${file}:${index + 1}:${line}`);
			}
		}

		return JSON.stringify({ pattern, path, matches: matches.join("\n") });
	}),
});
