import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export type ApiKeyCredential = {
	type: "api_key";
	key: string;
};

export type OAuthCredential = {
	type: "oauth";
	access: string;
	refresh: string;
	expires: number;
};

export type Credential = ApiKeyCredential | OAuthCredential;
export type AuthFile = Record<string, Credential>;

function defaultAuthPath(): string {
	const configHome =
		process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
	return join(configHome, "jig", "auth.json");
}

function isCredential(value: unknown): value is Credential {
	if (!value || typeof value !== "object") return false;

	const credential = value as Record<string, unknown>;
	if (credential.type === "api_key") {
		return typeof credential.key === "string" && credential.key.length > 0;
	}

	return (
		credential.type === "oauth" &&
		typeof credential.access === "string" &&
		credential.access.length > 0 &&
		typeof credential.refresh === "string" &&
		credential.refresh.length > 0 &&
		typeof credential.expires === "number" &&
		Number.isFinite(credential.expires)
	);
}

function validateCredential(credential: Credential): void {
	if (!isCredential(credential)) {
		throw new Error("invalid provider credential");
	}
}

export class CredentialManager {
	readonly authPath: string;

	constructor(authPath = process.env.JIG_AUTH_FILE ?? defaultAuthPath()) {
		this.authPath = authPath;
	}

	async load(): Promise<AuthFile> {
		try {
			const contents = await readFile(this.authPath, "utf8");
			const parsed: unknown = JSON.parse(contents);
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
				throw new Error("auth.json must contain an object");
			}

			const auth: AuthFile = {};
			for (const [provider, credential] of Object.entries(parsed)) {
				if (!isCredential(credential)) {
					throw new Error(`invalid credential for provider "${provider}"`);
				}
				auth[provider] = credential;
			}
			return auth;
		} catch (error) {
			if ((error as { code?: string }).code === "ENOENT") return {};
			if (error instanceof SyntaxError) {
				throw new Error(`could not parse ${this.authPath}`);
			}
			throw error;
		}
	}

	async get(provider: string): Promise<Credential | undefined> {
		const auth = await this.load();
		return auth[provider];
	}

	async require(provider: string): Promise<Credential> {
		const credential = await this.get(provider);
		if (!credential) {
			throw new Error(
				`provider "${provider}" is not authenticated; add it through the login flow`,
			);
		}
		return credential;
	}

	async login(provider: string, credential: Credential): Promise<void> {
		validateCredential(credential);
		const auth = await this.load();
		auth[provider] = credential;
		await this.save(auth);
	}

	async logout(provider: string): Promise<void> {
		const auth = await this.load();
		if (!(provider in auth)) return;
		delete auth[provider];
		await this.save(auth);
	}

	private async save(auth: AuthFile): Promise<void> {
		await mkdir(dirname(this.authPath), { recursive: true, mode: 0o700 });
		await chmod(dirname(this.authPath), 0o700);

		const temporaryPath = `${this.authPath}.${process.pid}.tmp`;
		await writeFile(temporaryPath, `${JSON.stringify(auth, null, 2)}\n`, {
			encoding: "utf8",
			mode: 0o600,
		});
		await chmod(temporaryPath, 0o600);
		await rename(temporaryPath, this.authPath);
	}
}
