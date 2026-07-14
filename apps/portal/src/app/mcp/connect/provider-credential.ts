const CREDENTIAL_DEFAULTS = {
  timeoutMs: 120_000,
  pollMs: 500,
  attemptTimeoutMs: 5_000,
};

export async function waitForProviderCredential(
  getCredential: () => Promise<unknown> | unknown,
  options: Partial<typeof CREDENTIAL_DEFAULTS> = {},
): Promise<unknown> {
  const { timeoutMs, pollMs, attemptTimeoutMs } = {
    ...CREDENTIAL_DEFAULTS,
    ...options,
  };
  const deadline = Date.now() + timeoutMs;

  for (let remainingMs = deadline - Date.now(); remainingMs > 0; ) {
    const credential = await resolveCredentialAttempt(
      getCredential,
      Math.min(attemptTimeoutMs, remainingMs),
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
