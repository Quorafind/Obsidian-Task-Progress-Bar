import TaskProgressBarPlugin from "./taskProgressBarIndex";
import { Component, MarkdownPostProcessorContext, TFile } from "obsidian";
import { shouldHideProgressBarInPreview } from "./utils";

interface GroupElement {
	parentElement: HTMLElement;
	childrenElement: HTMLElement[];
}

function groupElementsByParent(childrenElements: HTMLElement[]) {
	const parentMap = new Map();

	childrenElements.forEach((child: HTMLElement) => {
		const parent = child.parentElement;

		if (parent) {
			if (parentMap.has(parent)) {
				parentMap.get(parent).push(child);
			} else {
				parentMap.set(parent, [child]);
			}
		}
	});

	const result: GroupElement[] = [];
	parentMap.forEach((children, parent) => {
		result.push({ parentElement: parent, childrenElement: children });
	});

	return result;
}

function loadProgressbar(
	plugin: TaskProgressBarPlugin,
	groupedElements: GroupElement[],
	type: "dataview" | "normal"
) {
	for (let group of groupedElements) {
		if (
			group.parentElement.parentElement &&
			group.parentElement?.parentElement.hasClass("task-list-item")
		) {
			const progressBar = new ProgressBar(plugin, group, type).onload();

			const previousSibling = group.parentElement.previousElementSibling;
			if (previousSibling && previousSibling.tagName === "P") {
				previousSibling.appendChild(progressBar);
			} else {
				group.parentElement.parentElement.insertBefore(
					progressBar,
					group.parentElement
				);
			}
		}
	}
}

export function updateProgressBarInElement({
	plugin,
	element,
	ctx,
}: {
	plugin: TaskProgressBarPlugin;
	element: HTMLElement;
	ctx: MarkdownPostProcessorContext;
}) {
	// Check if progress bars should be hidden based on settings
	if (shouldHideProgressBarInPreview(plugin, ctx)) {
		return;
	}

	if (element.find("ul.contains-task-list")) {
		const elements = element.findAll(".task-list-item");
		const groupedElements = groupElementsByParent(elements);
		loadProgressbar(plugin, groupedElements, "normal");
	} else if (element.closest(".dataview-container")) {
		const parentElement = element.closest(".dataview-container");
		if (!parentElement) return;
		if (parentElement.getAttribute("data-task-progress-bar") === "true")
			return;
		const elements = parentElement.findAll(".task-list-item");
		const groupedElements = groupElementsByParent(elements);
		loadProgressbar(plugin, groupedElements, "dataview");
		parentElement.setAttribute("data-task-progress-bar", "true");
	}
}

class ProgressBar extends Component {
	progressBarEl: HTMLSpanElement;
	progressBackGroundEl: HTMLDivElement;
	progressEl: HTMLDivElement;
	inProgressEl: HTMLDivElement;
	abandonedEl: HTMLDivElement;
	numberEl: HTMLDivElement;

	plugin: TaskProgressBarPlugin;

	completed: number;
	total: number;
	inProgress: number;
	abandoned: number;
	notStarted: number;

	group: GroupElement;

	constructor(
		plugin: TaskProgressBarPlugin,
		group: GroupElement,
		readonly type: "dataview" | "normal"
	) {
		super();
		this.plugin = plugin;
		this.group = group;

		this.completed = 0;
		this.total = 0;
		this.inProgress = 0;
		this.abandoned = 0;
		this.notStarted = 0;

		if (type === "dataview") {
			this.updateCompletedAndTotalDataview();
		} else {
			this.updateCompletedAndTotal();
		}

		// Set up event handlers
		for (let el of this.group.childrenElement) {
			if (this.type === "normal") {
				el.on("click", "input", () => {
					setTimeout(() => {
						this.updateCompletedAndTotal();
						this.changePercentage();
						this.changeNumber();
					}, 200);
				});
			} else if (this.type === "dataview") {
				this.registerDomEvent(el, "mousedown", (ev) => {
					if (!ev.target) return;
					if ((ev.target as HTMLElement).tagName === "INPUT") {
						setTimeout(() => {
							this.updateCompletedAndTotalDataview();
							this.changePercentage();
							this.changeNumber();
						}, 200);
					}
				});
			}
		}
	}

	getTaskStatus(
		text: string
	): "completed" | "inProgress" | "abandoned" | "notStarted" {
		const markMatch = text.match(/\[(.)]/);
		if (!markMatch || !markMatch[1]) {
			return "notStarted";
		}

		const mark = markMatch[1];

		// Priority 1: If useOnlyCountMarks is enabled
		if (this.plugin?.settings.useOnlyCountMarks) {
			const onlyCountMarks =
				this.plugin?.settings.onlyCountTaskMarks.split("|");
			if (onlyCountMarks.includes(mark)) {
				return "completed";
			} else {
				// If using onlyCountMarks and the mark is not in the list,
				// determine which other status it belongs to
				return this.determineNonCompletedStatus(mark);
			}
		}

		// Priority 2: If the mark is in excludeTaskMarks
		if (
			this.plugin?.settings.excludeTaskMarks &&
			this.plugin.settings.excludeTaskMarks.includes(mark)
		) {
			// Excluded marks are considered not started
			return "notStarted";
		}

		// Priority 3: Check against specific task statuses
		return this.determineTaskStatus(mark);
	}

