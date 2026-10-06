import { theme } from "../theme.ts";

export function ReasoningView({
	text,
	streaming,
}: {
	text: string;
	streaming: boolean;
}) {
	return (
		<box flexDirection="column" width="100%">
			<text>
				<span fg={theme.colors.textMuted}>
					<strong>{streaming ? "Thinking…" : "Thinking"}</strong>
				</span>
			</text>
			{text && (
				<text><span fg={theme.colors.textDim}>{text}</span></text>
			)}
		</box>
	);
}
