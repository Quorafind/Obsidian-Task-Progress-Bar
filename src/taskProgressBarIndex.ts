import { App, Editor, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { taskProgressBarPlugin } from './taskProgressBarWidget';

interface TaskProgressBarSettings {
	addTaskProgressBarToHeading: boolean;
	addNumberToProgressBar: boolean;
}

const DEFAULT_SETTINGS: TaskProgressBarSettings = {
	addTaskProgressBarToHeading: false,
	addNumberToProgressBar: false
}

export default class TaskProgressBarPlugin extends Plugin {
	settings: TaskProgressBarSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new TaskProgressBarSettingTab(this.app, this));
		this.registerEditorExtension(taskProgressBarPlugin(this.app, this));

	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class TaskProgressBarSettingTab extends PluginSettingTab {
	plugin: TaskProgressBarPlugin;
	private applyDebounceTimer: number = 0;

	constructor(app: App, plugin: TaskProgressBarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	applySettingsUpdate() {
		clearTimeout(this.applyDebounceTimer);
		const plugin = this.plugin;
		this.applyDebounceTimer = window.setTimeout(() => {
			plugin.saveSettings();
		}, 100);
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: '📍 Task Progress Bar' });

		new Setting(containerEl)
			.setName('Add progress bar to Heading')
			.setDesc('Toggle this to allow this plugin to add progress bar for Task below the headings.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.addTaskProgressBarToHeading).onChange(async (value) => {
					this.plugin.settings.addTaskProgressBarToHeading = value;
					this.applySettingsUpdate();
				}));

		new Setting(containerEl)
			.setName('Add number to the Progress Bar')
			.setDesc('Toggle this to allow this plugin to add tasks number to progress bar.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.addNumberToProgressBar).onChange(async (value) => {
					this.plugin.settings.addNumberToProgressBar = value;
					this.applySettingsUpdate();
				}));

		this.containerEl.createEl('h2', { text: 'Say Thank You' });

		new Setting(containerEl)
			.setName('Donate')
			.setDesc('If you like this plugin, consider donating to support continued development:')
			.addButton((bt) => {
				bt.buttonEl.outerHTML = `<a href="https://www.buymeacoffee.com/boninall"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=boninall&button_colour=6495ED&font_colour=ffffff&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00"></a>`;
			});
	}
}
