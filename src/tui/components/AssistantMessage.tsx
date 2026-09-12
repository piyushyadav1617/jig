import { theme } from "../theme.ts";

const { markdownSyntaxStyle } = theme;

export function AssistantMessage({
	text,
	streaming,
}: {
	text: string;
	streaming: boolean;
}) {
	return (
		<markdown
			width="100%"
			content={text}
			syntaxStyle={markdownSyntaxStyle}
			streaming={streaming}
		/>
	);
}
