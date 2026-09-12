import { tool } from "ai";
import { z } from "zod";

export const bashTool = tool({
	description: "Run a shell command and return its exit code, stdout, and stderr.",
	inputSchema: z.object({
		command: z.string().describe("Shell command to run"),
		cwd: z
			.string()
			.optional()
			.describe("Working directory for the command. Defaults to the current directory"),
	}),
	execute: async ({ command, cwd }) => {
		if (!command) throw new Error("command is required");

		const child = Bun.spawn(["/bin/bash", "-lc", command], {
			cwd: cwd ?? globalThis.process.cwd(),
			stdout: "pipe",
			stderr: "pipe",
		});
		const [exitCode, stdout, stderr] = await Promise.all([
			child.exited,
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
		]);

		return JSON.stringify({ command, exitCode, stdout, stderr });
	},
});
