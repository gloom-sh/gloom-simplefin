import { describe, expect, test } from "bun:test";
import browserPlugin from "./index.browser";
import nativePlugin from "./index";
import { decodeSimpleFinSetupToken } from "./native";
import { normalizeSimpleFinSnapshot } from "./normalize";

const claimedInstance = {
  id: "simplefin-main",
  brokerType: "simplefin",
  label: "SimpleFIN",
  enabled: true,
  config: { setupToken: "", accessUrl: "https://user:password@example.com/simplefin" },
};

describe("SimpleFIN setup tokens", () => {
  test("accepts URL-safe tokens and rejects a non-HTTPS claim", () => {
    const claimUrl = "https://bridge.simplefin.org/simplefin/claim/demo";
    const token = Buffer.from(claimUrl).toString("base64url");

    expect(decodeSimpleFinSetupToken(token)).toBe(claimUrl);
    expect(() => decodeSimpleFinSetupToken(Buffer.from("http://localhost/claim").toString("base64")))
      .toThrow("not valid");
  });
});

describe("SimpleFIN normalization", () => {
  test("keeps only accounts that hold investments", () => {
    const snapshot = normalizeSimpleFinSnapshot({ accounts: [
      { id: "cash", conn_id: "bank", name: "Checking", currency: "USD", holdings: [] },
      {
        id: "invest",
        conn_id: "broker",
        name: "Roth IRA",
        currency: "USD",
        balance: "750",
        holdings: [{ symbol: "VTI", shares: "3", cost_basis: "600", market_value: "750" }],
      },
    ] });

    expect(snapshot.accounts).toHaveLength(1);
    expect(snapshot.accounts[0]?.accountId).toBe("broker:invest");
    expect(snapshot.positions[0]).toEqual(expect.objectContaining({
      ticker: "VTI",
      shares: 3,
      avgCost: 200,
      markPrice: 250,
    }));
  });
});

describe("credential round-trip", () => {
  test("keeps a claimed access URL when the profile is saved untouched", () => {
    // The form only ever sees a placeholder, so saving without retyping the
    // token must not wipe the credential that replaced it.
    const broker = nativePlugin.broker!;
    const values = broker.toConfigValues!(claimedInstance);

    expect(values.setupToken).not.toContain("password");
    expect(broker.fromConfigValues!(values, claimedInstance)).toEqual(claimedInstance.config);
  });

  test("is identical in the browser entry the desktop view loads", () => {
    const native = nativePlugin.broker!;
    const browser = browserPlugin.broker!;

    expect(browser.id).toBe(native.id);
    expect(browser.configSchema).toEqual(native.configSchema);
    expect(browser.fromConfigValues!(browser.toConfigValues!(claimedInstance), claimedInstance))
      .toEqual(claimedInstance.config);
  });
});
