// Code from https://github.com/obsidian-tasks-group/obsidian-tasks/tree/main/src/Config/Themes
// Original code is licensed under the MIT License.

import type { StatusCollection } from './StatusCollections';

/**
 * Status supported by the Minimal theme. {@link https://github.com/kepano/obsidian-minimal}
 * Values recognised by Tasks are excluded.
 * @see {@link StatusSettings.bulkAddStatusCollection}
 */
export function minimalSupportedStatuses() {
    const zzz: StatusCollection = [
        [' ', 'to-do', 'notStarted'],
        ['/', 'incomplete', 'inProgress'],
        ['x', 'done', 'completed'],
        ['-', 'canceled', 'abandoned'],
        ['>', 'forwarded', 'planned'],
        ['<', 'scheduling', 'planned'],
        ['?', 'question', 'notStarted'],
        ['!', 'important', 'notStarted'],
        ['*', 'star', 'notStarted'],
        ['"', 'quote', 'notStarted'],
        ['l', 'location', 'notStarted'],
        ['b', 'bookmark', 'notStarted'],
        ['i', 'information', 'notStarted'],
        ['S', 'savings', 'notStarted'],
        ['I', 'idea', 'notStarted'],
        ['p', 'pros', 'notStarted'],
        ['c', 'cons', 'notStarted'],
        ['f', 'fire', 'notStarted'],
        ['k', 'key', 'notStarted'],
        ['w', 'win', 'notStarted'],
        ['u', 'up', 'notStarted'],
        ['d', 'down', 'notStarted'],
    ];
    return zzz;
}
