import { extname } from "node:path";

export function getFiletype(path: string): string | undefined {
	const ext = extname(path).toLowerCase();
	const map: Record<string, string> = {
		".ts": "typescript",
		".mts": "typescript",
		".cts": "typescript",
		".tsx": "typescriptreact",
		".js": "javascript",
		".mjs": "javascript",
		".cjs": "javascript",
		".jsx": "javascriptreact",
		".json": "json",
		".py": "python",
		".rs": "rust",
		".go": "go",
		".html": "html",
		".css": "css",
		".sh": "bash",
		".bash": "bash",
		".zig": "zig",
		".md": "markdown",
		".markdown": "markdown",
	};
	return map[ext];
}

export function isMarkdown(path: string): boolean {
	return getFiletype(path) === "markdown";
}
