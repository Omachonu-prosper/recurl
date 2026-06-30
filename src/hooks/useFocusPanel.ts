import { useKeyboard } from "@opentui/react"
import { useState, useCallback } from "react"

type Panel = "sidebar" | "main"

export function useFocusPanel() {
	const [activePanel, setActivePanel] = useState<Panel>("sidebar")

	useKeyboard((key) => {
		if (key.name === "tab") {
			setActivePanel((prev) => (prev === "sidebar" ? "main" : "sidebar"))
		}
	})

	const focusSidebar = useCallback(() => setActivePanel("sidebar"), [])
	const focusMain = useCallback(() => setActivePanel("main"), [])

	return {
		activePanel,
		focusSidebar,
		focusMain,
	}
}
