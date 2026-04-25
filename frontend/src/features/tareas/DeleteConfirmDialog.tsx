import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteTareaMutation } from "./api";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tareaId: number | null;
  tareaDescripcion?: string;
  onDeleted?: () => void;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  tareaId,
  tareaDescripcion,
  onDeleted,
}: DeleteConfirmDialogProps) {
  const deleteMutation = useDeleteTareaMutation();
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (tareaId == null) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync(tareaId);
      onOpenChange(false);
      onDeleted?.();
    } catch (e) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "No se pudo eliminar la tarea";
      setError(msg);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setError(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar tarea</DialogTitle>
          <DialogDescription>
            {tareaDescripcion
              ? `¿Seguro que quieres eliminar la tarea "${tareaDescripcion}"? Esta acción no se puede deshacer.`
              : "¿Seguro que quieres eliminar esta tarea? Esta acción no se puede deshacer."}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
