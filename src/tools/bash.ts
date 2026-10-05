import { tool } from "ai";
import { z } from "zod";
import { BASH_TOOL_TIMEOUT_MS, withToolSignal } from "./execution.ts";

export const bashTool = tool({
	description: "Run a shell command and return its exit code, stdout, and stderr.",
	inputSchema: z.object({
		command: z.string().describe("Shell command to run"),
		timeout: z.number().int().positive().max(2_147_483_647).optional()
			.describe("Timeout in milliseconds. Defaults to 120000"),
		cwd: z
			.string()
			.optional()
			.describe("Working directory for the command. Defaults to the current directory"),
	}),
	execute: async ({ command, cwd, timeout = BASH_TOOL_TIMEOUT_MS }, { abortSignal }) => withToolSignal(abortSignal, timeout, async (signal) => {
		if (!command) throw new Error("command is required");

		const child = Bun.spawn(["/bin/bash", "-lc", command], {
			cwd: cwd ?? globalThis.process.cwd(),
			stdout: "pipe",
			stderr: "pipe",
			detached: true,
		});
		const kill = () => {
			try {
				// The detached shell owns a process group, including its descendants.
				process.kill(-child.pid, "SIGKILL");
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "ESRCH") child.kill("SIGKILL");
			}
		};
		signal.addEventListener("abort", kill, { once: true });
		if (signal.aborted) kill();
		try {
			const [exitCode, stdout, stderr] = await Promise.all([
				child.exited,
				new Response(child.stdout).text(),
				new Response(child.stderr).text(),
			]);
			return JSON.stringify({ command, exitCode, stdout, stderr });
		} finally {
			kill();
			await child.exited;
			signal.removeEventListener("abort", kill);
		}
	}),
});
