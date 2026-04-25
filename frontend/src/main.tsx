import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/clerk-react";
import { ThemeProvider } from "next-themes";
import App from "./App";
import { queryClient } from "./lib/queryClient";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

function MissingClerkKey() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md rounded-lg border bg-card p-6 text-center shadow">
        <h1 className="text-lg font-semibold">Configuración requerida</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configura{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            VITE_CLERK_PUBLISHABLE_KEY
          </code>{" "}
          en .env
        </p>
      </div>
    </div>
  );
}

function Root() {
  if (!PUBLISHABLE_KEY) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <MissingClerkKey />
      </ThemeProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/sign-in">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
