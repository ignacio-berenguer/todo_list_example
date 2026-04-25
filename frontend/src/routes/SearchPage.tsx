import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TareaFiltersForm } from "@/features/tareas/TareaFilters";
import { TareaTable } from "@/features/tareas/TareaTable";
import { TareaColumnPicker } from "@/features/tareas/TareaColumnPicker";
import { TareaModal } from "@/features/tareas/TareaModal";
import { DeleteConfirmDialog } from "@/features/tareas/DeleteConfirmDialog";
import { useTareasQuery } from "@/features/tareas/api";
import { useColumnPreferences } from "@/hooks/useColumnPreferences";
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT_FIELD,
  DEFAULT_SORT_ORDER,
  PAGE_SIZE_OPTIONS,
} from "@/features/tareas/constants";
import type {
  Estado,
  Responsable,
  SortField,
  SortOrder,
  Tarea,
  TareaFilters,
  TareaQueryParams,
} from "@/features/tareas/types";

const SORT_FIELDS: SortField[] = [
  "descripcion",
  "fecha_prevista",
  "estado",
  "responsable",
  "fecha_creacion",
  "fecha_actualizacion",
];

function parseParams(sp: URLSearchParams): TareaQueryParams {
  const sortRaw = sp.get("sort");
  const orderRaw = sp.get("order");
  const sort: SortField = SORT_FIELDS.includes(sortRaw as SortField)
    ? (sortRaw as SortField)
    : DEFAULT_SORT_FIELD;
  const order: SortOrder = orderRaw === "desc" ? "desc" : DEFAULT_SORT_ORDER;
  const pageNum = Number(sp.get("page"));
  const page = Number.isFinite(pageNum) && pageNum >= 1 ? pageNum : 1;
  const pageSizeNum = Number(sp.get("page_size"));
  const page_size = (PAGE_SIZE_OPTIONS as readonly number[]).includes(
    pageSizeNum,
  )
    ? pageSizeNum
    : DEFAULT_PAGE_SIZE;

  const estadoRaw = sp.get("estado");
  const estado: Estado | undefined =
    estadoRaw === "pendiente" || estadoRaw === "completado"
      ? estadoRaw
      : undefined;
  const responsableRaw = sp.get("responsable");
  const validResponsables: Responsable[] = [
    "Nacho",
    "Gonzalo",
    "María",
    "Papá",
    "Mamá",
  ];
  const responsable: Responsable | undefined = validResponsables.includes(
    responsableRaw as Responsable,
  )
    ? (responsableRaw as Responsable)
    : undefined;

  return {
    descripcion: sp.get("descripcion") ?? undefined,
    estado,
    responsable,
    fecha_desde: sp.get("fecha_desde") ?? undefined,
    fecha_hasta: sp.get("fecha_hasta") ?? undefined,
    sort,
    order,
    page,
    page_size,
  };
}

function paramsToFilters(p: TareaQueryParams): TareaFilters {
  return {
    descripcion: p.descripcion,
    estado: p.estado,
    responsable: p.responsable,
    fecha_desde: p.fecha_desde,
    fecha_hasta: p.fecha_hasta,
  };
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseParams(searchParams), [searchParams]);
  const initialFilters = useMemo(() => paramsToFilters(params), [params]);

  const { data, isLoading, isError, error } = useTareasQuery(params);
  const { visible, toggle, reset } = useColumnPreferences();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarea, setEditTarea] = useState<Tarea | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarea, setDeleteTarea] = useState<Tarea | null>(null);

  function writeParams(updater: (prev: URLSearchParams) => URLSearchParams) {
    setSearchParams(updater(new URLSearchParams(searchParams)));
  }

  function handleSearch(filters: TareaFilters) {
    const next = new URLSearchParams();
    if (filters.descripcion) next.set("descripcion", filters.descripcion);
    if (filters.estado) next.set("estado", filters.estado);
    if (filters.responsable) next.set("responsable", filters.responsable);
    if (filters.fecha_desde) next.set("fecha_desde", filters.fecha_desde);
    if (filters.fecha_hasta) next.set("fecha_hasta", filters.fecha_hasta);
    next.set("sort", params.sort);
    next.set("order", params.order);
    next.set("page", "1");
    next.set("page_size", String(params.page_size));
    setSearchParams(next);
  }

  function handleClear() {
    setSearchParams(new URLSearchParams());
  }

  function handleSortChange(sort: SortField, order: SortOrder) {
    writeParams((prev) => {
      prev.set("sort", sort);
      prev.set("order", order);
      prev.set("page", "1");
      return prev;
    });
  }

  function handlePageChange(page: number) {
    writeParams((prev) => {
      prev.set("page", String(page));
      return prev;
    });
  }

  function handlePageSizeChange(size: number) {
    writeParams((prev) => {
      prev.set("page_size", String(size));
      prev.set("page", "1");
      return prev;
    });
  }

  function openCreate() {
    setEditTarea(null);
    setModalOpen(true);
  }

  function openEdit(t: Tarea) {
    setEditTarea(t);
    setModalOpen(true);
  }

  function openDelete(t: Tarea) {
    setDeleteTarea(t);
    setDeleteOpen(true);
  }

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / params.page_size));
  const fromQueryString = searchParams.toString();

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tareas</h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Crear Tarea
        </Button>
      </div>

      <TareaFiltersForm
        initial={initialFilters}
        onSearch={handleSearch}
        onClear={handleClear}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Cargando..."
            : `${total} ${total === 1 ? "tarea" : "tareas"}`}
        </p>
        <TareaColumnPicker
          visible={visible}
          onToggle={toggle}
          onReset={reset}
        />
      </div>

      {isError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {(error as { message?: string })?.message ??
            "Error al cargar las tareas"}
        </div>
      ) : null}

      <TareaTable
        tareas={data?.items ?? []}
        visibleColumns={visible}
        sort={params.sort}
        order={params.order}
        onSortChange={handleSortChange}
        onEdit={openEdit}
        onDelete={openDelete}
        fromQueryString={fromQueryString}
        isLoading={isLoading}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Por página:</span>
          <Select
            value={String(params.page_size)}
            onValueChange={(v) => handlePageSizeChange(Number(v))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(params.page - 1)}
            disabled={params.page <= 1 || isLoading}
          >
            Anterior
          </Button>
          <span className="text-sm">
            Página {params.page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(params.page + 1)}
            disabled={params.page >= totalPages || isLoading}
          >
            Siguiente
          </Button>
        </div>
      </div>

      <TareaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={editTarea ? "edit" : "create"}
        tarea={editTarea}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        tareaId={deleteTarea?.id ?? null}
        tareaDescripcion={deleteTarea?.descripcion}
      />
    </div>
  );
}
