import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Tarea,
  TareaCreate,
  TareaListResponse,
  TareaQueryParams,
  TareaReorderRequest,
  TareaUpdate,
} from "./types";

function buildQueryString(params: TareaQueryParams): string {
  const search = new URLSearchParams();
  if (params.descripcion) search.set("descripcion", params.descripcion);
  if (params.estado) search.set("estado", params.estado);
  if (params.responsable) search.set("responsable", params.responsable);
  if (params.fecha_desde) search.set("fecha_desde", params.fecha_desde);
  if (params.fecha_hasta) search.set("fecha_hasta", params.fecha_hasta);
  search.set("sort", params.sort);
  search.set("order", params.order);
  search.set("page", String(params.page));
  search.set("page_size", String(params.page_size));
  return search.toString();
}

export function useTareasQuery(params: TareaQueryParams) {
  return useQuery<TareaListResponse>({
    queryKey: ["tareas", params],
    queryFn: async () => {
      const qs = buildQueryString(params);
      const { data } = await api.get<TareaListResponse>(`/api/tareas?${qs}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useTareaQuery(id: number | string | undefined) {
  return useQuery<Tarea>({
    queryKey: ["tareas", Number(id)],
    queryFn: async () => {
      const { data } = await api.get<Tarea>(`/api/tareas/${id}`);
      return data;
    },
    enabled: id !== undefined && id !== null && id !== "",
  });
}

export function useCreateTareaMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TareaCreate) => {
      const { data } = await api.post<Tarea>("/api/tareas", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tareas"] });
    },
  });
}

export function useUpdateTareaMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; payload: TareaUpdate }) => {
      const { data } = await api.patch<Tarea>(
        `/api/tareas/${vars.id}`,
        vars.payload,
      );
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(["tareas", data.id], data);
      qc.invalidateQueries({ queryKey: ["tareas"] });
    },
  });
}

export function useReorderTareasMutation() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    TareaReorderRequest,
    { snapshots: Array<[readonly unknown[], unknown]> }
  >({
    mutationFn: async (payload: TareaReorderRequest) => {
      await api.post("/api/tareas/reorder", payload);
    },
    onMutate: async (payload) => {
      // Pause concurrent refetches and snapshot the current cache so we can
      // roll back on error.
      await qc.cancelQueries({ queryKey: ["tareas"] });

      const newEstadoById = new Map<
        number,
        { estado: Tarea["estado"]; orden: number }
      >();
      for (const column of payload.columns) {
        column.ordered_ids.forEach((id, index) => {
          newEstadoById.set(id, { estado: column.estado, orden: index });
        });
      }

      const snapshots: Array<[readonly unknown[], unknown]> = [];
      const queries = qc.getQueriesData<TareaListResponse>({
        queryKey: ["tareas"],
      });
      for (const [key, value] of queries) {
        snapshots.push([key, value]);
        if (!value || !Array.isArray((value as TareaListResponse).items)) continue;
        const next: TareaListResponse = {
          ...(value as TareaListResponse),
          items: (value as TareaListResponse).items.map((item) => {
            const patch = newEstadoById.get(item.id);
            return patch ? { ...item, ...patch } : item;
          }),
        };
        qc.setQueryData(key, next);
      }

      return { snapshots };
    },
    onError: (_err, _payload, context) => {
      if (!context) return;
      for (const [key, value] of context.snapshots) {
        qc.setQueryData(key, value);
      }
      // eslint-disable-next-line no-console
      console.error("tareas.reorder rolled back due to API error", _err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tareas"] });
    },
  });
}

export function useDeleteTareaMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/tareas/${id}`);
      return id;
    },
    onSuccess: (id) => {
      qc.removeQueries({ queryKey: ["tareas", id] });
      qc.invalidateQueries({ queryKey: ["tareas"] });
    },
  });
}
