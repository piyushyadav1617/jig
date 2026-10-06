import {
	createCliRenderer,
	type CliRenderer,
	type TextareaRenderable,
} from "@opentui/core";
import { createRoot, useKeyboard } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import type { Bus } from "@/events/bus";
import type { ModelManager } from "@/api/model-manager.ts";
import {
	AssistantMessage,
	ErrorView,
	Logo,
	ReasoningView,
	Spinner,
	StatusView,
	ToolCallView,
	UserInputView,
} from "@/tui/components";
import { ProviderDialog } from "@/tui/components/ProviderDialog.tsx";
import { PromptInput } from "@/tui/components/PromptInput.tsx";
import { theme } from "@/tui/theme.ts";

export interface AppOptions {
	bus: Bus;
	model: string;
	modelManager: ModelManager;
	onModelChange: (model: string) => boolean;
	onExit: () => Promise<void>;
}

const { borders } = theme;

type Entry =
	| { kind: "user"; key: number; text: string }
	| { kind: "assistant"; key: number; text: string; streaming: boolean }
	| { kind: "reasoning"; key: number; text: string; streaming: boolean }
	| { kind: "tool_call"; key: number; id: string; name: string; args: string; result?: string }
	| { kind: "status"; key: number; text: string }
	| { kind: "error"; key: number; text: string };

type Command = {
	id: "clear" | "exit" | "esc" | "models" | "providers" | "init";
	name: string;
	description: string;
	aliases?: readonly string[];
};

const commands: readonly Command[] = [
	{ id: "clear", name: "/clear", description: "Clear the conversation", aliases: ["clear"] },
	{ id: "exit", name: "/exit", description: "Exit jig", aliases: ["exit", "quit"] },
	{ id: "esc", name: "/esc", description: "Stop the current task", aliases: ["esc"] },
	{ id: "models", name: "/models", description: "Choose an AI model" },
	{
		id: "providers",
		name: "/providers",
		description: "Configure an AI provider",
		aliases: ["/provider", "provider"],
	},
	{ id: "init", name: "/init", description: "Initialize the workspace" },
];

let entryKey = 0;
const nextKey = () => ++entryKey;

const sampleEntries: Entry[] = [
	{ kind: "user", key: 1, text: "Can you read src/index.ts and write a new file?" },
	{
		kind: "assistant",
		key: 2,
		text: "Sure, let me read the file first.",
		streaming: false,
	},
	{
		kind: "tool_call",
		key: 3,
		id: "sample-read",
		name: "read",
		args: JSON.stringify({ path: "src/index.ts" }),
		result: 'import { foo } from "./bar";\n\nexport function main() {\n  foo();\n}',
	},
	{
		kind: "tool_call",
		key: 5,
		id: "sample-write",
		name: "write",
		args: JSON.stringify({
			path: "src/new.ts",
			content: 'import { baz } from "./qux";\n\nexport function run() {\n  baz();\n}',
		}),
		result: "Wrote 78 characters to src/new.ts",
	},
	{ kind: "status", key: 7, text: "Done." },
];

