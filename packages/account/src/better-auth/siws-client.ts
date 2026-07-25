import type { aomiSiwsPlugin } from "./siws";

export function aomiSiwsClient() {
  return {
    id: "aomi-siws",
    $InferServerPlugin: {} as ReturnType<typeof aomiSiwsPlugin>,
    pathMethods: {
      "/siws/nonce": "POST",
    },
  } as const;
}
