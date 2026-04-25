# Technical Specifications — feature_003

## Default `fecha_prevista` to today in the "Crear tarea" form

## 1. Scope

This feature changes only the frontend "Crear tarea" form behavior. When the modal opens in **create** mode, the **Fecha prevista** input is pre-populated with **today's date** (in the user's local timezone). The user can still edit the field before submitting, and validation is unchanged.

Out of scope:
- The **Editar tarea** mode is unaffected — it continues to load the existing tarea's `fecha_prevista`.
- The backend remains unchanged. `fecha_prevista` is still a required field in `TareaCreate`; the frontend will always send a value.
- No DB schema, no API surface change, no `.env` change, no logging change beyond what the backend already does for `POST /api/tareas`.

## 2. Affected files

| File | Change |
|------|--------|
| `frontend/src/features/tareas/TareaModal.tsx` | Update `emptyState()` so `fecha_prevista` defaults to today (`YYYY-MM-DD`) instead of `""`. |
| `README.md` | Mention the new default in the "Crear tarea" usage section if/where the form is described. |
| `specs/architecture/architecture.md` | No structural change required; add a brief note under the frontend section if useful. |

No other module is touched.

## 3. Design decisions

### 3.1 Today is computed in the user's local timezone

The HTML `<input type="date">` value is a calendar date string `YYYY-MM-DD` with no timezone. The user's mental model of "today" is their local calendar day (the same day the date picker shows when they open it). We therefore compute today using the browser's local timezone, not UTC, to avoid the off-by-one near midnight UTC.

Implementation: a small helper

```ts
function todayLocalISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
```

We deliberately do **not** use `new Date().toISOString().slice(0, 10)` because that returns the UTC date, which is wrong for users west of UTC late in the day.

### 3.2 Default is computed at modal open time, not at module load

`emptyState()` is called from inside the `useEffect` that fires on `open` transitions, so today is recomputed every time the modal is opened. This handles the (rare) case where the app stays open across midnight.

### 3.3 Editing is preserved

The "edit" branch of the existing `useEffect` still calls `fromTarea(t)` and is not touched, so editing an existing tarea continues to show its stored `fecha_prevista`.

### 3.4 The user can still clear or change the date

The user remains free to pick any date. Validation in `validate()` (line 104–106) still rejects an empty `fecha_prevista` with "La fecha prevista es obligatoria" — no change. We are pre-filling, not locking.

### 3.5 No timezone configuration

Today is resolved from the browser; no `.env` setting is added. The spec's general "all configuration in `.env`" rule applies to backend configuration; this is a pure UI default and adding a setting for it would be over-engineering for a one-line behavior change.

## 4. Backwards compatibility

- Existing tareas continue to display their stored `fecha_prevista` in edit mode.
- The backend contract is unchanged; the field is still required and always sent.
- Existing frontend tests / build checks should continue to pass.

## 5. Verification

1. `cd frontend && npm run build` — must succeed.
2. Manual smoke:
   - Open the app, click **Crear tarea** → the **Fecha prevista** field shows today's date.
   - Submit without changing the date → tarea is created with today's `fecha_prevista`.
   - Open **Editar tarea** on an existing tarea with a different date → the existing date is shown (not today).
   - Change the date in the create form to a different date → the chosen date is what gets persisted.
