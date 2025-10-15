// ThemeManager - Handles theme configuration and application

import type {
  AomiChatTheme,
  AomiChatWidgetPalette,
  AomiChatWidgetPaletteColors,
  ThemeDefinition,
} from '../types';
import {
  PREDEFINED_THEMES,
  THEME_PALETTES,
  CSS_CLASSES,
} from '../types/constants';
import { createConfigurationError } from '../types/errors';

/*
 * ============================================================================
 * THEME MANAGER CLASS
 * ============================================================================
 */

export class ThemeManager {
  private currentTheme: ThemeDefinition;
  private customPalette: AomiChatWidgetPaletteColors | null = null;

  constructor(theme?: AomiChatTheme | AomiChatWidgetPalette) {
    this.currentTheme = this.resolveTheme(theme);
  }

  /*
   * ============================================================================
   * PUBLIC API
   * ============================================================================
   */

  /**
   * Updates the current theme
   */
  public updateTheme(theme?: AomiChatTheme | AomiChatWidgetPalette): void {
    this.currentTheme = this.resolveTheme(theme);
    this.customPalette = this.isCustomPalette(theme) ? theme : null;
  }

  /**
   * Gets the current computed theme
   */
  public getComputedTheme(): ThemeDefinition {
    if (this.customPalette) {
      return {
        ...this.currentTheme,
        palette: this.customPalette,
      };
    }
    return this.currentTheme;
  }

  /**
   * Gets a specific color from the current theme
   */
  public getColor(colorKey: keyof AomiChatWidgetPaletteColors): string {
    const theme = this.getComputedTheme();
    return theme.palette[colorKey] || THEME_PALETTES.light[colorKey];
  }

  /**
   * Gets the CSS class name for the current theme
   */
  public getThemeClass(): string {
    const baseTheme = (this.customPalette as any)?.baseTheme || this.getBaseThemeName();

    switch (baseTheme) {
      case 'light':
        return CSS_CLASSES.THEME_LIGHT;
      case 'dark':
        return CSS_CLASSES.THEME_DARK;
      case 'terminal':
        return CSS_CLASSES.THEME_TERMINAL;
      case 'neon':
        return CSS_CLASSES.THEME_NEON;
      case 'minimal':
        return CSS_CLASSES.THEME_MINIMAL;
      default:
        return CSS_CLASSES.THEME_LIGHT;
    }
  }

  /**
   * Gets the font family for the current theme
   */
  public getFontFamily(): string {
    return this.currentTheme.fonts?.primary || 'system-ui, sans-serif';
  }

  /**
   * Gets the monospace font family for the current theme
   */
  public getMonospaceFontFamily(): string {
    return this.currentTheme.fonts?.monospace || 'monospace';
  }

  /**
   * Gets a spacing value for the current theme
   */
  public getSpacing(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): string {
    return this.currentTheme.spacing?.[size] || '8px';
  }

  /**
   * Gets a border radius value for the current theme
   */
  public getBorderRadius(size: 'sm' | 'md' | 'lg'): string {
    return this.currentTheme.borderRadius?.[size] || '4px';
  }

  /**
   * Gets a shadow value for the current theme
   */
  public getShadow(size: 'sm' | 'md' | 'lg'): string {
    return this.currentTheme.shadows?.[size] || 'none';
  }

  /**
   * Generates CSS custom properties for the current theme
   */
  public getCSSCustomProperties(): Record<string, string> {
    const theme = this.getComputedTheme();
    const properties: Record<string, string> = {};

    // Color properties
    Object.entries(theme.palette).forEach(([key, value]) => {
      properties[`--aomi-color-${key}`] = value;
    });

    // Font properties
    if (theme.fonts?.primary) {
      properties['--aomi-font-primary'] = theme.fonts.primary;
    }
    if (theme.fonts?.monospace) {
      properties['--aomi-font-monospace'] = theme.fonts.monospace;
    }

    // Spacing properties
    if (theme.spacing) {
      Object.entries(theme.spacing).forEach(([key, value]) => {
        properties[`--aomi-spacing-${key}`] = value;
      });
    }

    // Border radius properties
    if (theme.borderRadius) {
      Object.entries(theme.borderRadius).forEach(([key, value]) => {
        properties[`--aomi-radius-${key}`] = value;
      });
    }

    // Shadow properties
    if (theme.shadows) {
      Object.entries(theme.shadows).forEach(([key, value]) => {
        properties[`--aomi-shadow-${key}`] = value;
      });
    }

    return properties;
  }

