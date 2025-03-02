// Code from https://github.com/obsidian-tasks-group/obsidian-tasks/tree/main/src/Config/Themes
// Original code is licensed under the MIT License.

import type { StatusCollection } from "./StatusCollections";

/**
 * Status supported by the AnuPpuccin theme. {@link https://github.com/AnubisNekhet/AnuPpuccin}
 * @see {@link StatusSettings.bulkAddStatusCollection}
 */
export function anuppuccinSupportedStatuses() {
	const zzz: StatusCollection = [
		[" ", "Unchecked", "notStarted"],
		["x", "Checked", "completed"],
		[">", "Rescheduled", "planned"],
		["<", "Scheduled", "planned"],
		["!", "Important", "notStarted"],
		["-", "Cancelled", "abandoned"],
		["/", "In Progress", "inProgress"],
		["?", "Question", "notStarted"],
		["*", "Star", "notStarted"],
		["n", "Note", "notStarted"],
		["l", "Location", "notStarted"],
		["i", "Information", "notStarted"],
		["I", "Idea", "notStarted"],
		["S", "Amount", "notStarted"],
		["p", "Pro", "notStarted"],
		["c", "Con", "notStarted"],
		["b", "Bookmark", "notStarted"],
		['"', "Quote", "notStarted"],
		["0", "Speech bubble 0", "notStarted"],
		["1", "Speech bubble 1", "notStarted"],
		["2", "Speech bubble 2", "notStarted"],
		["3", "Speech bubble 3", "notStarted"],
		["4", "Speech bubble 4", "notStarted"],
		["5", "Speech bubble 5", "notStarted"],
		["6", "Speech bubble 6", "notStarted"],
		["7", "Speech bubble 7", "notStarted"],
		["8", "Speech bubble 8", "notStarted"],
		["9", "Speech bubble 9", "notStarted"],
	];
	return zzz;
}
