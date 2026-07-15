import { verifyWidgetSiweProof } from "@aomi-labs/account/widget-auth";
import {
  applyWidgetCors,
  widgetCorsPreflight,
} from "@portal/lib/widget-auth/cors";
import { widgetAuthErrorResponse } from "@portal/lib/widget-auth/response";
import { z } from "zod";

const requestSchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
  wallet_address: z.string().min(1),
  chain_id: z.number().int().positive(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return applyWidgetCors(
        request,
        Response.json({ error: "invalid_request" }, { status: 400 }),
      );
    }
    const session = await verifyWidgetSiweProof({
      request,
      message: parsed.data.message,
      signature: parsed.data.signature,
      walletAddress: parsed.data.wallet_address,
      chainId: parsed.data.chain_id,
    });
    return applyWidgetCors(
      request,
      Response.json({
        access_token: session.token,
        token_type: session.tokenType,
        expires_at: session.expiresAt,
        user_id: session.userId,
      }),
    );
  } catch (error) {
    return widgetAuthErrorResponse(request, error, "SIWE verify");
  }
}

export function OPTIONS(request: Parameters<typeof widgetCorsPreflight>[0]) {
  return widgetCorsPreflight(request, ["POST", "OPTIONS"]);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
