// Code from https://github.com/obsidian-tasks-group/obsidian-tasks/tree/main/src/Statuses
// Original code is licensed under the MIT License.

/**
 * The type used for a single entry in bulk imports of pre-created sets of statuses, such as for Themes or CSS Snippets.
 * The values are: symbol, name, status type (must be one of the values in {@link StatusType}
 */
export type StatusCollectionEntry = [string, string, string];

/**
 * The type used for bulk imports of pre-created sets of statuses, such as for Themes or CSS Snippets.
 * See {@link Status.createFromImportedValue}
 */
export type StatusCollection = Array<StatusCollectionEntry>;
