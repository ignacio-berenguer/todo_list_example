---
name: create_feature
description: Create a new feature folder with requirements document following the project template
user-invocable: true
argument-hint: [brief description of the feature]
---

# Create Feature

Scaffold a new feature spec folder under `specs/features/` with a `requirements.md` document.

## Steps

1. **Determine the next feature number:**
   - List all directories matching `feature_*` in both `specs/features/` and `specs/features/implemented/`
   - Find the highest NNN across all feature directories
   - The new feature number is highest + 1, zero-padded to 3 digits

2. **Create the feature directory:**
   - Create `specs/features/feature_NNN/`
   - This directory lives at the top level of `specs/features/`, NOT inside `implemented/`
   - Features are moved to `implemented/` only after they are fully done

3. **Create `requirements.md`** inside the new directory using this template:

```markdown
# Requirements Prompt for feature_NNN

I have a new feature request. Follow the "Architect First" protocol: create spec.md and plan.md before writing code. Notify me when the documents are ready.

Please create a './specs/features/feature_NNN/specs.md' and './specs/features/feature_NNN/plan.md' in order to do that.

## Feature Brief

$ARGUMENTS

## User Story

As a user, I want to [PLACEHOLDER - describe what the user wants to achieve].

## Key Requirements

### Requirement 1: [PLACEHOLDER - title]

[PLACEHOLDER - describe the requirement in detail]

### General Requirements

- The architecture should follow the file specs/architecture/architecture.md
- Update the README.md document after all the changes are done.
- Update the architecture doc (specs/architecture/architecture.md) after all the changes are done.
- All the configuration needed should be stored in a .env file
- All the operations should be logged to a log file configured in .env file. The default debugging level will be INFO but it can be changed in the .env file
- The most important operations will be also logged to the console

## Constraints

- The existing application functionality from previous versions should be maintained as is, except for the changes in this feature.

## Final instructions

Analyze the current codebase and let me know when the docs are ready for review. Do not start making any modifications to the code until I review the documents and explicitly say so.
```

4. **Fill in what you can** from the `$ARGUMENTS` provided by the user:
   - Always fill in the Feature Brief with the user's description
   - Fill in the User Story if the description is clear enough
   - Fill in Requirement titles and descriptions if specific requirements were mentioned
   - Leave `[PLACEHOLDER - ...]` markers for anything not specified so the user can complete them

5. **Report back** to the user:
   - Show the feature number assigned
   - Show the path to the created `requirements.md`
   - Tell the user to review and edit the requirements before proceeding
