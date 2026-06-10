import { CliSession } from "../cli-session";
import { printDataFileLocation } from "../output";
import type { CliConfig } from "../types";

/**
 * Show the account the active session is bound to on the backend. Resolves the
 * binding via the account bearer (or persisted credential), so it doubles as a
 * "is my session authenticated / bound to a user" check.
 */
export async function whoamiCommand(config: CliConfig): Promise<void> {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  cli.mergeConfig(config);

  const state = cli.toState();
  const hasCredential = Boolean(
    config.accountAccessToken ??
      state.accountAccessToken ??
      config.accountProvider ??
      state.accountProvider,
  );

  const session = cli.createClientSession(config);
  try {
    const profile = await session.client.fetchAccountProfile(cli.sessionId);
    if (!profile) {
      console.log("Not bound to an account (anonymous session).");
      if (!hasCredential) {
        console.log(
          "No account credential configured. Pass --account-bearer, or " +
            "--account-provider + --account-provider-token.",
        );
      }
      printDataFileLocation();
      return;
    }

    const account = profile.account;
    console.log(`Account:  ${account.user_id}`);
    if (account.username) console.log(`Username: ${account.username}`);
    if (account.verified_email) console.log(`Email:    ${account.verified_email}`);
    if (account.tier) console.log(`Tier:     ${account.tier}`);
    if (account.status) console.log(`Status:   ${account.status}`);
    printDataFileLocation();
  } finally {
    session.close();
  }
}
