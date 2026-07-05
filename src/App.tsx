import { useState, useCallback } from "react"
import { useKeyboard, useTerminalDimensions } from "@opentui/react"
import { Sidebar } from "./components/sidebar/Sidebar"
import { MainContent } from "./components/main-content/MainContent"
import { KeybindPopup } from "./components/common/KeybindPopup"
import { useFocusPanel } from "./hooks/useFocusPanel"
import type { CollectionItem, OpenTab } from "./types"

interface TabState {
	openTabs: OpenTab[]
	activeTabId: string | null
}

export function App() {
	const { activePanel, focusSidebar, focusMain } = useFocusPanel()
	const [showKeybindings, setShowKeybindings] = useState(false)
	const { width, height } = useTerminalDimensions()
	const [tabState, setTabState] = useState<TabState>({
		openTabs: [],
		activeTabId: null,
	})

	useKeyboard((key) => {
		if (key.name === "/") {
			setShowKeybindings((prev) => !prev)
		}
	})

	const handleOpenItem = useCallback((item: CollectionItem) => {
		setTabState((prev) => {
			const existing = prev.openTabs.find((t) => t.id === item.id)
			if (existing) {
				return { ...prev, activeTabId: item.id }
			}
			const newTab: OpenTab = {
				id: item.id,
				name: item.name,
				type: item.type,
				method: item.type === "request" ? item.method : undefined,
			}
			return {
				openTabs: [...prev.openTabs, newTab],
				activeTabId: item.id,
			}
		})
	}, [])

	const handleCloseTab = useCallback((tabId: string) => {
		setTabState((prev) => {
			const idx = prev.openTabs.findIndex((t) => t.id === tabId)
			if (idx === -1) return prev
			const newTabs = prev.openTabs.filter((t) => t.id !== tabId)
			let newActive = prev.activeTabId
			if (prev.activeTabId === tabId) {
				if (newTabs.length > 0) {
					const nextIdx = Math.min(idx, newTabs.length - 1)
					const nextTab = newTabs[nextIdx]
					if (nextTab) newActive = nextTab.id
				} else {
					newActive = null
				}
			}
			return { openTabs: newTabs, activeTabId: newActive }
		})
	}, [])

	const handleActivateTab = useCallback((tabId: string) => {
		setTabState((prev) => ({ ...prev, activeTabId: tabId }))
	}, [])

	const handleItemRenamed = useCallback((id: string, name: string) => {
		setTabState((prev) => ({
			...prev,
			openTabs: prev.openTabs.map((t) =>
				t.id === id ? { ...t, name } : t,
			),
		}))
	}, [])

	return (
		<box flexDirection="row" width="100%" height="100%">
			<Sidebar
				focused={activePanel === "sidebar"}
				onMouseDown={focusSidebar}
				onOpenItem={handleOpenItem}
				onItemRenamed={handleItemRenamed}
				activeTabId={tabState.activeTabId}
			/>
			<MainContent
				focused={activePanel === "main"}
				onMouseDown={focusMain}
				openTabs={tabState.openTabs}
				activeTabId={tabState.activeTabId}
				onActivateTab={handleActivateTab}
				onCloseTab={handleCloseTab}
			/>
			{showKeybindings && (
				<KeybindPopup
					width={width}
					height={height}
					onClose={() => setShowKeybindings(false)}
				/>
			)}
		</box>
	)
}
