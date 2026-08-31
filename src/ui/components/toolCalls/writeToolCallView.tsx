import { theme } from "@/ui/theme";
import { getFiletype, isMarkdown } from "../filetype";

const { markdownSyntaxStyle, colors } = theme;

export function WriteToolCallView({
	path,
	content,
}: {
	path: string;
	content: string;
}) {
	return (
		<box flexDirection="column" width="100%">
			<text fg={colors.textDim}>
				<span>{"\u27A4"}</span>
				<span>{" "}</span>
				<strong>Write</strong>
				<span>{" "}</span>
				<span>{path}</span>
			</text>
			<box backgroundColor={colors.codeBg} width="100%" padding={1}>
				{isMarkdown(path) ? (
					<markdown
						content={content}
						syntaxStyle={markdownSyntaxStyle}
						width="100%"
					/>
				) : (
					<line-number showLineNumbers={true} fg={colors.textDim}>
						<code
							content={content}
							filetype={getFiletype(path)}
							syntaxStyle={markdownSyntaxStyle}
							width="100%"
						/>
					</line-number>
				)}
			</box>
		</box>
	);
}
