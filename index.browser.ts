import type { BrokerAdapter } from "gloomberb/types/broker";
import type { GloomPlugin } from "gloomberb/types/plugin";
import { simpleFinAdapterCore, simpleFinPluginMeta } from "./core";

/**
 * The renderer's copy of the plugin.
 *
 * Claiming a setup token means resolving the bridge's hostname and refusing
 * private addresses, which needs `node:dns` and `node:net`, so the desktop view
 * gets identity, fields, and the credential round-trip only. Gloomberb wraps
 * this adapter in a remote one that forwards every operation to the Bun
 * process, so these bodies are a guard rail rather than a code path.
 */
function backendOnly(): never {
  throw new Error("SimpleFIN sync runs in the Gloomberb backend.");
}

export const simpleFinBroker: BrokerAdapter = {
  ...simpleFinAdapterCore,
  importPositions: backendOnly,
  importPortfolioSnapshot: backendOnly,
  listAccounts: backendOnly,
  getPersistedConfigUpdate: backendOnly,
};

export const simpleFinPlugin: GloomPlugin = {
  ...simpleFinPluginMeta,
  broker: simpleFinBroker,
};

export default simpleFinPlugin;
