# Obsidian Task Progress Bar

A plugin for showing task progress bar near the tasks bullet or headings.

![example](./media/example.gif)

# Usage

For example, when you create a task list like this:

```markdown
- [ ] task1 [ ] [0/1] // Here is the progress bar
	- [ ] task2 // Indent by press tab
```

When you finished the task2,

```markdown
- [ ] task1 [|] [1/1] // The progress bar will be updated
	- [x] task2 // Indent by press tab
```

## Settings

### Basic Settings

1. **Add progress bar to Heading**: Make the Heading showing the task progress bars.
2. **Enable heading progress bars**: Add progress bars to headings to show progress of all tasks under that heading.
3. **Add number to progress bar**: You can see the total/completed number of tasks.
4. **Show percentage**: Display the completion percentage in the progress bar.
5. **Count sub children level of current Task**: Allow the plugin to count sub-tasks in the progress calculation.

### Task Status Settings

You can customize which characters represent different task statuses, or choose from predefined collections.

1. **Completed task markers**: Characters that represent completed tasks (default: `x|X`).
2. **Planned task markers**: Characters that represent planned tasks (default: `?`).
3. **In progress task markers**: Characters that represent tasks in progress (default: `>|/`).
4. **Abandoned task markers**: Characters that represent abandoned tasks (default: `-`).
5. **Not started task markers**: Characters that represent not started tasks (default: space ` `).
6. **Count other statuses as**: Choose which category to count other statuses as.

### Task Counting Settings

1. **Exclude specific task markers**: Specify task markers to exclude from counting (e.g., `?|/`).
2. **Only count specific task markers**: Toggle to only count specific task markers.
3. **Specific task markers to count**: If the above option is enabled, specify which task markers to count.

### Conditional Progress Bar Display

1. **Hide progress bars based on conditions**: Enable hiding progress bars based on tags, folders, or metadata.
2. **Hide by tags**: Specify tags that will hide progress bars (comma-separated, without #).
3. **Hide by folders**: Specify folder paths that will hide progress bars.
4. **Hide by metadata**: Specify frontmatter metadata that will hide progress bars.

## How to Install

### From Plugin Market in Obsidian

💜: Directly install from Obsidian Market.

### Download Manually

🚚: Download the latest release. Extract and put the three files (main.js, manifest.json, styles.css) to
folder `{{obsidian_vault}}/.obsidian/plugins/Obsidian-Task-Progress-Bar`.

## Say Thank You

If you are enjoy using Obsidian-Task-Progress-Bar then please support my work and enthusiasm by buying me a coffee
on [https://www.buymeacoffee.com/boninall](https://www.buymeacoffee.com/boninall).

<a href="https://www.buymeacoffee.com/boninall"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=boninall&button_colour=6495ED&font_colour=ffffff&font_family=Lato&outline_colour=000000&coffee_colour=FFDD00"></a>
