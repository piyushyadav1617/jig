import { useMemo } from "react";
import { createTwoFilesPatch } from "diff";
import { theme } from "../theme.ts";
import { getFiletype, isMarkdown } from "./filetype.ts";

type Fields = Record<string, unknown> | undefined;
const stringField = (fields: Fields, key: string): string | undefined =>
	typeof fields?.[key] === "string" ? fields[key] as string : undefined;
const quantity = (count: number, unit: string, plural = `${unit}s`) =>
	`${count} ${count === 1 ? unit : plural}`;

export function toolSummary(name: string, input: Fields, output: Fields): string {
	const path = stringField(input, "path") ?? stringField(output, "path") ?? "";
	if (name === "grep") {
		const pattern = stringField(input, "pattern") ?? stringField(output, "pattern") ?? "";
		const matches = stringField(output, "matches");
		const count = matches === undefined ? "" : ` (${quantity(matches ? matches.split("\n").length : 0, "match", "matches")})`;
		return `${pattern} in ${path || "."}${count}`;
	}
	if (name === "bash") {
		const exit = typeof output?.exitCode === "number" ? ` (exit ${output.exitCode})` : "";
		return `${stringField(input, "cwd") ?? ""}${exit}`.trim();
	}
	if (name === "edit") {
		const count = typeof output?.replacements === "number" ? ` (${quantity(output.replacements, "replacement")})` : "";
		return `${path}${count}`;
	}
	const lines = typeof output?.lines === "number" ? output.lines
		: name === "write" && typeof input?.content === "string" ? input.content.split("\n").length : undefined;
	return `${path}${lines === undefined ? "" : ` (${quantity(lines, "line")})`}`;
}

function CodePreview({ path, content, renderMarkdown = true }: { path: string; content: string; renderMarkdown?: boolean }) {
	return (
		<box width="100%" flexDirection="column" backgroundColor={theme.colors.codeBg} padding={1}>
			{!content ? <text fg={theme.colors.textDim}>(empty file)</text> : renderMarkdown && isMarkdown(path) ? (
				<markdown content={content} syntaxStyle={theme.markdownSyntaxStyle} width="100%" />
			) : (
				<line-number showLineNumbers fg={theme.colors.textDim} width="100%">
					<code content={content} filetype={getFiletype(path)} syntaxStyle={theme.markdownSyntaxStyle} width="100%" />
				</line-number>
			)}
		</box>
	);
}

function EditPreview({ path, input, output }: { path: string; input: Fields; output: Fields }) {
	const actualDiff = stringField(output, "diff");
	const oldText = stringField(input, "oldString");
	const newText = stringField(input, "newString");
	const diff = useMemo(() => actualDiff ?? (
		oldText !== undefined && newText !== undefined
			? createTwoFilesPatch(path, path, oldText, newText) : undefined
	), [actualDiff, oldText, newText, path]);
	return diff ? (
		<box width="100%" flexDirection="column">
			{!actualDiff && <text fg={theme.colors.textDim}>Replacement preview (snippet line numbers){input?.replaceAll ? " — all matches" : ""}</text>}
			{oldText !== undefined && oldText === newText ? <text fg={theme.colors.textDim}>No changes</text> : (
				<diff
					diff={diff}
					view="unified"
					filetype={getFiletype(path)}
					syntaxStyle={theme.markdownSyntaxStyle}
					showLineNumbers
					width="100%"
					wrapMode="word"
					fg={theme.colors.text}
					lineNumberFg={theme.colors.textDim}
					addedBg={theme.colors.codeBg}
					removedBg={theme.colors.codeBg}
					contextBg={theme.colors.codeBg}
					addedLineNumberBg={theme.colors.codeBg}
					removedLineNumberBg={theme.colors.codeBg}
					addedSignColor={theme.colors.text}
					removedSignColor={theme.colors.text}
				/>
			)}
		</box>
	) : <text fg={theme.colors.textDim}>No replacement preview available</text>;
}

function FieldList({ fields }: { fields: Fields }) {
	return fields ? (
		<box flexDirection="column" width="100%">
			{Object.entries(fields).map(([key, value]) => (
				<text key={key} fg={theme.colors.text}>{key}: {typeof value === "string" ? value : JSON.stringify(value)}</text>
			))}
		</box>
	) : null;
}

// Bound both line count and line width so a single minified line cannot fill the feed.
function previewText(content: string, maxLines = 4): string {
	const lines = content.split("\n");
	const visible = lines.slice(0, maxLines).map((line) =>
		line.length > 160 ? `${line.slice(0, 160)}…` : line,
	);
	if (lines.length > maxLines) visible.push(`… ${quantity(lines.length - maxLines, "more line")}`);
	return visible.join("\n");
}

