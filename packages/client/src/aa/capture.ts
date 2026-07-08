/**
 * Throwaway signature-capture harness — AA-to-BE phase aa-1.5.
 *
 * The BE signer (Privy delegated RPC) must reproduce, byte-for-byte, the
 * signatures the FE's viem/wallet account produces for Alchemy's
 * `signatureRequest`s — and Alchemy owns the request-type→method mapping
 * inside its SDK, so we can't read it from code. This wraps the signer the
 * Alchemy SDK calls and records, per sign call, the exact request it was
 * handed and the signature it returned (which Alchemy then accepted). Run
 * the normal FE AA flow once on 4337 and once on 7702 with this enabled and
 * the captures are the golden fixtures aa-2's signer is tested against.
 *
 * Enable with `AOMI_AA_CAPTURE=1` or `globalThis.__AOMI_AA_CAPTURE = true`.
 * Captures also collect on `globalThis.__AOMI_AA_CAPTURES`. Deleted with the
 * rest of the FE `aa/` package at aa-4.
 */

// The Alchemy SDK's `signSignatureRequest` routes each request kind to a viem
// account method: `personal_sign`→signMessage, `eth_signTypedData_v4`→
// signTypedData, `eip7702Auth`→signAuthorization. `signAuthorization` is the
// 7702 path — capture-verified against @alchemy/wallet-apis, don't drop it.
const SIGN_METHODS = new Set([
  "sign",
  "signMessage",
  "signTypedData",
  "signTransaction",
  "signAuthorization",
]);

export type AaSignatureCapture = {
  /** `"4337"` | `"7702"` — the request shape differs by account mode. */
  mode: string;
  chainId: number;
  /** The viem account method the SDK called. */
  method: string;
  /** What the SDK asked to sign (the `signatureRequest`, incl. rawPayload). */
  args: unknown;
  /** The signature returned — the format Alchemy accepted. */
  signature: unknown;
};

function captureEnabled(): boolean {
  const globals = globalThis as { __AOMI_AA_CAPTURE?: boolean };
  if (globals.__AOMI_AA_CAPTURE === true) {
    return true;
  }
  try {
    return typeof process !== "undefined" && process.env.AOMI_AA_CAPTURE === "1";
  } catch {
    return false;
  }
}

function sink(): AaSignatureCapture[] {
  const globals = globalThis as { __AOMI_AA_CAPTURES?: AaSignatureCapture[] };
  if (!globals.__AOMI_AA_CAPTURES) {
    globals.__AOMI_AA_CAPTURES = [];
  }
  return globals.__AOMI_AA_CAPTURES;
}

/** JSON-safe clone that stringifies bigints (viem values carry them). */
function plain(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, val) =>
      typeof val === "bigint" ? val.toString() : val,
    ),
  );
}

/**
 * Wrap a viem account so its sign calls are recorded. A no-op (returns the
 * account unchanged) unless capture is enabled, so it is safe to leave in
 * the hot path.
 */
export function captureSigner<T extends object>(
  account: T,
  meta: { mode: string; chainId: number },
): T {
  if (!captureEnabled()) {
    return account;
  }
  return new Proxy(account, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);
      if (
        typeof prop === "string" &&
        SIGN_METHODS.has(prop) &&
        typeof original === "function"
      ) {
        return async (...args: unknown[]) => {
          const signature = await (
            original as (...a: unknown[]) => Promise<unknown>
          ).apply(target, args);
          const entry: AaSignatureCapture = {
            mode: meta.mode,
            chainId: meta.chainId,
            method: prop,
            args: plain(args),
            signature: plain(signature),
          };
          sink().push(entry);
          console.info("[aomi][aa-capture]", JSON.stringify(entry));
          return signature;
        };
      }
      return original;
    },
  }) as T;
}
