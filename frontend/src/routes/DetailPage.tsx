import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TareaModal } from "@/features/tareas/TareaModal";
import { DeleteConfirmDialog } from "@/features/tareas/DeleteConfirmDialog";
import { useTareaQuery } from "@/features/tareas/api";
import { ESTADO_LABEL, formatDate, formatDateTime } from "@/lib/format";

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") ?? "";

  const { data: tarea, isLoading, isError, error } = useTareaQuery(id);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function back() {
    const target = `/tareas${from ? `?${from}` : ""}`;
    navigate(target);
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (isError || !tarea) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Button variant="outline" size="sm" onClick={back} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <p className="text-sm text-destructive">
          {(error as { message?: string })?.message ??
            "No se pudo cargar la tarea"}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={back} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">{tarea.descripcion}</h1>
          <p className="text-sm text-muted-foreground">ID #{tarea.id}</p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-muted-foreground tracking-wide">
              Estado
            </dt>
            <dd className="mt-1">
              <Badge
                variant={
                  tarea.estado === "completado" ? "success" : "warning"
                }
              >
                {ESTADO_LABEL[tarea.estado] ?? tarea.estado}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground tracking-wide">
              Responsable
            </dt>
            <dd className="mt-1 text-sm">{tarea.responsable}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground tracking-wide">
              Fecha prevista
            </dt>
            <dd className="mt-1 text-sm">{formatDate(tarea.fecha_prevista)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground tracking-wide">
              Notas
            </dt>
            <dd className="mt-1 text-sm whitespace-pre-wrap">
              {tarea.notas?.trim() ? tarea.notas : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground tracking-wide">
              Creada
            </dt>
            <dd className="mt-1 text-sm">
              {formatDateTime(tarea.fecha_creacion)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground tracking-wide">
              Última actualización
            </dt>
            <dd className="mt-1 text-sm">
              {formatDateTime(tarea.fecha_actualizacion)}
            </dd>
          </div>
        </dl>
      </div>

      <TareaModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        tarea={tarea}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        tareaId={tarea.id}
        tareaDescripcion={tarea.descripcion}
        onDeleted={back}
      />
    </div>
  );
}
