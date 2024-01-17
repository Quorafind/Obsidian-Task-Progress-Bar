import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from '@codemirror/view';
import { SearchCursor } from "@codemirror/search";
import { App, MarkdownView } from 'obsidian';
import { EditorState } from "@codemirror/state";
// @ts-ignore
import { foldable, syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import { RegExpCursor } from "./regexp-cursor";
import TaskProgressBarPlugin from "./taskProgressBarIndex";

interface tasks {
	completed: number;
	total: number;
}

interface Text {
	text: string;
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
		readonly total: number,
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
		if (offset.line === originalOffset.line && this.completed === other.completed && this.total === other.total) {
			return true;
		}
		return other.completed === this.completed && other.total === this.total;
	}

	changePercentage() {
		const percentage = Math.round(this.completed / this.total * 10000) / 100;
		this.progressEl.style.width = percentage + '%';
		switch (true) {
			case percentage >= 0 && percentage < 25:
				this.progressEl.className = 'progress-bar-inline progress-bar-inline-0';
				break;
			case percentage >= 25 && percentage < 50:
				this.progressEl.className = 'progress-bar-inline progress-bar-inline-1';
				break;
			case percentage >= 50 && percentage < 75:
				this.progressEl.className = 'progress-bar-inline progress-bar-inline-2';
				break;
			case percentage >= 75 && percentage < 100:
				this.progressEl.className = 'progress-bar-inline progress-bar-inline-3';
				break;
			case percentage >= 100:
				this.progressEl.className = 'progress-bar-inline progress-bar-inline-4';
				break;
		}
	}

	changeNumber() {
		if (this.plugin?.settings.addNumberToProgressBar) {
			const text = this.plugin?.settings.showPercentage ? `${Math.round(this.completed / this.total * 10000) / 100}%` : `[${this.completed}/${this.total}]`;

			this.numberEl = this.progressBarEl.createEl('div', {
				cls: 'progress-status',
				text: text
			});
		}
		this.numberEl.innerText = `[${this.completed}/${this.total}]`;
	}

	toDOM() {
		if (!this.plugin?.settings.addNumberToProgressBar && this.numberEl !== undefined) this.numberEl.detach();

		if (this.progressBarEl !== undefined) {
			this.changePercentage();
			if (this.numberEl !== undefined) this.changeNumber();
			return this.progressBarEl;
		}

		this.progressBarEl = createSpan(this.plugin?.settings.addNumberToProgressBar ? 'cm-task-progress-bar with-number' : 'cm-task-progress-bar');
		this.progressBackGroundEl = this.progressBarEl.createEl('div', {cls: 'progress-bar-inline-background'});
		this.progressEl = this.progressBackGroundEl.createEl('div');

		if (this.plugin?.settings.addNumberToProgressBar && this.total) {

			const text = this.plugin?.settings.showPercentage ? `${Math.round(this.completed / this.total * 10000) / 100}%` : `[${this.completed}/${this.total}]`;

			this.numberEl = this.progressBarEl.createEl('div', {
				cls: 'progress-status',
				text: text
			});

		}

		this.changePercentage();

		return this.progressBarEl;
	}

	ignoreEvent() {
		return false;
	}
}

