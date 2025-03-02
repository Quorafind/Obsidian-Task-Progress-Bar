// Code from https://github.com/obsidian-tasks-group/obsidian-tasks/tree/main/src/Config/Themes
// Original code is licensed under the MIT License.

import type { StatusCollection } from "./StatusCollections";

/**
 * Status supported by the ITS theme. {@link https://github.com/SlRvb/Obsidian--ITS-Theme}
 * Values recognised by Tasks are excluded.
 * @see {@link StatusSettings.bulkAddStatusCollection}
 */
export function itsSupportedStatuses() {
	const zzz: StatusCollection = [
		[" ", "Unchecked", "notStarted"],
		["x", "Regular", "completed"],
		["X", "Checked", "completed"],
		["-", "Dropped", "abandoned"],
		[">", "Forward", "planned"],
		["D", "Date", "notStarted"],
		["?", "Question", "planned"],
		["/", "Half Done", "inProgress"],
		["+", "Add", "notStarted"],
		["R", "Research", "notStarted"],
		["!", "Important", "notStarted"],
		["i", "Idea", "notStarted"],
		["B", "Brainstorm", "notStarted"],
		["P", "Pro", "notStarted"],
		["C", "Con", "notStarted"],
		["Q", "Quote", "notStarted"],
		["N", "Note", "notStarted"],
		["b", "Bookmark", "notStarted"],
		["I", "Information", "notStarted"],
		["p", "Paraphrase", "notStarted"],
		["L", "Location", "notStarted"],
		["E", "Example", "notStarted"],
		["A", "Answer", "notStarted"],
		["r", "Reward", "notStarted"],
		["c", "Choice", "notStarted"],
		["d", "Doing", "inProgress"],
		["T", "Time", "notStarted"],
		["@", "Character / Person", "notStarted"],
		["t", "Talk", "notStarted"],
		["O", "Outline / Plot", "notStarted"],
		["~", "Conflict", "notStarted"],
		["W", "World", "notStarted"],
		["f", "Clue / Find", "notStarted"],
		["F", "Foreshadow", "notStarted"],
		["H", "Favorite / Health", "notStarted"],
		["&", "Symbolism", "notStarted"],
		["s", "Secret", "notStarted"],
	];
	return zzz;
}
