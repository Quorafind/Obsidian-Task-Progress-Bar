import {
	EditorView,
	ViewPlugin,
	ViewUpdate,
	Decoration,
	DecorationSet,
	WidgetType,
	MatchDecorator,
	PluginValue,
	PluginSpec,
} from "@codemirror/view";
import { App, editorLivePreviewField, Keymap, Menu } from "obsidian";
import TaskProgressBarPlugin from "..";
import { Annotation, EditorSelection, SelectionRange } from "@codemirror/state";
// @ts-ignore - This import is necessary but TypeScript can't find it
import { foldable, syntaxTree, tokenClassNodeProp } from "@codemirror/language";

export type TaskState = string;
export const taskStatusChangeAnnotation = Annotation.define();

export const STATE_MARK_MAP: Record<string, string> = {
	TODO: " ",
	DOING: "-",
	"IN-PROGRESS": ">",
	DONE: "x",
};

class TaskStatusWidget extends WidgetType {
	private cycle: string[] = [];
	private marks: Record<string, string> = {};

	constructor(
		readonly app: App,
		readonly plugin: TaskProgressBarPlugin,
		readonly view: EditorView,
		readonly from: number,
		readonly to: number,
		readonly currentState: TaskState
	) {
		super();
		const config = this.getStatusConfig();
		this.cycle = config.cycle;
		this.marks = config.marks;
	}

	eq(other: TaskStatusWidget): boolean {
		return (
			this.from === other.from &&
			this.to === other.to &&
			this.currentState === other.currentState
		);
	}

	toDOM(): HTMLElement {
		const { cycle, marks, excludeMarksFromCycle } = this.getStatusConfig();
		let nextState = this.currentState;

		const remainingCycle = cycle.filter(
			(state) => !excludeMarksFromCycle.includes(state)
		);

		if (remainingCycle.length > 0) {
			const currentIndex = remainingCycle.indexOf(this.currentState);
			const nextIndex = (currentIndex + 1) % remainingCycle.length;
			nextState = remainingCycle[nextIndex];
		}

		const wrapper = createEl("span", {
			cls: "task-status-widget",
			attr: {
				"aria-label": "Next status: " + nextState,
			},
		});

		wrapper.createEl(
			"span",
			{
				cls: "cm-formatting cm-formatting-list cm-formatting-list-ul",
			},
			(el) => {
				el.createEl("span", {
					cls: "list-bullet",
					text: "-",
				});
			}
		);

		const statusText = document.createElement("span");
		statusText.classList.add(`task-state`);

		const mark = marks[this.currentState] || " ";
		statusText.setAttribute("data-task-state", mark);

		statusText.textContent = this.currentState;

		// Click to cycle through states
		statusText.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (Keymap.isModEvent(e)) {
				// When modifier key is pressed, jump to the first or last state
				const { cycle } = this.getStatusConfig();
				if (cycle.length > 0) {
					// Jump to the last state (DONE) if not already there
					if (this.currentState !== cycle[cycle.length - 1]) {
						this.setTaskState(cycle[cycle.length - 1]);
					} else {
						// If already at the last state, jump to the first state
						this.setTaskState(cycle[0]);
					}
				}
			} else {
				// Normal click behavior - cycle to next state
				this.cycleTaskState();
			}
		});

		// Right-click to show menu with all available states
		statusText.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const menu = new Menu();

			// Add each available state to the menu
			for (const state of this.cycle) {
				menu.addItem((item) => {
					item.setTitle(state);
					// When clicked, directly set to the selected state
					item.onClick(() => {
						this.setTaskState(state);
					});
				});
			}

			// Show the menu at the mouse position
			menu.showAtMouseEvent(e);
		});

		wrapper.appendChild(statusText);
		return wrapper;
	}

	private setTaskState(status: string) {
		const currentText = this.view.state.doc.sliceString(this.from, this.to);
		const currentMarkMatch = currentText.match(/\[(.)]/);

		if (!currentMarkMatch) return;

		const nextMark = this.marks[status] || " ";

		// Replace text with the selected state's mark
		const newText = currentText.replace(/\[(.)]/, `[${nextMark}]`);

		this.view.dispatch({
			changes: {
				from: this.from,
				to: this.to,
				insert: newText,
			},
			annotations: taskStatusChangeAnnotation.of("taskStatusChange"),
		});
	}

	private getStatusConfig() {
		if (!this.plugin.settings.enableTaskStatusSwitcher) {
			return {
				cycle: Object.keys(STATE_MARK_MAP),
				marks: STATE_MARK_MAP,
				excludeMarksFromCycle: [],
			};
		}

		return {
			cycle: this.plugin.settings.taskStatusCycle,
			excludeMarksFromCycle:
				this.plugin.settings.excludeMarksFromCycle || [],
			marks: this.plugin.settings.taskStatusMarks,
		};
	}

	// Cycle through task states
	cycleTaskState() {
		const currentText = this.view.state.doc.sliceString(this.from, this.to);
		const currentMarkMatch = currentText.match(/\[(.)]/);

		if (!currentMarkMatch) return;

		const currentMark = currentMarkMatch[1];
		const { cycle, marks, excludeMarksFromCycle } = this.getStatusConfig();

		const remainingCycle = cycle.filter(
			(state) => !excludeMarksFromCycle.includes(state)
		);

		if (remainingCycle.length === 0) return;

		let currentStateIndex = -1;

		for (let i = 0; i < remainingCycle.length; i++) {
			const state = remainingCycle[i];
			if (marks[state] === currentMark) {
				currentStateIndex = i;
				break;
			}
		}

		if (currentStateIndex === -1) {
			currentStateIndex = 0;
		}

		// Calculate next state
		const nextStateIndex = (currentStateIndex + 1) % remainingCycle.length;
		const nextState = remainingCycle[nextStateIndex];
		const nextMark = marks[nextState] || " ";

		// Replace text
		const newText = currentText.replace(/\[(.)]/, `[${nextMark}]`);

		this.view.dispatch({
			changes: {
				from: this.from,
				to: this.to,
				insert: newText,
			},
			annotations: taskStatusChangeAnnotation.of("taskStatusChange"),
			selection: EditorSelection.range(this.to + 1, this.to + 1),
		});
	}
}

