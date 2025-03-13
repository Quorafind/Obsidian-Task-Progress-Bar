# Task Genius Settings Guide

This guide explains all configuration options available in Task Genius (formerly Obsidian Task Progress Bar), with examples of how each setting affects functionality.

## Accessing Settings

1. Open Obsidian Settings by clicking the gear icon in the lower left corner
2. Navigate to Community Plugins
3. Find "Task Genius" in the list
4. Click the gear icon next to it to access plugin settings

## Basic Settings

### Progress Bar Display

#### Add progress bar to Heading
- **Description**: Adds progress bars to headings to show completion status of all tasks beneath them.
- **Default**: Enabled
- **Example**:
  ```markdown
  ## Project Tasks [2/5]
  
  - [x] Task 1
  - [x] Task 2
  - [ ] Task 3
  - [ ] Task 4
  - [ ] Task 5
  ```

#### Enable heading progress bars
- **Description**: Controls whether progress bars are displayed for headings.
- **Default**: Enabled
- **Use Case**: Disable this if you want to track task progress but don't want headings to show progress bars.

#### Add number to progress bar
- **Description**: Shows the completed/total count next to progress bars.
- **Default**: Enabled
- **Example**: `[3/5]` instead of just a visual progress bar

#### Show percentage
- **Description**: Displays completion percentage in the progress bar.
- **Default**: Enabled
- **Example**: `[3/5] 60%` or with custom progress ranges: `[3/5] Making progress 60%`

#### Count sub children level of current Task
- **Description**: Includes nested subtasks in progress calculation.
- **Default**: Enabled
- **Example**:
  ```markdown
  - [ ] Main task [1/3]
      - [x] Subtask 1
      - [ ] Subtask 2
          - [ ] Sub-subtask 1
          - [ ] Sub-subtask 2
      - [ ] Subtask 3
  ```
  With this setting enabled, the progress counts all levels of nested tasks.

### Task Behavior

#### Auto complete parent task
- **Description**: Automatically marks parent tasks as complete when all subtasks are completed.
- **Default**: Enabled
- **Example**:
  ```markdown
  - [ ] Main task
      - [x] Subtask 1
      - [x] Subtask 2
  ```
  Would automatically become:
  ```markdown
  - [x] Main task
      - [x] Subtask 1
      - [x] Subtask 2
  ```

#### Mark parent in progress when partially complete
- **Description**: Changes parent task status to "in progress" when some (but not all) subtasks are completed.
- **Default**: Enabled
- **Example**:
  ```markdown
  - [ ] Main task
      - [x] Subtask 1
      - [ ] Subtask 2
  ```
  Would automatically become:
  ```markdown
  - [/] Main task
      - [x] Subtask 1
      - [ ] Subtask 2
  ```

## Task Status Settings

### Task Markers Configuration

#### Completed task markers
- **Description**: Characters that represent completed tasks.
- **Default**: `x|X`
- **Example**: Tasks marked with `[x]` or `[X]` count as completed.

#### In progress task markers
- **Description**: Characters that represent tasks in progress.
- **Default**: `/`
- **Example**: Tasks marked with `[/]` are counted as in progress.

#### Abandoned task markers
- **Description**: Characters that represent abandoned or canceled tasks.
- **Default**: `-`
- **Example**: Tasks marked with `[-]` are counted as abandoned.

#### Not started task markers
- **Description**: Characters that represent tasks not yet started.
- **Default**: ` |!|?|*|n|l|i|I|S|p|c|b|\"|0|1|2|3|4|5|6|7|8|9`
- **Example**: Tasks marked with `[ ]`, `[?]`, `[!]`, etc. count as not started.

#### Count other statuses as
- **Description**: Determines how to count task statuses not explicitly defined.
- **Default**: "Not Started"
- **Options**: Not Started, In Progress, Completed, Abandoned, Don't Count
- **Use Case**: If you have custom task markers not explicitly defined, this setting determines how they affect progress calculation.

### Task Filtering

#### Exclude specific task markers
- **Description**: Specify task markers to exclude from counting in progress calculations.
- **Default**: Empty (counts all markers)
- **Example**: Setting this to `?` would exclude tasks with `[?]` from progress calculations.
- **Use Case**: Exclude tentative or question tasks from affecting progress bars.

