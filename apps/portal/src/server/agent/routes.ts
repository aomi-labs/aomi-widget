import type { AomiPublicV1 } from "@aomi-labs/client";
import { resolvePortalPrincipal } from "@portal/lib/widget-auth/principal";

import { decodeApplicationId } from "./application-id";
import { listApplications, resolveApplication } from "./application-discovery";
import type { ActionResult, StartTurn } from "./facade";
import {
  idempotencyKey,
  jsonBody,
  PublicHttpError,
  publicFailure,
  publicJson,
} from "./http";
import { resolveAgentPrincipal } from "./public-auth";
import { createAgentFacade } from "./runtime";

type Schemas = AomiPublicV1["schemas"];

export async function startAgentTurn(request: Request): Promise<Response> {
  try {
    const body = await jsonBody<StartTurn>(request);
    validateStartTurn(body);
    const applicationId = decodeApplicationId(body.application);
    const principal = await resolveAgentPrincipal(request, {
      session: body.session,
      applicationId,
      allowGuest: true,
    });
    const delta = await createAgentFacade(principal).chat({
      request: body,
      idempotencyKey: idempotencyKey(request),
      paymentSignature: request.headers.get("payment-signature") ?? undefined,
    });
    return publicJson(delta);
  } catch (error) {
    return publicFailure(error);
  }
}

export async function readAgentDelta(
  request: Request,
  session: string,
): Promise<Response> {
  try {
    validateSession(session);
    const principal = await resolveAgentPrincipal(request, {
      session,
      allowGuest: true,
    });
    const url = new URL(request.url);
    const wait = Number(url.searchParams.get("wait") ?? 0);
    const delta = await createAgentFacade(principal).check({
      session,
      cursor: url.searchParams.get("cursor") ?? undefined,
      waitMs: Number.isFinite(wait) ? wait : 0,
    });
    if (request.headers.get("accept")?.includes("text/event-stream")) {
      return new Response(
        `id: ${delta.cursor}\nevent: delta\ndata: ${JSON.stringify(delta)}\n\n`,
        {
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-store",
            vary: "Origin, Accept",
          },
        },
      );
    }
    return publicJson(delta);
  } catch (error) {
    return publicFailure(error);
  }
}

export async function submitAgentAction(
  request: Request,
  session: string,
  action: string,
): Promise<Response> {
  try {
    validateSession(session);
    if (!/^act_[A-Za-z0-9_-]+$/.test(action)) {
      throw new PublicHttpError(400, "action_not_found", "Invalid action id");
    }
    const result = await jsonBody<ActionResult>(request);
    const principal = await resolveAgentPrincipal(request, {
      session,
      allowGuest: true,
    });
    const accepted = await createAgentFacade(principal).submitAction({
      session,
      action,
      result,
      idempotencyKey: idempotencyKey(request),
    });
    return publicJson({ action: accepted });
  } catch (error) {
    return publicFailure(error);
  }
}

export async function interruptAgentTurn(
  request: Request,
  session: string,
): Promise<Response> {
  try {
    validateSession(session);
    const principal = await resolveAgentPrincipal(request, {
      session,
      allowGuest: true,
    });
    const delta = await createAgentFacade(principal).interrupt({
      session,
      idempotencyKey: idempotencyKey(request),
    });
    return publicJson({ turn: delta.turn, cursor: delta.cursor });
  } catch (error) {
    return publicFailure(error);
  }
}

export async function listAgentSessions(request: Request): Promise<Response> {
  try {
    const principal = await resolveAgentPrincipal(request, {
      allowGuest: false,
    });
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    return publicJson(
      await createAgentFacade(principal).sessions({
        cursor: url.searchParams.get("cursor") ?? undefined,
        limit: Number.isFinite(limit) ? limit : 20,
      }),
    );
  } catch (error) {
    return publicFailure(error);
  }
}

export async function updateAgentSession(
  request: Request,
  session: string,
): Promise<Response> {
  try {
    validateSession(session);
    const body = await jsonBody<{ title?: string; archived?: boolean }>(
      request,
    );
    if (body.title === undefined && body.archived === undefined) {
      throw new PublicHttpError(400, "session_not_found", "Update is empty");
    }
    const principal = await resolveAgentPrincipal(request, {
      allowGuest: false,
    });
    return publicJson(
      await createAgentFacade(principal).updateSession({
        session,
        title: body.title,
        archived: body.archived,
        idempotencyKey: idempotencyKey(request),
      }),
    );
  } catch (error) {
    return publicFailure(error);
  }
}

export async function deleteAgentSession(
  request: Request,
  session: string,
): Promise<Response> {
  try {
    validateSession(session);
    const principal = await resolveAgentPrincipal(request, {
      allowGuest: false,
    });
    await createAgentFacade(principal).deleteSession({
      session,
      idempotencyKey: idempotencyKey(request),
    });
    return new Response(null, {
      status: 204,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return publicFailure(error);
  }
}

export async function listPublicApps(request: Request): Promise<Response> {
  try {
    const principal = await resolvePortalPrincipal(request);
    const apps = await listApplications({
      includePrivate: principal.kind !== "anonymous",
    });
    return publicJson({ apps: apps.map(publicApplication) });
  } catch (error) {
    return publicFailure(error);
  }
}

export async function getPublicApp(
  request: Request,
  application: string,
): Promise<Response> {
  try {
    const principal = await resolvePortalPrincipal(request);
    return publicJson(
      publicApplication(
        await resolveApplication(application, {
          includePrivate: principal.kind !== "anonymous",
        }),
      ),
    );
  } catch (error) {
    return publicFailure(error);
  }
}

export function listPublicChains(): Response {
  return publicJson({
    chains: [
      {
        family: "evm",
        id: 1,
        name: "Ethereum",
        capabilities: [
          "externalTransaction",
          "personalSign",
          "typedDataSign",
          "accountAbstraction",
        ],
      },
      {
        family: "evm",
        id: 8453,
        name: "Base",
        capabilities: [
          "externalTransaction",
          "personalSign",
          "typedDataSign",
          "accountAbstraction",
        ],
      },
      {
        family: "svm",
        id: "solana:mainnet",
        name: "Solana",
        capabilities: ["externalTransaction", "messageSign", "transactionSign"],
      },
    ] satisfies Schemas["Chain"][],
  });
}

function validateStartTurn(body: StartTurn): void {
  validateSession(body?.session);
  if (
    typeof body.message !== "string" ||
    !body.message.trim() ||
    body.message.length > 65_536
  ) {
    throw new PublicHttpError(
      400,
      "payload_too_large",
      "Message is empty or too large",
    );
  }
  if (typeof body.application !== "string") {
    throw new PublicHttpError(
      400,
      "app_not_authorized",
      "Application is required",
    );
  }
}

function validateSession(session: string): void {
  if (!/^sess_[A-Za-z0-9_-]{22,}$/.test(session)) {
    throw new PublicHttpError(400, "session_not_found", "Invalid session id");
  }
}

function publicApplication(
  application: Awaited<ReturnType<typeof resolveApplication>>,
) {
  const { internalId: _, isPublic: __, ...publicFields } = application;
  return publicFields;
}
