/// <reference types="vite/client" />

/** Build-time constant injected by vite.config.ts from package.json's "version" field — the single source of truth for the visible app version. Never hard-code a version string in a component. */
declare const __APP_VERSION__: string;
