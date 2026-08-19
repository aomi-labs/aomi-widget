import { createHmac, timingSafeEqual } from "node:crypto";

const VERSION = 1;

type CursorClaims = {
  v: typeof VERSION;
  sub: string;
  session: string;
  epoch: string;
  sequence: number;
  exp: number;
};

export class CursorError extends Error {
  constructor(readonly code: "invalid_cursor" | "cursor_expired") {
    super(code);
  }
}

export class CursorCodec {
  constructor(
    private readonly secret: Uint8Array,
    private readonly ttlSeconds = 15 * 60,
  ) {
    if (secret.byteLength < 32) throw new Error("cursor_secret_too_short");
  }

  issue(input: {
    subject: string;
    session: string;
    epoch: string;
    sequence: number;
    now?: number;
  }): string {
    const now = input.now ?? Math.floor(Date.now() / 1_000);
    const claims: CursorClaims = {
      v: VERSION,
      sub: input.subject,
      session: input.session,
      epoch: input.epoch,
      sequence: input.sequence,
      exp: now + this.ttlSeconds,
    };
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    return `cur_${payload}.${this.signature(payload)}`;
  }

  verify(
    cursor: string,
    expected: { subject: string; session: string; now?: number },
  ): { epoch: string; sequence: number } {
    const match = /^cur_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(cursor);
    if (!match) throw new CursorError("invalid_cursor");
    const signature = Buffer.from(match[2], "base64url");
    const expectedSignature = Buffer.from(
      this.signature(match[1]),
      "base64url",
    );
    if (
      signature.byteLength !== expectedSignature.byteLength ||
      !timingSafeEqual(signature, expectedSignature)
    ) {
      throw new CursorError("invalid_cursor");
    }

    let claims: CursorClaims;
    try {
      claims = JSON.parse(Buffer.from(match[1], "base64url").toString("utf8"));
    } catch {
      throw new CursorError("invalid_cursor");
    }
    if (
      claims.v !== VERSION ||
      claims.sub !== expected.subject ||
      claims.session !== expected.session ||
      typeof claims.epoch !== "string" ||
      !Number.isSafeInteger(claims.sequence) ||
      claims.sequence < 0
    ) {
      throw new CursorError("invalid_cursor");
    }
    if (claims.exp <= (expected.now ?? Math.floor(Date.now() / 1_000))) {
      throw new CursorError("cursor_expired");
    }
    return { epoch: claims.epoch, sequence: claims.sequence };
  }

  private signature(payload: string): string {
    return createHmac("sha256", this.secret)
      .update(payload)
      .digest("base64url");
  }
}
