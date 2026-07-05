export interface FolderItem {
	id: string
	type: "folder"
	name: string
	parentId: string | null
}

export interface RequestItem {
	id: string
	type: "request"
	name: string
	method: string
	parentId: string | null
}

export type CollectionItem = FolderItem | RequestItem
