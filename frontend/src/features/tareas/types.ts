export type Estado = "pendiente" | "completado";

export type Responsable = "Nacho" | "Gonzalo" | "María" | "Papá" | "Mamá";

export interface Tarea {
  id: number;
  descripcion: string;
  fecha_prevista: string; // YYYY-MM-DD
  estado: Estado;
  responsable: Responsable;
  notas: string | null;
  fecha_creacion: string; // ISO timestamp
  fecha_actualizacion: string; // ISO timestamp
}

export interface TareaCreate {
  descripcion: string;
  fecha_prevista: string;
  estado: Estado;
  responsable: Responsable;
  notas: string | null;
}

export type TareaUpdate = Partial<TareaCreate>;

export interface TareaListResponse {
  items: Tarea[];
  total: number;
  page: number;
  page_size: number;
}

export type SortField =
  | "descripcion"
  | "fecha_prevista"
  | "estado"
  | "responsable"
  | "fecha_creacion"
  | "fecha_actualizacion";

export type SortOrder = "asc" | "desc";

export interface TareaFilters {
  descripcion?: string;
  estado?: Estado;
  responsable?: Responsable;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface TareaQueryParams extends TareaFilters {
  sort: SortField;
  order: SortOrder;
  page: number;
  page_size: number;
}

export type ColumnKey =
  | "descripcion"
  | "fecha_prevista"
  | "estado"
  | "responsable"
  | "notas"
  | "fecha_creacion"
  | "fecha_actualizacion";
