import { useEffect, useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { ModelDefinition, ProviderDefinition } from "@/providers/types.ts";
import type { ModelManager } from "@/api/model-manager.ts";
import { theme } from "@/tui/theme.ts";

type Screen = "providers" | "models" | "login";
type Status = "checking" | "connected" | "not connected";

export interface ProviderDialogProps {
	modelManager: ModelManager;
	initialScreen: "providers" | "models";
	onClose: () => void;
	onModelChange: (model: string) => boolean;
}

type ModelRow = {
	provider: ProviderDefinition;
	model: ModelDefinition;
};

const { borders, colors } = theme;

export function ProviderDialog({
	modelManager,
	initialScreen,
	onClose,
	onModelChange,
}: ProviderDialogProps) {
	const providers = modelManager.listProviders();
	const [screen, setScreen] = useState<Screen>(initialScreen);
	const [providerIndex, setProviderIndex] = useState(0);
	const [modelIndex, setModelIndex] = useState(0);
	const [loginProviderId, setLoginProviderId] = useState<string | null>(null);
	const [apiKey, setApiKey] = useState("");
	const [loginError, setLoginError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [query, setQuery] = useState("");
	const [statuses, setStatuses] = useState<Record<string, Status>>(
		Object.fromEntries(providers.map((provider) => [provider.id, "checking"])),
	);

	useEffect(() => {
		let cancelled = false;
		void Promise.all(
			providers.map(async (provider) => [
				provider.id,
				(await modelManager.isAuthenticated(provider.id))
					? "connected"
					: "not connected",
			] as const),
		).then((entries) => {
			if (!cancelled) setStatuses(Object.fromEntries(entries));
		});
		return () => {
			cancelled = true;
		};
	}, [modelManager]);

	const modelRows: ModelRow[] = providers.flatMap((provider) =>
		provider.models
			.filter((model) => {
				const value = `${model.displayName} ${model.id}`.toLowerCase();
				return value.includes(query.toLowerCase());
			})
			.map((model) => ({ provider, model })),
	);

	useEffect(() => {
		if (modelIndex >= modelRows.length) setModelIndex(Math.max(0, modelRows.length - 1));
	}, [modelIndex, modelRows.length]);

	const selectedProvider = providers[providerIndex];
	const selectedModel = modelRows[modelIndex];
	const loginProvider = providers.find((provider) => provider.id === loginProviderId);

	const openLogin = (provider: ProviderDefinition) => {
		setLoginProviderId(provider.id);
		setApiKey("");
		setLoginError(null);
		setScreen("login");
	};

	const selectModel = () => {
		if (!selectedModel) return;
		if (statuses[selectedModel.provider.id] !== "connected") {
			openLogin(selectedModel.provider);
			return;
		}
		if (onModelChange(`${selectedModel.provider.id}/${selectedModel.model.id}`)) {
			onClose();
		}
	};

	const saveApiKey = async () => {
		if (!loginProvider || !apiKey.trim() || saving) return;
		setSaving(true);
		setLoginError(null);
		try {
			await modelManager.login(loginProvider.id, apiKey.trim());
			setStatuses((current) => ({ ...current, [loginProvider.id]: "connected" }));
			setApiKey("");
			setScreen("models");
		} catch (error) {
			setLoginError(error instanceof Error ? error.message : "Could not save API key");
		} finally {
			setSaving(false);
		}
	};

	useKeyboard((key) => {
		if (key.name === "escape") {
			if (screen === "login") {
				setScreen("models");
				setLoginError(null);
			} else {
				onClose();
			}
			return;
		}
		if (screen === "login") return;
		if (key.name === "up" || key.name === "k") {
			if (screen === "providers") {
				setProviderIndex((index) => (index - 1 + providers.length) % providers.length);
			} else if (modelRows.length > 0) {
				setModelIndex((index) => (index - 1 + modelRows.length) % modelRows.length);
			}
		}
		if (key.name === "down" || key.name === "j") {
			if (screen === "providers") {
				setProviderIndex((index) => (index + 1) % providers.length);
			} else if (modelRows.length > 0) {
				setModelIndex((index) => (index + 1) % modelRows.length);
			}
		}
		if (key.name === "return" || key.name === "enter") {
			if (screen === "providers" && selectedProvider) {
				if (statuses[selectedProvider.id] === "connected") {
					setScreen("models");
				} else {
					openLogin(selectedProvider);
				}
			} else if (screen === "models") {
				selectModel();
			}
		}
	});

	return (
		<box
			position="absolute"
			left={3}
			top={2}
			right={3}
			bottom={3}
			zIndex={10}
			flexDirection="column"
			padding={1}
			border={borders.input.sides}
			borderColor={borders.input.color}
			backgroundColor={colors.codeBg}
		>
			{screen === "providers" && (
				<ProviderList
					providers={providers}
					selectedIndex={providerIndex}
					statuses={statuses}
				/>
			)}
			{screen === "models" && (
				<ModelList
					providers={providers}
					modelRows={modelRows}
					selectedIndex={modelIndex}
					statuses={statuses}
					query={query}
					onQueryChange={setQuery}
				/>
			)}
			{screen === "login" && loginProvider && (
				<LoginView
					provider={loginProvider}
					apiKey={apiKey}
					onApiKeyChange={setApiKey}
					onSubmit={() => void saveApiKey()}
					error={loginError}
					saving={saving}
				/>
			)}
		</box>
	);
}

function ProviderList({
	providers,
	selectedIndex,
	statuses,
}: {
	providers: readonly ProviderDefinition[];
	selectedIndex: number;
	statuses: Record<string, Status>;
}) {
	return (
		<>
			<text><span fg={colors.prompt}>Providers</span></text>
			<text fg={colors.textMuted}>Choose a provider. Enter opens its models or setup.</text>
			<box flexDirection="column" marginTop={1}>
				{providers.map((provider, index) => (
					<text key={provider.id}>
						<span fg={index === selectedIndex ? colors.prompt : colors.text}>
							{index === selectedIndex ? "> " : "  "}{provider.displayName}
						</span>
						<span fg={colors.textMuted}>  {statuses[provider.id] ?? "checking"}</span>
					</text>
				))}
			</box>
			<FooterHint text="up/down or j/k  select    enter  continue    esc  close" />
		</>
	);
}

function ModelList({
	providers,
	modelRows,
	selectedIndex,
	statuses,
	query,
	onQueryChange,
}: {
	providers: readonly ProviderDefinition[];
	modelRows: readonly ModelRow[];
	selectedIndex: number;
	statuses: Record<string, Status>;
	query: string;
	onQueryChange: (value: string) => void;
}) {
	let rowIndex = 0;
	return (
		<>
			<text><span fg={colors.prompt}>Models</span></text>
			<text fg={colors.textMuted}>Providers and their preset models. Enter selects a model.</text>
			<input
				marginTop={1}
				width="100%"
				placeholder="filter models"
				value={query}
				onInput={onQueryChange}
				focused
			/>
			<scrollbox flexGrow={1} marginTop={1}>
				{providers.map((provider) => {
					const providerModels = modelRows.filter((row) => row.provider.id === provider.id);
					if (providerModels.length === 0) return null;
					return (
						<box key={provider.id} flexDirection="column" marginBottom={1}>
							<text>
								<span fg={colors.heading}>{provider.displayName}</span>
								<span fg={colors.textMuted}>  {statuses[provider.id] ?? "checking"}</span>
							</text>
							{providerModels.map(({ model }) => {
								const currentIndex = rowIndex++;
								return (
									<text key={`${provider.id}/${model.id}`}>
										<span fg={currentIndex === selectedIndex ? colors.prompt : colors.text}>
											{currentIndex === selectedIndex ? "> " : "  "}{model.displayName}
										</span>
										<span fg={colors.textMuted}>  {model.id}</span>
									</text>
								);
							})}
						</box>
					);
				})}
			</scrollbox>
			<FooterHint text="up/down or j/k  select    enter  use model    esc  close" />
		</>
	);
}

function LoginView({
	provider,
	apiKey,
	onApiKeyChange,
	onSubmit,
	error,
	saving,
}: {
	provider: ProviderDefinition;
	apiKey: string;
	onApiKeyChange: (value: string) => void;
	onSubmit: () => void;
	error: string | null;
	saving: boolean;
}) {
	return (
		<>
			<text><span fg={colors.prompt}>Connect {provider.displayName}</span></text>
			<text fg={colors.textMuted} marginTop={1}>Enter an API key. It is stored in the configured auth file.</text>
			<box flexDirection="row" marginTop={1}>
				<text width={10}>API key</text>
				<input
					flexGrow={1}
					value={apiKey}
					onInput={onApiKeyChange}
					onSubmit={onSubmit}
					focused
				/>
			</box>
			{error && <text fg={colors.error} marginTop={1}>{error}</text>}
			{textStatus(saving ? "Saving..." : "Press enter to save")}
			<FooterHint text="enter  save    esc  back" />
		</>
	);
}

function textStatus(text: string) {
	return <text fg={colors.textMuted} marginTop={1}>{text}</text>;
}

function FooterHint({ text }: { text: string }) {
	return <text fg={colors.textMuted} marginTop={1}>{text}</text>;
}
