import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { BOLD, colors } from "../../theme"

export interface SelectOption {
	label: string
	value: string
	color?: string
}

interface SelectProps {
	options: SelectOption[]
	selectedIndex: number
	onSelect: (index: number) => void
	onClose: () => void
	top: number
	left: number
	width?: number
}

export function Select({
	options,
	selectedIndex,
	onSelect,
	onClose,
	top,
	left,
	width = 15,
}: SelectProps) {
	const [highlightIndex, setHighlightIndex] = useState(selectedIndex)

	useKeyboard((key) => {
		switch (key.name) {
			case "escape": {
				onClose()
				return
			}
			case "enter":
			case "return": {
				onSelect(highlightIndex)
				return
			}
			case "up":
			case "k": {
				setHighlightIndex((prev) =>
					prev > 0 ? prev - 1 : options.length - 1,
				)
				return
			}
			case "down":
			case "j": {
				setHighlightIndex((prev) =>
					prev < options.length - 1 ? prev + 1 : 0,
				)
				return
			}
		}
	})

	return (
		<box position="absolute" top={0} left={0} right={0} bottom={0}>
			<box
				position="absolute"
				top={1}
				left={0}
				right={0}
				bottom={0}
				onMouseDown={onClose}
			/>
			<box
				position="absolute"
				top={top}
				left={left}
				width={width}
				backgroundColor={colors.surface1}
				borderStyle="single"
				flexDirection="column"
				onMouseDown={onClose}
			>
				{options.map((opt, i) => (
					<box
						key={opt.value}
						onMouseDown={() => onSelect(i)}
						paddingX={2}
						backgroundColor={
							i === highlightIndex ? colors.surface0 : undefined
						}
					>
						<text fg={opt.color ?? colors.text} attributes={BOLD}>
							{opt.label}
						</text>
					</box>
				))}
			</box>
		</box>
	)
}
