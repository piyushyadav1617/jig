import { dirname, join } from "node:path";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";

const CONFIG_HOME = dirname(homedir()) + "/.config";
const CONTEXT_DIR = join(CONFIG_HOME, "jig", "contexts");
const CONTEXTS_FILE = join(CONTEXT_DIR, "contexts.json");

export interface Context {
	id: string;
	name: string;
	transcript: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface ContextManager {
	load(contextId: string): Context | null;
	save(context: Context): Promise<void>;
	list(): Promise<Context[]>;
	delete(contextId: string): Promise<void>;
	rename(oldId: string, newId: string): Promise<void>;
	clear(): Promise<void>;
}

export class ContextManager implements ContextManager {
	constructor() {}

	async ensureDirectory(): Promise<void> {
		try {
			await mkdir(CONTEXT_DIR, { recursive: true, mode: 0o700 });
		} catch (error) {
			if ((error as { code?: string }).code !== "EEXIST") throw error;
		}
	}

	async load(contextId: string): Promise<Context | null> {
		await this.ensureDirectory();
		try {
			const data = await readFile(CONTEXTS_FILE, "utf8");
			if (!data) return null;
			const contexts = JSON.parse(data) as Context[];
			const ctx = contexts.find((c) => c.id === contextId);
			if (!ctx) return null;
			return ctx;
		} catch (error) {
			if ((error as { code?: string }).code === "ENOENT") return null;
			console.warn(`Failed to load context "${contextId}": ${error}`);
			return null;
		}
	}

	async save(context: Context): Promise<void> {
		await this.ensureDirectory();
		const tmp = `${CONTEXTS_FILE}.${process.pid}.tmp`;
		let contexts: Context[] = [];
		try {
			const data = await readFile(CONTEXTS_FILE, "utf8");
			if (data) contexts = JSON.parse(data) as Context[];
		} catch (_) {
			// File doesn't exist or invalid JSON, start fresh
		}
		// Remove existing context with same ID
		contexts = contexts.filter((c) => c.id !== context.id);
		contexts.push(context);
		await writeFile(tmp, `${JSON.stringify(contexts, null, 2)}\n`, {
			encoding: "utf8",
			mode: 0o600,
		});
		await rename(tmp, CONTEXTS_FILE);
	}

	async list(): Promise<Context[]> {
		await this.ensureDirectory();
		try {
			const data = await readFile(CONTEXTS_FILE, "utf8");
			if (!data) return [];
			const contexts = JSON.parse(data) as Context[];
			return contexts.filter((c) => c.id && c.transcript.length > 0);
		} catch (error) {
			if ((error as { code?: string }).code === "ENOENT") return [];
			return [];
		}
	}

	async delete(contextId: string): Promise<void> {
		await this.ensureDirectory();
		try {
			const data = await readFile(CONTEXTS_FILE, "utf8");
			if (!data) return;
			let contexts: Context[] = JSON.parse(data) as Context[];
			const filtered = contexts.filter((c) => c.id !== contextId);
			if (filtered.length === contexts.length) return; // Nothing to delete
			const tmp = `${CONTEXTS_FILE}.${process.pid}.tmp`;
			await writeFile(tmp, `${JSON.stringify(filtered, null, 2)}\n`, {
				encoding: "utf8",
				mode: 0o600,
			});
			await rename(tmp, CONTEXTS_FILE);
		} catch (error) {
			if ((error as { code?: string }).code === "ENOENT") return;
			throw error;
		}
	}

	async rename(oldId: string, newId: string): Promise<void> {
		await this.ensureDirectory();
		const oldContext = await this.load(oldId);
		if (!oldContext) throw new Error(`Context "${oldId}" not found`);
		try {
			const data = await readFile(CONTEXTS_FILE, "utf8");
			if (!data) throw new Error(`No contexts found`);
			let contexts: Context[] = JSON.parse(data) as Context[];
			const duplicate = contexts.find(
				(c) => c.id === newId && c.id !== oldId
			);
			if (duplicate) throw new Error(`Context "${newId}" already exists`);
			contexts = contexts.map((c) =>
				c.id === oldId ? { ...c, id: newId } : c
			);
			const tmp = `${CONTEXTS_FILE}.${process.pid}.tmp`;
			await writeFile(tmp, `${JSON.stringify(contexts, null, 2)}\n`, {
				encoding: "utf8",
				mode: 0o600,
			});
			await rename(tmp, CONTEXTS_FILE);
		} catch (error) {
			if ((error as { code?: string }).code === "ENOENT") throw new Error(`Context "${oldId}" not found`);
			throw error;
		}
	}

	async clear(): Promise<void> {
		await this.ensureDirectory();
		try {
			const data = await readFile(CONTEXTS_FILE, "utf8");
			if (!data) return;
			const tmp = `${CONTEXTS_FILE}.${process.pid}.tmp`;
			await writeFile(tmp, "[]\n", {
				encoding: "utf8",
				mode: 0o600,
			});
			await rename(tmp, CONTEXTS_FILE);
		} catch (error) {
			if ((error as { code?: string }).code === "ENOENT") return;
			throw error;
		}
	}
}
