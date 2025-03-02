// Code from https://github.com/obsidian-tasks-group/obsidian-tasks/tree/main/src/Config/Themes
// Original code is licensed under the MIT License.
import type { StatusCollection } from "./StatusCollections";

/**
 * Statuses supported by the Border theme. {@link https://github.com/Akifyss/obsidian-border?tab=readme-ov-file#alternate-checkboxes}
 * @see {@link StatusSettings.bulkAddStatusCollection}
 */
export function borderSupportedStatuses() {
	const zzz: StatusCollection = [
		[" ", "To Do", "notStarted"],
		["/", "In Progress", "inProgress"],
		["x", "Done", "completed"],
		["-", "Cancelled", "abandoned"],
		[">", "Rescheduled", "planned"],
		["<", "Scheduled", "planned"],
		["!", "Important", "notStarted"],
		["?", "Question", "notStarted"],
		["i", "Infomation", "notStarted"],
		["S", "Amount", "notStarted"],
		["*", "Star", "notStarted"],
		["b", "Bookmark", "notStarted"],
		["“", "Quote", "notStarted"],
		["n", "Note", "notStarted"],
		["l", "Location", "notStarted"],
		["I", "Idea", "notStarted"],
		["p", "Pro", "notStarted"],
		["c", "Con", "notStarted"],
		["u", "Up", "notStarted"],
		["d", "Down", "notStarted"],
	];
	return zzz;
}
