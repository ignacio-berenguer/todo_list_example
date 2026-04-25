const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  // For YYYY-MM-DD strings, parse as local date to avoid TZ shift.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return dateFormatter.format(new Date(y, m - 1, d));
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return dateFormatter.format(d);
}

export function formatDateTime(
  value: string | Date | null | undefined,
): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return dateTimeFormatter.format(d);
}

export const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  iniciada: "Iniciada",
  completado: "Completada",
};

export const RESPONSABLE_OPTIONS = [
  "Nacho",
  "Gonzalo",
  "María",
  "Papá",
  "Mamá",
] as const;
