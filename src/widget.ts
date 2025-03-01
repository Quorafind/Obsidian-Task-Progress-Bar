import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { SearchCursor } from "@codemirror/search";
import { App, editorInfoField, MarkdownView, TFile } from "obsidian";
import { EditorState, Range, Text } from "@codemirror/state";
// @ts-ignore - This import is necessary but TypeScript can't find it
import { foldable, syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import { RegExpCursor } from "./regexp-cursor";
import TaskProgressBarPlugin from "./taskProgressBarIndex";
import { shouldHideProgressBarInLivePriview } from "./utils";

interface Tasks {
	completed: number;
	total: number;
}

// Type to represent a text range for safe access
interface TextRange {
	from: number;
	to: number;
}

class TaskProgressBarWidget extends WidgetType {
	progressBarEl: HTMLSpanElement;
	progressBackGroundEl: HTMLDivElement;
	progressEl: HTMLDivElement;
	numberEl: HTMLDivElement;

	constructor(
		readonly app: App,
		readonly plugin: TaskProgressBarPlugin,
		readonly view: EditorView,
		readonly from: number,
		readonly to: number,
		readonly completed: number,
		readonly total: number
	) {
		super();
	}

	eq(other: TaskProgressBarWidget) {
		const markdownView = app.workspace.getActiveViewOfType(MarkdownView);
		if (!markdownView) {
			return false;
		}
		if (this.completed === other.completed && this.total === other.total) {
			return true;
		}
		const editor = markdownView.editor;
		const offset = editor.offsetToPos(this.from);
		const originalOffset = editor.offsetToPos(other.from);
		if (this.completed !== other.completed || this.total !== other.total) {
			return false;
		}
		if (
			offset.line === originalOffset.line &&
			this.completed === other.completed &&
			this.total === other.total
		) {
			return true;
		}
		return other.completed === this.completed && other.total === this.total;
	}

	changePercentage() {
		const percentage =
			Math.round((this.completed / this.total) * 10000) / 100;
		this.progressEl.style.width = percentage + "%";
		switch (true) {
			case percentage >= 0 && percentage < 25:
				this.progressEl.className =
					"progress-bar-inline progress-bar-inline-0";
				break;
			case percentage >= 25 && percentage < 50:
				this.progressEl.className =
					"progress-bar-inline progress-bar-inline-1";
				break;
			case percentage >= 50 && percentage < 75:
				this.progressEl.className =
					"progress-bar-inline progress-bar-inline-2";
				break;
			case percentage >= 75 && percentage < 100:
				this.progressEl.className =
					"progress-bar-inline progress-bar-inline-3";
				break;
			case percentage >= 100:
				this.progressEl.className =
					"progress-bar-inline progress-bar-inline-4";
				break;
		}
	}

	changeNumber() {
		if (this.plugin?.settings.addNumberToProgressBar) {
			const text = this.plugin?.settings.showPercentage
				? `${Math.round((this.completed / this.total) * 10000) / 100}%`
				: `[${this.completed}/${this.total}]`;

			if (!this.numberEl) {
				this.numberEl = this.progressBarEl.createEl("div", {
					cls: "progress-status",
					text: text,
				});
			} else {
				this.numberEl.innerText = text;
				return;
			}
		}
		if (this.numberEl) {
			this.numberEl.innerText = `[${this.completed}/${this.total}]`;
		}
	}

	toDOM() {
		if (
			!this.plugin?.settings.addNumberToProgressBar &&
			this.numberEl !== undefined
		)
			this.numberEl.detach();

		if (this.progressBarEl !== undefined) {
			this.changePercentage();
			if (this.numberEl !== undefined) this.changeNumber();
			return this.progressBarEl;
		}

		this.progressBarEl = createSpan(
			this.plugin?.settings.addNumberToProgressBar
				? "cm-task-progress-bar with-number"
				: "cm-task-progress-bar"
		);
		this.progressBackGroundEl = this.progressBarEl.createEl("div", {
			cls: "progress-bar-inline-background",
		});
		this.progressEl = this.progressBackGroundEl.createEl("div");

		if (this.plugin?.settings.addNumberToProgressBar && this.total) {
			const text = this.plugin?.settings.showPercentage
				? `${Math.round((this.completed / this.total) * 10000) / 100}%`
				: `[${this.completed}/${this.total}]`;

			this.numberEl = this.progressBarEl.createEl("div", {
				cls: "progress-status",
				text: text,
			});
		}

		this.changePercentage();

		return this.progressBarEl;
	}

	ignoreEvent() {
		return false;
	}
}

export function taskProgressBarExtension(
	app: App,
	plugin: TaskProgressBarPlugin
) {
	return ViewPlugin.fromClass(
		class {
			progressDecorations: DecorationSet = Decoration.none;

			constructor(public view: EditorView) {
				let { progress } = this.getDeco(view);
				this.progressDecorations = progress;
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged) {
					let { progress } = this.getDeco(update.view);
					this.progressDecorations = progress;
				}
			}

			getDeco(view: EditorView): {
				progress: DecorationSet;
			} {
				let { state } = view,
					progressDecos: Range<Decoration>[] = [];

				// Check if progress bars should be hidden based on settings
				if (shouldHideProgressBarInLivePriview(plugin, view)) {
					return {
						progress: Decoration.none,
					};
				}

				for (let part of view.visibleRanges) {
					let taskBulletCursor: RegExpCursor | SearchCursor;
					let headingCursor: RegExpCursor | SearchCursor;
					try {
						taskBulletCursor = new RegExpCursor(
							state.doc,
							"^[\\t|\\s]*([-*+]|\\d+\\.)\\s\\[(.)\\]",
							{},
							part.from,
							part.to
						);
					} catch (err) {
						console.debug(err);
						continue;
					}

					// Process headings if enabled in settings
					if (plugin?.settings.addTaskProgressBarToHeading) {
						try {
							headingCursor = new RegExpCursor(
								state.doc,
								"^(#){1,6} ",
								{},
								part.from,
								part.to
							);
						} catch (err) {
							console.debug(err);
							continue;
						}

						// Process headings
						this.processHeadings(
							headingCursor,
							progressDecos,
							view
						);
					}

					// Process task bullets
					this.processBullets(taskBulletCursor, progressDecos, view);
				}

				return {
					progress: Decoration.set(
						progressDecos.sort((a, b) => a.from - b.from)
					),
				};
			}

			/**
			 * Process heading matches and add decorations
			 */
			private processHeadings(
				cursor: RegExpCursor | SearchCursor,
				decorations: Range<Decoration>[],
				view: EditorView
			) {
				while (!cursor.next().done) {
					let { from, to } = cursor.value;
					const headingLine = view.state.doc.lineAt(from);

					const range = this.calculateRangeForTransform(
						view.state,
						headingLine.from
					);

					if (!range) continue;

					const tasksNum = this.extractTasksFromRange(
						range,
						view.state,
						false
					);

					if (tasksNum.total === 0) continue;

					let startDeco = Decoration.widget({
						widget: new TaskProgressBarWidget(
							app,
							plugin,
							view,
							headingLine.to,
							headingLine.to,
							tasksNum.completed,
							tasksNum.total
						),
					});

					decorations.push(
						startDeco.range(headingLine.to, headingLine.to)
					);
				}
			}

			/**
			 * Process bullet matches and add decorations
			 */
			private processBullets(
				cursor: RegExpCursor | SearchCursor,
				decorations: Range<Decoration>[],
				view: EditorView
			) {
				while (!cursor.next().done) {
					let { from } = cursor.value;
					const linePos = view.state.doc.lineAt(from)?.from;

					// Don't parse any tasks in code blocks or frontmatter
					const syntaxNode = syntaxTree(view.state).resolveInner(
						linePos + 1
					);
					const nodeProps = syntaxNode.type.prop(tokenClassNodeProp);
					const excludedSection = [
						"hmd-codeblock",
						"hmd-frontmatter",
					].find((token) => nodeProps?.split(" ").includes(token));

					if (excludedSection) continue;

					const line = view.state.doc.lineAt(linePos);

					// Check if line is a task
					const lineText = this.getDocumentText(
						view.state.doc,
						line.from,
						line.to
					);
					if (
						!lineText ||
						!/^[\s|\t]*([-*+]|\d+\.)\s\[(.)\]/.test(lineText)
					) {
						continue;
					}

					const range = this.calculateRangeForTransform(
						view.state,
						line.to
					);

					if (!range) continue;

					const rangeText = this.getDocumentText(
						view.state.doc,
						range.from,
						range.to
					);
					if (!rangeText || rangeText.length === 1) continue;

					const tasksNum = this.extractTasksFromRange(
						range,
						view.state,
						true
					);

					if (tasksNum.total === 0) continue;

					let startDeco = Decoration.widget({
						widget: new TaskProgressBarWidget(
							app,
							plugin,
							view,
							line.to,
							line.to,
							tasksNum.completed,
							tasksNum.total
						),
					});

					decorations.push(startDeco.range(line.to, line.to));
				}
			}

			/**
			 * Extract tasks count from a document range
			 */
			private extractTasksFromRange(
				range: TextRange,
				state: EditorState,
				isBullet: boolean
			): Tasks {
				const textArray = this.getDocumentTextArray(
					state.doc,
					range.from,
					range.to
				);
				return this.calculateTasksNum(textArray, isBullet);
			}

			/**
			 * Safely extract text from a document range
			 */
			private getDocumentText(
				doc: Text,
				from: number,
				to: number
			): string | null {
				try {
					return doc.sliceString(from, to);
				} catch (e) {
					console.error("Error getting document text:", e);
					return null;
				}
			}

			/**
			 * Get an array of text lines from a document range
			 */
			private getDocumentTextArray(
				doc: Text,
				from: number,
				to: number
			): string[] {
				const text = this.getDocumentText(doc, from, to);
				if (!text) return [];
				return text.split("\n");
			}

			/**
			 * Calculate the foldable range for a position
			 */
			public calculateRangeForTransform(
				state: EditorState,
				pos: number
			): TextRange | null {
				const line = state.doc.lineAt(pos);
				const foldRange = foldable(state, line.from, line.to);

				if (!foldRange) {
					return null;
				}

				return { from: line.from, to: foldRange.to };
			}

			/**
			 * Create regex for counting total tasks
			 */
			private createTotalTaskRegex(
				isHeading: boolean,
				level: number = 0,
				tabSize: number = 4
			): RegExp {
				// 获取排除的任务标记
				const excludePattern = plugin?.settings.excludeTaskMarks || "";

				// 构建识别任务标记的正则表达式部分
				let markPattern = "\\[(.)\\]";

				// 如果存在排除的标记，修改标记匹配模式
				if (excludePattern && excludePattern.length > 0) {
					// 构建一个不匹配被排除标记的模式
					const excludeChars = excludePattern
						.split("")
						.map((c) => "\\" + c)
						.join("");
					markPattern = `\\[([^${excludeChars}])\\]`;
				}

				if (isHeading) {
					return new RegExp(`^([-*+]|\\d+\\.)\\s${markPattern}`);
				} else {
					// 如果是子级计数模式，使用更宽松的正则表达式匹配任何缩进级别的任务
					if (plugin?.settings.countSubLevel) {
						return new RegExp(
							`^[\\t|\\s]*?([-*+]|\\d+\\.)\\s${markPattern}`
						);
					} else {
						// 否则使用精确缩进级别匹配
						return new RegExp(
							`^[\\t|\\s]{${
								tabSize * (level + 1)
							}}([-*+]|\\d+\\.)\\s${markPattern}`
						);
					}
				}
			}

			/**
			 * Create regex for matching completed tasks
			 */
			private createCompletedTaskRegex(
				plugin: TaskProgressBarPlugin,
				isHeading: boolean,
				level: number = 0,
				tabSize: number = 4
			): RegExp {
				// Extract settings
				const useOnlyCountMarks = plugin?.settings.useOnlyCountMarks;
				const onlyCountPattern =
					plugin?.settings.onlyCountTaskMarks || "x|X";
				const excludePattern = plugin?.settings.excludeTaskMarks || "";
				const alternativeMarks = plugin?.settings.alternativeMarks;

				// Default patterns - 对子级计数的情况调整缩进匹配
				const basePattern = isHeading
					? "^([-*+]|\\d+\\.)\\s"
					: plugin?.settings.countSubLevel
					? "^[\\t|\\s]*?" // 如果是子级计数，使用非贪婪模式匹配任意缩进
					: "^[\\t|\\s]+";

				const bulletPrefix = isHeading
					? ""
					: plugin?.settings.countSubLevel
					? "([-*+]|\\d+\\.)\\s" // 子级计数时简化前缀
					: level !== 0
					? `{${tabSize * (level + 1)}}([-*+]|\\d+\\.)\\s`
					: "([-*+]|\\d+\\.)\\s";

				// 如果启用了仅统计特定标记功能
				if (useOnlyCountMarks) {
					return new RegExp(
						basePattern +
							bulletPrefix +
							"\\[(" +
							onlyCountPattern +
							")\\]"
					);
				}

				// Handle alternative marks option - 仅在未启用仅统计特定标记时才考虑替代标记
				if (
					!useOnlyCountMarks &&
					plugin?.settings.allowAlternateTaskStatus &&
					alternativeMarks &&
					alternativeMarks.length > 0
				) {
					if (excludePattern) {
						// Filter alternative marks based on exclusions
						const alternativeMarksArray = alternativeMarks
							.replace(/[()]/g, "")
							.split("|");
						const excludeMarksArray = excludePattern.split("");
						const filteredMarks = alternativeMarksArray
							.filter((mark) => !excludeMarksArray.includes(mark))
							.join("|");

						return new RegExp(
							basePattern +
								bulletPrefix +
								"\\[(" +
								filteredMarks +
								")\\]"
						);
					} else {
						return new RegExp(
							basePattern +
								bulletPrefix +
								"\\[" +
								alternativeMarks +
								"\\]"
						);
					}
				}

				// Handle standard case - 如果没有启用特殊选项
				if (excludePattern) {
					return new RegExp(
						basePattern +
							bulletPrefix +
							"\\[[^ " +
							excludePattern +
							"]\\]"
					);
				} else {
					return new RegExp(
						basePattern + bulletPrefix + "\\[[^ ]\\]"
					);
				}
			}

			/**
			 * Check if a task should be counted as completed
			 */
			private isCompletedTask(text: string): boolean {
				// 如果启用了仅统计特定标记
				if (plugin?.settings.useOnlyCountMarks) {
					const onlyCountPattern =
						plugin?.settings.onlyCountTaskMarks || "x|X";
					const markMatch = text.match(/\[(.)]/);
					console.log(markMatch, text);
					if (markMatch && markMatch[1]) {
						const mark = markMatch[1];
						// 检查标记是否在仅统计列表中
						const onlyCountMarks = onlyCountPattern.split("|");
						return onlyCountMarks.includes(mark);
					}
					return false;
				}

				// 如果启用了替代标记
				if (
					plugin?.settings.allowAlternateTaskStatus &&
					plugin?.settings.alternativeMarks
				) {
					const alternativeMarks = plugin?.settings.alternativeMarks
						.replace(/[()]/g, "")
						.split("|");
					const markMatch = text.match(/\[(.)]/);
					if (markMatch && markMatch[1]) {
						const mark = markMatch[1];
						return alternativeMarks.includes(mark);
					}
				}

				// 标准检查 - 非空格的字符
				const markMatch = text.match(/\[(.)]/);
				if (markMatch && markMatch[1]) {
					const mark = markMatch[1];
					// 排除需要排除的标记
					if (
						plugin?.settings.excludeTaskMarks &&
						plugin.settings.excludeTaskMarks.includes(mark)
					) {
						return false;
					}
					// 标准完成是非空格
					return mark !== " ";
				}

				return false;
			}

			/**
			 * Check if a task marker should be excluded from counting
			 */
			private shouldExcludeTask(text: string): boolean {
				// 如果没有排除设置，返回false
				if (
					!plugin?.settings.excludeTaskMarks ||
					plugin.settings.excludeTaskMarks.length === 0
				) {
					return false;
				}

				// 检查任务标记是否在排除列表中
				const taskMarkMatch = text.match(/\[(.)]/);
				if (taskMarkMatch && taskMarkMatch[1]) {
					const taskMark = taskMarkMatch[1];
					return plugin.settings.excludeTaskMarks.includes(taskMark);
				}

				return false;
			}

			/**
			 * Get tab size from vault configuration
			 */
			private getTabSize(): number {
				try {
					const vaultConfig = app.vault as any;
					const useTab =
						vaultConfig.getConfig?.("useTab") === undefined ||
						vaultConfig.getConfig?.("useTab") === true;
					return useTab
						? (vaultConfig.getConfig?.("tabSize") || 4) / 4
						: vaultConfig.getConfig?.("tabSize") || 4;
				} catch (e) {
					console.error("Error getting tab size:", e);
					return 4; // Default tab size
				}
			}

			public calculateTasksNum(
				textArray: string[],
				bullet: boolean
			): Tasks {
				if (!textArray || textArray.length === 0) {
					return { completed: 0, total: 0 };
				}

				let completed: number = 0;
				let total: number = 0;
				let level: number = 0;

				// Get tab size from vault config
				const tabSize = this.getTabSize();

				// Determine indentation level for bullets
				if (!plugin?.settings.countSubLevel && bullet && textArray[0]) {
					const indentMatch = textArray[0].match(/^[\s|\t]*/);
					if (indentMatch) {
						level = indentMatch[0].length / tabSize;
					}
				}

				// Create regexes based on settings and context
				const bulletTotalRegex = this.createTotalTaskRegex(
					false,
					level,
					tabSize
				);
				const bulletCompleteRegex = this.createCompletedTaskRegex(
					plugin,
					false,
					level,
					tabSize
				);
				const headingTotalRegex = this.createTotalTaskRegex(true);
				const headingCompleteRegex = this.createCompletedTaskRegex(
					plugin,
					true
				);

				// Count tasks
				for (let i = 0; i < textArray.length; i++) {
					if (i === 0) continue; // Skip the first line

					if (bullet) {
						// 确保每个任务只被计算一次
						const lineText = textArray[i].trim();
						// 首先检查是否匹配任务格式，然后检查是否是应该被排除的任务类型
						if (
							lineText &&
							lineText.match(bulletTotalRegex) &&
							!this.shouldExcludeTask(lineText)
						) {
							total++;
							// 使用新方法判断是否为已完成任务
							if (this.isCompletedTask(lineText)) {
								completed++;
							}
						}
					} else if (plugin?.settings.addTaskProgressBarToHeading) {
						const lineText = textArray[i].trim();
						// 同样使用shouldExcludeTask函数进行额外的验证
						if (
							lineText &&
							lineText.match(headingTotalRegex) &&
							!this.shouldExcludeTask(lineText)
						) {
							total++;
							// 使用新方法判断是否为已完成任务
							if (this.isCompletedTask(lineText)) {
								completed++;
							}
						}
					}
				}

				// 确保完成数不超过总数
				completed = Math.min(completed, total);

				return { completed, total };
			}
		},
		{
			provide: (plugin) => [
				EditorView.decorations.of(
					(v) =>
						v.plugin(plugin)?.progressDecorations || Decoration.none
				),
			],
		}
	);
}
