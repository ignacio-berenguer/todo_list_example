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
