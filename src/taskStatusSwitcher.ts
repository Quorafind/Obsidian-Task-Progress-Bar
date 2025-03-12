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
		private lastUpdate: number = 0;
		private readonly updateThreshold: number = 50; // 毫秒阈值，避免过于频繁更新
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
			// 只有在文档变化、视图变化或者距离上次更新超过阈值时才更新
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
			// 使用防抖策略，避免频繁创建新的装饰
			if (
				!update ||
				update.docChanged ||
				update.selectionSet ||
				this.decorations.size === 0
			) {
				// 只在必要时创建新的装饰集
				this.decorations = this.match.createDeco(view);
			} else {
				// 尽可能复用现有装饰
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
			// 缓存语法树查询结果以提高性能
			const syntaxNode = syntaxTree(view.state).resolveInner(
				decorationFrom + 1
			);
			const nodeProps = syntaxNode.type.prop(tokenClassNodeProp);

			// 快速排除代码块和前言
			if (nodeProps) {
				const props = nodeProps.split(" ");
				if (
					props.includes("hmd-codeblock") ||
					props.includes("hmd-frontmatter")
				) {
					return false;
				}
			}

			// 优化选区重叠检测
			const selection = view.state.selection;
			// 如果没有选区或只有一个光标位置，可以快速检查
			if (selection.ranges.length === 1 && selection.ranges[0].empty) {
				return this.isLivePreview(view.state);
			}

			// 检查是否有选区与装饰范围重叠
			const overlap = selection.ranges.some((r) => {
				// 优化重叠检测逻辑
				return !(r.to <= decorationFrom || r.from >= decorationTo);
			});

			// 只在 LivePreview 模式下且没有选中文本时渲染
			return !overlap && this.isLivePreview(view.state);
		}
	}

	const TaskStatusViewPluginSpec: PluginSpec<TaskStatusViewPluginValue> = {
		decorations: (plugin) => {
			// 优化装饰过滤逻辑
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

					// 优化选区重叠检测
					const selection = plugin.view.state.selection;

					// 快速路径：如果只有一个光标位置，可以直接返回true
					if (
						selection.ranges.length === 1 &&
						selection.ranges[0].empty
					) {
						return true;
					}

					// 检查是否有选区与装饰范围重叠
					for (const range of selection.ranges) {
						if (!(range.to <= rangeFrom || range.from >= rangeTo)) {
							return false; // 有重叠，不显示装饰
						}
					}

					return true; // 没有重叠，显示装饰
				},
			});
		},
	};

	return ViewPlugin.fromClass(
		TaskStatusViewPluginValue,
		TaskStatusViewPluginSpec
	);
}
