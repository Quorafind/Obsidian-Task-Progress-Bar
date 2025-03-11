import { App, Editor } from "obsidian";
import {
	EditorState,
	Text,
	Transaction,
	TransactionSpec,
} from "@codemirror/state";
import { getTabSize } from "./utils";
import { STATE_MARK_MAP, TaskState } from "./taskStatusSwitcher";
import TaskProgressBarPlugin from "./taskProgressBarIndex";

/**
 * Creates an editor extension that automatically completes parent tasks when all child tasks are completed
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns An editor extension that can be registered with the plugin
 */
export function autoCompleteParentExtension(
	app: App,
	plugin: TaskProgressBarPlugin
) {
	return EditorState.transactionFilter.of((tr) => {
		return handleAutoCompleteParentTransaction(tr, app, plugin);
	});
}

/**
 * Handles transactions to detect task completion and process parent task updates
 * @param tr The transaction to handle
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns The original transaction or a modified transaction
 */
export function handleAutoCompleteParentTransaction(
	tr: Transaction,
	app: App,
	plugin: TaskProgressBarPlugin
): TransactionSpec {
	// Only process transactions that change the document and are user input events
	if (!tr.docChanged) {
		return tr;
	}

	// Check if a task status was changed in this transaction
	const taskStatusChangeInfo = findTaskStatusChange(tr, plugin);
	if (!taskStatusChangeInfo) {
		return tr;
	}

	// Check if the changed task has a parent task
	const { doc, lineNumber, newStatus } = taskStatusChangeInfo;
	const parentInfo = findParentTask(doc, lineNumber);
	if (!parentInfo) {
		return tr;
	}

	// Only proceed if the new status is a "completed" status
	const { cycle, marks } = getStatusConfig(plugin);
	if (!isCompletedStatus(newStatus, cycle, marks, plugin)) {
		return tr;
	}

	// Check if all siblings are completed
	const allSiblingsCompleted = areAllSiblingsCompleted(
		doc,
		parentInfo.lineNumber,
		parentInfo.indentationLevel,
		app,
		plugin
	);

	// If all siblings are completed, update the parent task
	if (allSiblingsCompleted) {
		return completeParentTask(tr, parentInfo.lineNumber, doc, plugin);
	}

	return tr;
}

/**
 * Gets the current task status configuration
 * @param plugin The plugin instance
 * @returns The cycle and marks configuration
 */
function getStatusConfig(plugin: TaskProgressBarPlugin) {
	// If task status switcher is enabled, use those settings
	if (plugin.settings.enableTaskStatusSwitcher) {
		return {
			cycle: plugin.settings.taskStatusCycle,
			marks: plugin.settings.taskStatusMarks,
		};
	}

	// Otherwise, use the default configuration
	return {
		cycle: Object.keys(STATE_MARK_MAP),
		marks: STATE_MARK_MAP,
	};
}

/**
 * Determines if a status is considered "completed"
 * @param status The status to check
 * @param cycle The task status cycle
 * @param marks The task status marks
 * @param plugin The plugin instance
 * @returns True if the status is considered "completed"
 */
function isCompletedStatus(
	status: string,
	cycle: string[],
	marks: Record<string, string>,
	plugin: TaskProgressBarPlugin
): boolean {
	// If using cycle/status system
	if (plugin.settings.enableTaskStatusSwitcher) {
		// Consider the last status in the cycle as "completed"
		// This is typically the DONE status
		return status === cycle[cycle.length - 1];
	}

	// If not using the cycle system, check against the completed task statuses
	const completedMarks = plugin.settings.taskStatuses.completed.split("|");
	return completedMarks.includes(status);
}

/**
 * Finds a task status change event in the transaction
 * @param tr The transaction to check
 * @param plugin The plugin instance
 * @returns Information about the task with changed status or null if no task status was changed
 */
function findTaskStatusChange(
	tr: Transaction,
	plugin: TaskProgressBarPlugin
): {
	doc: Text;
	lineNumber: number;
	newStatus: string;
} | null {
	let taskChangedLine: number | null = null;
	let newStatus: string = "";

	// Check each change in the transaction
	tr.changes.iterChanges(
		(
			fromA: number,
			toA: number,
			fromB: number,
			toB: number,
			inserted: Text
		) => {
			const insertedText = inserted.toString();

			// Check if this might be a task status change
			// Check for both single character changes and full task insertion
			if (
				insertedText.length === 1 || // Single character change (clicking)
				insertedText.trim().startsWith("- [") // Full task insertion (shortcut)
			) {
				// Get the position context
				const pos = fromB;
				const line = tr.newDoc.lineAt(pos);
				const lineText = line.text;

				// Check if this is a task line
				const taskRegex = /^[\s|\t]*([-*+]|\d+\.)\s\[(.)]/i;
				const taskMatch = lineText.match(taskRegex);

				if (taskMatch) {
					// This is a task line with a status marker
					taskChangedLine = line.number;
					newStatus = taskMatch[2]; // The character inside the brackets
				}
			}
		}
	);

	if (taskChangedLine === null) {
		return null;
	}

	return {
		doc: tr.newDoc,
		lineNumber: taskChangedLine,
		newStatus: newStatus,
	};
}

/**
 * Finds the parent task of a given task line
 * @param doc The document to search in
 * @param lineNumber The line number of the task
 * @returns Information about the parent task or null if no parent was found
 */
