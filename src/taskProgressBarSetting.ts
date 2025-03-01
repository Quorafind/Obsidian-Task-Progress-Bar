import { App, PluginSettingTab, Setting } from "obsidian";
import TaskProgressBarPlugin from "./taskProgressBarIndex";

export interface TaskProgressBarSettings {
	addTaskProgressBarToHeading: boolean;
	addNumberToProgressBar: boolean;
	showPercentage: boolean;
	allowAlternateTaskStatus: boolean;
	alternativeMarks: string;
	countSubLevel: boolean;
	hideProgressBarBasedOnConditions: boolean;
	hideProgressBarTags: string;
	hideProgressBarFolders: string;
	hideProgressBarMetadata: string;
	excludeTaskMarks: string;
	onlyCountTaskMarks: string;
	useOnlyCountMarks: boolean;
}

export const DEFAULT_SETTINGS: TaskProgressBarSettings = {
	addTaskProgressBarToHeading: false,
	addNumberToProgressBar: false,
	showPercentage: false,
	allowAlternateTaskStatus: false,
	alternativeMarks: "(x|X|-)",
	countSubLevel: true,
	hideProgressBarBasedOnConditions: false,
	hideProgressBarTags: "no-progress-bar",
	hideProgressBarFolders: "",
	hideProgressBarMetadata: "hide-progress-bar",
	excludeTaskMarks: "",
	onlyCountTaskMarks: "x|X",
	useOnlyCountMarks: false,
};


export class TaskProgressBarSettingTab extends PluginSettingTab {
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

		containerEl.createEl("h2", { text: "📍 Task Progress Bar" });

