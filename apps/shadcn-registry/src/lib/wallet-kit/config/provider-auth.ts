import type {
  AomiWidgetAuthConfig,
  AuthMethodId,
  ProvidersConfig,
} from "./types";

export function providerAuth(input: {
  provider: string;
  environment: string;
  methods?: readonly AuthMethodId[];
  config: unknown;
}): AomiWidgetAuthConfig {
  return {
    provider: input.provider,
    environment: input.environment,
    methods: input.methods,
    providers: {
      [input.provider]: input.config,
    } satisfies ProvidersConfig,
  };
}
