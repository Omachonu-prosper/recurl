import { useState } from "react"
import { BOLD, colors } from "../theme"

interface SidebarProps {
	focused: boolean
	onMouseDown: () => void
}

export function Sidebar({ focused, onMouseDown }: SidebarProps) {
	const [hoveredIcon, setHoveredIcon] = useState<string | null>(null)

	return (
		<box flexDirection="row" width={34} onMouseDown={onMouseDown}>
			<box width={1} backgroundColor={focused ? colors.blue : colors.base} />
			<box flexDirection="column" flexGrow={1} backgroundColor={colors.base}>
				<box flexDirection="row" alignItems="center" paddingX={2} paddingY={1}>
					<text fg={colors.yellow} attributes={BOLD}>
						
					</text>
					<text fg={colors.text} attributes={BOLD}>
						{" "}recurl
					</text>
					<box flexGrow={1} />
					<box
						paddingX={1}
						backgroundColor={hoveredIcon === "folder" ? colors.surface1 : colors.base}
						onMouseOver={() => setHoveredIcon("folder")}
						onMouseOut={() => setHoveredIcon(null)}
					>
						<text fg={colors.blue}></text>
					</box>
					<box
						paddingX={1}
						backgroundColor={hoveredIcon === "file" ? colors.surface1 : colors.base}
						onMouseOver={() => setHoveredIcon("file")}
						onMouseOut={() => setHoveredIcon(null)}
					>
						<text fg={colors.green}></text>
					</box>
				</box>
			</box>
		</box>
	)
}
