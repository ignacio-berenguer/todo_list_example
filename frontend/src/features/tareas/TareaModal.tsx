import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESTADOS, RESPONSABLES } from "./constants";
import { useCreateTareaMutation, useUpdateTareaMutation } from "./api";
import type { Estado, Responsable, Tarea, TareaCreate } from "./types";

type Mode = "create" | "edit";

interface TareaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  tarea?: Tarea | null;
  onSaved?: (saved: Tarea) => void;
}

interface FormState {
  descripcion: string;
  fecha_prevista: string;
  estado: Estado;
  responsable: Responsable | "";
  notas: string;
}

interface FormErrors {
  descripcion?: string;
  fecha_prevista?: string;
  estado?: string;
  responsable?: string;
  submit?: string;
}

const DESC_MAX = 500;

function emptyState(): FormState {
  return {
    descripcion: "",
    fecha_prevista: "",
    estado: "pendiente",
    responsable: "",
    notas: "",
  };
}

function fromTarea(t: Tarea): FormState {
  return {
    descripcion: t.descripcion,
    fecha_prevista: t.fecha_prevista,
    estado: t.estado,
    responsable: t.responsable,
    notas: t.notas ?? "",
  };
}

export function TareaModal({
  open,
  onOpenChange,
  mode,
  tarea,
  onSaved,
}: TareaModalProps) {
  const [form, setForm] = useState<FormState>(emptyState());
  const [errors, setErrors] = useState<FormErrors>({});
  const createMutation = useCreateTareaMutation();
  const updateMutation = useUpdateTareaMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && tarea) {
      setForm(fromTarea(tarea));
    } else {
      setForm(emptyState());
    }
    setErrors({});
  }, [open, mode, tarea]);

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!form.descripcion.trim()) {
      next.descripcion = "La descripción es obligatoria";
    } else if (form.descripcion.length > DESC_MAX) {
      next.descripcion = `Máximo ${DESC_MAX} caracteres`;
    }
    if (!form.fecha_prevista) {
      next.fecha_prevista = "La fecha prevista es obligatoria";
    }
    if (!form.estado) {
      next.estado = "El estado es obligatorio";
    }
    if (!form.responsable) {
      next.responsable = "El responsable es obligatorio";
    }
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    const payload: TareaCreate = {
      descripcion: form.descripcion.trim(),
      fecha_prevista: form.fecha_prevista,
      estado: form.estado,
      responsable: form.responsable as Responsable,
      notas: form.notas.trim() ? form.notas.trim() : null,
    };

    try {
      let saved: Tarea;
      if (mode === "create") {
        saved = await createMutation.mutateAsync(payload);
      } else if (tarea) {
        saved = await updateMutation.mutateAsync({
          id: tarea.id,
          payload,
        });
      } else {
        return;
      }
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "No se pudo guardar la tarea";
      setErrors({ submit: msg });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Crear tarea" : "Editar tarea"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="tarea-descripcion">Descripción</Label>
            <Textarea
              id="tarea-descripcion"
              value={form.descripcion}
              maxLength={DESC_MAX}
              onChange={(e) =>
                setForm((p) => ({ ...p, descripcion: e.target.value }))
              }
              aria-invalid={Boolean(errors.descripcion)}
            />
            <div className="flex items-center justify-between">
              {errors.descripcion ? (
                <p className="text-xs text-destructive">
                  {errors.descripcion}
                </p>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground">
                {form.descripcion.length} / {DESC_MAX}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tarea-fecha-prevista">Fecha prevista</Label>
              <Input
                id="tarea-fecha-prevista"
                type="date"
                value={form.fecha_prevista}
                onChange={(e) =>
                  setForm((p) => ({ ...p, fecha_prevista: e.target.value }))
                }
                aria-invalid={Boolean(errors.fecha_prevista)}
              />
              {errors.fecha_prevista ? (
                <p className="text-xs text-destructive">
                  {errors.fecha_prevista}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select
                value={form.estado}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, estado: v as Estado }))
                }
              >
                <SelectTrigger aria-invalid={Boolean(errors.estado)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.estado ? (
                <p className="text-xs text-destructive">{errors.estado}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Responsable</Label>
            <Select
              value={form.responsable || undefined}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, responsable: v as Responsable }))
              }
            >
              <SelectTrigger aria-invalid={Boolean(errors.responsable)}>
                <SelectValue placeholder="Selecciona un responsable" />
              </SelectTrigger>
              <SelectContent>
                {RESPONSABLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.responsable ? (
              <p className="text-xs text-destructive">{errors.responsable}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tarea-notas">Notas</Label>
            <Textarea
              id="tarea-notas"
              value={form.notas}
              onChange={(e) =>
                setForm((p) => ({ ...p, notas: e.target.value }))
              }
              placeholder="Opcional"
            />
          </div>

          {errors.submit ? (
            <p className="text-sm text-destructive">{errors.submit}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
