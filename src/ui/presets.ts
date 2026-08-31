export const spinnerPresets = {
	braille: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
	dots: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
	arrows: ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"],
	spin: ["◜", "◝", "◞", "◟"],
	star: ["✶", "✸", "✹", "✺", "✹", "✷"],
	bouncing: ["⠁", "⠂", "⠄", "⠂"],
} as const;

export type SpinnerPresetName = keyof typeof spinnerPresets;

export const defaultSpinnerPreset: SpinnerPresetName = "braille";

export const spinnerFrameInterval = 80;
