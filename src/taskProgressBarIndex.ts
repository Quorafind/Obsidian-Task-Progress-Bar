import { App, Editor, Plugin, PluginSettingTab, Setting } from "obsidian";
import { taskProgressBarExtension } from "./widget";
import { updateProgressBarInElement } from "./readModeWidget";
import {
	DEFAULT_SETTINGS,
	TaskProgressBarSettings,
	TaskProgressBarSettingTab,
} from "./taskProgressBarSetting";

export default class TaskProgressBarPlugin extends Plugin {
	settings: TaskProgressBarSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new TaskProgressBarSettingTab(this.app, this));
		this.registerEditorExtension(taskProgressBarExtension(this.app, this));
		this.registerMarkdownPostProcessor((el, ctx) => {
			updateProgressBarInElement({
				plugin: this,
				element: el,
				ctx: ctx,
			});
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
