import { useKeyboard } from "@opentui/react"
import { BOLD, DIM, colors } from "../../theme"
import type { OpenTab } from "../../types"

interface MainContentProps {
	focused: boolean
	onMouseDown: () => void
	openTabs: OpenTab[]
	activeTabId: string | null
	onActivateTab: (id: string) => void
	onCloseTab: (id: string) => void
}

const METHOD_COLORS: Record<string, string> = {
	GET: colors.green,
	POST: colors.yellow,
	PATCH: colors.mauve,
	PUT: colors.blue,
	DELETE: colors.red,
	HEAD: colors.green,
	OPTIONS: colors.red,
}

export function MainContent({
	focused,
	onMouseDown,
	openTabs,
	activeTabId,
	onActivateTab,
	onCloseTab,
}: MainContentProps) {
	useKeyboard((key) => {
		if (!focused) return

		if (key.name === "q" && key.shift) {
			if (activeTabId) {
				onCloseTab(activeTabId)
			}
			return
		}

		if (key.name === "h" && key.shift) {
			if (openTabs.length > 0) {
				const idx = openTabs.findIndex((t) => t.id === activeTabId)
				const target =
					idx > 0 ? openTabs[idx - 1] : openTabs[openTabs.length - 1]
				if (target) onActivateTab(target.id)
			}
			return
		}

		if (key.name === "l" && key.shift) {
			if (openTabs.length > 0) {
				const idx = openTabs.findIndex((t) => t.id === activeTabId)
				const target =
					idx >= 0 && idx < openTabs.length - 1
						? openTabs[idx + 1]
						: openTabs[0]
				if (target) onActivateTab(target.id)
			}
			return
		}
	})

	const activeTab = activeTabId
		? openTabs.find((t) => t.id === activeTabId)
		: null

	if (openTabs.length === 0) {
		return (
			<box
				flexGrow={1}
				borderStyle="single"
				borderColor={focused ? colors.blue : colors.surface0}
				flexDirection="column"
				backgroundColor={colors.base}
				onMouseDown={onMouseDown}
			>
				<box
					flexGrow={1}
					alignItems="center"
					justifyContent="center"
					flexDirection="column"
					padding={2}
				>
					<ascii-font text="RECURL" font="tiny" color={colors.blue} paddingBottom={4} />
					<text attributes={DIM} fg={colors.subtext0}>
						api client built for the agentic age
					</text>
				</box>
			</box>
		)
	}

	return (
		<box
			flexGrow={1}
			borderStyle="single"
			borderColor={focused ? colors.blue : colors.surface0}
			flexDirection="column"
			backgroundColor={colors.base}
			onMouseDown={onMouseDown}
		>
			<box flexDirection="row" backgroundColor={colors.surface0}>
				{openTabs.map((tab) => {
					const isActive = tab.id === activeTabId
					const tabLen =
						tab.type === "folder"
							? tab.name.length + 2
							: tab.name.length + (tab.method?.length ?? 3) + 1
					return (
						<box key={tab.id} flexDirection="column">
							<box
								flexDirection="row"
								alignItems="center"
								paddingX={1}
								backgroundColor={isActive ? colors.surface1 : undefined}
							>
								<box
									onMouseDown={() => onActivateTab(tab.id)}
									flexDirection="row"
								>
									{tab.type === "folder" ? (
										<text fg={colors.blue}> </text>
									) : (
										<text
											fg={METHOD_COLORS[tab.method ?? "GET"]}
											attributes={BOLD}
										>
											{tab.method}{" "}
										</text>
									)}
									<text fg={isActive ? colors.text : colors.subtext0}>
										{tab.name}
									</text>
								</box>
								<box onMouseDown={() => onCloseTab(tab.id)}>
									<text fg={colors.subtext0}> x</text>
								</box>
							</box>
							{isActive ? (
								<text fg={colors.blue}>
									{"─".repeat(tabLen + 2)}
								</text>
							) : null}
						</box>
					)
				})}
			</box>
			<box flexGrow={1} paddingX={1} flexDirection="column">
				<text attributes={BOLD} fg={colors.text}>
					{activeTab?.name}
				</text>
				<text fg={colors.subtext0}>
					{activeTab?.type === "request"
						? `Method: ${activeTab.method}`
						: "Folder"}
				</text>
			</box>
		</box>
	)
}
