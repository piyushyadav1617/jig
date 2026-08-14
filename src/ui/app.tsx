import { createCliRenderer, type CliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import type { Bus } from "@/ui/events.ts";

export interface AppOptions {
	bus: Bus;
	model: string;
}

type Entry =
	| { kind: "user"; key: number; text: string }
	| { kind: "assistant"; key: number; text: string }
	| { kind: "tool_call"; key: number; name: string; args: string }
	| { kind: "tool_result"; key: number; name: string; result: string }
	| { kind: "status"; key: number; text: string }
	| { kind: "error"; key: number; text: string };

let entryKey = 0;
const nextKey = () => ++entryKey;

const trim = (s: string, max: number) =>
	s.length > max ? `${s.slice(0, max)}…` : s;

function CodingAgent({ bus, model }: { bus: Bus; model: string }) {
	const [entries, setEntries] = useState<Entry[]>([
		{ kind: "status", key: 0, text: `jig · model: ${model}` },
	]);
	const [running, setRunning] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const currentAssistantKey = useRef<number | null>(null);
	const assistantBuffer = useRef("");
	const inputRef = useRef<{ focus: () => void } | null>(null);

	useEffect(() => {
		const pushEntry = (entry: Entry) => {
			setEntries((prev) => [...prev, entry]);
		};

		const onTurnStart = () => {
			setRunning(true);
			assistantBuffer.current = "";
			const key = nextKey();
			currentAssistantKey.current = key;
			pushEntry({ kind: "assistant", key, text: "" });
		};

		const onDelta = ({ content }: { content: string }) => {
			assistantBuffer.current += content;
			const key = currentAssistantKey.current;
			if (key === null) return;
			const text = assistantBuffer.current;
			setEntries((prev) =>
				prev.map(function (entry){
					return entry
				}),
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
				args: trim(args, 80),
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
				result: trim(result, 200),
			});
		};

		const onTurnEnd = () => {
			currentAssistantKey.current = null;
			assistantBuffer.current = "";
		};

		const onDone = () => {
			setRunning(false);
		};

		const onError = ({ error }: { error: string }) => {
			pushEntry({ kind: "error", key: nextKey(), text: error });
			setRunning(false);
		};

		const onStatus = ({ status }: { status: string }) => {
			pushEntry({ kind: "status", key: nextKey(), text: status });
		};

		bus.on("agent:turn_start", onTurnStart);
		bus.on("agent:delta", onDelta);
		bus.on("agent:tool_call", onToolCall);
		bus.on("agent:tool_result", onToolResult);
		bus.on("agent:turn_end", onTurnEnd);
		bus.on("agent:done", onDone);
		bus.on("agent:error", onError);
		bus.on("agent:status", onStatus);

		return () => {
			bus.off("agent:turn_start", onTurnStart);
			bus.off("agent:delta", onDelta);
			bus.off("agent:tool_call", onToolCall);
			bus.off("agent:tool_result", onToolResult);
			bus.off("agent:turn_end", onTurnEnd);
			bus.off("agent:done", onDone);
			bus.off("agent:error", onError);
			bus.off("agent:status", onStatus);
		};
	}, [bus]);

	const handleSubmit = (value: string) => {
		if (running) return;
		const input = value.trim();
		setInputValue("");
		if (!input) return;

		if (input === "exit" || input === "quit") {
			setEntries((prev) => [
				...prev,
				{ kind: "status", key: nextKey(), text: "bye." },
			]);
			bus.emit("user:exit");
			setTimeout(() => process.exit(0), 100);
			return;
		}
		if (input === "clear") {
			setEntries([
				{
					kind: "status",
					key: nextKey(),
					text: `jig · model: ${model}`,
				},
			]);
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
			>
				{entries.map((entry) => {
					switch (entry.kind) {
						case "user":
							return (
								<text key={entry.key}>
									<strong fg="cyan">{">"} </strong>
									{entry.text}
								</text>
							);
						case "assistant":
							return <text key={entry.key}>{entry.text}</text>;
						case "tool_call":
							return (
								<text key={entry.key}>
									<span fg="magenta">{"  ⟡ "}</span>
									<strong>{entry.name}</strong>
									<span fg="#888">{" " + entry.args}</span>
								</text>
							);
						case "tool_result":
							return (
								<text key={entry.key}>
									<span fg="green">{"  ✓ "}</span>
									<span fg="#888">{entry.name + " "}</span>
									{entry.result}
								</text>
							);
						case "status":
							return (
								<text key={entry.key} fg="#888">
									{entry.text}
								</text>
							);
						case "error":
							return (
								<text key={entry.key} fg="red">
									{"✗ "}
									{entry.text}
								</text>
							);
					}
				})}
			</scrollbox>
			<box flexDirection="row" height={1} width="100%">
				<text>
					<strong fg={running ? "yellow" : "cyan"}>
						{running ? "● " : "> "}
					</strong>
				</text>
				<input
					ref={inputRef as never}
					flexGrow={1}
					focused
					placeholder='ask the agent…  ("exit" to quit, "clear" to reset)'
					value={inputValue}
					onInput={setInputValue}
					onSubmit={()=>handleSubmit as never}
				/>
			</box>
		</box>
	);
}

export class App {
	private readonly bus: Bus;
	private readonly model: string;

	constructor(options: AppOptions) {
		this.bus = options.bus;
		this.model = options.model;
	}

	async start(): Promise<void> {
		const renderer: CliRenderer = await createCliRenderer({
			exitOnCtrlC: false,
			targetFps: 60,
		});
		renderer.setTerminalTitle(`jig · ${this.model}`);
		createRoot(renderer).render(<CodingAgent bus={this.bus} model={this.model} />);
	}
}
