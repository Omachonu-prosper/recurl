import { useState, useRef, useCallback } from "react"
import { useKeyboard, useTerminalDimensions } from "@opentui/react"
import { BOLD, DIM, UNDERLINE, colors } from "../../theme"
import type { OpenTab } from "../../types"
import { Select } from "../select/Select"

interface MainContentProps {
	focused: boolean
	onMouseDown: () => void
	openTabs: OpenTab[]
	activeTabId: string | null
	onActivateTab: (id: string) => void
	onCloseTab: (id: string) => void
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const

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
	const { width } = useTerminalDimensions()
	const [requestState, setRequestState] = useState<
		Record<string, { method: string; url: string }>
	>({})
	const [openDropdownTabId, setOpenDropdownTabId] = useState<string | null>(
		null,
	)
	const [urlInputFocused, setUrlInputFocused] = useState(false)
	const [urlInputFocusedByClick, setUrlInputFocusedByClick] = useState(false)
	const methodPPending = useRef(0)

	const activeTab = activeTabId
		? openTabs.find((t) => t.id === activeTabId)
		: null

	const setMethod = useCallback((tabId: string, method: string) => {
		setRequestState((prev) => {
			const existing = prev[tabId]
			return {
				...prev,
				[tabId]: { method, url: existing?.url ?? "" },
			}
		})
	}, [])

	const setUrl = useCallback((tabId: string, url: string) => {
		setRequestState((prev) => {
			const existing = prev[tabId]
			return {
				...prev,
				[tabId]: {
					method: existing?.method ?? "GET",
					url,
				},
			}
		})
	}, [])

	const getMethod = useCallback(
		(tabId: string) => {
			const tab = openTabs.find((t) => t.id === tabId)
			return requestState[tabId]?.method ?? tab?.method ?? "GET"
		},
		[openTabs, requestState],
	)

	const getUrl = useCallback(
		(tabId: string) => {
			return requestState[tabId]?.url ?? ""
		},
		[requestState],
	)

