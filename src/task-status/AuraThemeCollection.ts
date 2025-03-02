// Code from https://github.com/obsidian-tasks-group/obsidian-tasks/tree/main/src/Config/Themes
// Original code is licensed under the MIT License.

import type { StatusCollection } from "./StatusCollections";

/**
 * Status supported by the Aura theme. {@link https://github.com/ashwinjadhav818/obsidian-aura}
 * @see {@link StatusSettings.bulkAddStatusCollection}
 */
export function auraSupportedStatuses() {
	const zzz: StatusCollection = [
		[" ", "incomplete", "notStarted"],
		["x", "complete / done", "completed"],
		["-", "cancelled", "abandoned"],
		[">", "deferred", "planned"],
		["/", "in progress, or half-done", "inProgress"],
		["!", "Important", "notStarted"],
		["?", "question", "notStarted"],
		["R", "review", "notStarted"],
		["+", "Inbox / task that should be processed later", "notStarted"],
		["b", "bookmark", "notStarted"],
		["B", "brainstorm", "notStarted"],
		["D", "deferred or scheduled", "planned"],
		["I", "Info", "notStarted"],
		["i", "idea", "notStarted"],
		["N", "note", "notStarted"],
		["Q", "quote", "notStarted"],
		["W", "win / success / reward", "notStarted"],
		["P", "pro", "notStarted"],
		["C", "con", "notStarted"],
	];
	return zzz;
}
