import { theme } from "@/ui/theme.ts";

const { colors, borders } = theme;

export function ErrorView({ text }: { text: string }) {
	return (
		<box
			width="100%"
			style={{
				border: borders.input.sides,
				borderColor: colors.error,
			}}
		>
			<text fg={colors.error}>
				{"✗ "}
				{text}
			</text>
		</box>
	);
}
