# Task Genius Tips and Troubleshooting

This guide provides useful tips, tricks, and solutions to common issues when using Task Genius.

## Tips and Tricks

### Effective Organization

1. **Use Consistent Task Structure**
   - Maintain a consistent task structure throughout your notes to make the most of progress tracking
   - Example: Main task → Subtasks → Sub-subtasks

2. **Leverage Heading Levels for Project Hierarchy**
   - Use heading levels to create a natural project hierarchy
   - Top-level headings for major projects
   - Second-level headings for project phases
   - Third-level headings for detailed components

3. **Combine with Other Plugins**
   - Task Genius works well with other task-oriented plugins
   - Dataview for custom task queries and dashboards
   - Calendar for timeline views of tasks
   - Kanban for visual task boards

### Performance Optimization

1. **Limit Progress Bars in Very Large Documents**
   - For extremely large documents (hundreds of tasks), consider using the `#no-progress-bar` tag
   - Apply it selectively to sections that don't need visual progress tracking

2. **Use Folders for Organization**
   - Create dedicated folders for different types of task notes
   - Example: `/projects`, `/daily`, `/areas`
   - Configure the "Hide by folders" setting for folders where progress bars aren't needed

3. **Task Status Cycling Keyboard Shortcuts**
   - Use the Command Palette to assign keyboard shortcuts to task status actions
   - This allows for quick status updates without using the mouse

### Advanced Usage

1. **Custom CSS Snippets**
   - Customize the appearance of progress bars using CSS snippets
   - Example to change the progress bar color:
   ```css
   .task-progress-bar {
     background-color: #4CAF50; /* Change to your preferred color */
   }
   ```

2. **Task Templates**
   - Create templates for common task structures
   - Use the Templater plugin to insert these structures quickly
   - Example template for a weekly review:
   ```markdown
   # Weekly Review - {{date:YYYY-MM-DD}}
   
   ## Completed Tasks [0/0]
   
   ## In Progress [0/0]
   
   ## Planned for Next Week [0/0]
   
   ## Notes
   ```

3. **Task Filtering with Tags**
   - Use tags to categorize tasks
   - Examples: #high-priority, #waiting, #delegated
   - Combine with Dataview queries to create filtered task lists

## Troubleshooting

### Progress Bars Not Showing

1. **Check Plugin Settings**
   - Ensure Task Genius is enabled
   - Verify that progress bar display settings are enabled

2. **Check Conditional Display Settings**
   - Verify that the note doesn't contain tags set in "Hide by tags"
   - Check that the note isn't in a folder set in "Hide by folders"
   - Ensure the note doesn't have frontmatter set in "Hide by metadata"

3. **Check Task Format**
   - Tasks must use the standard Markdown format: `- [ ] Task description`
   - Ensure there's a space between the dash and opening bracket
   - Ensure there's a space after the closing bracket

### Incorrect Progress Calculation

1. **Check Task Status Markers**
   - Review the "Task Status Settings" to ensure task markers are correctly defined
   - Verify which characters represent completed, in-progress, and not started tasks

2. **Check Task Filtering Settings**
   - Review "Exclude specific task markers" and "Only count specific task markers" settings
   - These may affect which tasks are included in progress calculations

3. **Nested Task Counting**
   - Verify the "Count sub children level of current Task" setting
   - This determines whether nested subtasks are included in progress calculations

### Task Status Cycling Issues

1. **Cycle Not Working**
   - Check if "Enable task status switcher" is enabled
   - Verify your task status cycle order in the settings

2. **Skipping Statuses**
   - Check "Exclude marks from cycle" setting
   - Tasks may skip statuses listed in this setting

3. **Wrong Status Characters**
   - Verify the "Task status marks" settings
   - Ensure each status has the correct character assigned

## Common Questions

### Q: Can I use Task Genius with Live Preview mode?
A: Yes, Task Genius fully supports Obsidian's Live Preview mode.

### Q: Does Task Genius work with mobile Obsidian?
A: Yes, the plugin works on both desktop and mobile versions of Obsidian.

### Q: Can I customize the appearance of progress bars?
A: Yes, you can use custom CSS snippets to change colors, sizes, and other visual aspects.

### Q: Will Task Genius affect the performance of my vault?
A: For most vaults, the impact is minimal. In very large vaults with thousands of tasks, you might notice slight delays when opening notes with many tasks.

### Q: Can I use Task Genius with tasks created by other plugins?
A: As long as tasks follow the standard Markdown checkbox format, Task Genius should work with them. 
