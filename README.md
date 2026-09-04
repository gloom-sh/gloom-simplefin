# gloomberb-simplefin

Read-only investment position sync through [SimpleFIN Bridge](https://beta-bridge.simplefin.org) for [Gloomberb](https://github.com/gloom-sh/gloomberb).

```bash
gloomberb install gloom-sh/gloomberb-simplefin
```

## Setup

1. Connect your institutions at SimpleFIN Bridge and generate a **setup token**.
2. In Gloomberb, run `BROKER` (or `Ctrl+P` → "Connect a broker"), pick **SimpleFIN**, and paste the token.

The token is one-time: Gloomberb claims it once, stores the access URL it receives, and clears the token. Accounts with no holdings are skipped, since this syncs investments rather than balances.

## What it can do

Nothing but read, and only over HTTPS. The claim and access URLs are rejected unless they are HTTPS with no unusual port, and the hostname is resolved and refused if it points at a private address. The stored access URL contains credentials, so it never leaves your machine and is shown in the profile form as a placeholder rather than the real value.

## Desktop and terminal

Address checks need `node:dns` and `node:net`, so the sync runs in Gloomberb's Bun process. The desktop view loads `index.browser.ts`, which carries the broker's identity, its fields, and the credential round-trip, and forwards the actual work to the backend. See the `browser` field in `package.json`.

## Development

```bash
bun install
bun test
bun run typecheck
```

## License

MIT
