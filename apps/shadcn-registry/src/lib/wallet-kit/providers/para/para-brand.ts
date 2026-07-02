"use client";

import { registerWalletBrand } from "../../catalog/wallet-branding";

/**
 * Canonical brand key for Para-backed wallets. Registering it here keeps the
 * shared brand resolver (`runtime/evm/brands`) free of any hardcoded provider
 * name — generic code resolves "para" only because this module ran. Importing
 * `PARA_BRAND_KEY` from a used call site guarantees the registration executes.
 */
export const PARA_BRAND_KEY = "para";

registerWalletBrand({ key: PARA_BRAND_KEY, matchers: ["para"] });
