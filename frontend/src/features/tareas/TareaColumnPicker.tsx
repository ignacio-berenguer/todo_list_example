import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Columns3 } from "lucide-react";
import { COLUMNAS } from "./constants";
import type { ColumnKey } from "./types";

interface TareaColumnPickerProps {
  visible: ColumnKey[];
  onToggle: (key: ColumnKey) => void;
  onReset: () => void;
}

export function TareaColumnPicker({
  visible,
  onToggle,
  onReset,
}: TareaColumnPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="h-4 w-4" />
          Columnas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Columnas visibles</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {COLUMNAS.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.key}
            checked={visible.includes(col.key)}
            onCheckedChange={() => onToggle(col.key)}
            onSelect={(e) => e.preventDefault()}
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <button
          type="button"
          onClick={onReset}
          className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent rounded-sm"
        >
          Restablecer por defecto
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