export function taskProgressBarExtension(app: App, plugin: TaskProgressBarPlugin) {
	return ViewPlugin.fromClass(
		class {
			progressDecorations: DecorationSet = Decoration.none;

			constructor(public view: EditorView) {

				let {progress} = this.getDeco(view);
				this.progressDecorations = progress;
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged) {
					let {progress} = this.getDeco(update.view);
					this.progressDecorations = progress;
				}
			}

			getDeco(view: EditorView): {
				progress: DecorationSet;
			} {
				let {state} = view,
					// @ts-ignore
					progressDecos: Range<Decoration>[] = [];
				for (let part of view.visibleRanges) {
					let taskBulletCursor: RegExpCursor | SearchCursor;
					let headingCursor: RegExpCursor | SearchCursor;
					try {
						taskBulletCursor = new RegExpCursor(state.doc, "^[\\t|\\s]*([-*+]|\\d+\\.)\\s\\[(.)\\]", {}, part.from, part.to);
					} catch (err) {
						console.debug(err);
						continue;
					}
					if (plugin?.settings.addTaskProgressBarToHeading) {
						try {
							headingCursor = new RegExpCursor(state.doc, "^(#){1,6} ", {}, part.from, part.to);
						} catch (err) {
							console.debug(err);
							continue;
						}
						// Showing task progress bar near heading items.
						while (!headingCursor.next().done) {
							let {from, to} = headingCursor.value;
							const headingLine = this.view.state.doc.lineAt(from);
							// @ts-ignore
							const range = this.calculateRangeForTransform(this.view.state, headingLine.from);

							if (!range) continue;
							let tasksNum;
							// @ts-ignore
							if (this.view.state.doc.slice(range.from, range.to).text === undefined && this.view.state.doc.slice(range.from, range.to).children?.length > 0) {
								let allChildrenText: string[] = [];
								// @ts-ignore
								for (let i = 0; i < this.view.state.doc.slice(range.from, range.to).children?.length; i++) {
									// @ts-ignore
									allChildrenText = allChildrenText.concat(this.view.state.doc.slice(range.from, range.to).children[i].text);
								}
								tasksNum = this.calculateTasksNum(allChildrenText, false);
							} else {
								// @ts-ignore
								tasksNum = this.calculateTasksNum(this.view.state.doc.slice(range.from, range.to).text, false);
							}
							if (tasksNum?.total === 0) continue;
							let startDeco = Decoration.widget({widget: new TaskProgressBarWidget(app, plugin, view, headingLine.to, headingLine.to, tasksNum.completed, tasksNum.total)});
							progressDecos.push(startDeco.range(headingLine.to, headingLine.to));
						}
					}
					// Showing task progress bar near bullet items.
					while (!taskBulletCursor.next().done) {
						let {from} = taskBulletCursor.value;
						const linePos = view.state.doc.lineAt(from)?.from;

						// Don't parse any tasks in code blocks or frontmatter
						// @ts-ignore
						let syntaxNode = syntaxTree(view.state).resolveInner(linePos + 1),
							// @ts-ignore
							nodeProps: string = syntaxNode.type.prop(tokenClassNodeProp),
							excludedSection = ["hmd-codeblock", "hmd-frontmatter"].find(token =>
								nodeProps?.split(" ").includes(token)
							);
						if (excludedSection) continue;
						const line = this.view.state.doc.lineAt(linePos);


						// @ts-ignore
						if (!(/^[\s|\t]*([-*+]|\d+\.)\s\[(.)\]/.test(this.view.state.doc.slice(line.from, line.to).text))) return;
						// @ts-ignore
						const range = this.calculateRangeForTransform(this.view.state, line.to);
						if (!range) continue;
						let tasksNum;
						// @ts-ignore
						if ((this.view.state.doc.slice(range.from, range.to).text?.length === 1)) continue;
						// @ts-ignore
						if (this.view.state.doc.slice(range.from, range.to).text === undefined && this.view.state.doc.slice(range.from, range.to).children?.length !== undefined) {
							let allChildrenText: string[] = [];
							// @ts-ignore
							for (let i = 0; i < this.view.state.doc.slice(range.from, range.to).children?.length; i++) {
								// @ts-ignore
								allChildrenText = allChildrenText.concat(this.view.state.doc.slice(range.from, range.to).children[i].text);
							}
							tasksNum = this.calculateTasksNum(allChildrenText, true);
						} else {
							// @ts-ignore
							tasksNum = this.calculateTasksNum(this.view.state.doc.slice(range.from, range.to).text, true);
						}
						if (tasksNum.total === 0) continue;
						let startDeco = Decoration.widget({widget: new TaskProgressBarWidget(app, plugin, view, line.to, line.to, tasksNum.completed, tasksNum.total)});
						progressDecos.push(startDeco.range(line.to, line.to));
					}
				}
				return {
					progress: Decoration.set(progressDecos.sort((a, b) => a.from - b.from)),
				};
			}


			public calculateRangeForTransform(state: EditorState, pos: number) {
				const line = state.doc.lineAt(pos);
				const foldRange = foldable(state, line.from, line.to);

				if (!foldRange) {
					return null;
				}

				return {from: line.from, to: foldRange.to};
			}

			public calculateTasksNum(textArray: string[], bullet: boolean): tasks {
				let completed: number = 0;
				let total: number = 0;
				let level: number = 0;
				if (!textArray) return {completed: 0, total: 0};
				// @ts-ignore
				const useTab = (app.vault.getConfig("useTab") === undefined || app.vault.getConfig("useTab") === true);
				// @ts-ignore
				const tabSize = useTab ? app.vault.getConfig("tabSize") / 4 : app.vault.getConfig("tabSize");

				let bulletCompleteRegex: RegExp = new RegExp(/^[\t|\s]+([-*+]|\d+\.)\s+\[[^ ]\]/);
				let bulletTotalRegex: RegExp = new RegExp(/^[\t|\s]+([-*+]|\d+\.)\s\[(.)\]/);
				let headingCompleteRegex: RegExp = new RegExp("([-*+]|\\d+\\.)\\s\\[[^ ]\\]");
				let headingTotalRegex: RegExp = new RegExp("([-*+]|\\d+\\.)\\s\\[(.)\\]");
				if (!plugin?.settings.countSubLevel && bullet) {
					// @ts-ignore
					level = textArray[0].match(/^[\s|\t]*/)[0].length / tabSize;
					// Total regex based on indent level
					bulletTotalRegex = new RegExp("^[\\t|\\s]{" + (tabSize * (level + 1)) + "}([-*+]|\\d+\\.)\\s\\[(.)\\]");
					bulletCompleteRegex = new RegExp("^[\\t|\\s]{" + (tabSize * (level + 1)) + "}([-*+]|\\d+\\.)\\s\\[[^ ]\\]");
				}
				if (plugin?.settings.countSubLevel && !bullet) {
					level = 0;
					headingTotalRegex = new RegExp("^([-*+]|\\d+\\.)\\s\\[(.)\\]");
					headingCompleteRegex = new RegExp("^([-*+]|\\d+\\.)\\s\\[[^ ]\\]");
				}
				if (plugin?.settings.alternativeMarks.length > 0 && plugin?.settings.allowAlternateTaskStatus) {
					const lengText = !plugin?.settings.countSubLevel && bullet ? `{${(tabSize * (level + 1))}}` : "";

					bulletCompleteRegex = level !== 0 ? new RegExp("^[\\t|\\s]" + `${lengText}` + "([-*+]|\\d+\\.)\\s\\[" + plugin?.settings.alternativeMarks + "\\]") : (new RegExp("[\\t|\\s]" + `${lengText}` + "([-*+]|\\d+\\.)\\s\\[" + plugin?.settings.alternativeMarks + "\\]"));
					if (plugin?.settings.addTaskProgressBarToHeading) {
						headingCompleteRegex = level !== 0 ? new RegExp("^([-*+]|\\d+\\.)\\s+\\[" + plugin?.settings.alternativeMarks + "\\]") : new RegExp("([-*+]|\\d+\\.)\\s+\\[" + plugin?.settings.alternativeMarks + "\\]");
					}
				}

				for (let i = 0; i < textArray.length; i++) {
					if (i === 0) {
						continue;
					}
					if (bullet) {
						if (textArray[i].match(bulletTotalRegex)) total++;
						if (textArray[i].match(bulletCompleteRegex)) completed++;
						continue;
					}
					if (plugin?.settings.addTaskProgressBarToHeading && !bullet) {
						if (textArray[i].match(headingTotalRegex)) total++;
						if (textArray[i].match(headingCompleteRegex)) completed++;
					}
				}
				return {completed: completed, total: total};
			};
		},
		{
			provide: plugin => [
				// these are separated out so that we can set decoration priority
				// it's also much easier to sort the decorations when they're grouped
				EditorView.decorations.of(v => v.plugin(plugin)?.progressDecorations || Decoration.none),
			],
		}
	);
}
