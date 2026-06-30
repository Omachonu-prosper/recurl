import { BOLD, colors } from "../theme"

interface MainContentProps {
	focused: boolean
	onMouseDown: () => void
}

export function MainContent({ focused, onMouseDown }: MainContentProps) {
	return (
		<box
			flexGrow={1}
			borderStyle="single"
			borderColor={focused ? colors.blue : colors.surface0}
			padding={1}
			flexDirection="column"
			onMouseDown={onMouseDown}
		>
			<text attributes={BOLD} fg={colors.text}>
				Main Content
			</text>
			<text fg={colors.subtext0}>This is the main content area.</text>
		</box>
	)
}
