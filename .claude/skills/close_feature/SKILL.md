---
name: close_feature
description: Close a completed feature by verifying docs, moving to implemented, and committing
user-invocable: true
argument-hint: feature_NNN
---

# Close Feature

Close a completed feature: verify documentation is up to date, move the feature folder to `implemented/`, and commit + push.

## Input

The user provides the feature name as `$ARGUMENTS` (e.g., `feature_023`). If not provided, check `specs/features/` for any non-implemented feature directories and ask the user which one to close.

## Steps

### 1. Validate the feature exists

- Verify that `specs/features/$ARGUMENTS/` exists (NOT in `implemented/`)
- If it doesn't exist, check if it's already in `specs/features/implemented/$ARGUMENTS/` and inform the user it's already closed
- If it doesn't exist anywhere, report an error

### 2. Ensure README.md is updated

- Read the current `README.md` at the project root
- Read the feature's spec files (`specs.md`, `plan.md`, `requirements.md`) to understand what was implemented
- Check if the README.md reflects the changes introduced by this feature
- If the README.md is missing information about the feature's changes, update it accordingly
- Show the user what changes (if any) were made to README.md

### 3. Ensure architecture doc is updated

- Read `specs/architecture/architecture.md`
- Verify that the architecture document reflects any structural changes introduced by this feature
- If updates are needed, make the changes and show the user what was modified

### 4. Ensure feature documentation is up to date

- Read all documentation files in `specs/features/$ARGUMENTS/` (typically `requirements.md`, `plan.md`, `specs.md`)
- Review the actual code changes made for this feature by examining recent git history:
  - Use `git log --oneline` to find commits related to this feature (look for the feature name in commit messages)
  - Use `git diff` against those commits to understand what was actually implemented
- Verify that the documentation accurately reflects what was implemented:
  - `specs.md` should describe the actual technical design that was built
  - `plan.md` should reflect the actual implementation steps taken
  - `requirements.md` should have no remaining `[PLACEHOLDER]` markers
- If any docs need updates, make the changes and show the user what was modified

### 5. Move feature folder to implemented

- Move `specs/features/$ARGUMENTS/` to `specs/features/implemented/$ARGUMENTS/`
- Use `git mv` to preserve git history

### 6. Commit and push

- Stage all changes: the moved feature folder, updated README.md, architecture doc, and any doc updates
- Create a commit with the message: `Move $ARGUMENTS to implemented`
- Push to the remote repository

### 7. Report back

- Confirm the feature has been closed
- List any documentation changes that were made
- Show the commit hash