function CodingAgent({
	bus,
	model,
	modelManager,
	onModelChange,
	onExit,
}: {
	bus: Bus;
	model: string;
	modelManager: ModelManager;
	onModelChange: (model: string) => boolean;
	onExit: () => void;
}) {
	const [entries, setEntries] = useState<Entry[]>([]);
	const [running, setRunning] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const [commandIndex, setCommandIndex] = useState(0);
	const [activeModel, setActiveModel] = useState(model);
	const [dialog, setDialog] = useState<"provider" | "models" | null>(null);
	const currentAssistantKey = useRef<number | null>(null);
	const assistantBuffer = useRef("");
	const reasoningKeys = useRef(new Map<string, number>());
	const inputRef = useRef<TextareaRenderable | null>(null);
	const commandSuggestions = inputValue.startsWith("/")
		? commands.filter((command) =>
				command.name.startsWith(inputValue.toLowerCase()),
			)
		: [];
	const selectedCommand = commandSuggestions[commandIndex];

	useEffect(() => {
		if (commandIndex >= commandSuggestions.length) {
			setCommandIndex(Math.max(0, commandSuggestions.length - 1));
		}
	}, [commandIndex, commandSuggestions.length]);

	useKeyboard((key) => {
		if (key.ctrl && key.name === "c") {
			key.preventDefault();
			onExit();
			return;
		}
		if (key.name === "escape" && !dialog) {
			key.preventDefault();
			bus.emit("user:cancel");
			return;
		}
		if (dialog || commandSuggestions.length === 0) return;
		if (key.name === "up") {
			key.preventDefault();
			setCommandIndex(
				(index) => (index - 1 + commandSuggestions.length) % commandSuggestions.length,
			);
		}
		if (key.name === "down") {
			key.preventDefault();
			setCommandIndex((index) => (index + 1) % commandSuggestions.length);
		}
	});

	useEffect(() => {
		const pushEntry = (entry: Entry) => {
			setEntries((prev) => [...prev, entry]);
		};

		const onTaskStart = () => {
			setRunning(true);
		};

		const onTurnStart = () => {
			assistantBuffer.current = "";
			currentAssistantKey.current = null;
			reasoningKeys.current.clear();
		};

		const onDelta = ({ content }: { content: string }) => {
			assistantBuffer.current += content;
			let key = currentAssistantKey.current;
			const text = assistantBuffer.current;
			if (key === null) {
				key = nextKey();
				currentAssistantKey.current = key;
				pushEntry({ kind: "assistant", key, text, streaming: true });
				return;
			}
			setEntries((prev) =>
				prev.map((e) =>
					e.kind === "assistant" && e.key === key ? { ...e, text } : e,
				),
			);
		};

		const onReasoningStart = ({ id }: { id: string }) => {
			if (reasoningKeys.current.has(id)) return;
			const key = nextKey();
			reasoningKeys.current.set(id, key);
			pushEntry({ kind: "reasoning", key, text: "", streaming: true });
		};

		const onReasoningDelta = ({ id, content }: { id: string; content: string }) => {
			onReasoningStart({ id });
			const key = reasoningKeys.current.get(id);
			setEntries((prev) => prev.map((entry) =>
				entry.kind === "reasoning" && entry.key === key
					? { ...entry, text: entry.text + content }
					: entry,
			));
		};

		const onReasoningEnd = ({ id }: { id: string }) => {
			const key = reasoningKeys.current.get(id);
			setEntries((prev) => prev.map((entry) =>
				entry.kind === "reasoning" && entry.key === key
					? { ...entry, streaming: false }
					: entry,
			));
			reasoningKeys.current.delete(id);
		};

		const onToolCall = ({
			id,
			name,
			arguments: args,
		}: {
			id: string;
			name: string;
			arguments: string;
		}) => {
			pushEntry({
				kind: "tool_call",
				key: nextKey(),
				id,
				name,
				args,
			});
		};

		const onToolResult = ({
			id,
			name,
			result,
		}: {
			id: string;
			name: string;
			result: string;
		}) => {
			const key = nextKey();
			setEntries((prev) => {
				const call = prev.find((entry) => entry.kind === "tool_call" && entry.id === id);
				if (!call) {
					return [...prev, { kind: "tool_call", key, id, name, args: "", result }];
				}
				return prev.map((entry) => entry === call ? { ...entry, result } : entry);
			});
		};

		const finishCurrentAssistant = () => {
			const keys = new Set(reasoningKeys.current.values());
			if (keys.size > 0) {
				setEntries((prev) => prev.map((entry) =>
					entry.kind === "reasoning" && keys.has(entry.key)
						? { ...entry, streaming: false }
						: entry,
				));
				reasoningKeys.current.clear();
			}
			const key = currentAssistantKey.current;
			if (key !== null) {
				setEntries((prev) =>
					prev.map((e) =>
						e.kind === "assistant" && e.key === key
							? { ...e, streaming: false }
							: e,
					),
				);
			}
			currentAssistantKey.current = null;
			assistantBuffer.current = "";
		};

		const onTurnEnd = () => {
			finishCurrentAssistant();
		};

		const onTaskEnd = () => {
			finishCurrentAssistant();
			setRunning(false);
		};

		const onError = ({ error }: { error: string }) => {
			finishCurrentAssistant();
			pushEntry({ kind: "error", key: nextKey(), text: error });
			setRunning(false);
		};

		const onStatus = ({ status }: { status: string }) => {
			pushEntry({ kind: "status", key: nextKey(), text: status });
		};

		bus.on("agent:task_start", onTaskStart);
		bus.on("agent:turn_start", onTurnStart);
		bus.on("agent:delta", onDelta);
		bus.on("agent:reasoning_start", onReasoningStart);
		bus.on("agent:reasoning_delta", onReasoningDelta);
		bus.on("agent:reasoning_end", onReasoningEnd);
		bus.on("agent:tool_call", onToolCall);
		bus.on("agent:tool_result", onToolResult);
		bus.on("agent:turn_end", onTurnEnd);
		bus.on("agent:task_end", onTaskEnd);
		bus.on("agent:error", onError);
		bus.on("agent:status", onStatus);

		return () => {
			bus.off("agent:task_start", onTaskStart);
			bus.off("agent:turn_start", onTurnStart);
			bus.off("agent:delta", onDelta);
			bus.off("agent:reasoning_start", onReasoningStart);
			bus.off("agent:reasoning_delta", onReasoningDelta);
			bus.off("agent:reasoning_end", onReasoningEnd);
			bus.off("agent:tool_call", onToolCall);
			bus.off("agent:tool_result", onToolResult);
			bus.off("agent:turn_end", onTurnEnd);
			bus.off("agent:task_end", onTaskEnd);
			bus.off("agent:error", onError);
			bus.off("agent:status", onStatus);
		};
	}, [bus]);

	const handleSubmit = (value: string) => {
		const input = value.trim();
		if (!input) return;
		const command = commands.find(
			(candidate) =>
				candidate.name === input || candidate.aliases?.includes(input),
		);
		if (command?.id === "exit") {
			onExit();
			return;
		}
		if (command?.id === "esc") {
			inputRef.current?.clear();
			setInputValue("");
			bus.emit("user:cancel");
			return;
		}
		if (running) return;
		inputRef.current?.clear();
		setInputValue("");
		if (command?.id === "providers") {
			setDialog("provider");
			return;
		}
		if (command?.id === "models") {
			setDialog("models");
			return;
		}
		if (command?.id === "init") {
			// Reserved: initialize the workspace. No action for now.
			return;
		}

		if (command?.id === "clear") {
			setEntries([]);
			bus.emit("user:clear");
			return;
		}

		setEntries((prev) => [
			...prev,
			{ kind: "user", key: nextKey(), text: input },
		]);
		bus.emit("user:input", input);
	};

	const handleModelChange = (nextModel: string): boolean => {
		if (!onModelChange(nextModel)) return false;
		setActiveModel(nextModel);
		return true;
	};

	return (
		<box position="relative" flexDirection="column" width="100%" height="100%">
			<scrollbox
				flexGrow={1}
				stickyScroll={true}
				stickyStart="bottom"
				padding={1}
				contentOptions={{ gap: 1 }}
			>
				<Logo/>
				{entries.map((entry) => {
					switch (entry.kind) {
						case "user":
							return (
								<UserInputView key={entry.key} text={entry.text} />
							);
						case "assistant":
							return (
								<AssistantMessage
									key={entry.key}
									text={entry.text}
									streaming={entry.streaming}
								/>
							);
						case "reasoning":
							return (
								<ReasoningView
									key={entry.key}
									text={entry.text}
									streaming={entry.streaming}
								/>
							);
						case "tool_call":
							return (
								<ToolCallView
									key={entry.key}
									name={entry.name}
									args={entry.args}
									result={entry.result}
								/>
							);
						case "status":
							return <StatusView key={entry.key} text={entry.text} />;
						case "error":
							return <ErrorView key={entry.key} text={entry.text} />;
					}
				})}
			</scrollbox>
			<PromptInput
				inputRef={inputRef}
				focused={!dialog}
				onChange={(value) => {
					setInputValue(value);
					setCommandIndex(0);
				}}
				onSubmit={(value) => {
					handleSubmit(value === inputValue ? selectedCommand?.name ?? value : value);
				}}
			>
				{commandSuggestions.length > 0 && (
					<CommandDropdown commands={commandSuggestions} selectedIndex={commandIndex} />
				)}
			</PromptInput>
			<box
				flexDirection="row"
				height={1}
				width="100%"
			>
				<box flexGrow={1}>{running && <Spinner />}</box>
				<text>{activeModel}</text>
			</box>
			{dialog && (
				<ProviderDialog
					modelManager={modelManager}
					initialScreen={dialog === "provider" ? "providers" : "models"}
					onClose={() => setDialog(null)}
					onModelChange={handleModelChange}
				/>
			)}
		</box>
	);
}

