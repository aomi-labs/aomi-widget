export type WaitForProviderCredentialOptions = {
  timeoutMs?: number;
  pollMs?: number;
  /** Per-attempt cap. `null` waits on the provider call with no race. */
  attemptTimeoutMs?: number | null;
};

const CREDENTIAL_DEFAULTS = {
  timeoutMs: 120_000,
  pollMs: 500,
  attemptTimeoutMs: 5_000 as number | null,
};

export async function waitForProviderCredential(
  getCredential: () => Promise<unknown> | unknown,
  options: WaitForProviderCredentialOptions = {},
): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? CREDENTIAL_DEFAULTS.timeoutMs;
  const pollMs = options.pollMs ?? CREDENTIAL_DEFAULTS.pollMs;
  const attemptTimeoutMs =
    options.attemptTimeoutMs === undefined
      ? CREDENTIAL_DEFAULTS.attemptTimeoutMs
      : options.attemptTimeoutMs;
  const deadline = Date.now() + timeoutMs;

  for (let remainingMs = deadline - Date.now(); remainingMs > 0; ) {
    const credential = await resolveCredentialAttempt(
      getCredential,
      attemptTimeoutMs === null
        ? null
        : Math.min(attemptTimeoutMs, remainingMs),
    );
    if (credential) return credential;
    remainingMs = deadline - Date.now();
    if (remainingMs > 0) {
      await sleep(Math.min(pollMs, remainingMs));
    }
    remainingMs = deadline - Date.now();
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
  timeoutMs: number | null,
): Promise<unknown> {
  const attempt = Promise.resolve().then(getCredential);
  if (timeoutMs == null) return attempt;
  return Promise.race([attempt, sleep(timeoutMs)]);
}

function sleep(ms: number): Promise<undefined> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
