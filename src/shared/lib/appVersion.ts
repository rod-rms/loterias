/**
 * Single source of truth for the visible application version: package.json's
 * "version" field, injected at build time as __APP_VERSION__ (see
 * vite.config.ts). Components must import this instead of hard-coding a
 * version string.
 */
export const APP_VERSION = __APP_VERSION__;