	useKeyboard((key) => {
		if (!focused) return

		if (key.name === "escape") {
			if (urlInputFocused) {
				setUrlInputFocused(false)
				setUrlInputFocusedByClick(false)
				return
			}
			if (openDropdownTabId) {
				setOpenDropdownTabId(null)
				return
			}
			return
		}

		if (urlInputFocused) {
			if (urlInputFocusedByClick) {
				return
			}
			const tabId = activeTabId
			if (!tabId || activeTab?.type !== "request") return
			if (key.name === "backspace") {
				setUrl(tabId, getUrl(tabId).slice(0, -1))
				return
			}
			if (key.name === "enter" || key.name === "return") {
				setUrlInputFocused(false)
				return
			}
			if (key.name.length === 1) {
				setUrl(tabId, getUrl(tabId) + key.name)
				return
			}
			return
		}

		if (key.name === "/") {
			if (activeTabId && activeTab?.type === "request") {
				setUrlInputFocused(true)
			}
			return
		}

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

		if (!activeTabId || activeTab?.type !== "request") return

		const tabId = activeTabId

		if (key.name === "u") {
			if (
				methodPPending.current !== 0 &&
				Date.now() - methodPPending.current < 300
			) {
				setMethod(tabId, "PUT")
				methodPPending.current = 0
			}
			return
		}

		if (key.name === "a") {
			if (
				methodPPending.current !== 0 &&
				Date.now() - methodPPending.current < 300
			) {
				setMethod(tabId, "PATCH")
				methodPPending.current = 0
			}
			return
		}

		if (key.name !== "p" && key.name !== "u" && key.name !== "a") {
			methodPPending.current = 0
		}

		switch (key.name) {
			case "g":
				setMethod(tabId, "GET")
				break
			case "p": {
				const now = Date.now()
				methodPPending.current = now
				setTimeout(() => {
					if (methodPPending.current === now) {
						setMethod(tabId, "POST")
						methodPPending.current = 0
					}
				}, 300)
				break
			}
			case "h":
				setMethod(tabId, "HEAD")
				break
			case "d":
				setMethod(tabId, "DELETE")
				break
      case "o":
        setMethod(tabId, "OPTIONS")
        break
		}
	})

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
					<ascii-font
						text="RECURL"
						font="tiny"
						color={colors.blue}
						paddingBottom={4}
					/>
					<text attributes={DIM} fg={colors.subtext0}>
						TUI api client built for the agentic age
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
					return (
						<box
							key={tab.id}
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
										fg={METHOD_COLORS[getMethod(tab.id)]}
										attributes={BOLD}
									>
										{getMethod(tab.id)}{" "}
									</text>
								)}
								<text
									fg={isActive ? colors.blue : colors.subtext0}
									attributes={isActive ? UNDERLINE : undefined}
								>
									{tab.name}
								</text>
							</box>
							<box onMouseDown={() => onCloseTab(tab.id)}>
								<text fg={colors.subtext0}> x</text>
							</box>
						</box>
					)
				})}
			</box>
			{activeTab?.type === "folder" ? (
				<box flexGrow={1} padding={2}>
					<text fg={colors.subtext0}>folder wip</text>
				</box>
			) : activeTab && activeTab.type === "request" ? (
				<box
					position="relative"
					flexGrow={1}
					flexDirection="column"
					onMouseDown={() => {
						setUrlInputFocused(false)
						setUrlInputFocusedByClick(false)
					}}
				>
					<box
						flexDirection="row"
						alignItems="center"
						gap={1}
						paddingX={1}
						backgroundColor={colors.surface0}
					>
						<box
							onMouseDown={() => {
								setUrlInputFocused(false)
								setUrlInputFocusedByClick(false)
								setOpenDropdownTabId((prev) =>
									prev === activeTab.id ? null : activeTab.id,
								)
							}}
							paddingX={1}
							backgroundColor={colors.surface1}
						>
							<text
								fg={METHOD_COLORS[getMethod(activeTab.id)]}
								attributes={BOLD}
							>
								{getMethod(activeTab.id)} ▾
							</text>
						</box>
						<box
							flexGrow={1}
							height={3}
							borderStyle="single"
							borderColor={
								urlInputFocused ? colors.blue : colors.surface1
							}
							onMouseDown={() => {
								setUrlInputFocused(true)
								setUrlInputFocusedByClick(true)
							}}
						>
							<input
								value={getUrl(activeTab.id)}
								onInput={(v) => setUrl(activeTab.id, v)}
								flexGrow={1}
								placeholder="enter url here"
								backgroundColor={colors.surface0}
								focusedBackgroundColor={colors.surface1}
							/>
						</box>
						<box
							backgroundColor={colors.blue}
							paddingX={2}
							onMouseDown={() => {
								setUrlInputFocused(false)
								setUrlInputFocusedByClick(false)
							}}
						>
							<text attributes={BOLD}>Send</text>
						</box>
					</box>
					<box
						flexGrow={1}
						flexDirection={width > 120 ? "row" : "column"}
						gap={1}
						paddingX={1}
					>
						<box
							flexGrow={1}
							borderStyle="single"
							borderColor={colors.surface0}
							padding={1}
							flexDirection="column"
						>
							<text attributes={BOLD} fg={colors.text}>
								Request
							</text>
						</box>
						<box
							flexGrow={1}
							borderStyle="single"
							borderColor={colors.surface0}
							padding={1}
							flexDirection="column"
						>
							<text attributes={BOLD} fg={colors.text}>
								Response
							</text>
						</box>
					</box>
					{openDropdownTabId === activeTab.id ? (
						<Select
							options={METHODS.map((m) => ({
								label: m,
								value: m,
								color: METHOD_COLORS[m],
							}))}
							selectedIndex={METHODS.indexOf(
								getMethod(activeTab.id) as typeof METHODS[number],
							)}
							onSelect={(i) => {
								setMethod(activeTab.id, METHODS[i]!)
								setOpenDropdownTabId(null)
							}}
							onClose={() => setOpenDropdownTabId(null)}
							top={1}
							left={1}
							width={15}
						/>
					) : null}
				</box>
			) : null}
		</box>
	)
}