#### Only count specific task markers
- **Description**: Toggle to only count specific task markers instead of all markers.
- **Default**: Disabled
- **Use Case**: When you want to track only certain types of tasks.

#### Specific task markers to count
- **Description**: If "Only count specific task markers" is enabled, specify which markers to count.
- **Default**: `-`
- **Example**: Setting this to `x|/` would only count completed and in-progress tasks.
- **Use Case**: When you want progress to reflect only certain task states.

## Conditional Display Settings

### Hide progress bars based on conditions
- **Description**: Enable hiding progress bars based on tags, folders, or metadata.
- **Default**: Enabled
- **Use Case**: Hide progress bars in certain types of notes where they're not relevant.

### Hide by tags
- **Description**: Specify tags that will hide progress bars (comma-separated, without #).
- **Default**: `no-progress-bar`
- **Example**: Adding `#no-progress-bar` to a note will hide all progress bars in that note.
- **Use Case**: Quickly toggle progress bar visibility for specific notes.

### Hide by folders
- **Description**: Specify folder paths that will hide progress bars.
- **Default**: Empty
- **Example**: Setting this to `Journal, Meeting Notes` would hide progress bars in all notes in those folders.
- **Use Case**: Hide progress bars in categories of notes where they're not helpful.

### Hide by metadata
- **Description**: Specify frontmatter metadata that will hide progress bars.
- **Default**: `hide-progress-bar`
- **Example**:
  ```markdown
  ---
  hide-progress-bar: true
  ---
  ```
  This frontmatter would hide progress bars in the note.
- **Use Case**: Programmatically control progress bar visibility based on note properties.

## Progress Visualization

### Customize progress ranges
- **Description**: Enable custom text for different progress percentage ranges.
- **Default**: Enabled
- **Use Case**: Add context or encouragement based on completion percentage.

### Progress ranges
- **Description**: Define custom text for different percentage ranges.
- **Default Ranges**:
  - 0-20%: "Just started {{PROGRESS}}%"
  - 20-40%: "Making progress {{PROGRESS}}%"
  - 40-60%: "Half way {{PROGRESS}}%"
  - 60-80%: "Go ahead {{PROGRESS}}%"
  - 80-95%: "Finally {{PROGRESS}}%"
  - 99-100%: "DONE"
- **Example**: A task that is 30% complete would show "Making progress 30%" instead of just "30%".
- **Customization**: You can edit these ranges and messages in the settings to match your preferred workflow and language.

## Task Status Cycling

### Enable task status switcher
- **Description**: Allow cycling through task statuses by clicking on the checkbox.
- **Default**: Enabled
- **Use Case**: Quickly update task status without typing.

### Task status cycle
- **Description**: Define the sequence of statuses to cycle through when clicking a task checkbox.
- **Default**: TODO → DOING → IN-PROGRESS → DONE
- **Example**: You could customize this to cycle through TODO → WAITING → IN-PROGRESS → REVIEW → DONE
- **Use Case**: Match the cycle to your specific workflow steps.

### Task status marks
- **Description**: Define the characters that represent each task status in the cycle.
- **Default**:
  - TODO: ` ` (space)
  - DOING: `-`
  - IN-PROGRESS: `/`
  - DONE: `x`
- **Example**: When cycling from TODO to DOING, the task changes from `[ ]` to `[-]`.
- **Use Case**: Visually represent different stages of task completion.

### Exclude marks from cycle
- **Description**: Specify task statuses to exclude from the cycling sequence.
- **Default**: `DOING`
- **Example**: With this default, clicking a task in DOING status will skip to IN-PROGRESS.
- **Use Case**: Skip intermediate statuses that you don't frequently use.

### Enable cycle complete status
- **Description**: Allow cycling back to incomplete after reaching complete status.
- **Default**: Enabled
- **Example**: With this enabled, clicking a completed task `[x]` would cycle back to `[ ]`.
- **Use Case**: Easily reopen completed tasks when needed.

### Always cycle new tasks
- **Description**: Automatically assign the first cycle status to newly created tasks.
- **Default**: Enabled
- **Use Case**: Ensure consistent task status for all new tasks.

### Allow alternate task status
- **Description**: Allow alternative syntax for task statuses.
- **Default**: Disabled
- **Example**: When enabled, `(x)` could be recognized as equivalent to `[x]`.
- **Use Case**: Support different task marking styles or imported content. 
