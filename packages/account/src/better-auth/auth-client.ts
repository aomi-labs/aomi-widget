"use client";

import { createAuthClient } from "better-auth/react";
import { siweClient } from "better-auth/client/plugins";
import { aomiSiwsClient } from "./siws-client";

export const authClient = createAuthClient({
  plugins: [siweClient(), aomiSiwsClient()],
});
