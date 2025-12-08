---
description: Update PROGRESS.md after completing a task or sprint
allowed-tools: Read, Write, Edit, Bash(git branch --show-current), Bash(git log --oneline -10), AskUserQuestion
---

# Update Project Specifications

Update the specs/PROGRESS.md file to reflect the current state after completing work.

## Pre-Update Questions

Before making updates, ask the user:

1. **Archive current progress?**
   - Would you like to rename the current PROGRESS.md to PROGRESS-{branch-name}.md before creating a fresh one?
   - This preserves the history for the completed branch/sprint
   - The current branch is: (get from `git branch --show-current`)

## Update Process

### Step 1: Gather Current State
- Get current branch name: `git branch --show-current`
- Get recent commits: `git log --oneline -10`
- Read current specs/PROGRESS.md

### Step 2: Archive (if requested)
If user wants to archive:
1. Copy specs/PROGRESS.md to specs/PROGRESS-{branch-name}.md
2. Create a fresh specs/PROGRESS.md

### Step 3: Update PROGRESS.md

Update the following sections based on the work completed:

#### Current Sprint Goal
- Update if the sprint goal has changed
- Mark as complete if finished

#### Branch Status
- Update current branch name
- Update recent commits list

#### Recently Completed Work
- Add new completed items with:
  - Brief description
  - Key changes made
  - Any notable decisions

#### Files Modified This Sprint
- List new files that were modified
- Group by category (Core, API, Tests, etc.)

#### Pending Tasks
- Remove completed tasks
- Add any new tasks discovered
- Update priorities if needed

#### Known Issues
- Remove resolved issues
- Add any new issues discovered

#### Multi-Step Flow State
- Update step completion status
- Add new steps if scope changed

#### Notes for Next Agent
- Update critical context
- Remove outdated notes
- Add any new gotchas or important context

## Content Guidelines

When updating:
- Keep entries concise but informative
- Use consistent formatting (tables, lists)
- Include file paths with line numbers where relevant
- Focus on "what changed" and "why"
- Remove stale information

## After Update

Summarize the changes made to PROGRESS.md:
1. What sections were updated
2. Key items added or removed
3. Any recommendations for next steps
