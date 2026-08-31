import { theme } from "@/ui/theme.ts";

const { colors } = theme;

export function Logo() {
	return (
		<box>
			<ascii-font
				text="jig"
				font="block"
				color={colors.logo}
			/>
		</box>
	);
}
