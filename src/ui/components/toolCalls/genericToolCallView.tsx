const trim = (s: string, max: number) =>
	s.length > max ? `${s.slice(0, max)}…` : s;

const toDisplay = (value: unknown): string => {
	if (typeof value !== "string") return JSON.stringify(value);
	const firstLine = value.split("\n")[0] ?? "";
	return trim(firstLine, 120);
};

export function GenericToolCallView({
	name,
	args,
}: {
	name: string;
	args: string;
}) {
	let parsed: Record<string, unknown> | undefined;
	try {
		const obj = JSON.parse(args);
		if (obj && typeof obj === "object" && !Array.isArray(obj)) {
			parsed = obj as Record<string, unknown>;
		}
	} catch {
		parsed = undefined;
	}

	if (!parsed) {
		return (
			<text>
				<span>{"- "}</span>
				<strong>{name + " "}</strong>
				<span>{trim(args, 400)}</span>
			</text>
		);
	}

	return (
		<box flexDirection="column" width="100%">
			<text>
				<span>{"- "}</span>
				<strong>{name}</strong>
			</text>
			{Object.entries(parsed).map(([key, value]) => (
				<text key={key}>
					<span>{"- "}</span>
					<strong>{key + ": "}</strong>
					<span>{toDisplay(value)}</span>
				</text>
			))}
		</box>
	);
}
