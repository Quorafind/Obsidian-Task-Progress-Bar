import {
  Decoration,
  DecorationSet,
  EditorView,
  MatchDecorator,
  PluginField,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import { SearchCursor } from "@codemirror/search";
import { App, editorLivePreviewField, MarkdownView, Menu, Setting } from 'obsidian';
import { EditorState } from "@codemirror/state";
import { foldable, syntaxTree } from "@codemirror/language";
import { RegExpCursor } from "./regexp-cursor";
import { tokenClassNodeProp } from "@codemirror/stream-parser";
import { addTaskProgressBarToHeading } from "./taskProgressBarIndex";

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
    if(this.completed === other.completed && this.total === other.total) {
      return true;
    }
    const editor = markdownView.editor;
    const offset = editor.offsetToPos(this.from);
    const originalOffset = editor.offsetToPos(other.from);
    if(this.completed !== other.completed || this.total !== other.total) {
      return false;
    }
    if (offset.line === originalOffset.line && this.completed === other.completed && this.total === other.total) {
      return true;
    }
    return other.view === this.view && other.from === this.from && other.to === this.to;
  }

  toDOM() {
    const creaseEl = createSpan('cm-task-progress-bar');
    const progressEl = document.createElement('progress');
    progressEl.setAttribute('max', this.total.toString());
    progressEl.setAttribute('value', this.completed.toString());
    progressEl.setAttribute('class', 'progress-bar-inline');
    creaseEl.appendChild(progressEl);

    return creaseEl;
  }

  ignoreEvent() {
    return false;
  }
}

export function taskProgressBarPlugin(app: App) {
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
		  if(addTaskProgressBarToHeading) {
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
				  // @ts-ignore
				  const tasksNum = this.caculateTasksNum(this.view.state.doc.slice(range.from, range.to).text);
				  if(tasksNum.total === 0) continue;
				  let startDeco = Decoration.widget({ widget: new TaskProgressBarWidget(app, view, headingLine.to, headingLine.to, tasksNum.completed, tasksNum.total  ) });
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
            if(!(/^\s*([-*+]|\d+\.)\s\[(.)\]/.test(this.view.state.doc.slice(line.from, line.to).text))) return;
            const range = this.calculateRangeForTransform(this.view.state, line.to);
            if(!range) continue;
            // @ts-ignore
			const tasksNum = this.caculateTasksNum(this.view.state.doc.slice(range.from, range.to).text);
            if(tasksNum.total === 0) continue;
            let startDeco = Decoration.widget({ widget: new TaskProgressBarWidget(app, view, line.to, line.to, tasksNum.completed, tasksNum.total  ) });
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

      public caculateTasksNum(textArray: string[]): tasks {
        let completed: number = 0;
        let total: number = 0;
        for(let i = 0; i < textArray.length; i++) {
          if(i === 0) continue;
          if(textArray[i].match(/[\t|\s]+-\s\[(.)\]/)) total++;
          if(textArray[i].match(/[\t|\s]+-\s\[x\]/)) completed++;
		  if(addTaskProgressBarToHeading) {
			  if(textArray[i].match(/-\s\[(.)\]/)) total++;
			  if(textArray[i].match(/-\s\[x\]/)) completed++;
		  }
        }
        return {completed: completed, total: total};
      };
    },
    {
      provide: PluginField.decorations.from((val) => val.progressDecorations),
    },
  );
}
