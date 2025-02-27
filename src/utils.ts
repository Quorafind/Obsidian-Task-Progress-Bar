import { EditorView } from "@codemirror/view";

import TaskProgressBarPlugin from "./taskProgressBarIndex";
import { editorInfoField, MarkdownPostProcessorContext, TFile } from "obsidian";


// Helper function to check if progress bars should be hidden
export function shouldHideProgressBarInPreview(
	plugin: TaskProgressBarPlugin,
	ctx: MarkdownPostProcessorContext
): boolean {
	if (!plugin.settings.hideProgressBarBasedOnConditions) {
		return false;
	}

	const abstractFile = ctx.sourcePath
		? plugin.app.vault.getAbstractFileByPath(ctx.sourcePath)
		: null;
	if (!abstractFile) {
		return false;
	}

	// Check if it's a file and not a folder
	if (!(abstractFile instanceof TFile)) {
		return false;
	}

	const file = abstractFile as TFile;

	// Check folder paths
	if (plugin.settings.hideProgressBarFolders) {
		const folders = plugin.settings.hideProgressBarFolders
			.split(",")
			.map((f) => f.trim());
		const filePath = file.path;

		for (const folder of folders) {
			if (folder && filePath.startsWith(folder)) {
				return true;
			}
		}
	}

	// Check tags
	if (plugin.settings.hideProgressBarTags) {
		const tags = plugin.settings.hideProgressBarTags
			.split(",")
			.map((t) => t.trim());
		const fileCache = plugin.app.metadataCache.getFileCache(file);

		if (fileCache && fileCache.tags) {
			for (const tag of tags) {
				if (fileCache.tags.some((t) => t.tag === "#" + tag)) {
					return true;
				}
			}
		}
	}

	// Check metadata
	if (plugin.settings.hideProgressBarMetadata) {
		const metadataCache = plugin.app.metadataCache.getFileCache(file);

		if (metadataCache && metadataCache.frontmatter) {
			// Parse the metadata string (format: "key: value")
			const key = plugin.settings.hideProgressBarMetadata;
			if (key && metadataCache.frontmatter[key] !== undefined) {
				return !!metadataCache.frontmatter[key];
			}
		}
	}

	return false;
}

// Helper function to check if progress bars should be hidden
export function shouldHideProgressBarInLivePriview(
	plugin: TaskProgressBarPlugin,
	view: EditorView
): boolean {
	if (!plugin.settings.hideProgressBarBasedOnConditions) {
		return false;
	}

	// Get the current file
	const editorInfo = view.state.field(editorInfoField);
	if (!editorInfo) {
		return false;
	}

	const file = editorInfo.file;
	if (!file) {
		return false;
	}

	// Check folder paths
	if (plugin.settings.hideProgressBarFolders) {
		const folders = plugin.settings.hideProgressBarFolders
			.split(",")
			.map((f) => f.trim());
		const filePath = file.path;

		for (const folder of folders) {
			if (folder && filePath.startsWith(folder)) {
				return true;
			}
		}
	}

	// Check tags
	if (plugin.settings.hideProgressBarTags) {
		const tags = plugin.settings.hideProgressBarTags
			.split(",")
			.map((t) => t.trim());

		// Try to get cache for tags
		const fileCache = plugin.app.metadataCache.getFileCache(file);
		if (fileCache && fileCache.tags) {
			for (const tag of tags) {
				if (fileCache.tags.some((t) => t.tag === "#" + tag)) {
					return true;
				}
			}
		}
	}

	// Check metadata
	if (plugin.settings.hideProgressBarMetadata) {
		const metadataCache = plugin.app.metadataCache.getFileCache(file);

		if (metadataCache && metadataCache.frontmatter) {
			// Parse the metadata string (format: "key: value")
			const key = plugin.settings.hideProgressBarMetadata;
			if (key && key in metadataCache.frontmatter) {
				return !!metadataCache.frontmatter[key];
			}
		}
	}

	return false;
}
