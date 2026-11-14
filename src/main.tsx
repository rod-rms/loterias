import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// UI-001: self-hosted IBM Plex (latin subset only; Portuguese diacritics are in it). No Google Fonts requests.
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./index.css";
import { App } from "./app/App";
import { ensureStrategiesRegistered } from "./app/providers/strategyBootstrap";

ensureStrategiesRegistered();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
