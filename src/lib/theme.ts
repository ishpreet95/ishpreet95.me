/**
 * Runtime theme utilities — shared by all canvas-based renderers.
 * Reads CSS custom properties and DOM state to derive palette colors.
 */

export function isLightMode(): boolean {
  return document.documentElement.classList.contains('light');
}

export function getAccentHueCss(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-hue')
    .trim();
  return parseFloat(raw) || 155;
}

/**
 * Build a 6-stop OKLCH palette from an accent hue.
 * Hue shifts +/-15° across stops for a natural gradient feel.
 */
export function buildPalette(hue: number, light: boolean): string[] {
  if (light) {
    return [
      `oklch(0.25 0.03 ${hue - 10})`,
      `oklch(0.32 0.05 ${hue - 5})`,
      `oklch(0.40 0.07 ${hue})`,
      `oklch(0.48 0.08 ${hue + 5})`,
      `oklch(0.52 0.10 ${hue + 10})`,
      `oklch(0.56 0.12 ${hue + 15})`,
    ];
  }
  return [
    `oklch(0.40 0.03 ${hue - 10})`,
    `oklch(0.50 0.05 ${hue - 5})`,
    `oklch(0.60 0.07 ${hue})`,
    `oklch(0.72 0.08 ${hue + 5})`,
    `oklch(0.82 0.10 ${hue + 10})`,
    `oklch(0.90 0.12 ${hue + 15})`,
  ];
}
