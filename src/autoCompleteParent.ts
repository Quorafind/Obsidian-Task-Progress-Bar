import { App, Editor } from "obsidian";
import {
	EditorState,
	Text,
	Transaction,
	TransactionSpec,
} from "@codemirror/state";
import { getTabSize } from "./utils";
import { taskStatusChangeAnnotation } from "./taskStatusSwitcher";
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

	// Check if a task was completed in this transaction
	const taskCompletionInfo = findTaskCompletion(tr);
	if (!taskCompletionInfo) {
		return tr;
	}

	// Check if the completed task has a parent task
	const { doc, lineNumber } = taskCompletionInfo;
	const parentInfo = findParentTask(doc, lineNumber);
	if (!parentInfo) {
		return tr;
	}

	// Check if all siblings are completed
	const allSiblingsCompleted = areAllSiblingsCompleted(
		doc,
		parentInfo.lineNumber,
		parentInfo.indentationLevel,
		app
	);

	// If all siblings are completed, update the parent task
	if (allSiblingsCompleted) {
		return completeParentTask(tr, parentInfo.lineNumber, doc);
	}

	// If not all siblings are completed but some are, and the feature is enabled,
	// mark the parent as "In Progress"
	if (plugin.settings.markParentInProgressWhenPartiallyComplete) {
		const anySiblingsCompleted = anySiblingCompleted(
			doc,
			parentInfo.lineNumber,
			parentInfo.indentationLevel,
			app
		);

		if (anySiblingsCompleted) {
			const parentStatus = getParentTaskStatus(
				doc,
				parentInfo.lineNumber
			);
			// Only update if the parent is not already marked as "In Progress"
			if (parentStatus !== ">" && parentStatus !== "/") {
				return markParentAsInProgress(tr, parentInfo.lineNumber, doc);
			}
		}
	}

	return tr;
}

/**
 * Finds a task completion event in the transaction
 * @param tr The transaction to check
 * @returns Information about the completed task or null if no task was completed
 */
function findTaskCompletion(tr: Transaction): {
	doc: Text;
	lineNumber: number;
} | null {
	let taskCompletedLine: number | null = null;

	// Check each change in the transaction
	tr.changes.iterChanges(
		(
			fromA: number,
			toA: number,
			fromB: number,
			toB: number,
			inserted: Text
		) => {
			// If a change involves inserting an 'x' character
			const insertedText = inserted.toString();
			if (
				insertedText === "x" ||
				insertedText === "X" ||
				insertedText.trim() === "- [x]"
			) {
				// Get the position context
				const pos = fromB;
				const line = tr.newDoc.lineAt(pos);
				const lineText = line.text;

				// Check if this is a task being completed ([ ] to [x])
				// Matches the pattern where the cursor is between [ and ]
				const taskRegex = /^[\s|\t]*([-*+]|\d+\.)\s\[[x|X]\]/i;
				if (taskRegex.test(lineText)) {
					taskCompletedLine = line.number;
				}
			}
		}
	);

	if (taskCompletedLine === null) {
		return null;
	}

	return {
		doc: tr.newDoc,
		lineNumber: taskCompletedLine,
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
			const taskRegex = /^[\s|\t]*([-*+]|\d+\.)\s\[([ |x|X])\]/i;
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
 * @returns True if all siblings are completed, false otherwise
 */
function areAllSiblingsCompleted(
	doc: Text,
	parentLineNumber: number,
	parentIndentLevel: number,
	app: App
): boolean {
	const tabSize = getTabSize(app);

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
				if (taskStatus !== "x" && taskStatus !== "X") {
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
 * @returns The modified transaction
 */
function completeParentTask(
	tr: Transaction,
	parentLineNumber: number,
	doc: Text
): TransactionSpec {
	const parentLine = doc.line(parentLineNumber);
	const parentLineText = parentLine.text;

	// Find the task marker position
	const taskMarkerMatch = parentLineText.match(
		/^[\s|\t]*([-*+]|\d+\.)\s\[( )\]/
	);
	if (!taskMarkerMatch) {
		return tr;
	}

	// Calculate the position where we need to insert 'x'
	const markerStart =
		parentLine.from +
		taskMarkerMatch.index! +
		taskMarkerMatch[0].indexOf("[ ]") +
		1;

	// Create a new transaction that adds the completion marker 'x' to the parent task
	return {
		changes: [
			tr.changes,
			{
				from: markerStart,
				to: markerStart + 1,
				insert: "x",
			},
		],
		selection: tr.selection,
		annotations: [taskStatusChangeAnnotation.of("taskStatusChange")],
	};
}

/**
 * Checks if any sibling tasks are completed
 * @param doc The document to check
 * @param parentLineNumber The line number of the parent task
 * @param parentIndentLevel The indentation level of the parent task
 * @param app The Obsidian app instance
 * @returns True if any siblings are completed, false otherwise
 */
function anySiblingCompleted(
	doc: Text,
	parentLineNumber: number,
	parentIndentLevel: number,
	app: App
): boolean {
	const tabSize = getTabSize(app);

	// The expected indentation level for child tasks
	const childIndentLevel = parentIndentLevel + tabSize;

	// Track if we found at least one completed child
	let foundCompletedChild = false;

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
				// If we find a completed task, return true
				const taskStatus = taskMatch[2];
				console.log("taskStatus", taskStatus);
				if (taskStatus !== " ") {
					foundCompletedChild = true;
				}
			}
		}
	}

	return foundCompletedChild;
}

/**
 * Gets the current status of a parent task
 * @param doc The document
 * @param parentLineNumber The line number of the parent task
 * @returns The task status character
 */
function getParentTaskStatus(doc: Text, parentLineNumber: number): string {
	const parentLine = doc.line(parentLineNumber);
	const parentLineText = parentLine.text;

	// Find the task marker
	const taskMarkerMatch = parentLineText.match(
		/^[\s|\t]*([-*+]|\d+\.)\s\[(.)]/
	);

	if (!taskMarkerMatch) {
		return "";
	}

	return taskMarkerMatch[2];
}

/**
 * Marks a parent task as "In Progress" by modifying the transaction
 * @param tr The transaction to modify
 * @param parentLineNumber The line number of the parent task
 * @param doc The document
 * @returns The modified transaction
 */
function markParentAsInProgress(
	tr: Transaction,
	parentLineNumber: number,
	doc: Text
): TransactionSpec {
	const parentLine = doc.line(parentLineNumber);
	const parentLineText = parentLine.text;

	// Find the task marker position
	const taskMarkerMatch = parentLineText.match(
		/^[\s|\t]*([-*+]|\d+\.)\s\[( )\]/
	);
	if (!taskMarkerMatch) {
		return tr;
	}

	// Calculate the position where we need to insert '>'
	const markerStart =
		parentLine.from +
		taskMarkerMatch.index! +
		taskMarkerMatch[0].indexOf("[ ]") +
		1;

	// Create a new transaction that adds the "In Progress" marker '>' to the parent task
	return {
		changes: [
			tr.changes,
			{
				from: markerStart,
				to: markerStart + 1,
				insert: ">",
			},
		],
		selection: tr.selection,
		annotations: [taskStatusChangeAnnotation.of("taskStatusChange")],
	};
}
