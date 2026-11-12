/**
 * Single source of truth for the visible application version: package.json's
 * "version" field, injected at build time as __APP_VERSION__ (see
 * vite.config.ts). Components must import this instead of hard-coding a
 * version string.
 */
export const APP_VERSION = __APP_VERSION__;

/** Short commit SHA of the build ("local" outside CI/Cloudflare); shown in the audit footer of the analysis page. */
export const BUILD_COMMIT = __BUILD_COMMIT__;
