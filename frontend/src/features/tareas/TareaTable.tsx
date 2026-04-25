import { Link } from "react-router-dom";
import { ChevronUp, ChevronDown, MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { COLUMNAS } from "./constants";
import { ESTADO_LABEL, formatDate, formatDateTime } from "@/lib/format";
import type {
  ColumnKey,
  SortField,
  SortOrder,
  Tarea,
} from "./types";

interface TareaTableProps {
  tareas: Tarea[];
  visibleColumns: ColumnKey[];
  sort: SortField;
  order: SortOrder;
  onSortChange: (sort: SortField, order: SortOrder) => void;
  onEdit: (tarea: Tarea) => void;
  onDelete: (tarea: Tarea) => void;
  fromQueryString: string;
  isLoading?: boolean;
}

function renderCell(t: Tarea, key: ColumnKey): React.ReactNode {
  switch (key) {
    case "descripcion":
      return <span className="line-clamp-2">{t.descripcion}</span>;
    case "fecha_prevista":
      return formatDate(t.fecha_prevista);
    case "estado":
      return (
        <Badge variant={t.estado === "completado" ? "success" : "warning"}>
          {ESTADO_LABEL[t.estado] ?? t.estado}
        </Badge>
      );
    case "responsable":
      return t.responsable;
    case "notas":
      return (
        <span className="line-clamp-2 text-muted-foreground">
          {t.notas ?? ""}
        </span>
      );
    case "fecha_creacion":
      return formatDateTime(t.fecha_creacion);
    case "fecha_actualizacion":
      return formatDateTime(t.fecha_actualizacion);
    default:
      return null;
  }
}

export function TareaTable({
  tareas,
  visibleColumns,
  sort,
  order,
  onSortChange,
  onEdit,
  onDelete,
  fromQueryString,
  isLoading,
}: TareaTableProps) {
  const cols = COLUMNAS.filter((c) => visibleColumns.includes(c.key));

  function handleHeaderClick(field: SortField | undefined) {
    if (!field) return;
    if (sort === field) {
      onSortChange(field, order === "asc" ? "desc" : "asc");
    } else {
      onSortChange(field, "asc");
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((col) => {
              const active = col.sortField && sort === col.sortField;
              return (
                <TableHead
                  key={col.key}
                  onClick={() => handleHeaderClick(col.sortField)}
                  className={col.sortable ? "cursor-pointer select-none" : ""}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {active ? (
                      order === "asc" ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )
                    ) : null}
                  </span>
                </TableHead>
              );
            })}
            <TableHead className="w-[60px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={cols.length + 1}
                className="text-center text-sm text-muted-foreground py-8"
              >
                Cargando...
              </TableCell>
            </TableRow>
          ) : tareas.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={cols.length + 1}
                className="text-center text-sm text-muted-foreground py-8"
              >
                No hay tareas que coincidan con los filtros.
              </TableCell>
            </TableRow>
          ) : (
            tareas.map((t) => (
              <TableRow key={t.id}>
                {cols.map((col) => (
                  <TableCell key={col.key}>{renderCell(t, col.key)}</TableCell>
                ))}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Acciones">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          to={`/tareas/${t.id}${
                            fromQueryString
                              ? `?from=${encodeURIComponent(fromQueryString)}`
                              : ""
                          }`}
                        >
                          Ver detalle
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onEdit(t)}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => onDelete(t)}
                      >
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
