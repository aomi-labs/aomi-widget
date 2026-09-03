import type { AomiHttpMethod, AomiRequestOptions } from "../types";

export const MICROUSD_PER_CREDIT = 10_000;
export const MIN_CREDIT_TOP_UP = 100;
export const MAX_CREDIT_TOP_UP = 100_000;

export type AomiCreditActivity = {
  id: number;
  amount_microusd: number;
  entry_kind: "purchase" | "usage_debit";
  payment_method: string | null;
  payment_provider: string | null;
  external_payment_reference: string | null;
  application_id: number | null;
  metadata: Record<string, unknown>;
  created_at: number;
};

export type AomiCreditPosition = {
  period_utc_month: string;
  included: {
    limit_microusd: number;
    used_microusd: number;
    remaining_microusd: number;
  };
  bank: {
    balance_microusd: number;
    outstanding_debt_microusd: number;
  };
  entries: AomiCreditActivity[];
  next_before_id: number | null;
};

export type AomiCreditPaymentReceipt = {
  transaction?: string;
  network?: string;
};

export type AomiCreditTopUpResult = AomiCreditPosition & {
  receipt?: AomiCreditPaymentReceipt;
};

export type AomiCreditListOptions = {
  limit?: number;
  beforeId?: number;
};

export type AomiCreditTopUpOptions =
  | { credits: number; amountMicrousd?: never; idempotencyKey?: string }
  | { amountMicrousd: number; credits?: never; idempotencyKey?: string };

type RequestResponse = (
  method: AomiHttpMethod,
  path: string,
  options?: AomiRequestOptions,
) => Promise<Response>;

export class AccountCreditsTransport {
  constructor(
    private readonly requestResponse: RequestResponse,
    private readonly basePath = "/v1/account/credits",
  ) {}

  async get(options: AomiCreditListOptions = {}): Promise<AomiCreditPosition> {
    const limit = options.limit ?? 25;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new RangeError("Credit activity limit must be between 1 and 100");
    }
    if (
      options.beforeId !== undefined &&
      (!Number.isInteger(options.beforeId) || options.beforeId < 1)
    ) {
      throw new RangeError("Credit activity cursor must be a positive integer");
    }
    const response = await this.requestResponse("GET", this.basePath, {
      query: { limit, before_id: options.beforeId },
    });
    return responseJson<AomiCreditPosition>(response, "fetch account credits");
  }

  async topUp(options: AomiCreditTopUpOptions): Promise<AomiCreditTopUpResult> {
    const amountMicrousd = topUpMicrousd(options);
    const idempotencyKey =
      options.idempotencyKey?.trim() || crypto.randomUUID();
    if (idempotencyKey.length > 200) {
      throw new RangeError("Credit top-up idempotency key is too long");
    }
    const response = await this.requestResponse(
      "POST",
      `${this.basePath}/top-up`,
      {
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          "X-Aomi-CSRF": "1",
        },
        body: { amount_microusd: amountMicrousd },
      },
    );
    const result = await responseJson<AomiCreditPosition>(
      response,
      "top up account credits",
    );
    const receipt = paymentReceiptFrom(response);
    return receipt ? { ...result, receipt } : result;
  }
}

export class AccountTransport {
  readonly credits: AccountCreditsTransport;
  constructor(requestResponse: RequestResponse) {
    this.credits = new AccountCreditsTransport(requestResponse);
  }
}

function topUpMicrousd(options: AomiCreditTopUpOptions): number {
  const scaled =
    options.credits === undefined
      ? options.amountMicrousd
      : options.credits * MICROUSD_PER_CREDIT;
  if (!Number.isSafeInteger(scaled)) {
    throw new TypeError(
      "Credit top-up must resolve to a whole, safe microusd amount",
    );
  }
  const min = MIN_CREDIT_TOP_UP * MICROUSD_PER_CREDIT;
  const max = MAX_CREDIT_TOP_UP * MICROUSD_PER_CREDIT;
  if (scaled < min || scaled > max) {
    throw new RangeError(
      `Credit top-up must be between ${MIN_CREDIT_TOP_UP.toLocaleString()} and ${MAX_CREDIT_TOP_UP.toLocaleString()} credits`,
    );
  }
  return scaled;
}

async function responseJson<T>(
  response: Response,
  operation: string,
): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Failed to ${operation}: HTTP ${response.status}${detail ? `\n${detail}` : ""}`,
    );
  }
  return (await response.json()) as T;
}

function paymentReceiptFrom(
  response: Response,
): AomiCreditPaymentReceipt | undefined {
  const header =
    response.headers.get("payment-response") ??
    response.headers.get("x-payment-response");
  if (!header) return undefined;
  try {
    const normalized = header.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(
      atob(
        normalized.padEnd(
          normalized.length + ((4 - (normalized.length % 4)) % 4),
          "=",
        ),
      ),
    ) as Record<string, unknown>;
    const transaction =
      typeof parsed.transaction === "string" ? parsed.transaction : undefined;
    const network =
      typeof parsed.network === "string" ? parsed.network : undefined;
    return transaction || network ? { transaction, network } : undefined;
  } catch {
    return undefined;
  }
}
