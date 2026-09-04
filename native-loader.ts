export type SimpleFinNativeModule = typeof import("./native");

/**
 * Deferred so the DNS and address checks, and their `node:*` imports, are only
 * pulled in when a sync actually runs.
 */
export function loadSimpleFinNativeModule(): Promise<SimpleFinNativeModule> {
  return import("./native");
}
