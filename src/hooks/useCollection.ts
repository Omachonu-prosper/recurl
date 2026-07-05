import { useState, useCallback, useMemo, useRef } from "react"
import type { CollectionItem, FolderItem, RequestItem } from "../types"

function sortItems(items: CollectionItem[]): CollectionItem[] {
	return [...items].sort((a, b) => {
		if (a.type !== b.type) {
			return a.type === "folder" ? -1 : 1
		}
		return a.name.localeCompare(b.name)
	})
}

function getDescendantIds(items: CollectionItem[], parentId: string): string[] {
	const ids: string[] = [parentId]
	for (const child of items) {
		if (child.parentId === parentId) {
			ids.push(...getDescendantIds(items, child.id))
		}
	}
	return ids
}

function buildDisplayList(
	items: CollectionItem[],
	collapsed: Set<string>,
): { items: CollectionItem[]; depths: readonly (readonly [string, number])[] } {
	function collectChildren(
		parentId: string,
		depth: number,
		result: CollectionItem[],
		depthEntries: [string, number][],
	): void {
		const children = items.filter((i) => i.parentId === parentId)
		for (const child of sortItems(children)) {
			result.push(child)
			depthEntries.push([child.id, depth])
			if (child.type === "folder" && !collapsed.has(child.id)) {
				collectChildren(child.id, depth + 1, result, depthEntries)
			}
		}
	}

	const result: CollectionItem[] = []
	const depthEntries: [string, number][] = []
	const rootItems = sortItems(items.filter((i) => !i.parentId))

	for (const item of rootItems) {
		result.push(item)
		depthEntries.push([item.id, 0])
		if (item.type === "folder" && !collapsed.has(item.id)) {
			collectChildren(item.id, 1, result, depthEntries)
		}
	}

	return { items: result, depths: depthEntries }
}

export function useCollection(collapsed: Set<string>) {
	const [items, setItems] = useState<CollectionItem[]>([])
	const idRef = useRef(0)

	const { items: displayItems, depths } = useMemo(
		() => buildDisplayList(items, collapsed),
		[items, collapsed],
	)

	const addFolder = useCallback((parentId: string | null = null) => {
		const id = `item-${++idRef.current}`
		const newItem: FolderItem = {
			id,
			type: "folder",
			name: "new folder",
			parentId,
		}
		setItems((prev) => [...prev, newItem])
		return id
	}, [])

	const addRequest = useCallback(
		(method = "GET", parentId: string | null = null) => {
			const id = `item-${++idRef.current}`
			const newItem: RequestItem = {
				id,
				type: "request",
				name: "new request",
				method,
				parentId,
			}
			setItems((prev) => [...prev, newItem])
			return id
		},
		[],
	)

	const renameItem = useCallback(
		(id: string, name: string) => {
			setItems((prev) =>
				prev.map((item) => (item.id === id ? { ...item, name } : item)),
			)
		},
		[],
	)

	const deleteItem = useCallback((id: string) => {
		setItems((prev) => {
			const idsToRemove = getDescendantIds(prev, id)
			return prev.filter((item) => !idsToRemove.includes(item.id))
		})
	}, [])

	return {
		items,
		displayItems,
		depths,
		addFolder,
		addRequest,
		renameItem,
		deleteItem,
	}
}
