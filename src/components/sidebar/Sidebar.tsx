import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useKeyboard } from "@opentui/react"
import { BOLD, colors } from "../../theme"
import { useCollection } from "../../hooks/useCollection"
import { CollectionList } from "./CollectionList"
import type { CollectionItem } from "../../types"

interface SidebarProps {
	focused: boolean
	onMouseDown: () => void
	onOpenItem: (item: CollectionItem) => void
	onItemRenamed: (id: string, name: string) => void
	activeTabId: string | null
}

export function Sidebar({
	focused,
	onMouseDown,
	onOpenItem,
	onItemRenamed,
	activeTabId,
}: SidebarProps) {
	const [hoveredIcon, setHoveredIcon] = useState<string | null>(null)
	const [collapsedIds, setCollapsedIds] = useState<string[]>([])
	const collapsedSet = useMemo(() => new Set(collapsedIds), [collapsedIds])
	const {
		displayItems,
		depths,
		addFolder,
		addRequest,
		renameItem,
		deleteItem,
	} = useCollection(collapsedSet)

	const toggleCollapsed = useCallback((id: string) => {
		setCollapsedIds((prev) =>
			prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id],
		)
	}, [])
	const [focusedIndex, setFocusedIndex] = useState<number>(-1)
	const [renamingId, setRenamingId] = useState<string | null>(null)
	const [renameValue, setRenameValue] = useState("")
	const [pendingRenameId, setPendingRenameId] = useState<string | null>(null)
	const [deletingId, setDeletingId] = useState<string | null>(null)
	const lastDPress = useRef(0)
	const spaceTimestamp = useRef(0)
	const lastClick = useRef<{ index: number; time: number } | null>(null)

	useEffect(() => {
		if (pendingRenameId !== null) {
			const idx = displayItems.findIndex(
				(item) => item.id === pendingRenameId,
			)
			if (idx >= 0) {
				const item = displayItems[idx]
				if (item) {
					setFocusedIndex(idx)
					setRenamingId(item.id)
					setRenameValue(item.name)
					setPendingRenameId(null)
					onOpenItem(item)
				}
			}
		}
	}, [displayItems, pendingRenameId, onOpenItem])

	useEffect(() => {
		if (focusedIndex >= displayItems.length) {
			setFocusedIndex(displayItems.length - 1)
		}
	}, [displayItems.length, focusedIndex])

	useEffect(() => {
		if (activeTabId) {
			const idx = displayItems.findIndex((item) => item.id === activeTabId)
			if (idx >= 0) {
				setFocusedIndex(idx)
			}
		}
	}, [activeTabId, displayItems])

	const getParentId = useCallback((): string | null => {
		if (focusedIndex >= 0) {
			const item = displayItems[focusedIndex]
			if (item) {
				return item.type === "folder" ? item.id : item.parentId
			}
		}
		return null
	}, [displayItems, focusedIndex])

	const handleNewFolder = useCallback(() => {
		setPendingRenameId(addFolder(getParentId()))
	}, [addFolder, getParentId])

	const handleNewRequest = useCallback(() => {
		setPendingRenameId(addRequest("GET", getParentId()))
	}, [addRequest, getParentId])

	const handleConfirmRename = useCallback(() => {
		if (renamingId !== null) {
			const trimmed = renameValue.trim()
			if (trimmed) {
				renameItem(renamingId, trimmed)
				onItemRenamed(renamingId, trimmed)
			}
			setRenamingId(null)
			setRenameValue("")
		}
	}, [renamingId, renameValue, renameItem, onItemRenamed])

	const handleConfirmDelete = useCallback(() => {
		if (deletingId !== null) {
			deleteItem(deletingId)
			setDeletingId(null)
		}
	}, [deletingId, deleteItem])

	const handleCancelDelete = useCallback(() => {
		setDeletingId(null)
	}, [])

	useKeyboard((key) => {
		if (!focused) return

		if (renamingId !== null) {
			if (key.name === "escape") {
				setRenamingId(null)
				setRenameValue("")
			}
			return
		}

		if (deletingId !== null) {
			if (key.name === "return" || key.name === "enter") {
				handleConfirmDelete()
			} else if (key.name === "escape") {
				handleCancelDelete()
			}
			return
		}

		if (key.name === "space") {
			spaceTimestamp.current = Date.now()
			lastDPress.current = 0
			return
		}

		const isNKey = key.name === "n" || key.name === "N"
		const atRoot =
			isNKey && Date.now() - spaceTimestamp.current < 300
		spaceTimestamp.current = 0

		if (key.name !== "d") {
			lastDPress.current = 0
		}

		switch (key.name) {
			case "n":
			case "N":
				if (key.shift) {
					setPendingRenameId(addFolder(atRoot ? null : getParentId()))
				} else {
					setPendingRenameId(addRequest("GET", atRoot ? null : getParentId()))
				}
				break
			case "j":
			case "down":
				setFocusedIndex((prev) =>
					prev < displayItems.length - 1 ? prev + 1 : prev,
				)
				break
			case "k":
			case "up":
				setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0))
				break
			case "d": {
				const now = Date.now()
				if (now - lastDPress.current < 300 && lastDPress.current !== 0) {
					lastDPress.current = 0
					if (focusedIndex >= 0) {
						const item = displayItems[focusedIndex]
						if (item) {
							setDeletingId(item.id)
						}
					}
				} else {
					lastDPress.current = now
				}
				break
			}
			case "r":
				if (focusedIndex >= 0) {
					const item = displayItems[focusedIndex]
					if (item) {
						setRenamingId(item.id)
						setRenameValue(item.name)
					}
				}
				break
			case "h":
			case "left":
				if (focusedIndex >= 0) {
					const hItem = displayItems[focusedIndex]
					if (
						hItem &&
						hItem.type === "folder" &&
						!collapsedIds.includes(hItem.id)
					) {
						toggleCollapsed(hItem.id)
					}
				}
				break
			case "l":
			case "right":
				if (focusedIndex >= 0) {
					const lItem = displayItems[focusedIndex]
					if (
						lItem &&
						lItem.type === "folder" &&
						collapsedIds.includes(lItem.id)
					) {
						toggleCollapsed(lItem.id)
					}
				}
				break
			case "return":
			case "enter":
				if (focusedIndex >= 0) {
					const item = displayItems[focusedIndex]
					if (item) {
						onOpenItem(item)
					}
				}
				break
			case "escape":
				setFocusedIndex(-1)
				break
		}
	})

	const handleFocusIndex = useCallback(
		(index: number) => {
			const now = Date.now()
			if (
				lastClick.current &&
				lastClick.current.index === index &&
				now - lastClick.current.time < 300
			) {
				const item = displayItems[index]
				if (item) onOpenItem(item)
			}
			lastClick.current = { index, time: now }
			setFocusedIndex(index)
		},
		[displayItems, onOpenItem],
	)

	const deletingItem =
		deletingId !== null
			? displayItems.find((i) => i.id === deletingId)
			: null

	return (
		<box flexDirection="row" width={34} onMouseDown={onMouseDown}>
			<box
				width={1}
				backgroundColor={focused ? colors.blue : colors.base}
			/>
			<box flexDirection="column" flexGrow={1} backgroundColor={colors.base}>
				<box
					flexDirection="row"
					alignItems="center"
					paddingX={2}
					paddingY={1}
					onMouseDown={() => setFocusedIndex(-1)}
				>
					<text fg={colors.yellow} attributes={BOLD}>
						
					</text>
					<text fg={colors.text} attributes={BOLD}>
						{" "}recurl
					</text>
					<box flexGrow={1} />
					<box
						paddingX={1}
						backgroundColor={
							hoveredIcon === "folder" ? colors.surface1 : colors.base
						}
						onMouseOver={() => setHoveredIcon("folder")}
						onMouseOut={() => setHoveredIcon(null)}
						onMouseDown={handleNewFolder}
					>
						<text fg={colors.blue}></text>
					</box>
					<box
						paddingX={1}
						backgroundColor={
							hoveredIcon === "file" ? colors.surface1 : colors.base
						}
						onMouseOver={() => setHoveredIcon("file")}
						onMouseOut={() => setHoveredIcon(null)}
						onMouseDown={handleNewRequest}
					>
						<text fg={colors.green}></text>
					</box>
				</box>
				<CollectionList
					items={displayItems}
					depths={depths}
					focusedIndex={focusedIndex}
					renamingId={renamingId}
					renameValue={renameValue}
					onFocusIndex={handleFocusIndex}
					onRenameChange={setRenameValue}
					onRenameSubmit={handleConfirmRename}
				/>
				<box flexGrow={1} onMouseDown={() => setFocusedIndex(-1)} />
				{deletingId !== null ? (
					<box paddingX={2} backgroundColor={colors.surface0}>
						<text fg={colors.peach}>
							Delete{" "}
							{deletingItem
								? `'${deletingItem.name.length > 14 ? deletingItem.name.slice(0, 13) + "…" : deletingItem.name}'`
								: ""}
							?  ↵confirm  ⎋cancel
						</text>
					</box>
				) : null}
			</box>
		</box>
	)
}
