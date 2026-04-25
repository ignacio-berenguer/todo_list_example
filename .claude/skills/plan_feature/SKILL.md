---
name: plan_feature
description: Plan a feature that has requirements.md ready
user-invocable: true
argument-hint: feature_NNN
---

# Plan Feature Development

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
  - `requirements.md` — If missing, report error: "requirements.md not found". Stop processing and indicate the user "to use `/create_feature` to scaffold the feature first."
- If any document is missing, stop and report ALL missing documents at once (don't stop at the first one)

### 2. Read and understand the feature requirements

- Read `specs/features/$ARGUMENTS/requirements.md` fully
- Also read any additional documentation files in the feature folder (e.g., `fields.md`, `instructions.md`, etc.)
- Check `requirements.md` for remaining `[PLACEHOLDER]` markers — if any exist, warn the user that the requirements may be incomplete and ask whether to proceed

### 3. Analyze the requirements and create a specs.md

- Read the requirements and create a `specs.md` file that translates the requirements into technical specifications, design decisions, and implementation details

### 4. Analyze the specs and create a plan.md

- Read the specs and create a `plan.md` file that breaks down the implementation into clear, actionable steps or phases

### 6. Report back

- Summarize what was done in `specs.md` and `plan.md`
- List all files that were created or modified
- Note any deviations from the requirements and why they were necessary
- Remind the user to:
  - Review the changes
  - Use `/develop_feature $ARGUMENTS` when satisfied to start the implementation of the feature
