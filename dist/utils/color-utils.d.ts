export interface RGB {
    r: number;
    g: number;
    b: number;
}
/**
 * Parses a hex color (#rgb or #rrggbb) into RGB components.
 */
export declare function hexToRgb(hexColor: string): RGB | null;
/**
 * Converts RGB components to a hex color string.
 */
export declare function rgbToHex({ r, g, b }: RGB): string;
/**
 * Mixes two colors together using the supplied weight (0..1).
 */
export declare function mixColors(colorA: string, colorB: string, weight: number): string;
/**
 * Adjusts brightness by blending with white (positive amount) or black (negative amount).
 */
export declare function adjustColor(color: string, amount: number): string;
/**
 * Adds transparency to a hex color and returns an rgba string.
 */
export declare function addAlpha(color: string, alpha: number): string;
/**
 * Calculates the relative luminance of a color (0=dark, 1=light).
 */
export declare function getRelativeLuminance(color: string): number;
//# sourceMappingURL=color-utils.d.ts.map