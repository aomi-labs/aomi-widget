export type AppSelectStateInput = {
  currentApp: string | null | undefined;
  effectiveApp: string | null | undefined;
};

export function formatAppLabel(app: string | null | undefined, placeholder: string) {
  if (!app) return placeholder;
  if (app === "khalani") return "Khalani Swaps";
  if (app === "defillama") return "DefiLlama";
  if (app === "dydx") return "dYdX";
  if (app === "lifi") return "LI.FI";
  if (app === "okx") return "OKX";
  if (app === "oneinch") return "1inch";
  if (app === "zerox") return "0x";
  return app;
}

export function getSelectedApp({
  currentApp,
  effectiveApp,
}: Pick<AppSelectStateInput, "currentApp" | "effectiveApp">) {
  return currentApp?.trim() || effectiveApp?.trim() || null;
}
