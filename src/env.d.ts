/// <reference types="astro/client" />

declare global {
  interface Window {
    PagefindUI: new (options: Record<string, unknown>) => unknown;
  }
}

export {};
