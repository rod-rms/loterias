import { RouterProvider } from "react-router-dom";
import { router } from "./router/router";
import { ErrorBoundary } from "./ErrorBoundary";
import { ModalityRegistryProvider } from "../shared/lib/modalityRegistry";

export function App() {
  return (
    <ErrorBoundary>
      <ModalityRegistryProvider>
        <RouterProvider router={router} />
      </ModalityRegistryProvider>
    </ErrorBoundary>
  );
}
