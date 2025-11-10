import {
  DEFAULT_CHAIN_ID,
  DEFAULT_MAX_HEIGHT,
  DEFAULT_RENDER_SURFACE,
  DEFAULT_WIDGET_HEIGHT,
  DEFAULT_WIDGET_THEME,
  DEFAULT_WIDGET_WIDTH,
} from '../types/constants';
import {
  type OptionalParam,
  type AomiWidgetThemeConfig,
  type AomiWidgetThemeDefinition,
  type ResolvedParams,
} from '../types/interfaces';

export function resolveWidgetParams(
  params: OptionalParam,
): ResolvedParams {
  const width = params.width || DEFAULT_WIDGET_WIDTH;
  const height = params.height || DEFAULT_WIDGET_HEIGHT;
  const maxHeight =
    typeof params.maxHeight === 'number' ? params.maxHeight : DEFAULT_MAX_HEIGHT;
  const chainId = params.chainId ?? DEFAULT_CHAIN_ID;

  const theme = mergeTheme(DEFAULT_WIDGET_THEME, params.theme);

  return {
    appCode: params.appCode,
    width,
    height,
    maxHeight,
    baseUrl: params.baseUrl,
    sessionId: params.sessionId,
    renderSurface: params.surfaceMode ?? DEFAULT_RENDER_SURFACE,
    welcomeMessage: params.welcomeMessage,
    placeholder: params.placeholder,
    chainId,
    supportedChains: params.supportedChains,
    theme,
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
  };
}
