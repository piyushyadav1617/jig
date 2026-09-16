import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

type JigConfig = {
	defaultModel?: string;
};

function defaultConfigPath(): string {
	const configHome =
		process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
	return join(configHome, "jig", "config.json");
}

function isConfig(value: unknown): value is JigConfig {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

export class ConfigManager {
	readonly configPath: string;

	constructor(configPath = process.env.JIG_CONFIG_FILE ?? defaultConfigPath()) {
		this.configPath = configPath;
	}

	async getDefaultModel(): Promise<string | undefined> {
		const config = await this.load();
		return typeof config.defaultModel === "string" && config.defaultModel.length > 0
			? config.defaultModel
			: undefined;
	}

	async setDefaultModel(model: string): Promise<void> {
		const config = await this.load();
		config.defaultModel = model;
		await this.save(config);
	}

	private async load(): Promise<JigConfig> {
		try {
			const contents = await readFile(this.configPath, "utf8");
			const parsed: unknown = JSON.parse(contents);
			if (!isConfig(parsed)) {
				throw new Error("config.json must contain an object");
			}
			return parsed;
		} catch (error) {
			if ((error as { code?: string }).code === "ENOENT") return {};
			if (error instanceof SyntaxError) {
				throw new Error(`could not parse ${this.configPath}`);
			}
			throw error;
		}
	}

	private async save(config: JigConfig): Promise<void> {
		await mkdir(dirname(this.configPath), { recursive: true, mode: 0o700 });
		await chmod(dirname(this.configPath), 0o700);

		const temporaryPath = `${this.configPath}.${process.pid}.tmp`;
		await writeFile(temporaryPath, `${JSON.stringify(config, null, 2)}\n`, {
			encoding: "utf8",
			mode: 0o600,
		});
		await chmod(temporaryPath, 0o600);
		await rename(temporaryPath, this.configPath);
	}
}
