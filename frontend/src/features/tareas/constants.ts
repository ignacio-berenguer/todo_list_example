import type { ColumnKey, Estado, Responsable, SortField } from "./types";

export const ESTADOS: { value: Estado; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "iniciada", label: "Iniciada" },
  { value: "completado", label: "Completada" },
];

export const RESPONSABLES: Responsable[] = [
  "Nacho",
  "Gonzalo",
  "María",
  "Papá",
  "Mamá",
];

export interface ColumnDef {
  key: ColumnKey;
  label: string;
  sortable: boolean;
  sortField?: SortField;
}

export const COLUMNAS: ColumnDef[] = [
  {
    key: "descripcion",
    label: "Descripción",
    sortable: true,
    sortField: "descripcion",
  },
  {
    key: "fecha_prevista",
    label: "Fecha prevista",
    sortable: true,
    sortField: "fecha_prevista",
  },
  {
    key: "estado",
    label: "Estado",
    sortable: true,
    sortField: "estado",
  },
  {
    key: "responsable",
    label: "Responsable",
    sortable: true,
    sortField: "responsable",
  },
  { key: "notas", label: "Notas", sortable: false },
  {
    key: "fecha_creacion",
    label: "Creada",
    sortable: true,
    sortField: "fecha_creacion",
  },
  {
    key: "fecha_actualizacion",
    label: "Actualizada",
    sortable: true,
    sortField: "fecha_actualizacion",
  },
];

export const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  "descripcion",
  "fecha_prevista",
  "estado",
  "responsable",
];

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_SORT_FIELD: SortField = "fecha_prevista";
export const DEFAULT_SORT_ORDER = "asc" as const;

export const COLUMN_PREFS_STORAGE_KEY = "tareas:visibleColumns";
