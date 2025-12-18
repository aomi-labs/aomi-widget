import type { AomiChatTheme, AomiChatWidgetPalette, AomiChatWidgetPaletteColors, ThemeDefinition } from '../types';
export declare class ThemeManager {
    private currentTheme;
    private customPalette;
    constructor(theme?: AomiChatTheme | AomiChatWidgetPalette);
    /**
     * Updates the current theme
     */
    updateTheme(theme?: AomiChatTheme | AomiChatWidgetPalette): void;
    /**
     * Gets the current computed theme
     */
    getComputedTheme(): ThemeDefinition;
    /**
     * Gets a specific color from the current theme
     */
    getColor(colorKey: keyof AomiChatWidgetPaletteColors): string;
    /**
     * Gets the CSS class name for the current theme
     */
    getThemeClass(): string;
    /**
     * Gets the font family for the current theme
     */
    getFontFamily(): string;
    /**
     * Gets the monospace font family for the current theme
     */
    getMonospaceFontFamily(): string;
    /**
     * Gets a spacing value for the current theme
     */
    getSpacing(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): string;
    /**
     * Gets a border radius value for the current theme
     */
    getBorderRadius(size: 'sm' | 'md' | 'lg'): string;
    /**
     * Gets a shadow value for the current theme
     */
    getShadow(size: 'sm' | 'md' | 'lg'): string;
    /**
     * Generates CSS custom properties for the current theme
     */
    getCSSCustomProperties(): Record<string, string>;
    /**
     * Applies the theme to a DOM element
     */
    applyThemeToElement(element: HTMLElement): void;
    /**
     * Generates CSS string for the current theme
     */
    generateCSS(selector?: string): string;
    /**
     * Destroys the theme manager
     */
    destroy(): void;
    private resolveTheme;
    private isCustomPalette;
    private getBaseThemeName;
    private isPaletteEqual;
    private generateComponentCSS;
}
/**
 * Creates a theme manager instance
 */
export declare function createThemeManager(theme?: AomiChatTheme | AomiChatWidgetPalette): ThemeManager;
/**
 * Gets all available predefined themes
 */
export declare function getAvailableThemes(): Record<string, ThemeDefinition>;
/**
 * Validates a custom palette
 */
export declare function validateCustomPalette(palette: unknown): palette is AomiChatWidgetPalette;
/**
 * Creates a custom palette from a base theme
 */
export declare function createCustomPalette(baseTheme: AomiChatTheme, overrides: Partial<AomiChatWidgetPaletteColors>): AomiChatWidgetPalette;
//# sourceMappingURL=ThemeManager.d.ts.map