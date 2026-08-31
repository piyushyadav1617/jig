import { theme } from "@/ui/theme.ts";
import { getFiletype, isMarkdown } from "../filetype.ts";

const { markdownSyntaxStyle } = theme;

export function WriteToolResultView({
	path,
	lines,
	content,
}: {
	path: string;
	lines: number;
	content: string;
}) {
	return (
		<box flexDirection="column" width="100%">
			<text>
				<span>{"- "}</span>
				<strong>{"write "}</strong>
				<span>{path + " "}</span>
				<span>{`(${lines} lines)`}</span>
			</text>
			{isMarkdown(path) ? (
				<markdown
					content={content}
					syntaxStyle={markdownSyntaxStyle}
					width="100%"
				/>
			) : (
				<code
					content={content}
					filetype={getFiletype(path)}
					syntaxStyle={markdownSyntaxStyle}
					width="100%"
				/>
			)}
		</box>
	);
}