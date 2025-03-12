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

// 定义任务状态类型
export type TaskState = string;
export const taskStatusChangeAnnotation = Annotation.define();

// 默认状态与mark的映射，仅在没有配置时使用
export const STATE_MARK_MAP: Record<string, string> = {
	TODO: " ",
	DOING: "-",
	"IN-PROGRESS": ">",
	DONE: "x",
};

// 状态切换组件
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
		// 获取下一个状态用于aria-label
		const { cycle, marks } = this.getStatusConfig();
		let nextState = this.currentState;

		if (cycle.length > 0) {
			// 找到当前状态在循环中的索引
			const currentIndex = cycle.indexOf(this.currentState);
			// 计算下一个状态
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

		// 获取当前状态对应的mark以设置data属性
		const mark = marks[this.currentState] || " ";
		statusText.setAttribute("data-task-state", mark);

		// 显示当前状态文本
		statusText.textContent = this.currentState;

		// 添加点击事件处理器
		statusText.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.cycleTaskState();
		});

		wrapper.appendChild(statusText);
		return wrapper;
	}

	// 获取当前配置的状态循环和标记
	private getStatusConfig() {
		// 如果没有启用任务状态切换器，使用默认值
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

		// 安全检查 - 确保有状态可循环
		if (cycle.length === 0) return;

		let currentStateIndex = -1;

		// 根据当前mark找到对应的状态
		for (let i = 0; i < cycle.length; i++) {
			const state = cycle[i];
			if (marks[state] === currentMark) {
				currentStateIndex = i;
				break;
			}
		}

		// 如果找不到对应状态，默认从第一个开始
		if (currentStateIndex === -1) {
			currentStateIndex = 0;
		}

		// 计算下一个状态
		const nextStateIndex = (currentStateIndex + 1) % cycle.length;
		const nextState = cycle[nextStateIndex];
		const nextMark = marks[nextState] || " "; // 提供默认值以防配置不完整

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
		private readonly match = new MatchDecorator({
			regexp: /^(\s*)((?:[-*+]|\d+[.)])\s+\[(.)])(\s)/g,
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

				// 获取任务标记的位置，而不是整个匹配

				const mark = match[3];
				const cycle = plugin.settings.taskStatusCycle;
				const marks = plugin.settings.taskStatusMarks;

				// 安全检查 - 确保有状态可用
				if (cycle.length === 0) return;

				// 确定当前状态，基于任务标记查找匹配的状态
				let currentState: TaskState = cycle[0]; // 默认为第一个状态
				let found = false;

				// 遍历所有状态找到匹配的
				for (const state of cycle) {
					if (marks[state] === mark) {
						currentState = state;
						found = true;
						break;
					}
				}

				// 如果找不到匹配的状态，检查是否是有效的任务标记
				if (!found && Object.values(marks).indexOf(mark) === -1) {
					// 对于未知的标记，仍然以第一个状态开始循环
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
			if (update.docChanged || update.viewportChanged) {
				this.updateDecorations(update.view, update);
			}
		}

		destroy(): void {
			this.decorations = Decoration.none;
		}

		updateDecorations(view: EditorView, update?: ViewUpdate) {
			if (!update || update.docChanged || this.decorations.size === 0) {
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
			console.log(
				"decorationFrom",
				decorationFrom,
				"decorationTo",
				decorationTo
			);
			const overlap = view.state.selection.ranges.some((r) => {
				if (r.from <= decorationFrom) {
					return r.to >= decorationFrom;
				} else {
					return r.from < decorationTo;
				}
			});

			console.log("overlap", overlap);

			// 只在 LivePreview 模式下且没有选中文本时渲染
			return !overlap && this.isLivePreview(view.state);
		}
	}

	const TaskStatusViewPluginSpec: PluginSpec<TaskStatusViewPluginValue> = {
		decorations: (plugin) => {
			// Update and return decorations for the CodeMirror view
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
					// Check if the range is collapsed (cursor position)
					return (
						rangeFrom === rangeTo ||
						// Check if there are no overlapping selection ranges
						!plugin.view.state.selection.ranges.filter(
							(selectionRange: { from: number; to: number }) => {
								// Determine the start and end positions of the selection range
								const selectionStart = selectionRange.from;
								const selectionEnd = selectionRange.to;
								console.log(
									"selectionStart",
									selectionStart,
									"selectionEnd",
									selectionEnd
								);

								// Check if the selection range overlaps with the specified range
								if (selectionStart <= rangeFrom) {
									return selectionEnd >= rangeFrom; // Overlapping condition
								} else {
									return selectionStart <= rangeTo; // Overlapping condition
								}
							}
						).length
					);
				},
			});
		},
	};

	return ViewPlugin.fromClass(
		TaskStatusViewPluginValue,
		TaskStatusViewPluginSpec
	);
}
