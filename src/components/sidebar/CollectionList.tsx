import { BOLD, colors } from "../../theme"
import type { CollectionItem } from "../../types"

const METHOD_COLORS: Record<string, string> = {
	GET: colors.green,
	POST: colors.yellow,
	PATCH: colors.mauve,
	PUT: colors.blue,
	DELETE: colors.red,
	HEAD: colors.green,
	OPTIONS: colors.red,
}

interface CollectionListProps {
	items: CollectionItem[]
	depths: readonly (readonly [string, number])[]
	focusedIndex: number
	renamingId: string | null
	renameValue: string
	onFocusIndex: (index: number) => void
	onRenameChange: (value: string) => void
	onRenameSubmit: () => void
}

export function CollectionList({
	items,
	depths,
	focusedIndex,
	renamingId,
	renameValue,
	onFocusIndex,
	onRenameChange,
	onRenameSubmit,
}: CollectionListProps) {
	const depthMap = new Map(depths)

	return (
		<box flexDirection="column">
			{items.map((item, index) => {
				const isFocused = index === focusedIndex
				const isRenaming = renamingId === item.id
				const depth = depthMap.get(item.id) ?? 0
				const indent = "  ".repeat(depth)
				const iconWidth = item.type === "folder" ? 1 : item.method.length
				const nameMax = Math.max(3, 29 - depth * 2 - iconWidth - 1)
				const displayName =
					item.name.length > nameMax
						? item.name.slice(0, nameMax - 1) + "…"
						: item.name

				return (
					<box
						key={item.id}
						flexDirection="row"
						alignItems="center"
						paddingX={2}
						backgroundColor={
							isFocused || isRenaming ? colors.surface1 : colors.base
						}
						onMouseDown={() => onFocusIndex(index)}
					>
						{indent ? (
							<text fg={colors.subtext0}>{indent}</text>
						) : null}
						{item.type === "folder" ? (
							<text fg={colors.blue}></text>
						) : (
							<text
								fg={METHOD_COLORS[item.method] ?? colors.text}
								attributes={BOLD}
							>
								{item.method}
							</text>
						)}
						<text> </text>
						{isRenaming ? (
							<input
								value={renameValue}
								onInput={onRenameChange}
								onSubmit={onRenameSubmit}
								focused
								width={nameMax}
							/>
						) : (
							<text fg={colors.text}>{displayName}</text>
						)}
					</box>
				)
			})}
		</box>
	)
}
