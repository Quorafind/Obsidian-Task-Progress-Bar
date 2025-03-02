import { App, PluginSettingTab, Setting, Modal } from "obsidian";
import TaskProgressBarPlugin from "./taskProgressBarIndex";
import { allStatusCollections } from "./task-status";

export interface TaskProgressBarSettings {
	addTaskProgressBarToHeading: boolean;
	enableHeadingProgressBar: boolean;
	addNumberToProgressBar: boolean;
	showPercentage: boolean;
	autoCompleteParent: boolean;
	countSubLevel: boolean;
	hideProgressBarBasedOnConditions: boolean;
	hideProgressBarTags: string;
	hideProgressBarFolders: string;
	hideProgressBarMetadata: string;

	// Task state settings
	taskStatuses: {
		completed: string;
		inProgress: string;
		abandoned: string;
		notStarted: string;
		planned: string;
	};

	countOtherStatusesAs: string;

	// Control which tasks to count
	excludeTaskMarks: string;
	useOnlyCountMarks: boolean;
	onlyCountTaskMarks: string;
}

export const DEFAULT_SETTINGS: TaskProgressBarSettings = {
	addTaskProgressBarToHeading: false,
	enableHeadingProgressBar: false,
	addNumberToProgressBar: false,
	autoCompleteParent: false,
	showPercentage: false,
	countSubLevel: true,
	hideProgressBarBasedOnConditions: false,
	hideProgressBarTags: "no-progress-bar",
	hideProgressBarFolders: "",
	hideProgressBarMetadata: "hide-progress-bar",

	// Default task statuses
	taskStatuses: {
		completed: "x|X",
		inProgress: ">|/",
		abandoned: "-",
		notStarted: " ",
		planned: "?",
	},

	countOtherStatusesAs: "notStarted",

	// Control which tasks to count
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

		new Setting(containerEl)
			.setName("Enable heading progress bars")
			.setDesc(
				"Add progress bars to headings to show progress of all tasks under that heading."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableHeadingProgressBar)
					.onChange(async (value) => {
						this.plugin.settings.enableHeadingProgressBar = value;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName("Auto complete parent task")
			.setDesc(
				"Toggle this to allow this plugin to auto complete parent task when all child tasks are completed."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoCompleteParent)
					.onChange(async (value) => {
						this.plugin.settings.autoCompleteParent = value;
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

		// Task Status Settings
		new Setting(containerEl)
			.setName("Task Status Settings")
			.setDesc(
				"Select a predefined task status collection or customize your own"
			)
			.setHeading()
			.addDropdown((dropdown) => {
				dropdown.addOption("custom", "Custom");
				for (const statusCollection of allStatusCollections) {
					dropdown.addOption(statusCollection, statusCollection);
				}

				// Set default value to custom
				dropdown.setValue("custom");

				dropdown.onChange(async (value) => {
					if (value === "custom") {
						return;
					}

					// Confirm before applying the theme
					const modal = new Modal(this.app);
					modal.titleEl.setText(`Apply ${value} Theme?`);

					const content = modal.contentEl.createDiv();
					content.setText(
						`This will override your current task status settings with the ${value} theme. Do you want to continue?`
					);

					const buttonContainer = modal.contentEl.createDiv();
					buttonContainer.addClass("modal-button-container");

					const cancelButton = buttonContainer.createEl("button");
					cancelButton.setText("Cancel");
					cancelButton.addEventListener("click", () => {
						dropdown.setValue("custom");
						modal.close();
					});

					const confirmButton = buttonContainer.createEl("button");
					confirmButton.setText("Apply Theme");
					confirmButton.addClass("mod-cta");
					confirmButton.addEventListener("click", async () => {
						modal.close();

						// Apply the selected theme's task statuses
						try {
							// Import the function dynamically based on the selected theme
							const functionName =
								value.toLowerCase() + "SupportedStatuses";
							const statusesModule = await import(
								"./task-status"
							);

							// Use type assertion for the dynamic function access
							const getStatuses = (statusesModule as any)[
								functionName
							];

							if (typeof getStatuses === "function") {
								const statuses = getStatuses();

								// Create a map to collect all statuses of each type
								const statusMap: Record<string, string[]> = {
									completed: [],
									inProgress: [],
									abandoned: [],
									notStarted: [],
									planned: [],
								};

								// Group statuses by their type
								for (const [symbol, _, type] of statuses) {
									if (type in statusMap) {
										statusMap[
											type as keyof typeof statusMap
										].push(symbol);
									}
								}

								// Update the settings with the collected statuses
								for (const type of Object.keys(
									this.plugin.settings.taskStatuses
								)) {
									if (
										statusMap[type] &&
										statusMap[type].length > 0
									) {
										(
											this.plugin.settings
												.taskStatuses as Record<
												string,
												string
											>
										)[type] = statusMap[type].join("|");
									}
								}

								// Save settings and refresh the display
								this.applySettingsUpdate();
								this.display();
							}
						} catch (error) {
							console.error(
								"Failed to apply task status theme:",
								error
							);
						}
					});

					modal.open();
				});
			});

		new Setting(containerEl)
			.setName("Completed task markers")
			.setDesc(
				'Characters in square brackets that represent completed tasks. Example: "x|X"'
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.taskStatuses.completed)
					.setValue(this.plugin.settings.taskStatuses.completed)
					.onChange(async (value) => {
						this.plugin.settings.taskStatuses.completed =
							value || DEFAULT_SETTINGS.taskStatuses.completed;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName("Planned task markers")
			.setDesc(
				'Characters in square brackets that represent planned tasks. Example: "?"'
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.taskStatuses.planned)
					.setValue(this.plugin.settings.taskStatuses.planned)
					.onChange(async (value) => {
						this.plugin.settings.taskStatuses.planned =
							value || DEFAULT_SETTINGS.taskStatuses.planned;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName("In progress task markers")
			.setDesc(
				'Characters in square brackets that represent tasks in progress. Example: ">|/"'
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.taskStatuses.inProgress)
					.setValue(this.plugin.settings.taskStatuses.inProgress)
					.onChange(async (value) => {
						this.plugin.settings.taskStatuses.inProgress =
							value || DEFAULT_SETTINGS.taskStatuses.inProgress;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName("Abandoned task markers")
			.setDesc(
				'Characters in square brackets that represent abandoned tasks. Example: "-"'
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.taskStatuses.abandoned)
					.setValue(this.plugin.settings.taskStatuses.abandoned)
					.onChange(async (value) => {
						this.plugin.settings.taskStatuses.abandoned =
							value || DEFAULT_SETTINGS.taskStatuses.abandoned;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName("Not started task markers")
			.setDesc(
				'Characters in square brackets that represent not started tasks. Default is space " "'
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.taskStatuses.notStarted)
					.setValue(this.plugin.settings.taskStatuses.notStarted)
					.onChange(async (value) => {
						this.plugin.settings.taskStatuses.notStarted =
							value || DEFAULT_SETTINGS.taskStatuses.notStarted;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName("Count other statuses as")
			.setDesc(
				'Select the status to count other statuses as. Default is "Not Started".'
			)
			.addDropdown((dropdown) => {
				dropdown.addOption("notStarted", "Not Started");
				dropdown.addOption("abandoned", "Abandoned");
				dropdown.addOption("planned", "Planned");
				dropdown.addOption("completed", "Completed");
				dropdown.addOption("inProgress", "In Progress");
			});

		// Task Counting Settings
		new Setting(containerEl)
			.setName("Task Counting Settings")
			.setDesc("Toggle this to allow this plugin to count sub tasks.")
			.setHeading();

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
