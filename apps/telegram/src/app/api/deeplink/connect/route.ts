import { NextRequest, NextResponse } from "next/server";

import { startConnect } from "@/lib/wallet-state/store";
import { getServerWcClient } from "@/lib/wc/server-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = typeof body?.user_id === "string" ? body.user_id.trim() : "";

    if (!userId) {
      return NextResponse.json({ error: "missing user_id" }, { status: 400 });
    }

    const pending = startConnect(userId, "server_wc");
    const { uri, expiresAt } = await getServerWcClient().connect(userId);
    return NextResponse.json({
      uri,
      expiresAt,
      state: pending,
      operationId: pending.activeOperation?.operationId,
      label: pending.label,
    });
  } catch (error) {
    console.error("Error initiating server-side WalletConnect:", error);
    return NextResponse.json(
      { error: "failed_to_initiate_walletconnect" },
      { status: 500 },
    );
  }
}
