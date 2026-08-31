import { ReadToolResultView } from "./toolResults/readToolResultView.tsx";
import { WriteToolResultView } from "./toolResults/writeToolResultView.tsx";
import { GenericToolResultView } from "./toolResults/genericToolResultView.tsx";

function tryParse(result: string): Record<string, unknown> | undefined {
	try {
		const obj = JSON.parse(result);
		if (obj && typeof obj === "object" && !Array.isArray(obj)) {
			return obj as Record<string, unknown>;
		}
	} catch {
		// not JSON — fall through to generic
	}
	return undefined;
}

export function ToolResultView({
	name,
	result,
}: {
	name: string;
	result: string;
}) {
	const parsed = tryParse(result);

	if (
		name === "read" &&
		parsed &&
		typeof parsed.path === "string"
	) {
		return <ReadToolResultView path={parsed.path} />;
	}

	if (
		name === "write" &&
		parsed &&
		typeof parsed.path === "string" &&
		typeof parsed.lines === "number" &&
		typeof parsed.content === "string"
	) {
		return (
			<WriteToolResultView
				path={parsed.path}
				lines={parsed.lines}
				content={parsed.content}
			/>
		);
	}

	return <GenericToolResultView name={name} result={result} />;
}