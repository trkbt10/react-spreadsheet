/**
 * @file Color conversion utilities for RGB, HSL, and Hex formats.
 */

export type RGBColor = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
};

export type HSLColor = {
  readonly h: number;
  readonly s: number;
  readonly l: number;
};

/**
 * Converts hex color string to RGB object.
 * @param hex - Hex color string (e.g., "#ff0000")
 * @returns RGB color object
 */
export const hexToRgb = (hex: string): RGBColor => {
  const cleanHex = hex.replace("#", "");
  const r = Number.parseInt(cleanHex.substring(0, 2), 16);
  const g = Number.parseInt(cleanHex.substring(2, 4), 16);
  const b = Number.parseInt(cleanHex.substring(4, 6), 16);
  return { r, g, b };
};

/**
 * Converts RGB object to hex color string.
 * @param rgb - RGB color object
 * @returns Hex color string
 */
export const rgbToHex = ({ r, g, b }: RGBColor): string => {
  const toHex = (value: number): string => {
    const hex = Math.round(value).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Converts RGB to HSL.
 * @param rgb - RGB color object
 * @returns HSL color object
 */
export const rgbToHsl = ({ r, g, b }: RGBColor): HSLColor => {
  const normalizedR = r / 255;
  const normalizedG = g / 255;
  const normalizedB = b / 255;

  const max = Math.max(normalizedR, normalizedG, normalizedB);
  const min = Math.min(normalizedR, normalizedG, normalizedB);
  const delta = max - min;

  const l = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  const calculateHue = (): number => {
    if (max === normalizedR) {
      return ((normalizedG - normalizedB) / delta + (normalizedG < normalizedB ? 6 : 0)) / 6;
    }
    if (max === normalizedG) {
      return ((normalizedB - normalizedR) / delta + 2) / 6;
    }
    return ((normalizedR - normalizedG) / delta + 4) / 6;
  };

  const h = calculateHue() * 360;

  return { h, s: s * 100, l: l * 100 };
};

/**
 * Converts HSL to RGB.
 * @param hsl - HSL color object
 * @returns RGB color object
 */
export const hslToRgb = ({ h, s, l }: HSLColor): RGBColor => {
  const normalizedS = s / 100;
  const normalizedL = l / 100;

  if (normalizedS === 0) {
    const gray = Math.round(normalizedL * 255);
    return { r: gray, g: gray, b: gray };
  }

  const hueToRgb = (p: number, q: number, t: number): number => {
    const normalizedT = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (normalizedT < 1 / 6) {
      return p + (q - p) * 6 * normalizedT;
    }
    if (normalizedT < 1 / 2) {
      return q;
    }
    if (normalizedT < 2 / 3) {
      return p + (q - p) * (2 / 3 - normalizedT) * 6;
    }
    return p;
  };

  const q = normalizedL < 0.5 ? normalizedL * (1 + normalizedS) : normalizedL + normalizedS - normalizedL * normalizedS;
  const p = 2 * normalizedL - q;
  const normalizedH = h / 360;

  return {
    r: Math.round(hueToRgb(p, q, normalizedH + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, normalizedH) * 255),
    b: Math.round(hueToRgb(p, q, normalizedH - 1 / 3) * 255),
  };
};

/**
 * Converts hex color to HSL.
 * @param hex - Hex color string
 * @returns HSL color object
 */
export const hexToHsl = (hex: string): HSLColor => {
  return rgbToHsl(hexToRgb(hex));
};

/**
 * Converts HSL to hex color.
 * @param hsl - HSL color object
 * @returns Hex color string
 */
export const hslToHex = (hsl: HSLColor): string => {
  return rgbToHex(hslToRgb(hsl));
};
