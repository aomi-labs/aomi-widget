---
description: Read project specs to understand architecture, domain rules, and current progress
allowed-tools: Read, Glob
---

# Read Project Specifications

Read and internalize the project specifications to understand the codebase before working on tasks.

## Required Reading

Read the following spec files in order:

### 1. Domain Logic (specs/DOMAIN.md)
Contains immutable truths of the system:
- Architecture decisions and rationale
- Invariants that must never be violated
- Constraints for blockchain, LLM, and concurrency
- Naming conventions and idioms
- API design and testing rules
- Agent behavioral rules

### 2. Environment Metadata (specs/METADATA.md)
Contains factual environment information:
- Tooling versions
- Repository file tree
- Key dependencies
- Environment variables
- Port mappings
- Database schema
- API endpoints
- Build commands

### 3. Current Progress (specs/PROGRESS.md)
Contains temporary sprint/task state:
- Current sprint goal
- Branch status and recent commits
- Recently completed work
- Files modified this sprint
- Pending tasks
- Known issues
- Notes for next agent

## Focus Area

$ARGUMENTS

If a focus area is specified above, pay special attention to sections related to that topic. For example:
- "session management" → Focus on session invariants, SessionState patterns, and related idioms
- "tools" → Focus on tool registration patterns, ToolScheduler, and tool execution invariants
- "database" → Focus on database schema, store traits, and database access patterns
- "api" → Focus on API endpoints, response types, and REST design rules

## After Reading

After reading the specs, summarize:
1. **Key constraints** relevant to the current task
2. **Patterns to follow** from the idioms section
3. **Current state** from PROGRESS.md that may affect the work
4. Any **potential conflicts** between the task and existing invariants

Do NOT make any changes to the specs files during this command - this is read-only.
