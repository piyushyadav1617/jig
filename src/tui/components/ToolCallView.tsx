import { useMemo, useState } from "react";
import { theme } from "../theme.ts";
import { ToolContentView, ToolPreviewView, toolSummary } from "./ToolContentView.tsx";

function tryParse(args: string): Record<string, unknown> | undefined {
	try {
		const obj = JSON.parse(args);
		if (obj && typeof obj === "object" && !Array.isArray(obj)) {
			return obj as Record<string, unknown>;
		}
	} catch {
		// fall through
	}
	return undefined;
}

export function ToolCallView({
	name,
	args,
	result,
}: {
	name: string;
	args: string;
	result?: string;
}) {
	const [expanded, setExpanded] = useState(name === "write" || name === "edit");
	const parsed = useMemo(() => tryParse(args), [args]);
	const output = useMemo(() => result === undefined ? undefined : tryParse(result), [result]);
	const summary = toolSummary(name, parsed, output);

	return (
		<box flexDirection="column" width="100%" flexShrink={0}>
			<box
				width="100%"
				flexDirection="row"
				flexShrink={0}
				onMouseDown={(event) => {
					if (event.button !== 0) return;
					event.preventDefault();
					setExpanded((value) => !value);
				}}
			>
				<text flexGrow={1} flexShrink={1} minWidth={0} fg={theme.colors.textDim}>
					<span>{name}</span>
					<span>{summary ? ` ${summary}` : ""}</span>
					<span>{result === undefined ? " (running)" : result.startsWith("Error:") ? " (failed)" : ""}</span>
				</text>
				<text width={20} flexShrink={0} fg={theme.colors.textDim}>
					{expanded ? " [click to collapse]" : " [click to expand]"}
				</text>
			</box>
			{expanded ? (
				<ToolContentView name={name} input={parsed} output={output} args={args} result={result} />
			) : name !== "write" && name !== "edit" ? (
				<ToolPreviewView name={name} input={parsed} output={output} args={args} result={result} />
			) : null}
		</box>
	);
}
