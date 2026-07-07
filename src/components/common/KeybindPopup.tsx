import { useKeyboard } from "@opentui/react"
import { BOLD, colors } from "../../theme"
import { KEYBINDINGS } from "../../constants/keybindings"

interface KeybindPopupProps {
	width: number
	height: number
	onClose: () => void
}

export function KeybindPopup({ width, height, onClose }: KeybindPopupProps) {
	const popupWidth = 60
	const popupHeight = 18

	useKeyboard((key) => {
		if (key.name === "<" || key.name === "escape") {
			onClose()
		}
	})

	return (
		<box
			position="absolute"
			left={Math.floor((width - popupWidth) / 2)}
			top={Math.floor((height - popupHeight) / 2)}
			width={popupWidth}
			height={popupHeight}
			borderStyle="single"
			borderColor={colors.blue}
			backgroundColor={colors.base}
			flexDirection="column"
		>
			<text attributes={BOLD} fg={colors.blue}>
				{" "}Keybindings
			</text>
			<box flexDirection="column" paddingX={2} paddingY={1}>
				{KEYBINDINGS.map((kb) => (
					<box key={kb.key} flexDirection="row">
						<text fg={colors.blue} attributes={BOLD}>
							{kb.key.padEnd(10)}
						</text>
						<text fg={colors.subtext0}>{kb.desc}</text>
					</box>
				))}
			</box>
		</box>
	)
}
