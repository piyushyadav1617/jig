import { theme } from "../theme.ts";

const { borders } = theme;

export function UserInputView({ text }: { text: string }) {
	return (
		<box
			width="100%"
			flexShrink={0}
			style={{
				border: borders.userInput.sides,
				borderColor: borders.userInput.color,
			}}
		>
			<box
				width="100%"
				paddingLeft={1}
				border={["left"]}
				borderColor={theme.colors.prompt}
			>
				<text>{text}</text>
			</box>
		</box>
	);
}