export function ToolPreviewView({ name, input, output, args, result }: {
	name: string;
	input: Fields;
	output: Fields;
	args: string;
	result?: string;
}) {
	const path = stringField(input, "path") ?? stringField(output, "path") ?? "";
	const content = stringField(output, "content");
	if (name === "read" && content !== undefined) {
		return <CodePreview path={path} content={previewText(content)} renderMarkdown={false} />;
	}
	if (name === "bash") {
		const command = stringField(input, "command") ?? stringField(output, "command") ?? args;
		const stdout = stringField(output, "stdout");
		const stderr = stringField(output, "stderr");
		const text = [stdout, stderr ? `stderr: ${stderr}` : undefined].filter(Boolean).join("\n");
		return (
			<box width="100%" flexDirection="column" paddingLeft={1}>
				<code content={previewText(command, 2)} filetype="bash" syntaxStyle={theme.markdownSyntaxStyle} width="100%" />
				<text fg={theme.colors.text}>{previewText(result === undefined ? "Waiting for command…" : text || (stdout === undefined && stderr === undefined ? result : "(no output)"), 3)}</text>
			</box>
		);
	}
	const fields = (values: Fields) => values ? Object.entries(values)
		.map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`).join("\n") : "";
	const matches = stringField(output, "matches");
	const text = name === "grep"
		? result === undefined ? "Searching…" : matches !== undefined ? matches || "No matches" : result || "No matches"
		: result === undefined ? fields(input) || args || "Waiting for result…" : fields(output) || result || "(empty result)";
	return (
		<box width="100%" paddingLeft={1}>
			<text fg={theme.colors.text}>{previewText(text)}</text>
		</box>
	);
}

export function ToolContentView({ name, input, output, args, result }: {
	name: string;
	input: Fields;
	output: Fields;
	args: string;
	result?: string;
}) {
	const path = stringField(input, "path") ?? stringField(output, "path") ?? "";
	const content = stringField(output, "content") ?? stringField(input, "content");
	const hasFilePreview = (name === "read" || name === "write") && content !== undefined;
	const knownOutput = name === "edit" ? typeof output?.replacements === "number"
		: stringField(output, "content") !== undefined;

	if (name === "read" || name === "write" || name === "edit") {
		return (
			<box width="100%" flexDirection="column" gap={1}>
				{hasFilePreview && <CodePreview path={path} content={content} renderMarkdown={name !== "write"} />}
				{name === "edit" && <EditPreview path={path} input={input} output={output} />}
				{result === undefined ? (
					<text fg={theme.colors.textDim}>{name === "read" ? "Reading file…" : name === "write" ? "Writing file…" : "Applying edit…"}</text>
				) : knownOutput ? (
					<text fg={theme.colors.textDim}>
						{name === "write" ? "File written" : name === "read" ? "File read" : `Applied ${quantity(output?.replacements as number, "replacement")}`}
					</text>
				) : output ? <FieldList fields={output} /> : <text fg={theme.colors.text}>{result || "(empty result)"}</text>}
			</box>
		);
	}

	if (name === "bash") {
		const command = stringField(input, "command") ?? stringField(output, "command") ?? args;
		const stdout = stringField(output, "stdout");
		const stderr = stringField(output, "stderr");
		return (
			<box width="100%" flexDirection="column" gap={1} padding={1} backgroundColor={theme.colors.codeBg}>
				<code content={command} filetype="bash" syntaxStyle={theme.markdownSyntaxStyle} width="100%" />
				{typeof input?.timeout === "number" && <text fg={theme.colors.textDim}>Timeout: {input.timeout} ms</text>}
				{stdout && <text fg={theme.colors.text}>{stdout}</text>}
				{stderr && <box flexDirection="column"><text fg={theme.colors.textDim}>stderr</text><text fg={theme.colors.text}>{stderr}</text></box>}
				{result === undefined ? <text fg={theme.colors.textDim}>Waiting for command…</text>
					: stdout === undefined && stderr === undefined ? <text fg={theme.colors.text}>{result || "(no output)"}</text>
					: !stdout && !stderr ? <text fg={theme.colors.textDim}>(no output)</text> : null}
			</box>
		);
	}

	if (name === "grep") {
		const matches = stringField(output, "matches");
		return (
			<box width="100%" flexDirection="column" gap={1} paddingLeft={1}>
				{typeof input?.include === "string" && <text fg={theme.colors.textDim}>Files: {input.include}</text>}
				<text fg={theme.colors.text}>{result === undefined ? "Searching…" : matches !== undefined ? matches || "No matches" : result || "No matches"}</text>
			</box>
		);
	}

	return (
		<box width="100%" flexDirection="column" gap={1} paddingLeft={1}>
			{input ? <FieldList fields={input} /> : args && <text fg={theme.colors.text}>{args}</text>}
			{result === undefined ? <text fg={theme.colors.textDim}>Waiting for result…</text>
				: output ? <FieldList fields={output} /> : <text fg={theme.colors.text}>{result || "(empty result)"}</text>}
		</box>
	);
}
