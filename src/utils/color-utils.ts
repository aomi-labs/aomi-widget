// Color utility helpers for markdown rendering and theming

export interface RGB {
  r: number;
  g: number;
  b: number;
}

const HEX_SHORT_LENGTH = 3;
const HEX_FULL_LENGTH = 6;

/**
 * Parses a hex color (#rgb or #rrggbb) into RGB components.
 */
export function hexToRgb(hexColor: string): RGB | null {
  if (!hexColor) return null;

  let hex = hexColor.trim().replace(/^#/, '');

  if (![HEX_SHORT_LENGTH, HEX_FULL_LENGTH].includes(hex.length)) {
    return null;
  }

  if (hex.length === HEX_SHORT_LENGTH) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }

  const numeric = Number.parseInt(hex, 16);
  if (Number.isNaN(numeric)) {
    return null;
  }

  return {
    r: (numeric >> 16) & 0xff,
    g: (numeric >> 8) & 0xff,
    b: numeric & 0xff,
  };
}

/**
 * Converts RGB components to a hex color string.
 */
export function rgbToHex({ r, g, b }: RGB): string {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  const hex = [clamp(r), clamp(g), clamp(b)]
    .map((component) => component.toString(16).padStart(2, '0'))
    .join('');
  return `#${hex}`;
}

/**
 * Mixes two colors together using the supplied weight (0..1).
 */
export function mixColors(colorA: string, colorB: string, weight: number): string {
  const weightClamped = Math.max(0, Math.min(1, weight));
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);

  if (!rgbA || !rgbB) {
    return colorA;
  }

  return rgbToHex({
    r: rgbA.r * (1 - weightClamped) + rgbB.r * weightClamped,
    g: rgbA.g * (1 - weightClamped) + rgbB.g * weightClamped,
    b: rgbA.b * (1 - weightClamped) + rgbB.b * weightClamped,
  });
}

/**
 * Adjusts brightness by blending with white (positive amount) or black (negative amount).
 */
export function adjustColor(color: string, amount: number): string {
  if (amount === 0) return color;
  const blendTarget = amount > 0 ? '#ffffff' : '#000000';
  const blendAmount = Math.min(1, Math.abs(amount));
  return mixColors(color, blendTarget, blendAmount);
}

/**
 * Adds transparency to a hex color and returns an rgba string.
 */
export function addAlpha(color: string, alpha: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) {
    return color;
  }

  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha})`;
}

/**
 * Calculates the relative luminance of a color (0=dark, 1=light).
 */
export function getRelativeLuminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;

  const normalize = (value: number): number => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  };

  const r = normalize(rgb.r);
  const g = normalize(rgb.g);
  const b = normalize(rgb.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
