import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESTADOS, RESPONSABLES } from "./constants";
import type { Estado, Responsable, TareaFilters } from "./types";

interface TareaFiltersProps {
  initial: TareaFilters;
  onSearch: (next: TareaFilters) => void;
  onClear: () => void;
}

const ANY_VALUE = "__any__";

export function TareaFiltersForm({
  initial,
  onSearch,
  onClear,
}: TareaFiltersProps) {
  const [draft, setDraft] = useState<TareaFilters>(initial);

  // Keep form in sync if URL is changed externally (e.g. browser back).
  useEffect(() => {
    setDraft(initial);
  }, [
    initial.descripcion,
    initial.estado,
    initial.responsable,
    initial.fecha_desde,
    initial.fecha_hasta,
    // Re-run only when normalized values change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  function update<K extends keyof TareaFilters>(
    key: K,
    value: TareaFilters[K] | undefined,
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned: TareaFilters = {};
    if (draft.descripcion?.trim()) cleaned.descripcion = draft.descripcion.trim();
    if (draft.estado) cleaned.estado = draft.estado;
    if (draft.responsable) cleaned.responsable = draft.responsable;
    if (draft.fecha_desde) cleaned.fecha_desde = draft.fecha_desde;
    if (draft.fecha_hasta) cleaned.fecha_hasta = draft.fecha_hasta;
    onSearch(cleaned);
  }

  function handleClear() {
    setDraft({});
    onClear();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-3 lg:grid-cols-5"
    >
      <div className="space-y-1.5 lg:col-span-2">
        <Label htmlFor="filter-descripcion">Descripción</Label>
        <Input
          id="filter-descripcion"
          value={draft.descripcion ?? ""}
          onChange={(e) => update("descripcion", e.target.value)}
          placeholder="Buscar por texto..."
        />
      </div>

      <div className="space-y-1.5">
        <Label>Estado</Label>
        <Select
          value={draft.estado ?? ANY_VALUE}
          onValueChange={(v) =>
            update("estado", v === ANY_VALUE ? undefined : (v as Estado))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>Todos</SelectItem>
            {ESTADOS.map((e) => (
              <SelectItem key={e.value} value={e.value}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Responsable</Label>
        <Select
          value={draft.responsable ?? ANY_VALUE}
          onValueChange={(v) =>
            update(
              "responsable",
              v === ANY_VALUE ? undefined : (v as Responsable),
            )
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>Todos</SelectItem>
            {RESPONSABLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-fecha-desde">Desde</Label>
        <Input
          id="filter-fecha-desde"
          type="date"
          value={draft.fecha_desde ?? ""}
          onChange={(e) =>
            update("fecha_desde", e.target.value || undefined)
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-fecha-hasta">Hasta</Label>
        <Input
          id="filter-fecha-hasta"
          type="date"
          value={draft.fecha_hasta ?? ""}
          onChange={(e) =>
            update("fecha_hasta", e.target.value || undefined)
          }
        />
      </div>

      <div className="flex items-end gap-2 md:col-span-3 lg:col-span-5">
        <Button type="submit">Buscar</Button>
        <Button type="button" variant="outline" onClick={handleClear}>
          Limpiar filtros
        </Button>
      </div>
    </form>
  );
}