	determineNonCompletedStatus(
		mark: string
	): "inProgress" | "abandoned" | "notStarted" {
		const inProgressMarks =
			this.plugin?.settings.taskStatuses.inProgress.split("|");
		if (inProgressMarks.includes(mark)) {
			return "inProgress";
		}

		const abandonedMarks =
			this.plugin?.settings.taskStatuses.abandoned.split("|");
		if (abandonedMarks.includes(mark)) {
			return "abandoned";
		}

		return "notStarted";
	}

	determineTaskStatus(
		mark: string
	): "completed" | "inProgress" | "abandoned" | "notStarted" {
		const completedMarks =
			this.plugin?.settings.taskStatuses.completed.split("|");
		if (completedMarks.includes(mark)) {
			return "completed";
		}

		const inProgressMarks =
			this.plugin?.settings.taskStatuses.inProgress.split("|");
		if (inProgressMarks.includes(mark)) {
			return "inProgress";
		}

		const abandonedMarks =
			this.plugin?.settings.taskStatuses.abandoned.split("|");
		if (abandonedMarks.includes(mark)) {
			return "abandoned";
		}

		// If not matching any specific status, check if it's a not-started mark
		const notStartedMarks =
			this.plugin?.settings.taskStatuses.notStarted.split("|");
		if (notStartedMarks.includes(mark)) {
			return "notStarted";
		}

		// Default fallback - any unrecognized mark is considered not started
		return "notStarted";
	}

	isCompletedTask(text: string): boolean {
		const markMatch = text.match(/\[(.)]/);
		if (!markMatch || !markMatch[1]) {
			return false;
		}

		const mark = markMatch[1];

		// Priority 1: If useOnlyCountMarks is enabled, only count tasks with specified marks
		if (this.plugin?.settings.useOnlyCountMarks) {
			const onlyCountMarks =
				this.plugin?.settings.onlyCountTaskMarks.split("|");
			return onlyCountMarks.includes(mark);
		}

		// Priority 2: If the mark is in excludeTaskMarks, don't count it
		if (
			this.plugin?.settings.excludeTaskMarks &&
			this.plugin.settings.excludeTaskMarks.includes(mark)
		) {
			return false;
		}

		// Priority 3: Check against the task statuses
		// We consider a task "completed" if it has a mark from the "completed" status
		const completedMarks =
			this.plugin?.settings.taskStatuses.completed.split("|");

		// Return true if the mark is in the completedMarks array
		return completedMarks.includes(mark);
	}

	updateCompletedAndTotalDataview() {
		let completed = 0;
		let inProgress = 0;
		let abandoned = 0;
		let notStarted = 0;
		let total = 0;

		for (let element of this.group.childrenElement) {
			const checkboxElement = element.querySelector(
				".task-list-item-checkbox"
			);
			if (!checkboxElement) continue;

			// For dataview, we need to check the text content
			const textContent = element.textContent?.trim() || "";

			total++;

			// Extract the task mark
			const markMatch = textContent.match(/\[(.)]/);
			if (markMatch && markMatch[1]) {
				const status = this.getTaskStatus(textContent);

				// Count based on status
				if (this.isCompletedTask(textContent)) {
					completed++;
				} else if (status === "inProgress") {
					inProgress++;
				} else if (status === "abandoned") {
					abandoned++;
				} else if (status === "notStarted") {
					notStarted++;
				}
			} else {
				// Fallback to checking if the checkbox is checked
				const checkbox = checkboxElement as HTMLInputElement;
				if (checkbox.checked) {
					completed++;
				} else {
					notStarted++;
				}
			}
		}

		this.completed = completed;
		this.inProgress = inProgress;
		this.abandoned = abandoned;
		this.notStarted = notStarted;
		this.total = total;
	}

	updateCompletedAndTotal() {
		let completed = 0;
		let inProgress = 0;
		let abandoned = 0;
		let notStarted = 0;
		let total = 0;

		for (let element of this.group.childrenElement) {
			const checkboxElement = element.querySelector(
				".task-list-item-checkbox"
			);
			if (!checkboxElement) continue;

			const checkbox = checkboxElement as HTMLInputElement;
			const textContent = element.textContent?.trim() || "";

			// Extract the task mark
			const markMatch = textContent.match(/\[(.)]/);

			total++;

			if (markMatch && markMatch[1]) {
				const status = this.getTaskStatus(textContent);

				// Count based on status
				if (this.isCompletedTask(textContent)) {
					completed++;
				} else if (status === "inProgress") {
					inProgress++;
				} else if (status === "abandoned") {
					abandoned++;
				} else if (status === "notStarted") {
					notStarted++;
				}
			} else if (checkbox.checked) {
				completed++;
			}
		}

		this.completed = completed;
		this.inProgress = inProgress;
		this.abandoned = abandoned;
		this.notStarted = notStarted;
		this.total = total;
	}