  /**
   * Applies the theme to a DOM element
   */
  public applyThemeToElement(element: HTMLElement): void {
    const properties = this.getCSSCustomProperties();

    Object.entries(properties).forEach(([property, value]) => {
      element.style.setProperty(property, value);
    });

    // Add theme class
    element.classList.add(this.getThemeClass());
  }

  /**
   * Generates CSS string for the current theme
   */
  public generateCSS(selector = '.aomi-chat-widget'): string {
    const properties = this.getCSSCustomProperties();
    const cssRules: string[] = [];

    // Main theme CSS
    const mainRule = Object.entries(properties)
      .map(([property, value]) => `  ${property}: ${value};`)
      .join('\n');

    cssRules.push(`${selector} {\n${mainRule}\n}`);

    // Add component-specific styles
    cssRules.push(this.generateComponentCSS(selector));

    return cssRules.join('\n\n');
  }

  /**
   * Destroys the theme manager
   */
  public destroy(): void {
    // Clean up any resources if needed
  }

  /*
   * ============================================================================
   * PRIVATE METHODS
   * ============================================================================
   */

  private resolveTheme(theme?: AomiChatTheme | AomiChatWidgetPalette): ThemeDefinition {
    if (!theme) {
      return PREDEFINED_THEMES.light;
    }

    if (typeof theme === 'string') {
      const predefinedTheme = PREDEFINED_THEMES[theme];
      if (!predefinedTheme) {
        throw createConfigurationError(`Unknown theme: ${theme}`);
      }
      return predefinedTheme;
    }

    if (this.isCustomPalette(theme)) {
      const baseTheme = PREDEFINED_THEMES[theme.baseTheme];
      if (!baseTheme) {
        throw createConfigurationError(`Unknown base theme: ${theme.baseTheme}`);
      }

      return {
        ...baseTheme,
        palette: {
          primary: theme.primary,
          background: theme.background,
          surface: theme.surface,
          text: theme.text,
          textSecondary: theme.textSecondary,
          border: theme.border,
          success: theme.success,
          error: theme.error,
          warning: theme.warning,
          accent: theme.accent,
        },
      };
    }

    throw createConfigurationError('Invalid theme configuration');
  }

  private isCustomPalette(theme: unknown): theme is AomiChatWidgetPalette {
    if (typeof theme !== 'object' || theme === null) return false;

    const palette = theme as Record<string, unknown>;

    return (
      typeof palette.baseTheme === 'string' &&
      typeof palette.primary === 'string' &&
      typeof palette.background === 'string' &&
      typeof palette.surface === 'string' &&
      typeof palette.text === 'string' &&
      typeof palette.textSecondary === 'string' &&
      typeof palette.border === 'string' &&
      typeof palette.success === 'string' &&
      typeof palette.error === 'string' &&
      typeof palette.warning === 'string' &&
      typeof palette.accent === 'string'
    );
  }

  private getBaseThemeName(): AomiChatTheme {
    // Find the base theme name by comparing palettes
    for (const [themeName, themeDefinition] of Object.entries(PREDEFINED_THEMES)) {
      if (this.isPaletteEqual(themeDefinition.palette, this.currentTheme.palette)) {
        return themeName as AomiChatTheme;
      }
    }
    return 'light'; // fallback
  }

  private isPaletteEqual(
    palette1: AomiChatWidgetPaletteColors,
    palette2: AomiChatWidgetPaletteColors,
  ): boolean {
    const keys = Object.keys(palette1) as (keyof AomiChatWidgetPaletteColors)[];
    return keys.every(key => palette1[key] === palette2[key]);
  }

