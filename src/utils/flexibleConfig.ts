import {
  InteractionMode,
  type FlexibleConfig,
  type PerChainConfig,
  type PerInteractionModeConfig,
  type WidgetResolutionContext,
} from '../types';

const DIGIT_KEY_REGEX = /^\d+$/;
const MODE_KEYS = Object.values(InteractionMode);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isPerChainConfig<T>(
  config: FlexibleConfig<T> | undefined,
): config is PerChainConfig<T> {
  if (!isRecord(config)) return false;

  const keys = Object.keys(config);
  if (keys.length === 0) return false;

  return keys.every((key) => DIGIT_KEY_REGEX.test(key));
}

export function isPerInteractionModeConfig<T>(
  config: FlexibleConfig<T> | undefined,
): config is PerInteractionModeConfig<T> {
  if (!isRecord(config)) return false;

  const keys = Object.keys(config);
  if (keys.length === 0) return false;

  return keys.every((key) => MODE_KEYS.includes(key as InteractionMode));
}

export function resolveFlexibleConfigValue<T>(
  config: FlexibleConfig<T> | undefined,
  context: WidgetResolutionContext,
): T | undefined {
  if (config === undefined || config === null) {
    return undefined;
  }

  if (isPerInteractionModeConfig(config)) {
    const modeValue = context.mode ? config[context.mode] : undefined;
    if (modeValue === undefined) return undefined;

    return resolveFlexibleConfigValue(
      modeValue as FlexibleConfig<T>,
      context,
    );
  }

  if (isPerChainConfig(config)) {
    const chainValue = context.chainId ? config[context.chainId] : undefined;
    if (chainValue === undefined) return undefined;

    return resolveFlexibleConfigValue(
      chainValue as FlexibleConfig<T>,
      context,
    );
  }

  return config as T;
}

export function forEachFlexibleValue<T>(
  config: FlexibleConfig<T> | undefined,
  callback: (value: T) => void,
): void {
  if (config === undefined || config === null) {
    return;
  }

  if (isPerInteractionModeConfig(config) || isPerChainConfig(config)) {
    Object.values(config).forEach((value) => {
      forEachFlexibleValue(value as FlexibleConfig<T>, callback);
    });
    return;
  }

  callback(config as T);
}
