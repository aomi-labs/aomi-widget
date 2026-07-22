import { createWidgetSiweChallenge } from "@aomi-labs/account/widget-auth";
import {
  applyWidgetCors,
  widgetCorsPreflight,
} from "@portal/lib/widget-auth/cors";
import { widgetAuthErrorResponse } from "@portal/lib/widget-auth/response";
import { z } from "zod";

const requestSchema = z.object({
  wallet_address: z.string().min(1),
  chain_id: z.number().int().positive(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const parsed = requestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return applyWidgetCors(
        request,
        Response.json({ error: "invalid_request" }, { status: 400 }),
      );
    }
    const challenge = await createWidgetSiweChallenge({
      request,
      walletAddress: parsed.data.wallet_address,
      chainId: parsed.data.chain_id,
    });
    return applyWidgetCors(
      request,
      Response.json({
        nonce: challenge.nonce,
        domain: challenge.domain,
        uri: challenge.uri,
        issued_at: challenge.issuedAt,
        expiration_time: challenge.expirationTime,
      }),
    );
  } catch (error) {
    return widgetAuthErrorResponse(request, error, "SIWE nonce");
  }
}

export function OPTIONS(request: Request): Response {
  return widgetCorsPreflight(request, ["POST", "OPTIONS"]);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