  private generateComponentCSS(selector: string): string {
    return `
/* Chat Interface */
${selector} .${CSS_CLASSES.CHAT_INTERFACE} {
  background-color: var(--aomi-color-background);
  color: var(--aomi-color-text);
  border: 1px solid var(--aomi-color-border);
  border-radius: var(--aomi-radius-md);
  font-family: var(--aomi-font-primary);
}

/* Message List */
${selector} .${CSS_CLASSES.MESSAGE_LIST} {
  padding: var(--aomi-spacing-md);
  overflow-y: auto;
}

/* Message Input */
${selector} .${CSS_CLASSES.MESSAGE_INPUT} {
  background-color: var(--aomi-color-surface);
  border: 1px solid var(--aomi-color-border);
  border-radius: var(--aomi-radius-sm);
  color: var(--aomi-color-text);
  padding: var(--aomi-spacing-sm);
  font-family: var(--aomi-font-primary);
}

${selector} .${CSS_CLASSES.MESSAGE_INPUT}:focus {
  outline: none;
  border-color: var(--aomi-color-primary);
  box-shadow: 0 0 0 2px var(--aomi-color-primary)25;
}

/* Wallet Status */
${selector} .${CSS_CLASSES.WALLET_STATUS} {
  background-color: var(--aomi-color-surface);
  color: var(--aomi-color-textSecondary);
  padding: var(--aomi-spacing-sm);
  border-radius: var(--aomi-radius-sm);
  font-size: 12px;
}

${selector} .${CSS_CLASSES.WALLET_STATUS}.${CSS_CLASSES.CONNECTED} {
  color: var(--aomi-color-success);
}

${selector} .${CSS_CLASSES.WALLET_STATUS}.${CSS_CLASSES.DISCONNECTED} {
  color: var(--aomi-color-error);
}

/* Typing Indicator */
${selector} .${CSS_CLASSES.TYPING_INDICATOR} {
  color: var(--aomi-color-textSecondary);
  font-style: italic;
  padding: var(--aomi-spacing-sm);
}

/* State Classes */
${selector}.${CSS_CLASSES.LOADING} {
  opacity: 0.7;
  pointer-events: none;
}

${selector}.${CSS_CLASSES.ERROR} {
  border-color: var(--aomi-color-error);
}

${selector}.${CSS_CLASSES.DISABLED} {
  opacity: 0.5;
  pointer-events: none;
}

/* Terminal Theme Specific */
${selector}.${CSS_CLASSES.THEME_TERMINAL} {
  font-family: var(--aomi-font-monospace);
  background-color: var(--aomi-color-background);
}

${selector}.${CSS_CLASSES.THEME_TERMINAL} .${CSS_CLASSES.CHAT_INTERFACE} {
  border: 1px solid var(--aomi-color-primary);
  box-shadow: var(--aomi-shadow-md);
}

/* Neon Theme Specific */
${selector}.${CSS_CLASSES.THEME_NEON} {
  background: linear-gradient(135deg, var(--aomi-color-background), var(--aomi-color-surface));
}

${selector}.${CSS_CLASSES.THEME_NEON} .${CSS_CLASSES.CHAT_INTERFACE} {
  border: 1px solid var(--aomi-color-primary);
  box-shadow: 0 0 20px var(--aomi-color-primary)50;
}`;
  }
}

/*
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */

/**
 * Creates a theme manager instance
 */
export function createThemeManager(theme?: AomiChatTheme | AomiChatWidgetPalette): ThemeManager {
  return new ThemeManager(theme);
}

/**
 * Gets all available predefined themes
 */
export function getAvailableThemes(): Record<string, ThemeDefinition> {
  return { ...PREDEFINED_THEMES };
}

/**
 * Validates a custom palette
 */
export function validateCustomPalette(palette: unknown): palette is AomiChatWidgetPalette {
  if (typeof palette !== 'object' || palette === null) return false;

  const p = palette as Record<string, unknown>;
  const requiredKeys: (keyof AomiChatWidgetPalette)[] = [
    'baseTheme', 'primary', 'background', 'surface', 'text', 'textSecondary',
    'border', 'success', 'error', 'warning', 'accent',
  ];

  return requiredKeys.every(key => typeof p[key] === 'string');
}

/**
 * Creates a custom palette from a base theme
 */
export function createCustomPalette(
  baseTheme: AomiChatTheme,
  overrides: Partial<AomiChatWidgetPaletteColors>,
): AomiChatWidgetPalette {
  const basePalette = THEME_PALETTES[baseTheme];
  if (!basePalette) {
    throw createConfigurationError(`Unknown base theme: ${baseTheme}`);
  }

  return {
    baseTheme,
    ...basePalette,
    ...overrides,
  };
}
