// Code from https://github.com/obsidian-tasks-group/obsidian-tasks/tree/main/src/Config/Themes
// Original code is licensed under the MIT License.
import type { StatusCollection } from "./StatusCollections";

/**
 * Status supported by the Ebullientworks theme. {@link https://github.com/ebullient/obsidian-theme-ebullientworks}
 * @see {@link StatusSettings.bulkAddStatusCollection}
 */
export function ebullientworksSupportedStatuses() {
	const zzz: StatusCollection = [
		[" ", "Unchecked", "notStarted"],
		["x", "Checked", "completed"],
		["-", "Cancelled", "abandoned"],
		["/", "In Progress", "inProgress"],
		[">", "Deferred", "planned"],
		["!", "Important", "notStarted"],
		["?", "Question", "planned"],
		["r", "Review", "notStarted"],
	];
	return zzz;
}
