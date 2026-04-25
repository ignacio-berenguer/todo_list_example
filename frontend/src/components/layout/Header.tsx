import { useTheme } from "next-themes";
import { UserButton } from "@clerk/clerk-react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  function cycle() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }

  let icon = <Monitor className="h-4 w-4" />;
  let label = "Tema del sistema";
  if (theme === "light") {
    icon = <Sun className="h-4 w-4" />;
    label = "Tema claro";
  } else if (theme === "dark") {
    icon = <Moon className="h-4 w-4" />;
    label = "Tema oscuro";
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={label}
      title={label}
    >
      {icon}
    </Button>
  );
}

export function Header() {
  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/tareas" className="text-lg font-semibold">
          Tareas
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    </header>
  );
}
