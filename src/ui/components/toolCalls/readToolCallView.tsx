import { theme } from "@/ui/theme";

const { colors } = theme;
export function ReadToolCallView({ path }: { path: string }) {
	return (
		<text fg={colors.textDim}>
			<span>{"\u27A4"}</span>
			<span>{" "}</span>
			<strong>Read</strong>
			<span>{" "}</span>
			<span>{path}</span>
		</text>
	);
}