import { describe, expect, test } from "bun:test";
import browserPlugin from "./index.browser";
import nativePlugin from "./index";
import { currentBridgeUrl, decodeSimpleFinSetupToken, loadSimpleFinPortfolio } from "./native";
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

describe("SimpleFIN accounts", () => {
  // A listing that is balances-only gives every account empty holdings, so
  // nothing was ever imported. An IP host skips the DNS lookup.
  test("asks the Bridge for holdings and imports them", async () => {
    const requested: URL[] = [];
    const fetchImpl = (async (input: URL) => {
      requested.push(new URL(input));
      return Response.json({ errlist: [], accounts: [{
        id: "Demo Savings",
        conn_id: "CON-DEMO",
        name: "SimpleFIN Savings",
        currency: "USD",
        balance: "113845.51",
        holdings: [{ symbol: "AAPL", shares: "550.0", cost_basis: "55.00", purchase_price: "0.10", market_value: "105884.8", currency: "USD" }],
      }] });
    }) as unknown as typeof fetch;
    const snapshot = await loadSimpleFinPortfolio({
      ...claimedInstance,
      config: { setupToken: "", accessUrl: "https://user:password@8.8.8.8/simplefin" },
    }, fetchImpl);

    expect(requested[0]?.pathname).toBe("/simplefin/accounts");
    expect(requested[0]?.searchParams.has("balances-only")).toBe(false);
    expect(snapshot.positions).toEqual([expect.objectContaining({ ticker: "AAPL", shares: 550, avgCost: 0.1 })]);
  });

  test("reads the retired bridge host at the one it moved to, keeping the path and credentials", () => {
    const moved = currentBridgeUrl(new URL("https://user:password@bridge.simplefin.org/simplefin"));
    expect(moved.href).toBe("https://user:password@beta-bridge.simplefin.org/simplefin");
    const current = new URL("https://beta-bridge.simplefin.org/simplefin/claim/abc");
    expect(currentBridgeUrl(current)).toBe(current);
  });

  test("a price paid of zero is no cost: the total cost gives the average instead", () => {
    const snapshot = normalizeSimpleFinSnapshot({ accounts: [{
      id: "brokerage",
      conn_id: "fidelity",
      currency: "USD",
      holdings: [{ symbol: "VOO", shares: "100", cost_basis: "50000.00", purchase_price: "0.00", market_value: "60000.00", currency: "" }],
    }] });
    expect(snapshot.positions[0]).toEqual(expect.objectContaining({ ticker: "VOO", avgCost: 500, currency: "USD" }));
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
