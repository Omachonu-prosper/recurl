import { fonts } from "@opentui/core"

const colorTagRe = /<\/?c[12]>/g

function stripColorTags(s: string): string {
	return s.replaceAll(colorTagRe, "")
}

export function renderAsciiArt(
	input: string,
	fontName: keyof typeof fonts = "block",
): string {
	const font = fonts[fontName]
	const chars = input.toUpperCase().split("")
	const height = font.lines
	const rows: string[] = new Array(height).fill("")

	for (const ch of chars) {
		const glyph = font.chars[ch as keyof typeof font.chars] ?? font.chars[" "]
		for (let r = 0; r < height; r++) {
			rows[r] += stripColorTags(glyph[r] ?? " ".repeat(glyph[0]?.length ?? 1)) + " "
		}
	}

	return rows.join("\n")
}
