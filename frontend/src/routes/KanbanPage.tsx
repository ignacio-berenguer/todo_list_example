import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useReorderTareasMutation,
  useTareasQuery,
} from "@/features/tareas/api";
import { KanbanCard } from "@/features/tareas/KanbanCard";
import { KanbanColumn } from "@/features/tareas/KanbanColumn";
import { TareaModal } from "@/features/tareas/TareaModal";
import type {
  Estado,
  Tarea,
  TareaReorderRequest,
} from "@/features/tareas/types";

const COLUMN_ORDER: Estado[] = ["pendiente", "iniciada", "completado"];
const KANBAN_PAGE_SIZE = 50;

interface ModalState {
  open: boolean;
  mode: "create" | "edit";
  tarea: Tarea | null;
  defaultEstado?: Estado;
}

interface SortableCardProps {
  tarea: Tarea;
  onOpen: (tarea: Tarea) => void;
}

function SortableCard({ tarea, onOpen }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tarea.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <KanbanCard
      tarea={tarea}
      onOpen={onOpen}
      dragRef={setNodeRef}
      dragHandleProps={{ ...attributes, ...listeners }}
      dragStyle={style}
      isDragging={isDragging}
    />
  );
}

interface SortableColumnProps {
  estado: Estado;
  tareas: Tarea[];
  onCreate: (estado: Estado) => void;
  onOpen: (tarea: Tarea) => void;
}

function SortableColumn({
  estado,
  tareas,
  onCreate,
  onOpen,
}: SortableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${estado}`,
    data: { type: "column", estado },
  });
  const ids = useMemo(() => tareas.map((t) => t.id), [tareas]);
  return (
    <KanbanColumn
      estado={estado}
      count={tareas.length}
      onCreate={onCreate}
      dropRef={setNodeRef}
      isOver={isOver}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {tareas.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Sin tareas
          </p>
        ) : (
          tareas.map((tarea) => (
            <SortableCard key={tarea.id} tarea={tarea} onOpen={onOpen} />
          ))
        )}
      </SortableContext>
    </KanbanColumn>
  );
}

export default function KanbanPage() {
  const query = useTareasQuery({
    sort: "fecha_prevista",
    order: "asc",
    page: 1,
    page_size: KANBAN_PAGE_SIZE,
  });
  const reorderMutation = useReorderTareasMutation();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const [modal, setModal] = useState<ModalState>({
    open: false,
    mode: "create",
    tarea: null,
  });

  const grouped = useMemo(() => {
    const buckets: Record<Estado, Tarea[]> = {
      pendiente: [],
      iniciada: [],
      completado: [],
    };
    const items = query.data?.items ?? [];
    for (const item of items) {
      if (item.estado in buckets) buckets[item.estado].push(item);
    }
    for (const key of COLUMN_ORDER) {
      buckets[key].sort((a, b) => a.orden - b.orden);
    }
    return buckets;
  }, [query.data]);

  function openCreate(estado: Estado) {
    setModal({
      open: true,
      mode: "create",
      tarea: null,
      defaultEstado: estado,
    });
  }

  function openEdit(tarea: Tarea) {
    setModal({ open: true, mode: "edit", tarea });
  }

  function findColumnOf(id: number): Estado | null {
    for (const estado of COLUMN_ORDER) {
      if (grouped[estado].some((t) => t.id === id)) return estado;
    }
    return null;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeNumId = Number(active.id);
    const sourceEstado = findColumnOf(activeNumId);
    if (!sourceEstado) return;

    let targetEstado: Estado | null = null;
    let targetIndex: number;

    if (typeof over.id === "string" && over.id.startsWith("column:")) {
      // Dropped on the column body itself (e.g. an empty column).
      targetEstado = over.id.slice("column:".length) as Estado;
      targetIndex = grouped[targetEstado].length;
    } else {
      const overNumId = Number(over.id);
      const overEstado = findColumnOf(overNumId);
      if (!overEstado) return;
      targetEstado = overEstado;
      const idx = grouped[overEstado].findIndex((t) => t.id === overNumId);
      targetIndex = idx < 0 ? grouped[overEstado].length : idx;
    }

    if (targetEstado === sourceEstado) {
      const fromIndex = grouped[sourceEstado].findIndex(
        (t) => t.id === activeNumId,
      );
      if (fromIndex < 0 || fromIndex === targetIndex) return;
      const next = arrayMove(grouped[sourceEstado], fromIndex, targetIndex);
      reorderMutation.mutate({
        columns: [
          { estado: sourceEstado, ordered_ids: next.map((t) => t.id) },
        ],
      });
      return;
    }

    // Cross-column move.
    const movedCard = grouped[sourceEstado].find((t) => t.id === activeNumId);
    if (!movedCard) return;
    const sourceList = grouped[sourceEstado].filter((t) => t.id !== activeNumId);
    const destList = [...grouped[targetEstado]];
    const insertAt = Math.min(targetIndex, destList.length);
    destList.splice(insertAt, 0, movedCard);
    const payload: TareaReorderRequest = {
      columns: [
        { estado: sourceEstado, ordered_ids: sourceList.map((t) => t.id) },
        { estado: targetEstado, ordered_ids: destList.map((t) => t.id) },
      ],
    };
    reorderMutation.mutate(payload);
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tablero Kanban</h1>
        {query.data ? (
          <p className="text-xs text-muted-foreground">
            Mostrando {query.data.items.length} de {query.data.total} tareas
            {query.data.total > KANBAN_PAGE_SIZE
              ? " (primeras " + KANBAN_PAGE_SIZE + ")"
              : ""}
          </p>
        ) : null}
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando tareas...</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          {(query.error as Error)?.message ?? "Error al cargar las tareas"}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMN_ORDER.map((estado) => (
              <SortableColumn
                key={estado}
                estado={estado}
                tareas={grouped[estado]}
                onCreate={openCreate}
                onOpen={openEdit}
              />
            ))}
          </div>
        </DndContext>
      )}

      <TareaModal
        open={modal.open}
        onOpenChange={(open) =>
          setModal((prev) => ({
            ...prev,
            open,
            ...(open ? {} : { tarea: null }),
          }))
        }
        mode={modal.mode}
        tarea={modal.tarea}
        defaultEstado={modal.defaultEstado}
      />

    </div>
  );
}
