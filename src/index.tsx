import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./App"
import { renderAsciiArt } from "./ascii"

const isHeadless = process.argv.includes("--headless")

if (isHeadless) {
	console.log(renderAsciiArt("Recurl headless WIP"))
	process.exit(0)
}

const renderer = await createCliRenderer({ exitOnCtrlC: true })
createRoot(renderer).render(<App />)
