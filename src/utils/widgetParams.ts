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
  type ResolvedAomiChatWidgetParams,
} from '../types';

export function resolveWidgetParams(
  params: AomiChatWidgetParams,
): ResolvedAomiChatWidgetParams {
  const width = params.width || DEFAULT_WIDGET_WIDTH;
  const height = params.height || DEFAULT_WIDGET_HEIGHT;
  const maxHeight =
    typeof params.maxHeight === 'number' ? params.maxHeight : DEFAULT_MAX_HEIGHT;
  const interactionMode = params.interactionMode ?? DEFAULT_INTERACTION_MODE;
  const chainId = params.chainId ?? DEFAULT_CHAIN_ID;

  const theme = mergeTheme(DEFAULT_WIDGET_THEME, params.theme);
  const content = mergeContent(theme.content, params.content);

  const themedDefinition: AomiWidgetThemeDefinition = {
    ...theme,
    content,
  };

  return {
    appCode: params.appCode,
    width,
    height,
    maxHeight,
    baseUrl: params.baseUrl,
    sessionId: params.sessionId,
    interactionMode,
    renderSurface: params.renderSurface ?? DEFAULT_RENDER_SURFACE,
    welcomeMessage: params.welcomeMessage,
    placeholder: params.placeholder,
    chainId,
    supportedChains: params.supportedChains,
    content,
    theme: themedDefinition,
  };
}

function mergeTheme(
  base: AomiWidgetThemeDefinition,
  override?: AomiWidgetThemeConfig,
): AomiWidgetThemeDefinition {
  return {
    palette: {
      ...base.palette,
      ...(override?.palette ?? {}),
    },
    fonts: {
      ...base.fonts,
      ...(override?.fonts ?? {}),
    },
    images: {
      ...base.images,
      ...(override?.images ?? {}),
    },
    sounds: {
      ...base.sounds,
      ...(override?.sounds ?? {}),
    },
    content: mergeContent(base.content, override?.content),
  };
}

function mergeContent(
  base: AomiChatContentResolved,
  overrides?: Partial<AomiChatContentConfig>,
): AomiChatContentResolved {
  if (!overrides) return { ...base };

  return {
    welcomeTitle: overrides.welcomeTitle ?? base.welcomeTitle,
    assistantName: overrides.assistantName ?? base.assistantName,
    emptyStateMessage: overrides.emptyStateMessage ?? base.emptyStateMessage,
  };
}
