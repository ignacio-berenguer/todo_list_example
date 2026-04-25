import { Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { Tarea } from "./types";

const NOTAS_PREVIEW_MAX = 80;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

type DueState = "overdue" | "near" | "normal";

function dueState(tarea: Tarea, today: Date): DueState {
  if (tarea.estado === "completado") return "normal";
  // Parse YYYY-MM-DD as local date.
  const parts = tarea.fecha_prevista.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return "normal";
  const due = new Date(parts[0], parts[1] - 1, parts[2]);
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((due.getTime() - todayMidnight.getTime()) / dayMs);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 2) return "near";
  return "normal";
}

interface KanbanCardProps {
  tarea: Tarea;
  onOpen: (tarea: Tarea) => void;
  /** Drag bindings injected by the parent (dnd-kit). */
  dragRef?: (node: HTMLElement | null) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  dragStyle?: React.CSSProperties;
  isDragging?: boolean;
}

export function KanbanCard({
  tarea,
  onOpen,
  dragRef,
  dragHandleProps,
  dragStyle,
  isDragging,
}: KanbanCardProps) {
  const today = new Date();
  const due = dueState(tarea, today);
  const notasPreview = tarea.notas
    ? truncate(tarea.notas, NOTAS_PREVIEW_MAX)
    : null;

  const dueClass =
    due === "overdue"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : due === "near"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
        : "text-muted-foreground border-transparent";

  return (
    <article
      ref={dragRef}
      style={dragStyle}
      {...dragHandleProps}
      onClick={(e) => {
        // Only treat as a click when the user wasn't dragging.
        if (isDragging) return;
        e.stopPropagation();
        onOpen(tarea);
      }}
      className={cn(
        "group rounded-md border bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing select-none",
        isDragging && "opacity-60 shadow-lg ring-2 ring-primary/40",
      )}
    >
      <h3 className="text-sm font-semibold leading-tight">
        {tarea.descripcion}
      </h3>
      {notasPreview ? (
        <p
          className="mt-1 text-xs text-muted-foreground line-clamp-2"
          title={tarea.notas ?? undefined}
        >
          {notasPreview}
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
            dueClass,
          )}
        >
          <Calendar className="h-3 w-3" />
          {formatDate(tarea.fecha_prevista)}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <User className="h-3 w-3" />
          {tarea.responsable}
        </span>
      </div>
    </article>
  );
}