export function taskStatusSwitcherExtension(
	app: App,
	plugin: TaskProgressBarPlugin
) {
	class TaskStatusViewPluginValue implements PluginValue {
		public readonly view: EditorView;
		decorations: DecorationSet = Decoration.none;
		private lastUpdate: number = 0;
		private readonly updateThreshold: number = 50;
		private readonly match = new MatchDecorator({
			regexp: /^(\s*)((?:[-*+]|\d+[.)])\s\[(.)])(\s)/g,
			decorate: (
				add,
				from: number,
				to: number,
				match: RegExpExecArray,
				view: EditorView
			) => {
				if (!this.shouldRender(view, from, to)) {
					return;
				}

				const mark = match[3];
				const cycle = plugin.settings.taskStatusCycle;
				const marks = plugin.settings.taskStatusMarks;
				const excludeMarksFromCycle =
					plugin.settings.excludeMarksFromCycle || [];
				const remainingCycle = cycle.filter(
					(state) => !excludeMarksFromCycle.includes(state)
				);

				if (remainingCycle.length === 0) return;

				let currentState: TaskState =
					Object.keys(marks).find((state) => marks[state] === mark) ||
					remainingCycle[0];

				add(
					from + match[1].length,
					to - match[4].length,
					Decoration.replace({
						widget: new TaskStatusWidget(
							app,
							plugin,
							view,
							from + match[1].length,
							to - match[4].length,
							currentState
						),
					})
				);
			},
		});

		constructor(view: EditorView) {
			this.view = view;
			this.updateDecorations(view);
		}

		update(update: ViewUpdate): void {
			const now = Date.now();
			if (
				update.docChanged ||
				update.viewportChanged ||
				(now - this.lastUpdate > this.updateThreshold &&
					update.selectionSet)
			) {
				this.lastUpdate = now;
				this.updateDecorations(update.view, update);
			}
		}

		destroy(): void {
			this.decorations = Decoration.none;
		}

		updateDecorations(view: EditorView, update?: ViewUpdate) {
			if (
				!update ||
				update.docChanged ||
				update.selectionSet ||
				this.decorations.size === 0
			) {
				this.decorations = this.match.createDeco(view);
			} else {
				this.decorations = this.match.updateDeco(
					update,
					this.decorations
				);
			}
		}

		isLivePreview(state: EditorView["state"]): boolean {
			return state.field(editorLivePreviewField);
		}

		shouldRender(
			view: EditorView,
			decorationFrom: number,
			decorationTo: number
		) {
			const syntaxNode = syntaxTree(view.state).resolveInner(
				decorationFrom + 1
			);
			const nodeProps = syntaxNode.type.prop(tokenClassNodeProp);

			if (nodeProps) {
				const props = nodeProps.split(" ");
				if (
					props.includes("hmd-codeblock") ||
					props.includes("hmd-frontmatter")
				) {
					return false;
				}
			}

			const selection = view.state.selection;

			const overlap = selection.ranges.some((r) => {
				return !(r.to <= decorationFrom || r.from >= decorationTo);
			});

			return !overlap && this.isLivePreview(view.state);
		}
	}

	const TaskStatusViewPluginSpec: PluginSpec<TaskStatusViewPluginValue> = {
		decorations: (plugin) => {
			return plugin.decorations.update({
				filter: (
					rangeFrom: number,
					rangeTo: number,
					deco: Decoration
				) => {
					const widget = deco.spec?.widget;
					if ((widget as any).error) {
						return false;
					}

					const selection = plugin.view.state.selection;

					for (const range of selection.ranges) {
						if (!(range.to <= rangeFrom || range.from >= rangeTo)) {
							return false;
						}
					}

					return true;
				},
			});
		},
	};

	return ViewPlugin.fromClass(
		TaskStatusViewPluginValue,
		TaskStatusViewPluginSpec
	);
}
