import {
	createCliRenderer,
	type CliRenderer,
} from "@opentui/core";
import { createRoot } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import type { Bus } from "@/ui/events.ts";
import {
	AssistantMessage,
	ErrorView,
	Logo,
	Spinner,
	StatusView,
	ToolCallView,
	ToolResultView,
	UserInputView,
} from "@/ui/components";
import { theme } from "@/ui/theme.ts";

export interface AppOptions {
	bus: Bus;
	model: string;
}

const { borders } = theme;

type Entry =
	| { kind: "user"; key: number; text: string }
	| { kind: "assistant"; key: number; text: string; streaming: boolean }
	| { kind: "tool_call"; key: number; name: string; args: string }
	| { kind: "tool_result"; key: number; name: string; result: string }
	| { kind: "status"; key: number; text: string }
	| { kind: "error"; key: number; text: string };

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
		name: "read",
		args: JSON.stringify({ path: "src/index.ts" }),
	},
	{
		kind: "tool_result",
		key: 4,
		name: "read",
		result: 'import { foo } from "./bar";\n\nexport function main() {\n  foo();\n}',
	},
	{
		kind: "tool_call",
		key: 5,
		name: "write",
		args: JSON.stringify({
			path: "src/new.ts",
			content: 'import { baz } from "./qux";\n\nexport function run() {\n  baz();\n}',
		}),
	},
	{
		kind: "tool_result",
		key: 6,
		name: "write",
		result: "Wrote 78 characters to src/new.ts",
	},
	{ kind: "status", key: 7, text: "Done." },
];

function CodingAgent({
	bus,
	model,
	onExit,
}: { bus: Bus; model: string; onExit: () => void }) {
	const [entries, setEntries] = useState<Entry[]>([]);
	const [running, setRunning] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const currentAssistantKey = useRef<number | null>(null);
	const assistantBuffer = useRef("");
	const inputRef = useRef<{ focus: () => void } | null>(null);

	useEffect(() => {
		const pushEntry = (entry: Entry) => {
			setEntries((prev) => [...prev, entry]);
		};

		const onTaskStart = () => {
			setRunning(true);
		};

		const onTurnStart = () => {
			assistantBuffer.current = "";
			const key = nextKey();
			currentAssistantKey.current = key;
			pushEntry({ kind: "assistant", key, text: "", streaming: true });
		};

		const onDelta = ({ content }: { content: string }) => {
			assistantBuffer.current += content;
			const key = currentAssistantKey.current;
			if (key === null) return;
			const text = assistantBuffer.current;
			setEntries((prev) =>
				prev.map((e) =>
					e.kind === "assistant" && e.key === key ? { ...e, text } : e,
				),
			);
		};

		const onToolCall = ({
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
				name,
				args,
		});
	};

	const onToolResult = ({
		name,
		result,
	}: {
		id: string;
		name: string;
		result: string;
	}) => {
		pushEntry({
			kind: "tool_result",
			key: nextKey(),
			name,
			result,
		});
	};

		const finishCurrentAssistant = () => {
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
			bus.off("agent:tool_call", onToolCall);
			bus.off("agent:tool_result", onToolResult);
			bus.off("agent:turn_end", onTurnEnd);
			bus.off("agent:task_end", onTaskEnd);
			bus.off("agent:error", onError);
			bus.off("agent:status", onStatus);
		};
	}, [bus]);

	const handleSubmit = (value: string) => {
		if (running) return;
		// TODO: The user might send commands while the agent is still processing a previous request. 
		// We should queue them up and process them in order, rather than ignoring them.
		const input = value.trim();
		setInputValue("");
		if (!input) return;

		if (input === "exit" || input === "quit") {
			setEntries((prev) => [
				...prev,
				{ kind: "status", key: nextKey(), text: "bye." },
			]);
		bus.emit("user:exit");
		setTimeout(() => onExit(), 100);
		return;
		}
		if (input === "clear") {
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

	return (
		<box flexDirection="column" width="100%" height="100%">
			<scrollbox
				flexGrow={1}
				stickyScroll={true}
				stickyStart="bottom"
				padding={1}
				gap={10}
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
						case "tool_call":
							return (
								<ToolCallView
									key={entry.key}
									name={entry.name}
									args={entry.args}
								/>
							);
						case "tool_result":
							return (
								<ToolResultView
									key={entry.key}
									name={entry.name}
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
			<box
				flexDirection="row"
				height={3}
				width="100%"
				style={{
					border: ["top", "bottom"],
					borderColor: borders.input.color,
				}}
			>
				<input
					ref={inputRef as never}
					flexGrow={1}
					focused
					placeholder='ask the agent  (exit to quit, clear to reset)'
					value={inputValue}
					onInput={setInputValue}
					onSubmit={() => handleSubmit(inputValue)}
				/>
			</box>
			<Spinner active={running} />
		</box>
	);
}

export class App {
	private readonly bus: Bus;
	private readonly model: string;
	private renderer?: CliRenderer;

	constructor(options: AppOptions) {
		this.bus = options.bus;
		this.model = options.model;
	}

	stop(): void {
		this.renderer?.destroy();
		process.exit(0);
	}

	async start(): Promise<void> {
		const renderer: CliRenderer = await createCliRenderer({
			exitOnCtrlC: false,
			targetFps: 60,
		});
		this.renderer = renderer;
		renderer.setTerminalTitle(`jig · ${this.model}`);
		createRoot(renderer).render(
			<CodingAgent
				bus={this.bus}
				model={this.model}
				onExit={() => this.stop()}
			/>,
		);
	}
}
