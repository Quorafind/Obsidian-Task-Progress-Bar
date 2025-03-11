import {
	editorInfoField,
	HoverParent,
	HoverPopover,
	MarkdownRenderer,
	Plugin,
} from "obsidian";
import { taskProgressBarExtension } from "./widget";
import { updateProgressBarInElement } from "./readModeWidget";
import {
	DEFAULT_SETTINGS,
	TaskProgressBarSettings,
	TaskProgressBarSettingTab,
} from "./taskProgressBarSetting";
import { EditorView } from "@codemirror/view";
import { autoCompleteParentExtension } from "./autoCompleteParent";
import { taskStatusSwitcherExtension } from "./task-status-switcher";

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
			this.registerEditorExtension([
				taskStatusSwitcherExtension(this.app, this),
			]);
		this.registerMarkdownPostProcessor((el, ctx) => {
			updateProgressBarInElement({
				plugin: this,
				element: el,
				ctx: ctx,
			});
		});

		this.app.workspace.onLayoutReady(() => {
			if (this.settings.autoCompleteParent) {
				this.registerEditorExtension([
					autoCompleteParentExtension(this.app),
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
