import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { Home } from "../pages/Home";
import { ModalityHome } from "../pages/ModalityHome";
import { GerarPage } from "../pages/GerarPage";
import { CarteirasPage } from "../pages/CarteirasPage";
import { MetodologiaPage } from "../pages/MetodologiaPage";
import { SobrePage } from "../pages/SobrePage";

function withShell(children: React.ReactNode) {
  return <AppShell>{children}</AppShell>;
}

export const router = createBrowserRouter([
  { path: "/", element: withShell(<Home />) },
  { path: "/lotofacil", element: withShell(<ModalityHome modality="lotofacil" />) },
  { path: "/lotofacil/gerar", element: withShell(<GerarPage modality="lotofacil" />) },
  { path: "/lotofacil/carteiras", element: withShell(<CarteirasPage modality="lotofacil" />) },
  { path: "/lotofacil/metodologia", element: withShell(<MetodologiaPage modality="lotofacil" />) },
  { path: "/megasena", element: withShell(<ModalityHome modality="megasena" />) },
  { path: "/megasena/gerar", element: withShell(<GerarPage modality="megasena" />) },
  { path: "/megasena/carteiras", element: withShell(<CarteirasPage modality="megasena" />) },
  { path: "/megasena/metodologia", element: withShell(<MetodologiaPage modality="megasena" />) },
  { path: "/carteiras", element: withShell(<CarteirasPage />) },
  { path: "/sobre", element: withShell(<SobrePage />) },
]);
