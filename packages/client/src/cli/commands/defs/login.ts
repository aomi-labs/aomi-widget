import { defineCommand } from "citty";
import { fatal } from "../../errors";
import { globalArgs, buildCliConfig } from "./shared";

function parseProvider(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  return raw.trim().toLowerCase();
}

export const loginDef = defineCommand({
  meta: {
    name: "login",
    description:
      "Log in to Aomi (device flow). With --provider privy: connect an " +
      "embedded wallet into the account and mint the delegated grant.",
  },
  args: {
    ...globalArgs,
    provider: {
      type: "string",
      description:
        'Wallet/auth provider to connect ("privy") instead of the canonical device login',
    },
    evm: {
      type: "boolean",
      description:
        "With --provider: request the default EVM embedded-wallet flow explicitly",
    },
    solana: {
      type: "boolean",
      alias: ["svm"],
      description: "With --provider: request a Solana embedded-wallet flow",
    },
  },
  async run({ args }) {
    const provider = parseProvider(args.provider);
    if (!provider) {
      if (args.evm === true || args.solana === true) {
        fatal(
          "`--evm`/`--solana` only apply to the provider connect flow.\n" +
            "Use `aomi login --provider privy [--evm|--solana]`.",
        );
      }
      const { loginCommand } = await import("../account");
      await loginCommand(buildCliConfig(args));
      return;
    }
    if (provider !== "privy") {
      fatal(`Unknown provider "${provider}". Supported providers: "privy".`);
    }
    if (args.evm === true && args.solana === true) {
      fatal("Choose only one of `--evm` or `--solana`.");
    }
    const { walletLoginCommand } = await import("../account");
    await walletLoginCommand(buildCliConfig(args), {
      walletFamily: args.solana === true ? "solana" : "evm",
    });
  },
});

export const logoutDef = defineCommand({
  meta: {
    name: "logout",
    description:
      "Log out of Aomi (clear the locally stored account credential). " +
      "With --provider privy: disconnect the provider.",
  },
  args: {
    provider: {
      type: "string",
      description: 'Provider to disconnect ("privy")',
    },
  },
  async run({ args }) {
    const provider = parseProvider(args.provider);
    if (provider) {
      const { providerLogoutCommand } = await import("../account");
      providerLogoutCommand(provider);
      return;
    }
    const { logoutCommand } = await import("../account");
    logoutCommand();
  },
});