function CommandDropdown({
	commands,
	selectedIndex,
}: {
	commands: readonly Command[];
	selectedIndex: number;
}) {
	return (
		<box
			position="absolute"
			left={2}
			bottom="100%"
			marginBottom={1}
			zIndex={5}
			flexDirection="column"
			width={48}
			paddingLeft={1}
			paddingRight={1}
			backgroundColor={theme.colors.codeBg}
			overflow="hidden"
			// Header, visible commands, and the two border rows.
			height={commands.length + 3}
			style={{
				border: ["top", "right", "bottom", "left"],
				borderColor: borders.input.color,
			}}
		>
			<text height={1}>
				<span fg={theme.colors.textMuted}>Commands</span>
			</text>
			<select
				width="100%"
				height={commands.length}
				options={commands.map((command) => ({
					name: command.name,
					description: command.description,
					value: command.id,
				}))}
				selectedIndex={selectedIndex}
				focused={false}
				showDescription={false}
				backgroundColor={theme.select.background}
				textColor={theme.select.text}
				focusedBackgroundColor={theme.select.focusedBackground}
				focusedTextColor={theme.select.focusedText}
				selectedBackgroundColor={theme.select.selectedBackground}
				selectedTextColor={theme.select.selectedText}
				descriptionColor={theme.select.description}
				selectedDescriptionColor={theme.select.selectedDescription}
			/>
		</box>
	);
}

