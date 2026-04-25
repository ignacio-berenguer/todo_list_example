import { useCallback, useEffect, useState } from "react";
import {
  COLUMN_PREFS_STORAGE_KEY,
  COLUMNAS,
  DEFAULT_VISIBLE_COLUMNS,
} from "@/features/tareas/constants";
import type { ColumnKey } from "@/features/tareas/types";

const VALID_KEYS = new Set<ColumnKey>(COLUMNAS.map((c) => c.key));

function readFromStorage(): ColumnKey[] {
  if (typeof window === "undefined") return DEFAULT_VISIBLE_COLUMNS;
  try {
    const raw = window.localStorage.getItem(COLUMN_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE_COLUMNS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_VISIBLE_COLUMNS;
    const filtered = parsed.filter(
      (k): k is ColumnKey =>
        typeof k === "string" && VALID_KEYS.has(k as ColumnKey),
    );
    return filtered.length ? filtered : DEFAULT_VISIBLE_COLUMNS;
  } catch {
    return DEFAULT_VISIBLE_COLUMNS;
  }
}

export function useColumnPreferences() {
  const [visible, setVisible] = useState<ColumnKey[]>(() => readFromStorage());

  useEffect(() => {
    try {
      window.localStorage.setItem(
        COLUMN_PREFS_STORAGE_KEY,
        JSON.stringify(visible),
      );
    } catch {
      // ignore quota / privacy errors
    }
  }, [visible]);

  const toggle = useCallback((key: ColumnKey) => {
    setVisible((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  const reset = useCallback(() => {
    setVisible(DEFAULT_VISIBLE_COLUMNS);
  }, []);

  return { visible, toggle, reset, setVisible };
}
