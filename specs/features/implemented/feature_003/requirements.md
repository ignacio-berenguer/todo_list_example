# Requirements Prompt for feature_003

I have a new feature request. Follow the "Architect First" protocol: create spec.md and plan.md before writing code. Notify me when the documents are ready.

Please create a './specs/features/feature_003/specs.md' and './specs/features/feature_003/plan.md' in order to do that.

## Feature Brief

In the create Tarea I want that the default date is today.

## User Story

As a user creating a new Tarea, I want the date field to default to today's date so that I don't have to manually pick it for the common case.

## Key Requirements

### Requirement 1: Default date in create Tarea form

When the user opens the "create Tarea" form in the frontend, the date input should be pre-populated with today's date by default. The user can still change it to any other valid date before submitting.

### Requirement 2: Scope

The "date" referred to in Requirement 1 is `fecha_prevista` (the only date field on tareas). The default is applied **frontend-side only**, in the create modal. The backend contract is unchanged: `fecha_prevista` remains a required field in `TareaCreate`, and the frontend always sends a value.

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
