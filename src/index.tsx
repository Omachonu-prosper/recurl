import { createCliRenderer, TextAttributes } from "@opentui/core";
import { createRoot } from "@opentui/react";

const BOLD = TextAttributes.BOLD;

function App() {
	return (
		<box flexDirection="row" width="100%" height="100%">
			<box borderStyle="single" width={30} padding={1} flexDirection="column">
				<text attributes={BOLD}>Sidebar</text>
				<text> Item 1</text>
				<text> Item 2</text>
				<text> Item 3</text>
			</box>
			<box borderStyle="single" flexGrow={1} padding={1}>
				<text attributes={BOLD}>Main Content</text>
				<text>This is the main content area.</text>
			</box>
		</box>
	);
}

const renderer = await createCliRenderer({ exitOnCtrlC: true });
createRoot(renderer).render(<App />);
