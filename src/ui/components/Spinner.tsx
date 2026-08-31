import { useEffect, useState } from "react";
import { theme } from "@/ui/theme.ts";
import {
	defaultSpinnerPreset,
	spinnerFrameInterval,
	spinnerPresets,
	type SpinnerPresetName,
} from "@/ui/presets.ts";

const { colors } = theme;

export function Spinner({
	active,
	label = "running",
	preset = defaultSpinnerPreset,
}: {
	active: boolean;
	label?: string;
	preset?: SpinnerPresetName;
}) {
	const [frame, setFrame] = useState(0);
	const frames = spinnerPresets[preset];

	useEffect(() => {
		if (!active) return;
		const id = setInterval(() => {
			setFrame((f) => (f + 1) % frames.length);
		}, spinnerFrameInterval);
		return () => clearInterval(id);
	}, [active, frames.length]);

	if (!active) {
		return (
			<box height={1} width="100%">
				<text>
					<span fg={colors.textDim}>{process.cwd()}</span>
				</text>
			</box>
		);
	}

	return (
		<box height={1} width="100%">
			<text fg={colors.prompt}>
				{frames[frame] + " "}
				<span fg={colors.textDim}>{label}</span>
			</text>
		</box>
	);
}
