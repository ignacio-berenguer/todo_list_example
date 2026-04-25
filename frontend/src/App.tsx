import { useEffect } from "react";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { Header } from "@/components/layout/Header";
import { setAuthTokenGetter } from "@/lib/api";
import SearchPage from "@/routes/SearchPage";
import DetailPage from "@/routes/DetailPage";
import KanbanPage from "@/routes/KanbanPage";
import SignInPage from "@/routes/SignInPage";

function ProtectedLayout() {
  const { getToken, isLoaded } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        <div className="min-h-screen bg-background">
          <Header />
          <main>
            <Outlet />
          </main>
        </div>
      </SignedIn>
      <SignedOut>
        <Navigate
          to="/sign-in"
          replace
          state={{ from: location.pathname + location.search }}
        />
      </SignedOut>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/kanban" replace />} />
        <Route path="/kanban" element={<KanbanPage />} />
        <Route path="/tareas" element={<SearchPage />} />
        <Route path="/tareas/:id" element={<DetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/kanban" replace />} />
    </Routes>
  );
}
