import {
	Decoration,
	DecorationSet,
	EditorView,
	MatchDecorator,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from '@codemirror/view';
import { SearchCursor } from "@codemirror/search";
import { App, editorLivePreviewField, MarkdownView, Menu, Plugin, Setting } from 'obsidian';
import { EditorState } from "@codemirror/state";
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
	constructor(
		readonly app: App,
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
			return;
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
		return other.view === this.view && other.from === this.from && other.to === this.to;
	}

	toDOM() {
		const progressBarEl = createSpan('cm-task-progress-bar');
		const progressBackGroundEl = document.createElement('div');
		const progressEl = document.createElement('div');
		const percentage = Math.round(this.completed / this.total * 10000) / 100;
		progressEl.style.width = percentage + '%';
		progressEl.style.height = '8px';
		switch (true) {
			case percentage >= 0 && percentage < 25:
				progressEl.style.backgroundColor = '#AE431E'
				break;
			case percentage >= 25 && percentage < 50:
				progressEl.style.backgroundColor = '#E5890A'
				break;
			case percentage >= 50 && percentage < 75:
				progressEl.style.backgroundColor = '#B4C6A6'
				break;
			case percentage >= 75 && percentage < 100:
				progressEl.style.backgroundColor = '#6BCB77'
				break;
			case percentage >= 100:
				progressEl.style.backgroundColor = '#4D96FF'
				break;
		}
		progressBackGroundEl.setAttribute('class', 'progress-bar-inline-background');
		progressEl.setAttribute('class', 'progress-bar-inline');

		progressBarEl.appendChild(progressBackGroundEl);
		progressBackGroundEl.appendChild(progressEl);

		return progressBarEl;
	}

	ignoreEvent() {
		return false;
	}
}

export function taskProgressBarPlugin(app: App, plugin: TaskProgressBarPlugin) {
	console.log(plugin);
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
					// @ts-ignore
					progressDecos: Range<Decoration>[] = [];
				for (let part of view.visibleRanges) {
					let taskBulletCursor: RegExpCursor | SearchCursor;
					let headingCursor: RegExpCursor | SearchCursor;
					try {
						taskBulletCursor = new RegExpCursor(state.doc, "^\\s*([-*+]|\\d+\\.)\\s\\[(.)\\]", {}, part.from, part.to);
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
						while (!headingCursor.next().done) {
							let { from, to } = headingCursor.value;
							const headingLine = this.view.state.doc.lineAt(from);
							const range = this.calculateRangeForTransform(this.view.state, headingLine.from);

							if (!range) continue;
							let tasksNum;
							// @ts-ignore
							if (this.view.state.doc.slice(range.from, range.to).text === undefined && this.view.state.doc.slice(range.from, range.to).children?.length > 0) {
								let allChildrenText: string[] = [];
								for (let i = 0; i < this.view.state.doc.slice(range.from, range.to).children?.length; i++) {
									// @ts-ignore
									allChildrenText = allChildrenText.concat(this.view.state.doc.slice(range.from, range.to).children[i].text);
								}
								tasksNum = this.calculateTasksNum(allChildrenText);
							} else {
								// @ts-ignore
								tasksNum = this.calculateTasksNum(this.view.state.doc.slice(range.from, range.to).text);
							}
							if (tasksNum?.total === 0) continue;
							let startDeco = Decoration.widget({ widget: new TaskProgressBarWidget(app, view, headingLine.to, headingLine.to, tasksNum.completed, tasksNum.total) });
							progressDecos.push(startDeco.range(headingLine.to, headingLine.to));
						}
					}
					while (!taskBulletCursor.next().done) {
						let { from } = taskBulletCursor.value;
						const linePos = view.state.doc.lineAt(from)?.from;
						let syntaxNode = syntaxTree(view.state).resolveInner(linePos + 1),
							nodeProps: string = syntaxNode.type.prop(tokenClassNodeProp),
							excludedSection = ["hmd-codeblock", "hmd-frontmatter"].find(token =>
								nodeProps?.split(" ").includes(token)
							);
						if (excludedSection) continue;
						const line = this.view.state.doc.lineAt(linePos);
						// @ts-ignore
						if (!(/^\s*([-*+]|\d+\.)\s\[(.)\]/.test(this.view.state.doc.slice(line.from, line.to).text))) return;
						const range = this.calculateRangeForTransform(this.view.state, line.to);
						if (!range) continue;
						// @ts-ignore
						const tasksNum = this.calculateTasksNum(this.view.state.doc.slice(range.from, range.to).text);
						if (tasksNum.total === 0) continue;
						let startDeco = Decoration.widget({ widget: new TaskProgressBarWidget(app, view, line.to, line.to, tasksNum.completed, tasksNum.total) });
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

				if (!foldRange && /^\s*([-*+]|\d+\.)\s+/.test(line.text)) {
					return { from: line.from, to: line.to };
				}

				if (!foldRange) {
					return null;
				}

				return { from: line.from, to: foldRange.to };
			}

			public calculateTasksNum(textArray: string[]): tasks {
				let completed: number = 0;
				let total: number = 0;
				if (!textArray) return;
				for (let i = 0; i < textArray.length; i++) {
					if (i === 0) continue;
					if (textArray[i].match(/[\t|\s]+-\s\[(.)\]/)) total++;
					if (textArray[i].match(/[\t|\s]+-\s\[(x|X)\]/)) completed++;
					if (plugin?.settings.addTaskProgressBarToHeading) {
						if (textArray[i].match(/-\s\[(.)\]/)) total++;
						if (textArray[i].match(/-\s\[(x|X)\]/)) completed++;
					}
				}
				return { completed: completed, total: total };
			};
		},
		{
			provide: plugin => [
				// these are separated out so that we can set decoration priority
				// it's also much easier to sort the decorations when they're grouped
				EditorView.decorations.of(v => v.plugin(plugin)?.progressDecorations || Decoration.none),
			],
		}
		// provide: PluginField.decorations.from((val) => val.progressDecorations),
	);
}