export class App {
	private readonly bus: Bus;
	private readonly model: string;
	private readonly modelManager: ModelManager;
	private readonly onModelChange: (model: string) => boolean;
	private renderer?: CliRenderer;
	private readonly onExit: () => Promise<void>;
	private stopping?: Promise<void>;

	constructor(options: AppOptions) {
		this.bus = options.bus;
		this.model = options.model;
		this.modelManager = options.modelManager;
		this.onModelChange = options.onModelChange;
		this.onExit = options.onExit;
	}

	stop(): Promise<void> {
		return this.stopping ??= (async () => {
			this.bus.emit("user:exit");
			try {
				await this.onExit();
			} finally {
				process.off("SIGINT", this.handleSignal);
				process.off("SIGTERM", this.handleSignal);
				this.renderer?.destroy();
			}
		})();
	}

	private readonly handleSignal = () => { void this.stop(); };

	async start(): Promise<void> {
		const renderer: CliRenderer = await createCliRenderer({
			exitOnCtrlC: false,
			targetFps: 60,
		});
		this.renderer = renderer;
		process.on("SIGINT", this.handleSignal);
		process.on("SIGTERM", this.handleSignal);
		renderer.setTerminalTitle(`jig · ${this.model}`);
		createRoot(renderer).render(
			<CodingAgent
				bus={this.bus}
				model={this.model}
				modelManager={this.modelManager}
				onModelChange={this.onModelChange}
				onExit={() => { void this.stop(); }}
			/>,
		);
	}
}
