/**
 * Derive an accent hue (0-360) from article content.
 * Uses FNV-1a hash of the first 500 chars of the body.
 * Deterministic: same content always produces the same hue.
 */
export function deriveHue(body: string): number {
  const sample = body.slice(0, 500);
  let h = 2166136261;
  for (let i = 0; i < sample.length; i++) {
    h ^= sample.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}

/**
 * Get the accent hue for an article.
 * Uses explicit frontmatter value if set, otherwise derives from content.
 */
export function getAccentHue(frontmatterHue: number | undefined, body: string): number {
  return frontmatterHue ?? deriveHue(body);
}
