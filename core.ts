import { PRESERVED_PASSWORD_HINT } from "gloomberb/broker";
import type { BrokerAdapter } from "gloomberb/types/broker";
import type { BrokerInstanceConfig } from "gloomberb/types/config";

/**
 * Everything both entries share.
 *
 * The plugin is loaded twice on the desktop: natively in the Bun process, which
 * claims the setup token and fetches accounts, and as a browser bundle in the
 * view, which only renders the profile form. The credential round-trip below is
 * the reason this is shared rather than duplicated: SimpleFIN trades a one-time
 * setup token for a long-lived access URL, so an edited profile has to be able
 * to say "unchanged" without the secret ever reaching the form.
 */

export const simpleFinConfigSchema: BrokerAdapter["configSchema"] = [{
  key: "setupToken",
  label: "Setup Token",
  type: "password",
  required: true,
  placeholder: "One-time token from SimpleFIN Bridge",
}];

export const simpleFinAdapterCore = {
  id: "simplefin",
  name: "SimpleFIN",
  configSchema: simpleFinConfigSchema,

  async validate(instance: BrokerInstanceConfig) {
    return [instance.config.setupToken, instance.config.accessUrl]
      .some((value) => typeof value === "string" && value.trim().length > 0);
  },

  toConfigValues(instance: BrokerInstanceConfig) {
    return {
      setupToken: typeof instance.config.accessUrl === "string"
        ? PRESERVED_PASSWORD_HINT
        : instance.config.setupToken,
    };
  },

  fromConfigValues(values: Record<string, unknown>, previous?: BrokerInstanceConfig | null) {
    const setupToken = typeof values.setupToken === "string" ? values.setupToken.trim() : "";
    const accessUrl = previous && typeof previous.config.accessUrl === "string" ? previous.config.accessUrl : "";
    if (setupToken === PRESERVED_PASSWORD_HINT && accessUrl) return { setupToken: "", accessUrl };
    if (setupToken) return { setupToken };
    return accessUrl ? { setupToken: "", accessUrl } : { setupToken: "" };
  },
} satisfies Partial<BrokerAdapter> & { id: string; name: string };

export const simpleFinPluginMeta = {
  id: "simplefin",
  name: "SimpleFIN",
  version: "1.0.0",
  description: "Read-only investment position sync through SimpleFIN Bridge.",
  homepage: "https://github.com/gloom-sh/gloom-simplefin",
  toggleable: true,
} as const;
