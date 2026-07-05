import { useState } from "react"
import { useKeyboard, useTerminalDimensions } from "@opentui/react"
import { Sidebar } from "./components/sidebar/Sidebar"
import { MainContent } from "./components/main-content/MainContent"
import { KeybindPopup } from "./components/common/KeybindPopup"
import { useFocusPanel } from "./hooks/useFocusPanel"

export function App() {
	const { activePanel, focusSidebar, focusMain } = useFocusPanel()
	const [showKeybindings, setShowKeybindings] = useState(false)
	const { width, height } = useTerminalDimensions()

	useKeyboard((key) => {
		if (key.name === "/") {
			setShowKeybindings((prev) => !prev)
		}
	})

	return (
		<box flexDirection="row" width="100%" height="100%">
			<Sidebar focused={activePanel === "sidebar"} onMouseDown={focusSidebar} />
			<MainContent focused={activePanel === "main"} onMouseDown={focusMain} />
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
