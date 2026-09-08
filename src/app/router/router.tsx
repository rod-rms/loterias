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
  { path: "/lotofacil/gerar", element: withShell(<GerarPage modality="lotofacil" />) },
  { path: "/lotofacil/carteiras", element: withShell(<CarteirasPage modality="lotofacil" />) },
  { path: "/lotofacil/metodologia", element: withShell(<MetodologiaPage modality="lotofacil" />) },
  { path: "/megasena/gerar", element: withShell(<GerarPage modality="megasena" />) },
  { path: "/megasena/carteiras", element: withShell(<CarteirasPage modality="megasena" />) },
  { path: "/megasena/metodologia", element: withShell(<MetodologiaPage modality="megasena" />) },
  { path: "/carteiras", element: withShell(<CarteirasPage />) },
  { path: "/sobre", element: withShell(<SobrePage />) },
]);
