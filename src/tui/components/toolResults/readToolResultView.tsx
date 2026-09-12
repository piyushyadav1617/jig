export function ReadToolResultView({ path }: { path: string }) {
	return (
		<text>
			<span>{"- "}</span>
			<strong>{"read "}</strong>
			<span>{path}</span>
		</text>
	);
}