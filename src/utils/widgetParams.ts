import {
  DEFAULT_CHAIN_ID,
  DEFAULT_INTERACTION_MODE,
  DEFAULT_MAX_HEIGHT,
  DEFAULT_RENDER_SURFACE,
  DEFAULT_WIDGET_HEIGHT,
  DEFAULT_WIDGET_THEME,
  DEFAULT_WIDGET_WIDTH,
} from '../types/constants';
import {
  type AomiChatContentConfig,
  type AomiChatContentResolved,
  type AomiChatWidgetParams,
  type AomiWidgetThemeConfig,
  type AomiWidgetThemeDefinition,
  type FlexibleConfig,
  type ResolvedAomiChatWidgetParams,
  type WidgetResolutionContext,
} from '../types';
import {
  resolveFlexibleConfigValue,
} from './flexibleConfig';

const DIMENSION_FALLBACKS: Record<'width' | 'height', string> = {
  width: DEFAULT_WIDGET_WIDTH,
  height: DEFAULT_WIDGET_HEIGHT,
};

export function resolveWidgetParams(
  params: AomiChatWidgetParams,
  context: WidgetResolutionContext = {},
): ResolvedAomiChatWidgetParams {
  const mode = context.mode ?? params.interactionMode ?? DEFAULT_INTERACTION_MODE;
  const chainId =
    context.chainId ??
    params.chainId ??
    DEFAULT_CHAIN_ID;

  const resolutionContext: WidgetResolutionContext = {
    chainId,
    mode,
  };

  const width = resolveDimension(params.width, resolutionContext, 'width');
  const height = resolveDimension(params.height, resolutionContext, 'height');
  const maxHeight = resolveNumber(params.maxHeight, resolutionContext, DEFAULT_MAX_HEIGHT);
  const welcomeMessage = resolveFlexibleConfigValue(params.welcomeMessage, resolutionContext);
  const placeholder = resolveFlexibleConfigValue(params.placeholder, resolutionContext);
  const contentOverrides = resolveContent(params.content, resolutionContext);
  const themeOverride = resolveFlexibleConfigValue(params.theme, resolutionContext);

  const theme = mergeTheme(
    DEFAULT_WIDGET_THEME,
    themeOverride,
    resolutionContext,
    contentOverrides,
  );

  return {
    appCode: params.appCode,
    width,
    height,
    maxHeight,
    baseUrl: params.baseUrl,
    sessionId: params.sessionId,
    interactionMode: mode,
    renderSurface: params.renderSurface ?? DEFAULT_RENDER_SURFACE,
    welcomeMessage,
    placeholder,
    chainId,
    supportedChains: params.supportedChains,
    content: theme.content,
    theme,
  };
}

function resolveDimension(
  dimension: FlexibleConfig<string> | undefined,
  context: WidgetResolutionContext,
  axis: 'width' | 'height',
): string {
  const resolved = resolveFlexibleConfigValue(dimension, context);
  return resolved || DIMENSION_FALLBACKS[axis];
}

function resolveNumber(
  value: FlexibleConfig<number> | undefined,
  context: WidgetResolutionContext,
  fallback: number,
): number {
  const resolved = resolveFlexibleConfigValue(value, context);
  return typeof resolved === 'number' ? resolved : fallback;
}

export function resolveContent(
  config: AomiChatContentConfig | undefined,
  context: WidgetResolutionContext,
): Partial<AomiChatContentResolved> {
  if (!config) return {};

  const resolved: Partial<AomiChatContentResolved> = {};
  if (config.welcomeTitle !== undefined) {
    const value = resolveFlexibleConfigValue(config.welcomeTitle, context);
    if (value) resolved.welcomeTitle = value;
  }
  if (config.assistantName !== undefined) {
    const value = resolveFlexibleConfigValue(config.assistantName, context);
    if (value) resolved.assistantName = value;
  }
  if (config.emptyStateMessage !== undefined) {
    const value = resolveFlexibleConfigValue(config.emptyStateMessage, context);
    if (value) resolved.emptyStateMessage = value;
  }

  return resolved;
}

function mergeContent(
  base: AomiChatContentResolved,
  overrides: Partial<AomiChatContentResolved> = {},
): AomiChatContentResolved {
  return {
    welcomeTitle: overrides.welcomeTitle ?? base.welcomeTitle,
    assistantName: overrides.assistantName ?? base.assistantName,
    emptyStateMessage: overrides.emptyStateMessage ?? base.emptyStateMessage,
  };
}

function mergeTheme(
  base: AomiWidgetThemeDefinition,
  override: AomiWidgetThemeConfig | undefined,
  context: WidgetResolutionContext,
  contentOverrides: Partial<AomiChatContentResolved>,
): AomiWidgetThemeDefinition {
  const palette = {
    ...base.palette,
    ...(override?.palette ?? {}),
  };

  const fonts = {
    ...base.fonts,
    ...(override?.fonts ?? {}),
  };

  const images = {
    ...base.images,
    ...(override?.images ?? {}),
  };

  const sounds = {
    ...base.sounds,
    ...(override?.sounds ?? {}),
  };

  const themeContent = resolveContent(override?.content, context);
  const mergedContent = mergeContent(
    base.content,
    {
      ...themeContent,
      ...contentOverrides,
    },
  );

  return {
    palette,
    fonts,
    images,
    sounds,
    content: mergedContent,
  };
}
