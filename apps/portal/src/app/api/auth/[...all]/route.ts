import { auth } from "@aomi-labs/auth/better-auth";
import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, PUT, PATCH, DELETE } = toNextJsHandler(auth);
