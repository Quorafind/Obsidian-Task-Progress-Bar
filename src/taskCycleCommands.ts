import { Editor, MarkdownFileInfo, MarkdownView } from "obsidian";
import TaskProgressBarPlugin from "./taskProgressBarIndex";
import { taskStatusChangeAnnotation } from "./taskStatusSwitcher";

/**
 * Cycles the task status on the current line forward
 * @param checking Whether this is a check or an execution
 * @param editor The editor instance
 * @param ctx The markdown view or file info context
 * @param plugin The plugin instance
 * @returns Boolean indicating whether the command can be executed
 */
export function cycleTaskStatusForward(
	checking: boolean,
	editor: Editor,
	ctx: MarkdownView | MarkdownFileInfo,
	plugin: TaskProgressBarPlugin
): boolean {
	return cycleTaskStatus(checking, editor, plugin, "forward");
}

/**
 * Cycles the task status on the current line backward
 * @param checking Whether this is a check or an execution
 * @param editor The editor instance
 * @param ctx The markdown view or file info context
 * @param plugin The plugin instance
 * @returns Boolean indicating whether the command can be executed
 */
export function cycleTaskStatusBackward(
	checking: boolean,
	editor: Editor,
	ctx: MarkdownView | MarkdownFileInfo,
	plugin: TaskProgressBarPlugin
): boolean {
	return cycleTaskStatus(checking, editor, plugin, "backward");
}

/**
 * Cycles the task status on the current line in the specified direction
 * @param checking Whether this is a check or an execution
 * @param editor The editor instance
 * @param plugin The plugin instance
 * @param direction The direction to cycle: "forward" or "backward"
 * @returns Boolean indicating whether the command can be executed
 */
function cycleTaskStatus(
	checking: boolean,
	editor: Editor,
	plugin: TaskProgressBarPlugin,
	direction: "forward" | "backward"
): boolean {
	// Get the current cursor position
	const cursor = editor.getCursor();

	// Get the text from the current line
	const line = editor.getLine(cursor.line);

	// Check if this line contains a task
	const taskRegex = /^[\s|\t]*([-*+]|\d+\.)\s+\[(.)]/;
	const match = line.match(taskRegex);

	if (!match) {
		// Not a task line
		return false;
	}

	// If just checking if the command is valid
	if (checking) {
		return true;
	}

	// Get the task cycle and marks from plugin settings
	const { cycle, marks, excludeMarksFromCycle } = getTaskStatusConfig(plugin);
	const remainingCycle = cycle.filter(
		(state) => !excludeMarksFromCycle.includes(state)
	);

	// If no cycle is defined, don't do anything
	if (remainingCycle.length === 0) {
		return false;
	}

	// Get the current mark
	const currentMark = match[2];

	// Find the current status in the cycle
	let currentStatusIndex = -1;
	for (let i = 0; i < remainingCycle.length; i++) {
		const state = remainingCycle[i];
		if (marks[state] === currentMark) {
			currentStatusIndex = i;
			break;
		}
	}

	// If we couldn't find the current status in the cycle, start from the first one
	if (currentStatusIndex === -1) {
		currentStatusIndex = 0;
	}

	// Calculate the next status based on direction
	let nextStatusIndex;
	if (direction === "forward") {
		nextStatusIndex = (currentStatusIndex + 1) % remainingCycle.length;
	} else {
		nextStatusIndex =
			(currentStatusIndex - 1 + remainingCycle.length) %
			remainingCycle.length;
	}

	const nextStatus = remainingCycle[nextStatusIndex];
	const nextMark = marks[nextStatus] || " ";

	// Find the positions of the mark in the line
	const startPos = line.indexOf("[") + 1;

	// Replace the mark
	editor.replaceRange(
		nextMark,
		{ line: cursor.line, ch: startPos },
		{ line: cursor.line, ch: startPos + 1 }
	);

	return true;
}

/**
 * Gets the task status configuration from the plugin settings
 * @param plugin The plugin instance
 * @returns Object containing the task cycle and marks
 */
function getTaskStatusConfig(plugin: TaskProgressBarPlugin) {
	return {
		cycle: plugin.settings.taskStatusCycle,
		excludeMarksFromCycle: plugin.settings.excludeMarksFromCycle || [],
		marks: plugin.settings.taskStatusMarks,
	};
}
