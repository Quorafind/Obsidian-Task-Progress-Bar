import { App, PluginSettingTab, Setting, Modal } from "obsidian";
import TaskProgressBarPlugin from ".";
import { allStatusCollections } from "./task-status";

export interface TaskProgressBarSettings {
	showProgressBar: boolean;
	addTaskProgressBarToHeading: boolean;
	enableHeadingProgressBar: boolean;
	addNumberToProgressBar: boolean;
	showPercentage: boolean;
	autoCompleteParent: boolean;
	supportHoverToShowProgressInfo: boolean;
	markParentInProgressWhenPartiallyComplete: boolean;
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

	// Progress range text customization
	customizeProgressRanges: boolean;
	progressRanges: Array<{
		min: number;
		max: number;
		text: string;
	}>;

	// Task status switcher settings
	enableTaskStatusSwitcher: boolean;
	enableCustomTaskMarks: boolean;
	taskStatusCycle: string[];
	taskStatusMarks: Record<string, string>;
	excludeMarksFromCycle: string[];

	// Cycle complete status settings
	enableCycleCompleteStatus: boolean;
	alwaysCycleNewTasks: boolean;
}

export const DEFAULT_SETTINGS: TaskProgressBarSettings = {
	showProgressBar: false,
	addTaskProgressBarToHeading: false,
	enableHeadingProgressBar: false,
	addNumberToProgressBar: false,
	autoCompleteParent: false,
	supportHoverToShowProgressInfo: false,
	markParentInProgressWhenPartiallyComplete: false,
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

	// Progress range text customization
	customizeProgressRanges: false,
	progressRanges: [
		{ min: 0, max: 20, text: "Just started {{PROGRESS}}%" },
		{ min: 20, max: 40, text: "Making progress {{PROGRESS}}%" },
		{ min: 40, max: 60, text: "Half way {{PROGRESS}}%" },
		{ min: 60, max: 80, text: "Good progress {{PROGRESS}}%" },
		{ min: 80, max: 100, text: "Almost there {{PROGRESS}}%" },
	],

	// Task status switcher settings
	enableTaskStatusSwitcher: false,
	enableCustomTaskMarks: false,
	taskStatusCycle: ["TODO", "DOING", "IN-PROGRESS", "DONE"],
	taskStatusMarks: {
		TODO: " ",
		DOING: "-",
		"IN-PROGRESS": ">",
		DONE: "x",
	},
	excludeMarksFromCycle: [],

	// Cycle complete status settings
	enableCycleCompleteStatus: true,
	alwaysCycleNewTasks: false,
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

		new Setting(containerEl)
			.setName("Task Genius")
			.setDesc(
				"Comprehensive task management plugin for Obsidian with progress bars, task status cycling, and advanced task tracking features."
			)
			.setHeading();

		new Setting(containerEl)
			.setName("Show progress bar")
			.setDesc("Toggle this to show the progress bar.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showProgressBar)
					.onChange(async (value) => {
						this.plugin.settings.showProgressBar = value;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName("Support hover to show progress info")
			.setDesc(
				"Toggle this to allow this plugin to show progress info when hovering over the progress bar."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(
						this.plugin.settings.supportHoverToShowProgressInfo
					)
					.onChange(async (value) => {
						this.plugin.settings.supportHoverToShowProgressInfo =
							value;
						this.applySettingsUpdate();
					})
			);

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

		new Setting(containerEl)
			.setName("Mark parent as 'In Progress' when partially complete")
			.setDesc(
				"When some but not all child tasks are completed, mark the parent task as 'In Progress'. Only works when 'Auto complete parent' is enabled."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(
						this.plugin.settings
							.markParentInProgressWhenPartiallyComplete
					)
					.onChange(async (value) => {
						this.plugin.settings.markParentInProgressWhenPartiallyComplete =
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

		this.containerEl.createEl("h2", { text: "Task Status Switcher" });

		new Setting(containerEl)
			.setName("Enable task status switcher")
			.setDesc(
				"Enable/disable the ability to cycle through task states by clicking."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.enableTaskStatusSwitcher)
					.onChange(async (value) => {
						this.plugin.settings.enableTaskStatusSwitcher = value;
						this.applySettingsUpdate();
					});
			});

		new Setting(containerEl)
			.setName("Enable custom task marks")
			.setDesc(
				"Replace default checkboxes with styled text marks that follow your task status cycle when clicked."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.enableCustomTaskMarks)
					.onChange(async (value) => {
						this.plugin.settings.enableCustomTaskMarks = value;
						this.applySettingsUpdate();
					});
			});

		new Setting(containerEl)
			.setName("Enable cycle complete status")
			.setDesc(
				"Enable/disable the ability to automatically cycle through task states when pressing a mark."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.enableCycleCompleteStatus)
					.onChange(async (value) => {
						this.plugin.settings.enableCycleCompleteStatus = value;
						this.applySettingsUpdate();
					});
			});

		new Setting(containerEl)
			.setName("Always cycle new tasks")
			.setDesc(
				"When enabled, newly inserted tasks will immediately cycle to the next status. When disabled, newly inserted tasks with valid marks will keep their original mark."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.alwaysCycleNewTasks)
					.onChange(async (value) => {
						this.plugin.settings.alwaysCycleNewTasks = value;
						this.applySettingsUpdate();
					});
			});

		new Setting(containerEl)
			.setName("Task Status Cycle and Marks")
			.setDesc(
				"Define task states and their corresponding marks. The order from top to bottom defines the cycling sequence."
			);

		// Create a container for the task states list
		const taskStatesContainer = containerEl.createDiv({
			cls: "task-states-container",
		});

		// Function to refresh the task states list
		const refreshTaskStatesList = () => {
			// Clear the container
			taskStatesContainer.empty();

			// Get current cycle and marks
			const cycle = this.plugin.settings.taskStatusCycle;
			const marks = this.plugin.settings.taskStatusMarks;

			// Initialize excludeMarksFromCycle if it doesn't exist
			if (!this.plugin.settings.excludeMarksFromCycle) {
				this.plugin.settings.excludeMarksFromCycle = [];
			}

			// Add each status in the cycle
			cycle.forEach((state, index) => {
				const stateRow = taskStatesContainer.createDiv({
					cls: "task-state-row",
				});

				// Create the setting
				const stateSetting = new Setting(stateRow)
					.setName(`Status #${index + 1}`)
					.addText((text) => {
						text.setValue(state)
							.setPlaceholder("Status name")
							.onChange((value) => {
								// Update the state name in both cycle and marks
								const oldState = cycle[index];
								cycle[index] = value;

								// If the old state had a mark, preserve it with the new name
								if (oldState in marks) {
									marks[value] = marks[oldState];
									delete marks[oldState];
								}

								this.applySettingsUpdate();
							});
					})
					.addText((text) => {
						text.setValue(marks[state] || " ")
							.setPlaceholder("Mark")
							.onChange((value) => {
								// Only use the first character
								const mark = value.trim().charAt(0) || " ";
								marks[state] = mark;
								this.applySettingsUpdate();
							});
						text.inputEl.maxLength = 1;
						text.inputEl.style.width = "40px";
					});

				// Add toggle for including in cycle
				stateSetting.addToggle((toggle) => {
					toggle
						.setTooltip("Include in cycle")
						.setValue(
							!this.plugin.settings.excludeMarksFromCycle.includes(
								state
							)
						)
						.onChange((value) => {
							if (!value) {
								// Add to exclude list if not already there
								if (
									!this.plugin.settings.excludeMarksFromCycle.includes(
										state
									)
								) {
									this.plugin.settings.excludeMarksFromCycle.push(
										state
									);
								}
							} else {
								// Remove from exclude list
								this.plugin.settings.excludeMarksFromCycle =
									this.plugin.settings.excludeMarksFromCycle.filter(
										(s) => s !== state
									);
							}
							this.applySettingsUpdate();
						});
				});

				// Add buttons for moving up/down and removing
				stateSetting.addExtraButton((button) => {
					button
						.setIcon("arrow-up")
						.setTooltip("Move up")
						.onClick(() => {
							if (index > 0) {
								// Swap with the previous item
								[cycle[index - 1], cycle[index]] = [
									cycle[index],
									cycle[index - 1],
								];
								this.applySettingsUpdate();
								refreshTaskStatesList();
							}
						});
					button.extraSettingsEl.style.marginRight = "0";
				});

				stateSetting.addExtraButton((button) => {
					button
						.setIcon("arrow-down")
						.setTooltip("Move down")
						.onClick(() => {
							if (index < cycle.length - 1) {
								// Swap with the next item
								[cycle[index], cycle[index + 1]] = [
									cycle[index + 1],
									cycle[index],
								];
								this.applySettingsUpdate();
								refreshTaskStatesList();
							}
						});
					button.extraSettingsEl.style.marginRight = "0";
				});

				stateSetting.addExtraButton((button) => {
					button
						.setIcon("trash")
						.setTooltip("Remove")
						.onClick(() => {
							// Remove from cycle
							cycle.splice(index, 1);
							// Don't remove from marks to preserve settings
							this.applySettingsUpdate();
							refreshTaskStatesList();
						});
					button.extraSettingsEl.style.marginRight = "0";
				});
			});

			// Add button to add new status
			const addButtonContainer = taskStatesContainer.createDiv();
			new Setting(addButtonContainer).addButton((button) => {
				button
					.setButtonText("Add Status")
					.setCta()
					.onClick(() => {
						// Add a new status to the cycle with a default mark
						const newStatus = `STATUS_${cycle.length + 1}`;
						cycle.push(newStatus);
						marks[newStatus] = " ";
						this.applySettingsUpdate();
						refreshTaskStatesList();
					});
			});
		};

		// Initial render of the task states list
		refreshTaskStatesList();

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

							setTimeout(() => {
								this.display();
							}, 200);
						})
				);

			if (this.plugin.settings.showPercentage) {
				new Setting(this.containerEl)
					.setName("Customize progress text")
					.setDesc(
						"Toggle this to customize text representation for different progress percentage ranges."
					)
					.addToggle((toggle) =>
						toggle
							.setValue(
								this.plugin.settings.customizeProgressRanges
							)
							.onChange(async (value) => {
								this.plugin.settings.customizeProgressRanges =
									value;
								this.applySettingsUpdate();

								setTimeout(() => {
									this.display();
								}, 200);
							})
					);

				if (this.plugin.settings.customizeProgressRanges) {
					this.addProgressRangesSettings();
				}
			}
		}
	}

	addProgressRangesSettings() {
		new Setting(this.containerEl)
			.setName("Progress Ranges")
			.setDesc(
				"Define progress ranges and their corresponding text representations."
			)
			.setHeading();

		// Display existing ranges
		this.plugin.settings.progressRanges.forEach((range, index) => {
			new Setting(this.containerEl)
				.setName(`Range ${index + 1}: ${range.min}%-${range.max}%`)
				.setDesc(
					`Use {{PROGRESS}} as a placeholder for the percentage value`
				)
				.addText((text) =>
					text
						.setPlaceholder(
							"Template text with {{PROGRESS}} placeholder"
						)
						.setValue(range.text)
						.onChange(async (value) => {
							this.plugin.settings.progressRanges[index].text =
								value;
							this.applySettingsUpdate();
						})
				)
				.addButton((button) => {
					button.setButtonText("Delete").onClick(async () => {
						this.plugin.settings.progressRanges.splice(index, 1);
						this.applySettingsUpdate();
						this.display();
					});
				});
		});

		new Setting(this.containerEl)
			.setName("Add new range")
			.setDesc("Add a new progress percentage range with custom text");

		// Add a new range
		const newRangeSetting = new Setting(this.containerEl);
		newRangeSetting.infoEl.detach();

		newRangeSetting
			.addText((text) =>
				text
					.setPlaceholder("Min percentage (0-100)")
					.setValue("")
					.onChange(async (value) => {
						// This will be handled when the user clicks the Add button
					})
			)
			.addText((text) =>
				text
					.setPlaceholder("Max percentage (0-100)")
					.setValue("")
					.onChange(async (value) => {
						// This will be handled when the user clicks the Add button
					})
			)
			.addText((text) =>
				text
					.setPlaceholder("Text template (use {{PROGRESS}})")
					.setValue("")
					.onChange(async (value) => {
						// This will be handled when the user clicks the Add button
					})
			)
			.addButton((button) => {
				button.setButtonText("Add").onClick(async () => {
					const settingsContainer = button.buttonEl.parentElement;
					if (!settingsContainer) return;

					const inputs = settingsContainer.querySelectorAll("input");
					if (inputs.length < 3) return;

					const min = parseInt(inputs[0].value);
					const max = parseInt(inputs[1].value);
					const text = inputs[2].value;

					if (isNaN(min) || isNaN(max) || !text) {
						return;
					}

					this.plugin.settings.progressRanges.push({
						min,
						max,
						text,
					});

					// Clear inputs
					inputs[0].value = "";
					inputs[1].value = "";
					inputs[2].value = "";

					this.applySettingsUpdate();
					this.display();
				});
			});

		// Reset to defaults
		new Setting(this.containerEl)
			.setName("Reset to defaults")
			.setDesc("Reset progress ranges to default values")
			.addButton((button) => {
				button.setButtonText("Reset").onClick(async () => {
					this.plugin.settings.progressRanges = [
						{ min: 0, max: 20, text: "Just started {{PROGRESS}}%" },
						{
							min: 20,
							max: 40,
							text: "Making progress {{PROGRESS}}%",
						},
						{ min: 40, max: 60, text: "Half way {{PROGRESS}}%" },
						{
							min: 60,
							max: 80,
							text: "Good progress {{PROGRESS}}%",
						},
						{
							min: 80,
							max: 100,
							text: "Almost there {{PROGRESS}}%",
						},
					];
					this.applySettingsUpdate();
					this.display();
				});
			});
	}
}
