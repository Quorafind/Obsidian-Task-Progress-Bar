import {
	editorInfoField,
	HoverParent,
	HoverPopover,
	MarkdownRenderer,
	Plugin,
} from "obsidian";
import { taskProgressBarExtension } from "./editor-ext/widget";
import { updateProgressBarInElement } from "./components/readModeWidget";
import { applyTaskTextMarks } from "./components/readModeTextMark";
import {
	DEFAULT_SETTINGS,
	TaskProgressBarSettings,
	TaskProgressBarSettingTab,
} from "./setting";
import { EditorView } from "@codemirror/view";
import { autoCompleteParentExtension } from "./editor-ext/autoCompleteParent";
import { taskStatusSwitcherExtension } from "./editor-ext/taskStatusSwitcher";
import { cycleCompleteStatusExtension } from "./editor-ext/cycleCompleteStatus";
import {
	cycleTaskStatusForward,
	cycleTaskStatusBackward,
} from "./commands/taskCycleCommands";
import { moveTaskCommand } from "./commands/taskMover";

class TaskProgressBarPopover extends HoverPopover {
	plugin: TaskProgressBarPlugin;
	data: {
		completed: string;
		total: string;
		inProgress: string;
		abandoned: string;
		notStarted: string;
		planned: string;
	};

	constructor(
		plugin: TaskProgressBarPlugin,
		data: {
			completed: string;
			total: string;
			inProgress: string;
			abandoned: string;
			notStarted: string;
			planned: string;
		},
		parent: HoverParent,
		targetEl: HTMLElement,
		waitTime: number = 1000
	) {
		super(parent, targetEl, waitTime);

		this.hoverEl.toggleClass("task-progress-bar-popover", true);
		this.plugin = plugin;
		this.data = data;
	}

	onload(): void {
		MarkdownRenderer.render(
			this.plugin.app,
			`
| Status | Count |
| --- | --- |
| Total | ${this.data.total} |
| Completed | ${this.data.completed} |
| In Progress | ${this.data.inProgress} |
| Abandoned | ${this.data.abandoned} |
| Not Started | ${this.data.notStarted} |
| Planned | ${this.data.planned} |
`,
			this.hoverEl,
			"",
			this.plugin
		);
	}
}

export const showPopoverWithProgressBar = (
	plugin: TaskProgressBarPlugin,
	{
		progressBar,
		data,
		view,
	}: {
		progressBar: HTMLElement;
		data: {
			completed: string;
			total: string;
			inProgress: string;
			abandoned: string;
			notStarted: string;
			planned: string;
		};
		view: EditorView;
	}
) => {
	const editor = view.state.field(editorInfoField);
	if (!editor) return;
	new TaskProgressBarPopover(plugin, data, editor, progressBar);
};

export default class TaskProgressBarPlugin extends Plugin {
	settings: TaskProgressBarSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new TaskProgressBarSettingTab(this.app, this));
		this.registerEditorExtension([
			taskProgressBarExtension(this.app, this),
		]);
		this.settings.enableTaskStatusSwitcher &&
			this.settings.enableCustomTaskMarks &&
			this.registerEditorExtension([
				taskStatusSwitcherExtension(this.app, this),
			]);
		this.registerMarkdownPostProcessor((el, ctx) => {
			// Apply custom task text marks (replaces checkboxes with styled marks)
			if (this.settings.enableTaskStatusSwitcher) {
				applyTaskTextMarks({
					plugin: this,
					element: el,
					ctx: ctx,
				});
			}

			// Apply progress bars (existing functionality)
			updateProgressBarInElement({
				plugin: this,
				element: el,
				ctx: ctx,
			});
		});

		// Add command for cycling task status forward
		this.addCommand({
			id: "cycle-task-status-forward",
			name: "Cycle task status forward",
			editorCheckCallback: (checking, editor, ctx) => {
				return cycleTaskStatusForward(checking, editor, ctx, this);
			},
		});

		// Add command for cycling task status backward
		this.addCommand({
			id: "cycle-task-status-backward",
			name: "Cycle task status backward",
			editorCheckCallback: (checking, editor, ctx) => {
				return cycleTaskStatusBackward(checking, editor, ctx, this);
			},
		});

		// Add command for moving tasks
		this.addCommand({
			id: "move-task-to-file",
			name: "Move task to another file",
			editorCheckCallback: (checking, editor, ctx) => {
				return moveTaskCommand(checking, editor, this);
			},
		});

		this.app.workspace.onLayoutReady(() => {
			if (this.settings.autoCompleteParent) {
				this.registerEditorExtension([
					autoCompleteParentExtension(this.app, this),
				]);
			}

			if (this.settings.enableCycleCompleteStatus) {
				this.registerEditorExtension([
					cycleCompleteStatusExtension(this.app, this),
				]);
			}
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
