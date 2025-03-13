# Task Genius Usage Guide

This guide provides detailed instructions on how to use Task Genius (formerly Obsidian Task Progress Bar) with practical examples and use cases.

## Core Features

Task Genius offers several key features to enhance your task management in Obsidian:

1. **Task Progress Bars**: Visualize completion status of tasks and subtasks
2. **Task Status Cycling**: Easily cycle through different task statuses
3. **Comprehensive Task Tracking**: Track progress at both task and heading levels

## Task Progress Bars

### Basic Usage

When you create a task with subtasks, Task Genius automatically adds a progress bar showing completion status:

```markdown
- [ ] Prepare presentation [0/3]
    - [ ] Research topic
    - [ ] Create slides
    - [ ] Practice delivery
```

As you complete subtasks by checking them:

```markdown
- [ ] Prepare presentation [2/3]
    - [x] Research topic
    - [x] Create slides
    - [ ] Practice delivery
```

The progress bar updates automatically to show completion status.

### Heading Progress Bars

When the "Add progress bar to Heading" setting is enabled, headings will display progress of all tasks beneath them:

```markdown
## Project Alpha [1/4]

- [x] Initial research
- [ ] Design phase
    - [ ] Create wireframes
    - [ ] Get feedback
- [ ] Development
- [ ] Testing
```

This is particularly useful for tracking progress of project sections or categories of tasks.

### Use Case: Project Management

For a large project with multiple phases:

```markdown
# Website Redesign Project [2/5]

## Planning Phase [3/3]
- [x] Identify goals and requirements
- [x] Analyze current website
- [x] Define target audience

## Design Phase [2/4]
- [x] Create wireframes
- [x] Design visual mockups
- [ ] Review with stakeholders
- [ ] Finalize designs

## Development Phase [0/3]
- [ ] Develop frontend
- [ ] Implement backend functionality
- [ ] Integrate with existing systems

## Testing Phase [0/3]
- [ ] Conduct functionality testing
- [ ] Perform usability testing
- [ ] Fix identified issues

## Launch Phase [0/2]
- [ ] Deploy to production
- [ ] Post-launch monitoring
```

This structure gives you a clear visual indication of overall project progress and progress within each phase.

## Task Status Cycling

Task Genius allows you to cycle through different task statuses by clicking on the task checkbox.

### Basic Status Cycle

By default, tasks cycle through these statuses:
- `[ ]` (TODO)
- `-` (DOING)
- `/` (IN-PROGRESS)
- `[x]` (DONE)

### Use Case: Complex Workflow Tracking

When working on a complex project with multiple stages:

```markdown
## Article Writing Process

- [/] Research topic
    - [x] Identify key themes
    - [x] Gather statistics
    - [ ] Find case studies
- [ ] Draft article
- [ ] Editorial review
- [ ] Publish and promote
```

In this example:
- Research is marked as "in progress" (`/`)
- Some subtasks are completed
- Other tasks are not yet started

### Use Case: Daily Planning

For daily planning with different states of completion:

```markdown
## Today's Tasks

- [x] Morning routine
- [/] Work on Task Genius documentation
    - [x] Create outline
    - [x] Write usage examples
    - [ ] Add screenshots
- [-] Team meeting preparation
- [ ] Exercise
- [ ] Evening review
```

Here:
- Completed tasks show as `[x]`
- In-progress tasks show as `[/]`
- Tasks you've started but paused show as `[-]`

## Conditional Display

You can hide progress bars based on tags, folders, or metadata, which is useful for specific note types:

### Use Case: Personal vs. Work Tasks

```markdown
---
type: personal
hide-progress-bar: true
---

# Personal Journaling

- [ ] Reflect on yesterday
- [ ] Set intentions for today
- [ ] Note three gratitudes
```

In this example, progress bars are hidden for this personal reflection note through the `hide-progress-bar` metadata.

### Use Case: Reading Notes with #no-progress-bar Tag

```markdown
# Book Notes #no-progress-bar

- [ ] Chapter 1 summary
- [ ] Chapter 2 summary
- [ ] Write key takeaways
```

The `#no-progress-bar` tag hides progress bars in this note, which is appropriate for notes where progress tracking isn't the main focus.

## Customized Progress Messages

With the "Customize Progress Ranges" setting, you can show different messages based on completion percentage:

```markdown
## Sprint Tasks [3/10]
<!-- Shows "Making progress 30%" instead of just "30%" -->

## Project Documentation [8/10]
<!-- Shows "Finally 80%" -->

## Code Review [10/10]
<!-- Shows "DONE" -->
```

This adds context and motivation as you progress through your tasks. 