	changePercentage() {
		if (this.total === 0) return;

		const completedPercentage =
			Math.round((this.completed / this.total) * 10000) / 100;
		const inProgressPercentage =
			Math.round((this.inProgress / this.total) * 10000) / 100;
		const abandonedPercentage =
			Math.round((this.abandoned / this.total) * 10000) / 100;

		// Set the completed part
		this.progressEl.style.width = completedPercentage + "%";

		// Set the in-progress part (if it exists)
		if (this.inProgressEl) {
			this.inProgressEl.style.width = inProgressPercentage + "%";
			this.inProgressEl.style.left = completedPercentage + "%";
		}

		// Set the abandoned part (if it exists)
		if (this.abandonedEl) {
			this.abandonedEl.style.width = abandonedPercentage + "%";
			this.abandonedEl.style.left =
				completedPercentage + inProgressPercentage + "%";
		}

		// Update the class based on progress percentage
		let progressClass = "progress-bar-inline";

		switch (true) {
			case completedPercentage === 0:
				progressClass += " progress-bar-inline-empty";
				break;
			case completedPercentage > 0 && completedPercentage < 25:
				progressClass += " progress-bar-inline-0";
				break;
			case completedPercentage >= 25 && completedPercentage < 50:
				progressClass += " progress-bar-inline-1";
				break;
			case completedPercentage >= 50 && completedPercentage < 75:
				progressClass += " progress-bar-inline-2";
				break;
			case completedPercentage >= 75 && completedPercentage < 100:
				progressClass += " progress-bar-inline-3";
				break;
			case completedPercentage >= 100:
				progressClass += " progress-bar-inline-complete";
				break;
		}

		// Add classes for special states
		if (inProgressPercentage > 0) {
			progressClass += " has-in-progress";
		}
		if (abandonedPercentage > 0) {
			progressClass += " has-abandoned";
		}

		this.progressEl.className = progressClass;
	}

	changeNumber() {
		if (this.plugin?.settings.addNumberToProgressBar) {
			let text;
			if (this.plugin?.settings.showPercentage) {
				// Calculate percentage of completed tasks
				const percentage =
					Math.round((this.completed / this.total) * 10000) / 100;
				text = `${percentage}%`;
			} else {
				// Show detailed counts if we have in-progress or abandoned tasks
				if (this.inProgress > 0 || this.abandoned > 0) {
					text = `[${this.completed}✓ ${this.inProgress}⟳ ${this.abandoned}✗ / ${this.total}]`;
				} else {
					text = `[${this.completed}/${this.total}]`;
				}
			}

			if (!this.numberEl) {
				this.numberEl = this.progressBarEl.createEl("div", {
					cls: "progress-status",
					text: text,
				});
			} else {
				this.numberEl.innerText = text;
			}
		} else if (this.numberEl) {
			this.numberEl.innerText = `[${this.completed}/${this.total}]`;
		}
	}

	onload() {
		this.progressBarEl = createSpan(
			this.plugin?.settings.addNumberToProgressBar
				? "cm-task-progress-bar with-number"
				: "cm-task-progress-bar"
		);
		this.progressBackGroundEl = this.progressBarEl.createEl("div", {
			cls: "progress-bar-inline-background",
		});

		// Create elements for each status type
		this.progressEl = this.progressBackGroundEl.createEl("div", {
			cls: "progress-bar-inline progress-completed",
		});

		// Only create these elements if we have tasks of these types
		if (this.inProgress > 0) {
			this.inProgressEl = this.progressBackGroundEl.createEl("div", {
				cls: "progress-bar-inline progress-in-progress",
			});
		}

		if (this.abandoned > 0) {
			this.abandonedEl = this.progressBackGroundEl.createEl("div", {
				cls: "progress-bar-inline progress-abandoned",
			});
		}

		if (this.plugin?.settings.addNumberToProgressBar && this.total) {
			let text;
			if (this.plugin?.settings.showPercentage) {
				const percentage =
					Math.round((this.completed / this.total) * 10000) / 100;
				text = `${percentage}%`;
			} else {
				// Show detailed counts if we have in-progress or abandoned tasks
				if (this.inProgress > 0 || this.abandoned > 0) {
					text = `[${this.completed}✓ ${this.inProgress}⟳ ${this.abandoned}✗ / ${this.total}]`;
				} else {
					text = `[${this.completed}/${this.total}]`;
				}
			}

			this.numberEl = this.progressBarEl.createEl("div", {
				cls: "progress-status",
				text: text,
			});
		}

		this.changePercentage();

		return this.progressBarEl;
	}

	onunload() {
		super.onunload();
	}
}
