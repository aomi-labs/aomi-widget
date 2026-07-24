import type { AomiWidgetAuthConfig, AuthMethodId } from "./types";

export function providerAuth(input: {
  provider: string;
  environment: string;
  methods?: readonly AuthMethodId[];
  config: unknown;
}): AomiWidgetAuthConfig {
  // `ProvidersConfig` has an open `[providerId: string]: unknown` index
  // signature, so a `satisfies ProvidersConfig` here would be vacuous. The
  // return type already constrains the shape via `AomiWidgetAuthConfig`.
  return {
    provider: input.provider,
    environment: input.environment,
    methods: input.methods,
    providers: {
      [input.provider]: input.config,
    },
  };
}
