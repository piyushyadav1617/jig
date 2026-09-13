import { useEffect, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { ProviderDefinition } from "@/providers/types.ts";
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

type ModelGroup = {
	provider: ProviderDefinition;
	options: ModelSelectOption[];
};

type ModelSelectOption = {
	name: string;
	description: string;
	value: {
		providerId: string;
		modelId: string;
	};
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
	const [activeGroupIndex, setActiveGroupIndex] = useState(0);
	const [selectedModelIndexes, setSelectedModelIndexes] = useState<number[]>([]);
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

	const modelGroups: ModelGroup[] = providers.flatMap((provider) => {
		const options = provider.models
			.filter((model) => {
				const value = `${model.displayName} ${model.id}`.toLowerCase();
				return value.includes(query.toLowerCase());
			})
			.map((model) => ({
				name: model.displayName,
				description: model.id,
				value: { providerId: provider.id, modelId: model.id },
			}));
		return options.length > 0 ? [{ provider, options }] : [];
	});

	useEffect(() => {
		setSelectedModelIndexes((current) =>
			modelGroups.map((group, index) =>
				Math.min(current[index] ?? 0, group.options.length - 1),
			),
		);
		if (activeGroupIndex >= modelGroups.length) {
			setActiveGroupIndex(Math.max(0, modelGroups.length - 1));
		}
	}, [activeGroupIndex, modelGroups.length]);

	const loginProvider = providers.find((provider) => provider.id === loginProviderId);

	const openLogin = (provider: ProviderDefinition) => {
		setLoginProviderId(provider.id);
		setApiKey("");
		setLoginError(null);
		setScreen("login");
	};

	const selectModel = (option: ModelSelectOption | null) => {
		const value = option?.value;
		if (!value) return;
		const provider = providers.find((item) => item.id === value.providerId);
		if (!provider) return;
		if (statuses[provider.id] !== "connected") {
			openLogin(provider);
			return;
		}
		if (onModelChange(`${provider.id}/${value.modelId}`)) {
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
	});

	return (
		<box
			position="absolute"
			left={0}
			top={0}
			width="100%"
			height="100%"
			justifyContent="center"
			alignItems="center"
			zIndex={10}
		>
			<box
				width={72}
				height={screen === "providers" ? 14 : screen === "models" ? 20 : 14}
				flexDirection="column"
				padding={1}
				border={["top", "right", "bottom", "left"]}
				borderColor={borders.input.color}
				backgroundColor={colors.codeBg}
				overflow="hidden"
			>
			{screen === "providers" && (
				<ProviderList
					providers={providers}
					selectedIndex={providerIndex}
					statuses={statuses}
					onChange={setProviderIndex}
					onSelect={(index) => {
						const provider = providers[index];
						if (!provider) return;
						if (statuses[provider.id] === "connected") {
							setScreen("models");
						} else {
							openLogin(provider);
						}
					}}
				/>
			)}
			{screen === "models" && (
				<ModelList
					groups={modelGroups}
					activeGroupIndex={activeGroupIndex}
					selectedIndexes={selectedModelIndexes}
					query={query}
					onQueryChange={(value) => {
						setQuery(value);
						setActiveGroupIndex(0);
						setSelectedModelIndexes([]);
					}}
					onGroupChange={(groupIndex, modelIndex) => {
						setActiveGroupIndex(groupIndex);
						setSelectedModelIndexes((current) => {
							const next = [...current];
							next[groupIndex] = modelIndex;
							return next;
						});
					}}
					onSelect={selectModel}
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
		</box>
	);
}

function ProviderList({
	providers,
	selectedIndex,
	statuses,
	onChange,
	onSelect,
}: {
	providers: readonly ProviderDefinition[];
	selectedIndex: number;
	statuses: Record<string, Status>;
	onChange: (index: number) => void;
	onSelect: (index: number) => void;
}) {
	const options = providers.map((provider) => ({
		name: provider.displayName,
		description: `${statuses[provider.id] ?? "checking"} · ${provider.description}`,
		value: provider.id,
	}));

	return (
		<>
			<text><span fg={colors.prompt}>Providers</span></text>
			<text fg={colors.textMuted}>Choose a provider. Enter opens its models or setup.</text>
			<select
				flexGrow={1}
				marginTop={1}
				height={5}
				options={options}
				selectedIndex={selectedIndex}
				focused
				showScrollIndicator
				backgroundColor={theme.select.background}
				textColor={theme.select.text}
				focusedBackgroundColor={theme.select.focusedBackground}
				focusedTextColor={theme.select.focusedText}
				selectedBackgroundColor={theme.select.selectedBackground}
				selectedTextColor={theme.select.selectedText}
				descriptionColor={theme.select.description}
				selectedDescriptionColor={theme.select.selectedDescription}
				onChange={(index) => onChange(index)}
				onSelect={(index) => onSelect(index)}
			/>
			<FooterHint text="up/down or j/k  select    enter  continue    esc  close" />
		</>
	);
}

function ModelList({
	groups,
	activeGroupIndex,
	selectedIndexes,
	query,
	onQueryChange,
	onGroupChange,
	onSelect,
}: {
	groups: ModelGroup[];
	activeGroupIndex: number;
	selectedIndexes: number[];
	query: string;
	onQueryChange: (value: string) => void;
	onGroupChange: (groupIndex: number, modelIndex: number) => void;
	onSelect: (option: ModelSelectOption | null) => void;
}) {
	const [focusSearch, setFocusSearch] = useState(false);
	const modelListRef = useRef<{
		scrollChildIntoView: (id: string) => void;
	} | null>(null);

	useEffect(() => {
		modelListRef.current?.scrollChildIntoView(`model-group-${activeGroupIndex}`);
	}, [activeGroupIndex]);

	useKeyboard((key) => {
		if (key.name === "tab") setFocusSearch((focused) => !focused);
		if (focusSearch) return;

		const group = groups[activeGroupIndex];
		if (!group) return;
		const selectedIndex = selectedIndexes[activeGroupIndex] ?? 0;
		if (key.name === "down" || key.name === "j") {
			if (selectedIndex < group.options.length - 1) {
				onGroupChange(activeGroupIndex, selectedIndex + 1);
			} else if (activeGroupIndex < groups.length - 1) {
				onGroupChange(activeGroupIndex + 1, 0);
			}
		}
		if (key.name === "up" || key.name === "k") {
			if (selectedIndex > 0) {
				onGroupChange(activeGroupIndex, selectedIndex - 1);
			} else if (activeGroupIndex > 0) {
				const previousGroupIndex = activeGroupIndex - 1;
				onGroupChange(
					previousGroupIndex,
					Math.max(0, (groups[previousGroupIndex]?.options.length ?? 1) - 1),
				);
			}
		}
		if (key.name === "enter" || key.name === "return") {
			onSelect(group.options[selectedIndex] ?? null);
		}
	});

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
				focused={focusSearch}
			/>
			<scrollbox ref={modelListRef as never} height={9} marginTop={1}>
				{groups.map((group, groupIndex) => (
					<box
						key={group.provider.id}
						id={`model-group-${groupIndex}`}
						flexDirection="column"
						marginBottom={1}
					>
						<text height={1} fg={colors.textMuted}>
							{group.provider.displayName}
						</text>
						<select
							width="100%"
							height={group.options.length}
							options={group.options}
							selectedIndex={selectedIndexes[groupIndex] ?? 0}
							focused={false}
							showSelectionIndicator={false}
							showDescription={false}
							backgroundColor={theme.select.background}
							textColor={theme.select.text}
							focusedBackgroundColor={theme.select.focusedBackground}
							focusedTextColor={theme.select.focusedText}
							selectedBackgroundColor={
								groupIndex === activeGroupIndex
									? theme.select.selectedBackground
									: theme.select.background
							}
							selectedTextColor={
								groupIndex === activeGroupIndex
									? theme.select.selectedText
									: theme.select.text
							}
							descriptionColor={theme.select.description}
							selectedDescriptionColor={
								groupIndex === activeGroupIndex
									? theme.select.selectedDescription
									: theme.select.description
							}
							onChange={(index) => onGroupChange(groupIndex, index)}
							onSelect={(_, option) => onSelect(option as ModelSelectOption | null)}
						/>
					</box>
				))}
			</scrollbox>
			<FooterHint text="up/down or j/k  select    tab  search    enter  use model    esc  close" />
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
