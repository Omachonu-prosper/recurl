import { Sidebar } from "./components/Sidebar"
import { MainContent } from "./components/MainContent"
import { useFocusPanel } from "./hooks/useFocusPanel"

export function App() {
	const { activePanel, focusSidebar, focusMain } = useFocusPanel()

	return (
		<box flexDirection="row" width="100%" height="100%">
			<Sidebar focused={activePanel === "sidebar"} onMouseDown={focusSidebar} />
			<MainContent focused={activePanel === "main"} onMouseDown={focusMain} />
		</box>
	)
}
