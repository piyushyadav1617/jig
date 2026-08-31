import { theme } from "@/ui/theme.ts";

const { colors } = theme;

export function StatusView({ text }: { text: string }) {
	return (
		<text fg={colors.status}>{text}</text>
	);
}
