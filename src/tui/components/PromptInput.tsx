import type { TextareaRenderable, KeyBinding } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode, RefObject } from "react";
import { theme } from "../theme.ts";

const keyBindings: KeyBinding[] = [
	{ name: "return", action: "submit" },
	{ name: "return", shift: true, action: "newline" },
];

export function PromptInput({ inputRef, focused, onChange, onSubmit, children }: {
	inputRef: RefObject<TextareaRenderable | null>;
	focused: boolean;
	onChange: (value: string) => void;
	onSubmit: (value: string) => void;
	children?: ReactNode;
}) {
	const { height } = useTerminalDimensions();
	return (
		<box
			position="relative"
			flexDirection="column"
			width="100%"
			flexShrink={0}
			border={theme.borders.input.sides}
			borderColor={theme.borders.input.color}
		>
			<box
				width="100%"
				flexDirection="column"
				border={["left"]}
				borderColor={theme.colors.prompt}
				paddingX={1}
			>
				<textarea
					ref={inputRef}
					width="100%"
					height="auto"
					minHeight={1}
					maxHeight={Math.max(1, Math.min(8, Math.floor(height / 3)))}
					flexShrink={0}
					wrapMode="word"
					focused={focused}
					keyBindings={keyBindings}
					placeholder="ask the agent"
					onContentChange={() => onChange(inputRef.current?.plainText ?? "")}
					onSubmit={() => onSubmit(inputRef.current?.plainText ?? "")}
				/>
			</box>
			{children}
		</box>
	);
}
