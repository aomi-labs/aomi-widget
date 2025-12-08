# Cleanup Markdown Files

Review all `.md` files in the repository root and consolidate essential information into the `specs/` folder.

## Your Task

1. **Scan for markdown files** in the repository root (not in subdirectories like `specs/`, `documents/`, etc.)

2. **For each markdown file found**, determine:
   - Is this a temporary artifact (implementation notes, problem tracking, history)?
   - Does it contain information that should be preserved?
   - Is it duplicating information already in `specs/`?

3. **Categorize the content**:
   - **Domain rules/invariants** → Merge into `specs/DOMAIN.md`
   - **Current state/progress** → Merge into `specs/PROGRESS.md`
   - **Environment/metadata** → Merge into `specs/METADATA.md`
   - **Obsolete/duplicate** → Delete the file

4. **Update specs/PROGRESS.md** with:
   - Any pending tasks found in the cleaned files
   - Recent progress/changes documented in those files
   - Notes for the next agent

5. **Delete cleaned files** after merging their essential content

## Files to Review

Look for files like:
- `IMPLEMENTATION_COMPLETE.md`
- `PROBLEM-*.md`
- `SSE-TITLE-UPDATE.md`
- `history.md`
- `SESSION-*.md`
- Any other `.md` files in root

## Files to KEEP (do not delete)

- `README.md` - Project readme
- `CLAUDE.md` - Claude Code instructions
- `specs/*.md` - The target spec files
- `documents/**/*.md` - RAG documentation

## Output

After cleanup:
1. List files that were deleted
2. List files that were kept and why
3. Summarize what was merged into each spec file
4. Confirm `specs/PROGRESS.md` is up to date with pending tasks
