---
name: develop_feature
description: Start developing a feature that has specs.md, and plan.md ready
user-invocable: true
argument-hint: feature_NNN
---

# Start Feature Development

Begin implementing a feature whose specification documents are already prepared and reviewed.

## Input

The user provides the feature name as `$ARGUMENTS` (e.g., `feature_031`). If not provided, list all non-implemented feature directories under `specs/features/` and ask the user which one to start.

## Steps

### 1. Validate the feature exists and is ready for development

- Verify that `specs/features/$ARGUMENTS/` exists (NOT in `implemented/`)
- If the directory doesn't exist:
  - Check if it's already in `specs/features/implemented/$ARGUMENTS/` and inform the user it's already implemented
  - If it doesn't exist anywhere, report an error and suggest using `/create_feature` first
- Verify all three required documents exist inside `specs/features/$ARGUMENTS/`:
  - `requirements.md` — If missing, report error: "requirements.md not found. Use `/create_feature` to scaffold the feature first."
  - `specs.md` — If missing, report error: "specs.md not found. Create the technical specification before starting development." and stop processing
  - `plan.md` — If missing, report error: "plan.md not found. Create the implementation plan before starting development." and stop processing
- If any document is missing, stop and report ALL missing documents at once (don't stop at the first one)

### 2. Read and understand the feature documentation

- Read `specs/features/$ARGUMENTS/requirements.md` fully
- Read `specs/features/$ARGUMENTS/specs.md` fully
- Read `specs/features/$ARGUMENTS/plan.md` fully
- Also read any additional documentation files in the feature folder (e.g., `fields.md`, `instructions.md`, etc.)
- Check `requirements.md` for remaining `[PLACEHOLDER]` markers — if any exist, warn the user that the requirements may be incomplete and ask whether to proceed

### 3. Analyze the plan and create a task list

- Parse `plan.md` to identify all implementation phases/steps
- Create a structured task list (using TaskCreate) with one task per major step or phase from the plan
- Set up task dependencies where steps must be sequential (using addBlockedBy/addBlocks)
- Present the task list to the user for confirmation before starting
- If possible, use multiple subagents to work on different tasks in parallel, while respecting dependencies (e.g., frontend and backend tasks can often be done simultaneously)

### 4. Execute the plan

- Work through each task in order, following `plan.md` step by step
- For each task:
  - Mark the task as `in_progress` before starting
  - Follow the specific instructions in `plan.md` for that step
  - Refer to `specs.md` for technical details and design decisions
  - Mark the task as `completed` when done
- After completing backend changes, verify the backend starts without errors:
  ```bash
  cd backend && uv run python -c "from app.main import app; print('Backend OK')"
  ```
- After completing frontend changes, verify the frontend builds without errors:
  ```bash
  cd frontend && npm run build
  ```

### 5. Post-implementation verification

- Review all changes made against `specs.md` to verify nothing was missed
- Run any tests or verification steps mentioned in the plan
- Ensure no existing functionality was broken

### 6. Report back

- Summarize what was implemented
- List all files that were created or modified
- Note any deviations from the plan and why they were necessary
- Remind the user to:
  - Review the changes
  - Test the feature manually
