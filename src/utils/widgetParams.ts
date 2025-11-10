import {
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
} from '../types/interface';

export function resolveWidgetParams(
  params: OptionalParam,
): ResolvedParams {
  const width = params.width || DEFAULT_WIDGET_WIDTH;
  const height = params.height || DEFAULT_WIDGET_HEIGHT;
  const theme = mergeTheme(DEFAULT_WIDGET_THEME, params.theme);

  return {
    width,
    height,
    renderSurface: params.surfaceMode ?? DEFAULT_RENDER_SURFACE,
    placeholder: params.placeholder,
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
