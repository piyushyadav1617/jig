import { ReadToolCallView } from "./toolCalls/readToolCallView.tsx";
import { WriteToolCallView } from "./toolCalls/writeToolCallView.tsx";
import { GenericToolCallView } from "./toolCalls/genericToolCallView.tsx";

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
}: {
	name: string;
	args: string;
}) {
	const parsed = tryParse(args);

	if (name === "read" && parsed && typeof parsed.path === "string") {
		return <ReadToolCallView path={parsed.path} />;
	}

	if (name === "write" && parsed && typeof parsed.path === "string" && typeof parsed.content === "string") {
		return <WriteToolCallView path={parsed.path} content={parsed.content} />
	}
	return <GenericToolCallView name={name} args={args} />;
}
