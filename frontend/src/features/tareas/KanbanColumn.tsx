import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ESTADO_LABEL } from "@/lib/format";
import type { Estado } from "./types";

interface KanbanColumnProps {
  estado: Estado;
  count: number;
  onCreate: (estado: Estado) => void;
  children: React.ReactNode;
  /** Drop-zone ref (set by dnd-kit). */
  dropRef?: (node: HTMLElement | null) => void;
  isOver?: boolean;
}

export function KanbanColumn({
  estado,
  count,
  onCreate,
  children,
  dropRef,
  isOver,
}: KanbanColumnProps) {
  return (
    <section className="flex w-80 shrink-0 flex-col rounded-lg border bg-muted/30">
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{ESTADO_LABEL[estado]}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {count}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onCreate(estado)}
          aria-label={`Crear tarea en ${ESTADO_LABEL[estado]}`}
          title={`Crear tarea en ${ESTADO_LABEL[estado]}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </header>
      <div
        ref={dropRef}
        className={
          "flex flex-1 flex-col gap-2 p-2 min-h-40 transition-colors " +
          (isOver ? "bg-primary/5" : "")
        }
      >
        {children}
      </div>
    </section>
  );
}
