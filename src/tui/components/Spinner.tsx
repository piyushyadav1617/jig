import { useEffect, useState } from "react";
import { theme } from "../theme.ts";
import {
	defaultSpinnerPreset,
	spinnerFrameInterval,
	spinnerPresets,
	type SpinnerPresetName,
} from "../presets.ts";

const { colors } = theme;

export function Spinner({
	preset = defaultSpinnerPreset,
}: {
	preset?: SpinnerPresetName;
}) {
	const [frame, setFrame] = useState(0);
	const frames = spinnerPresets[preset];

	useEffect(() => {
		const id = setInterval(() => {
			setFrame((f) => (f + 1) % frames.length);
		}, spinnerFrameInterval);
		return () => clearInterval(id);
	}, [frames.length]);

	return <text fg={colors.prompt}>{frames[frame]}</text>;
}
