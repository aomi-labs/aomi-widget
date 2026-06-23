import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@portal/lib/mcp-auth";

export const runtime = "nodejs";

export const { GET, POST } = toNextJsHandler(auth);
