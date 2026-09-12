import { theme } from "../theme.ts";

const { borders } = theme;

export function UserInputView({ text }: { text: string }) {
	return (
		<box
			width="100%"
			style={{
				border: borders.userInput.sides,
				borderColor: borders.userInput.color,
			}}
		>
			<text>{text}</text>
		</box>
	);
}
