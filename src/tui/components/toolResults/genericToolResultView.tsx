import { theme } from "../../theme.ts";

const { colors } = theme;

const trim = (s: string, max: number) =>
	s.length > max ? `${s.slice(0, max)}…` : s;

export function GenericToolResultView({
	name,
	result,
}: {
	name: string;
	result: string;
}) {
	return (
		<text>
			<span fg={colors.textDim}>
				{name + " " + trim(result, 1000)}
			</span>
		</text>
	);
}