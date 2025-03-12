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
import { App, editorLivePreviewField } from "obsidian";
import TaskProgressBarPlugin from "./taskProgressBarIndex";
import { Annotation, AnnotationType } from "@codemirror/state";
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
	constructor(
		readonly app: App,
		readonly plugin: TaskProgressBarPlugin,
		readonly view: EditorView,
		readonly from: number,
		readonly to: number,
		readonly currentState: TaskState
	) {
		super();
	}

	eq(other: TaskStatusWidget): boolean {
		return (
			this.from === other.from &&
			this.to === other.to &&
			this.currentState === other.currentState
		);
	}

	toDOM(): HTMLElement {
		const { cycle, marks } = this.getStatusConfig();
		let nextState = this.currentState;

		if (cycle.length > 0) {
			const currentIndex = cycle.indexOf(this.currentState);
			const nextIndex = (currentIndex + 1) % cycle.length;
			nextState = cycle[nextIndex];
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

		statusText.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.cycleTaskState();
		});

		wrapper.appendChild(statusText);
		return wrapper;
	}

	private getStatusConfig() {
		if (!this.plugin.settings.enableTaskStatusSwitcher) {
			return {
				cycle: Object.keys(STATE_MARK_MAP),
				marks: STATE_MARK_MAP,
			};
		}

		return {
			cycle: this.plugin.settings.taskStatusCycle,
			marks: this.plugin.settings.taskStatusMarks,
		};
	}

	// 循环任务状态
	cycleTaskState() {
		const currentText = this.view.state.doc.sliceString(this.from, this.to);
		const currentMarkMatch = currentText.match(/\[(.)]/);

		if (!currentMarkMatch) return;

		const currentMark = currentMarkMatch[1];
		const { cycle, marks } = this.getStatusConfig();

		if (cycle.length === 0) return;

		let currentStateIndex = -1;

		for (let i = 0; i < cycle.length; i++) {
			const state = cycle[i];
			if (marks[state] === currentMark) {
				currentStateIndex = i;
				break;
			}
		}

		if (currentStateIndex === -1) {
			currentStateIndex = 0;
		}

		// 计算下一个状态
		const nextStateIndex = (currentStateIndex + 1) % cycle.length;
		const nextState = cycle[nextStateIndex];
		const nextMark = marks[nextState] || " ";

		// 替换文本
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

				if (cycle.length === 0) return;

				let currentState: TaskState = cycle[0];
				let found = false;

				for (const state of cycle) {
					if (marks[state] === mark) {
						currentState = state;
						found = true;
						break;
					}
				}

				if (!found && Object.values(marks).indexOf(mark) === -1) {
					currentState = cycle[0];
				}

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
			if (selection.ranges.length === 1 && selection.ranges[0].empty) {
				return this.isLivePreview(view.state);
			}

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

					if (
						selection.ranges.length === 1 &&
						selection.ranges[0].empty
					) {
						return true;
					}

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
