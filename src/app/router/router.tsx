import type { ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { Home } from "../pages/Home";
import { CarteirasPage } from "../pages/CarteirasPage";
import { SobrePage } from "../pages/SobrePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { LegacyAnaliseRedirect, ModalityIndexRedirect, ModalityRoute } from "./routeComponents";

function withShell(children: ReactNode) {
  return <AppShell>{children}</AppShell>;
}

/**
 * UI-001: canonical routes are `/:modalidade/{gerar,carteiras,analise,metodologia}`, resolved against the modality
 * registry (see routeComponents.tsx). Legacy URLs keep working: `/lotofacil` and `/megasena` redirect to the hub,
 * `/analise?modalidade=x` redirects to `/x/analise`, `/carteiras` and `/sobre` are unchanged.
 */
export const router = createBrowserRouter([
  { path: "/", element: withShell(<Home />) },
  { path: "/carteiras", element: withShell(<CarteirasPage />) },
  { path: "/sobre", element: withShell(<SobrePage />) },
  { path: "/analise", element: withShell(<LegacyAnaliseRedirect />) },
  { path: "/:modalidade", element: withShell(<ModalityIndexRedirect />) },
  { path: "/:modalidade/gerar", element: withShell(<ModalityRoute section="gerar" />) },
  { path: "/:modalidade/carteiras", element: withShell(<ModalityRoute section="carteiras" />) },
  { path: "/:modalidade/analise", element: withShell(<ModalityRoute section="analise" />) },
  { path: "/:modalidade/metodologia", element: withShell(<ModalityRoute section="metodologia" />) },
  { path: "*", element: withShell(<NotFoundPage />) },
]);
