// Code from https://github.com/obsidian-tasks-group/obsidian-tasks/tree/main/src/Config/Themes
// Original code is licensed under the MIT License.

import type { StatusCollection } from './StatusCollections';

/**
 * Status supported by the LYT Mode theme. {@link https://github.com/nickmilo/LYT-Mode}
 * @see {@link StatusSettings.bulkAddStatusCollection}
 */
export function lytModeSupportedStatuses() {
    const zzz: StatusCollection = [
        [' ', 'Unchecked', 'notStarted'],
        ['x', 'Checked', 'completed'],
        ['>', 'Rescheduled', 'planned'],
        ['<', 'Scheduled', 'planned'],
        ['!', 'Important', 'notStarted'],
        ['-', 'Cancelled', 'abandoned'],
        ['/', 'In Progress', 'inProgress'],
        ['?', 'Question', 'notStarted'],
        ['*', 'Star', 'notStarted'],
        ['n', 'Note', 'notStarted'],
        ['l', 'Location', 'notStarted'],
        ['i', 'Information', 'notStarted'],
        ['I', 'Idea', 'notStarted'],
        ['S', 'Amount', 'notStarted'],
        ['p', 'Pro', 'notStarted'],
        ['c', 'Con', 'notStarted'],
        ['b', 'Bookmark', 'notStarted'],
        ['f', 'Fire', 'notStarted'],
        ['k', 'Key', 'notStarted'],
        ['w', 'Win', 'notStarted'],
        ['u', 'Up', 'notStarted'],
        ['d', 'Down', 'notStarted'],
    ];
    return zzz;
}
