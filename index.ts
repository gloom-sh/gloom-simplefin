import type { BrokerAdapter } from "gloomberb/types/broker";
import type { BrokerInstanceConfig } from "gloomberb/types/config";
import type { GloomPlugin } from "gloomberb/types/plugin";
import { simpleFinAdapterCore, simpleFinPluginMeta } from "./core";
import { loadSimpleFinNativeModule } from "./native-loader";
import type { BrokerPortfolioSnapshot } from "./normalize";

async function loadSimpleFinPortfolio(instance: BrokerInstanceConfig): Promise<BrokerPortfolioSnapshot> {
  const module = await loadSimpleFinNativeModule();
  return module.loadSimpleFinPortfolio(instance);
}

export const simpleFinBroker: BrokerAdapter = {
  ...simpleFinAdapterCore,

  async importPositions(instance) {
    return (await loadSimpleFinPortfolio(instance)).positions;
  },

  async importPortfolioSnapshot(instance) {
    return loadSimpleFinPortfolio(instance);
  },

  async listAccounts(instance) {
    return (await loadSimpleFinPortfolio(instance)).accounts;
  },

  async getPersistedConfigUpdate(instance) {
    const module = await loadSimpleFinNativeModule();
    return module.simpleFinBroker.getPersistedConfigUpdate?.(instance) ?? null;
  },
};

export const simpleFinPlugin: GloomPlugin = {
  ...simpleFinPluginMeta,
  broker: simpleFinBroker,
};

export default simpleFinPlugin;
