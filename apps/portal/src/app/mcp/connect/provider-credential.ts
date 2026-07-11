const DEFAULT_CREDENTIAL_TIMEOUT_MS = 120_000;
const DEFAULT_CREDENTIAL_POLL_MS = 500;
const DEFAULT_CREDENTIAL_ATTEMPT_TIMEOUT_MS = 5_000;

export async function waitForProviderCredential(
  getCredential: () => Promise<unknown> | unknown,
  options: {
    timeoutMs?: number;
    pollMs?: number;
    attemptTimeoutMs?: number;
  } = {},
): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_CREDENTIAL_TIMEOUT_MS;
  const pollMs = options.pollMs ?? DEFAULT_CREDENTIAL_POLL_MS;
  const attemptTimeoutMs =
    options.attemptTimeoutMs ?? DEFAULT_CREDENTIAL_ATTEMPT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const credential = await resolveCredentialAttempt(
      getCredential,
      Math.min(attemptTimeoutMs, Math.max(1, deadline - Date.now())),
    );
    if (credential) return credential;
    await sleep(Math.min(pollMs, Math.max(1, deadline - Date.now())));
  }

  throw new Error("Provider did not return an exchangeable credential");
}

export async function providerExchangeError(
  response: Response,
): Promise<Error> {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
    error?: unknown;
  } | null;
  const message =
    typeof body?.message === "string"
      ? body.message
      : typeof body?.error === "string"
        ? body.error
        : `HTTP ${response.status}`;
  return new Error(`Provider exchange failed: ${message}`);
}

async function resolveCredentialAttempt(
  getCredential: () => Promise<unknown> | unknown,
  timeoutMs: number,
): Promise<unknown> {
  return Promise.race([
    Promise.resolve().then(getCredential),
    sleep(timeoutMs),
  ]);
}

function sleep(ms: number): Promise<undefined> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
