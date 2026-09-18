import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { Home } from "../pages/Home";
import { GerarPage } from "../pages/GerarPage";
import { CarteirasPage } from "../pages/CarteirasPage";
import { MetodologiaPage } from "../pages/MetodologiaPage";
import { SobrePage } from "../pages/SobrePage";

function withShell(children: React.ReactNode) {
  return <AppShell>{children}</AppShell>;
}

export const router = createBrowserRouter([
  { path: "/", element: withShell(<Home />) },
  // Compatibility redirects: /lotofacil and /megasena used to render a
  // separate landing page (ModalityHome) that mostly duplicated the
  // strategy catalog already shown on /gerar. The modality "hub" is now
  // /<modality>/gerar directly; these routes exist only so old links/
  // bookmarks keep working. `replace` keeps the Back button from bouncing
  // through the old URL.
  { path: "/lotofacil", element: <Navigate to="/lotofacil/gerar" replace /> },
  { path: "/megasena", element: <Navigate to="/megasena/gerar" replace /> },
  // `key` forces React to fully unmount/remount GerarPage on a modality
  // route change instead of reconciling it as the same component instance
  // (it otherwise would be, since both routes render the same component
  // type at the same position in the tree — not nested via a shared
  // <Outlet>). This is defense-in-depth only: GerarPage and
  // useGenerationWorker are independently safe if ever reused across a
  // modality prop change (see their own modality-transition resets).
  { path: "/lotofacil/gerar", element: withShell(<GerarPage key="lotofacil" modality="lotofacil" />) },
  { path: "/lotofacil/carteiras", element: withShell(<CarteirasPage modality="lotofacil" />) },
  { path: "/lotofacil/metodologia", element: withShell(<MetodologiaPage modality="lotofacil" />) },
  { path: "/megasena/gerar", element: withShell(<GerarPage key="megasena" modality="megasena" />) },
  { path: "/megasena/carteiras", element: withShell(<CarteirasPage modality="megasena" />) },
  { path: "/megasena/metodologia", element: withShell(<MetodologiaPage modality="megasena" />) },
  { path: "/carteiras", element: withShell(<CarteirasPage />) },
  { path: "/sobre", element: withShell(<SobrePage />) },
]);
