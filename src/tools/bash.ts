import type { Tool } from "./definition.ts";

export const bashTool: Tool = {
	name: "bash",
	description: "Run a shell command and return its exit code, stdout, and stderr.",
	parameters: {
		type: "object",
		properties: {
			command: { type: "string", description: "Shell command to run" },
			cwd: {
				type: "string",
				description: "Working directory for the command. Defaults to the current directory",
			},
		},
		required: ["command"],
	},
	execute: async (args) => {
		const command = args.command as string;
		const cwd = args.cwd as string | undefined;
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
};
