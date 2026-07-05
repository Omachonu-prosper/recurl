export const KEYBINDINGS = [
	{ key: "n", desc: "New request (inside focused folder)" },
	{ key: "N", desc: "New folder (inside focused folder)" },
	{ key: "Space n", desc: "New request at root" },
	{ key: "Space N", desc: "New folder at root" },
	{ key: "j / ↓", desc: "Move focus down" },
	{ key: "k / ↑", desc: "Move focus up" },
	{ key: "h / ←", desc: "Collapse folder" },
	{ key: "l / →", desc: "Expand folder" },
	{ key: "r", desc: "Rename focused item" },
	{ key: "dd", desc: "Delete focused item (with confirm)" },
	{ key: "Tab", desc: "Toggle sidebar / main focus" },
	{ key: "/", desc: "Toggle this keybindings popup" },
] as const