		new Setting(containerEl)
			.setName("Add progress bar to Heading")
			.setDesc(
				"Toggle this to allow this plugin to add progress bar for Task below the headings."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.addTaskProgressBarToHeading)
					.onChange(async (value) => {
						this.plugin.settings.addTaskProgressBarToHeading =
							value;
						this.applySettingsUpdate();
					})
			);

		this.showNumberToProgressbar();

		new Setting(containerEl)
			.setName("Count sub children level of current Task")
			.setDesc("Toggle this to allow this plugin to count sub tasks.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.countSubLevel)
					.onChange(async (value) => {
						this.plugin.settings.countSubLevel = value;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName("Allow alternate task status")
			.setDesc(
				"Toggle this to allow this plugin to treat different tasks mark as completed or uncompleted tasks."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.allowAlternateTaskStatus)
					.onChange(async (value) => {
						this.plugin.settings.allowAlternateTaskStatus = value;
						this.applySettingsUpdate();

						setTimeout(() => {
							this.display();
						}, 200);
					})
			);

		if (this.plugin.settings.allowAlternateTaskStatus) {
			new Setting(containerEl)
				.setName("Completed alternative marks")
				.setDesc('Set completed alternative marks here. Like "x|X|-"')
				.addText((text) =>
					text
						.setPlaceholder(DEFAULT_SETTINGS.alternativeMarks)
						.setValue(this.plugin.settings.alternativeMarks)
						.onChange(async (value) => {
							if (value.length === 0) {
								this.plugin.settings.alternativeMarks =
									DEFAULT_SETTINGS.alternativeMarks;
							} else {
								this.plugin.settings.alternativeMarks = value;
							}
							this.applySettingsUpdate();
						})
				);
		}

		new Setting(containerEl)
			.setName("Exclude specific task markers")
			.setDesc(
				'Specify task markers to exclude from counting. Example: "?|/"'
			)
			.addText((text) =>
				text
					.setPlaceholder("")
					.setValue(this.plugin.settings.excludeTaskMarks)
					.onChange(async (value) => {
						this.plugin.settings.excludeTaskMarks = value;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName("Only count specific task markers")
			.setDesc("Toggle this to only count specific task markers")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useOnlyCountMarks)
					.onChange(async (value) => {
						this.plugin.settings.useOnlyCountMarks = value;
						this.applySettingsUpdate();

						setTimeout(() => {
							this.display();
						}, 200);
					})
			);

		if (this.plugin.settings.useOnlyCountMarks) {
			new Setting(containerEl)
				.setName("Specific task markers to count")
				.setDesc(
					'Specify which task markers to count. Example: "x|X|>"'
				)
				.addText((text) =>
					text
						.setPlaceholder(DEFAULT_SETTINGS.onlyCountTaskMarks)
						.setValue(this.plugin.settings.onlyCountTaskMarks)
						.onChange(async (value) => {
							if (value.length === 0) {
								this.plugin.settings.onlyCountTaskMarks =
									DEFAULT_SETTINGS.onlyCountTaskMarks;
							} else {
								this.plugin.settings.onlyCountTaskMarks = value;
							}
							this.applySettingsUpdate();
						})
				);
		}

		new Setting(containerEl)
			.setName("Conditional Progress Bar Display")
			.setHeading();

		new Setting(containerEl)
			.setName("Hide progress bars based on conditions")
			.setDesc(
				"Toggle this to enable hiding progress bars based on tags, folders, or metadata."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(
						this.plugin.settings.hideProgressBarBasedOnConditions
					)
					.onChange(async (value) => {
						this.plugin.settings.hideProgressBarBasedOnConditions =
							value;
						this.applySettingsUpdate();

						setTimeout(() => {
							this.display();
						}, 200);
					})
			);

		if (this.plugin.settings.hideProgressBarBasedOnConditions) {
			new Setting(containerEl)
				.setName("Hide by tags")
				.setDesc(
					'Specify tags that will hide progress bars (comma-separated, without #). Example: "no-progress-bar,hide-progress"'
				)
				.addText((text) =>
					text
						.setPlaceholder(DEFAULT_SETTINGS.hideProgressBarTags)
						.setValue(this.plugin.settings.hideProgressBarTags)
						.onChange(async (value) => {
							this.plugin.settings.hideProgressBarTags = value;
							this.applySettingsUpdate();
						})
				);

			new Setting(containerEl)
				.setName("Hide by folders")
				.setDesc(
					'Specify folder paths that will hide progress bars (comma-separated). Example: "Daily Notes,Projects/Hidden"'
				)
				.addText((text) =>
					text
						.setPlaceholder("folder1,folder2/subfolder")
						.setValue(this.plugin.settings.hideProgressBarFolders)
						.onChange(async (value) => {
							this.plugin.settings.hideProgressBarFolders = value;
							this.applySettingsUpdate();
						})
				);

			new Setting(containerEl)
				.setName("Hide by metadata")
				.setDesc(
					'Specify frontmatter metadata that will hide progress bars. Example: "hide-progress-bar: true"'
				)
				.addText((text) =>
					text
						.setPlaceholder(
							DEFAULT_SETTINGS.hideProgressBarMetadata
						)
						.setValue(this.plugin.settings.hideProgressBarMetadata)
						.onChange(async (value) => {
							this.plugin.settings.hideProgressBarMetadata =
								value;
							this.applySettingsUpdate();
						})
				);
		}

		this.containerEl.createEl("h2", { text: "Say Thank You" });

		new Setting(containerEl)
			.setName("Donate")
			.setDesc(
				"If you like this plugin, consider donating to support continued development:"
			)
			.addButton((bt) => {
				bt.buttonEl.outerHTML = `<a href="https://www.buymeacoffee.com/boninall"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=boninall&button_colour=6495ED&font_colour=ffffff&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00"></a>`;
			});
	}

	showNumberToProgressbar() {
		new Setting(this.containerEl)
			.setName("Add number to the Progress Bar")
			.setDesc(
				"Toggle this to allow this plugin to add tasks number to progress bar."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.addNumberToProgressBar)
					.onChange(async (value) => {
						this.plugin.settings.addNumberToProgressBar = value;
						this.applySettingsUpdate();

						setTimeout(() => {
							this.display();
						}, 200);
					})
			);

		if (this.plugin.settings.addNumberToProgressBar) {
			new Setting(this.containerEl)
				.setName("Show percentage")
				.setDesc(
					"Toggle this to allow this plugin to show percentage in the progress bar."
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.showPercentage)
						.onChange(async (value) => {
							this.plugin.settings.showPercentage = value;
							this.applySettingsUpdate();
						})
				);
		}
	}
}