function findParentTask(
	doc: Text,
	lineNumber: number
): {
	lineNumber: number;
	indentationLevel: number;
} | null {
	// Get the current line and its indentation level
	const currentLine = doc.line(lineNumber);
	const currentLineText = currentLine.text;
	const currentIndentMatch = currentLineText.match(/^[\s|\t]*/);
	const currentIndentLevel = currentIndentMatch
		? currentIndentMatch[0].length
		: 0;

	// If we're at the top level, there's no parent
	if (currentIndentLevel === 0) {
		return null;
	}

	// Look backwards for a line with less indentation that contains a task
	for (let i = lineNumber - 1; i >= 1; i--) {
		const line = doc.line(i);
		const lineText = line.text;

		// Skip empty lines
		if (lineText.trim() === "") {
			continue;
		}

		// Get the indentation level of this line
		const indentMatch = lineText.match(/^[\s|\t]*/);
		const indentLevel = indentMatch ? indentMatch[0].length : 0;

		// If this line has less indentation than the current line
		if (indentLevel < currentIndentLevel) {
			// Check if it's a task
			const taskRegex = /^[\s|\t]*([-*+]|\d+\.)\s\[(.)]/i;
			if (taskRegex.test(lineText)) {
				return {
					lineNumber: i,
					indentationLevel: indentLevel,
				};
			}

			// If it's not a task, it can't be a parent task
			// If it's a heading or other structural element, we keep looking
			if (!lineText.startsWith("#") && !lineText.startsWith(">")) {
				break;
			}
		}
	}

	return null;
}

/**
 * Checks if all sibling tasks at the same indentation level as the parent's children are completed
 * @param doc The document to check
 * @param parentLineNumber The line number of the parent task
 * @param parentIndentLevel The indentation level of the parent task
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns True if all siblings are completed, false otherwise
 */
function areAllSiblingsCompleted(
	doc: Text,
	parentLineNumber: number,
	parentIndentLevel: number,
	app: App,
	plugin: TaskProgressBarPlugin
): boolean {
	const tabSize = getTabSize(app);
	const { cycle, marks } = getStatusConfig(plugin);

	// The expected indentation level for child tasks
	const childIndentLevel = parentIndentLevel + tabSize;

	// Track if we found at least one child
	let foundChild = false;

	// Search forward from the parent line
	for (let i = parentLineNumber + 1; i <= doc.lines; i++) {
		const line = doc.line(i);
		const lineText = line.text;

		// Skip empty lines
		if (lineText.trim() === "") {
			continue;
		}

		// Get the indentation of this line
		const indentMatch = lineText.match(/^[\s|\t]*/);
		const indentLevel = indentMatch ? indentMatch[0].length : 0;

		// If we encounter a line with less or equal indentation to the parent,
		// we've moved out of the parent's children scope
		if (indentLevel <= parentIndentLevel) {
			break;
		}

		// If this is a direct child of the parent (exactly one level deeper)
		if (indentLevel === childIndentLevel) {
			// Create a regex to match tasks based on the indentation level
			const taskRegex = new RegExp(
				`^[\\s|\\t]{${childIndentLevel}}([-*+]|\\d+\\.)\\s\\[(.)\\]`
			);

			const taskMatch = lineText.match(taskRegex);
			if (taskMatch) {
				foundChild = true;

				// If we find an incomplete task, return false
				const taskStatus = taskMatch[2];

				// Check if this task is considered completed
				if (!isCompletedStatus(taskStatus, cycle, marks, plugin)) {
					return false;
				}
			}
		}
	}

	// If we found at least one child and all were completed, return true
	return foundChild;
}

/**
 * Completes a parent task by modifying the transaction
 * @param tr The transaction to modify
 * @param parentLineNumber The line number of the parent task
 * @param doc The document
 * @param plugin The plugin instance
 * @returns The modified transaction
 */
function completeParentTask(
	tr: Transaction,
	parentLineNumber: number,
	doc: Text,
	plugin: TaskProgressBarPlugin
): TransactionSpec {
	const parentLine = doc.line(parentLineNumber);
	const parentLineText = parentLine.text;
	const { cycle, marks } = getStatusConfig(plugin);

	// Find the task marker position
	const taskMarkerMatch = parentLineText.match(
		/^[\s|\t]*([-*+]|\d+\.)\s\[(.)\]/
	);
	if (!taskMarkerMatch) {
		return tr;
	}

	// Get the current mark and position
	const currentMark = taskMarkerMatch[2];
	const markerStart =
		parentLine.from +
		taskMarkerMatch.index! +
		taskMarkerMatch[0].indexOf(`[${currentMark}]`) +
		1;

	// Determine which mark to use for completion
	let completionMark: string;

	if (plugin.settings.enableTaskStatusSwitcher) {
		// Use the last mark in the cycle (usually "completed" state)
		const lastState = cycle[cycle.length - 1];
		completionMark = marks[lastState] || "x";
	} else {
		// Use the first mark in the completed list
		const completedMarks =
			plugin.settings.taskStatuses.completed.split("|");
		completionMark = completedMarks[0] || "x";
	}

	// Create a new transaction that updates the parent task mark
	return {
		changes: [
			tr.changes,
			{
				from: markerStart,
				to: markerStart + 1,
				insert: completionMark,
			},
		],
		selection: tr.selection,
	};
}
