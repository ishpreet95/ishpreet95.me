/**
 * ASCII name art — renders "ishpreet" as animated ASCII characters
 * using a text mask + Perlin noise coloring.
 * Uses a pre-rendered character atlas for performance (drawImage vs fillText).
 */

import { fbm2, CHARS } from '../lib/noise';
import { isLightMode, getAccentHueCss, buildPalette } from '../lib/theme';

// --- Character atlas ---
const ALPHA_STEPS = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

function buildAtlas(cellW: number, cellH: number, palette: string[], dpr: number) {
  const tiles = new Map<string, HTMLCanvasElement>();
  for (let ci = 1; ci < CHARS.length; ci++) {
    for (let pi = 0; pi < palette.length; pi++) {
      for (let ai = 0; ai < ALPHA_STEPS.length; ai++) {
        const c = document.createElement('canvas');
        c.width = cellW * dpr;
        c.height = cellH * dpr;
        const ctx = c.getContext('2d')!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.font = `${cellH - 1}px 'Geist Mono', 'SF Mono', monospace`;
        ctx.textBaseline = 'top';
        ctx.fillStyle = palette[pi];
        ctx.globalAlpha = ALPHA_STEPS[ai];
        ctx.fillText(CHARS[ci], 0, 0);
        tiles.set(`${ci}-${pi}-${ai}`, c);
      }
    }
  }
  return tiles;
}

// --- Text mask ---
function createMask(text: string, w: number, h: number): ImageData {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.font = `900 150px Georgia, serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, h / 2);
  return ctx.getImageData(0, 0, w, h);
}

// --- Constants ---
const CELL_W = 6;
const CELL_H = 8;
const ALPHA_MIN = 0.50;
const ALPHA_MAX = 1.00;
const SKIP_THRESHOLD = 0.15;
const SCATTER_THRESHOLD = 0.72;
const TIME_SCALE = 0.00003;
const HUE_CYCLE_SPEED = 0.000017;
const HUE_STEPS = 4; // 4 atlases, 90° apart — rebuilt on theme change

// --- Setup ---
function setupAsciiName(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const parent = canvas.parentElement;
  if (!parent) return;
  const dpr = Math.min(window.devicePixelRatio, 2);
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const text = canvas.dataset.asciiName || 'ishpreet';
  const mask = createMask(text, w, h);

  // Build atlases — rebuilt when theme changes
  let currentLight = isLightMode();
  let atlases: Map<string, HTMLCanvasElement>[] = [];
  let palettes: string[][] = [];

  function rebuildAtlases() {
    currentLight = isLightMode();
    atlases = [];
    palettes = [];
    for (let i = 0; i < HUE_STEPS; i++) {
      const hue = (i / HUE_STEPS) * 360;
      const pal = buildPalette(hue, currentLight);
      palettes.push(pal);
      atlases.push(buildAtlas(CELL_W, CELL_H, pal, dpr));
    }
  }
  rebuildAtlases();

  // Watch for theme changes via class mutation on <html>
  const themeObserver = new MutationObserver(() => {
    if (isLightMode() !== currentLight) rebuildAtlases();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // Pre-compute mask hits
  const cols = Math.ceil(w / CELL_W) + 1;
  const rows = Math.ceil(h / CELL_H) + 1;
  const maskCache = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = Math.floor(c * CELL_W);
      const py = Math.floor(r * CELL_H);
      if (px >= 0 && px < mask.width && py >= 0 && py < mask.height) {
        maskCache[r * cols + c] = mask.data[(py * mask.width + px) * 4] > 128 ? 1 : 0;
      }
    }
  }

  const state = { rafId: null as number | null };
  let lastFrame = 0;

  function draw(now: number) {
    state.rafId = requestAnimationFrame(draw);
    if (now - lastFrame < 100) return;
    lastFrame = now;

    const t = now * TIME_SCALE;
    const huePhase = (now * HUE_CYCLE_SPEED) % 1;
    const hueIdx = Math.floor(huePhase * HUE_STEPS) % HUE_STEPS;
    const atlas = atlases[hueIdx];
    const palette = palettes[hueIdx];

    ctx.clearRect(0, 0, w, h);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const inMask = maskCache[r * cols + c];
        const n = fbm2(c * 0.1 + t, r * 0.1 + t * 0.7);
        const norm = (n + 1) * 0.5;

        if (!inMask) {
          if (norm < SCATTER_THRESHOLD) continue;
          const ci = Math.min(CHARS.length - 1, Math.floor(norm * CHARS.length));
          if (ci === 0) continue;
          const pi = Math.min(palette.length - 1, Math.floor(norm * palette.length));
          const tile = atlas.get(`${ci}-${pi}-0`);
          if (tile) ctx.drawImage(tile, c * CELL_W, r * CELL_H, CELL_W, CELL_H);
          continue;
        }

        if (norm < SKIP_THRESHOLD) continue;
        const ci = Math.min(CHARS.length - 1, Math.floor(norm * CHARS.length));
        if (ci === 0) continue;
        const pi = Math.min(palette.length - 1, Math.floor(norm * palette.length));
        // Map norm to alpha step — normalize over [ALPHA_MIN, ALPHA_MAX] range
        const rawAlpha = ALPHA_MIN + norm * (ALPHA_MAX - ALPHA_MIN);
        const ai = Math.min(
          ALPHA_STEPS.length - 1,
          Math.floor(((rawAlpha - ALPHA_STEPS[0]) / (ALPHA_STEPS[ALPHA_STEPS.length - 1] - ALPHA_STEPS[0])) * ALPHA_STEPS.length),
        );
        const tile = atlas.get(`${ci}-${pi}-${Math.max(0, ai)}`);
        if (tile) ctx.drawImage(tile, c * CELL_W, r * CELL_H, CELL_W, CELL_H);
      }
    }
  }

  // Visibility observer
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        if (state.rafId === null) state.rafId = requestAnimationFrame(draw);
      } else {
        if (state.rafId !== null) { cancelAnimationFrame(state.rafId); state.rafId = null; }
      }
    },
    { threshold: 0 },
  );
  observer.observe(canvas);

  return { state, observer, themeObserver };
}

// --- Static fallback for reduced motion ---
function renderStatic(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const parent = canvas.parentElement;
  if (!parent) return;
  const dpr = Math.min(window.devicePixelRatio, 2);
  const w = parent.clientWidth, h = parent.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const text = canvas.dataset.asciiName || 'ishpreet';
  const hue = getAccentHueCss();
  const light = isLightMode();
  const palette = buildPalette(hue, light);
  const mask = createMask(text, w, h);

  ctx.font = `${CELL_H - 1}px 'Geist Mono', 'SF Mono', monospace`;
  ctx.textBaseline = 'top';
  const cols = Math.ceil(w / CELL_W) + 1, rows = Math.ceil(h / CELL_H) + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = c * CELL_W, py = r * CELL_H;
      if (px >= mask.width || py >= mask.height) continue;
      const inMask = mask.data[(Math.floor(py) * mask.width + Math.floor(px)) * 4] > 128;
      if (!inMask) continue;

      const n = fbm2(c * 0.1, r * 0.1);
      const norm = (n + 1) * 0.5;
      if (norm < SKIP_THRESHOLD) continue;
      const ci = Math.min(CHARS.length - 1, Math.floor(norm * CHARS.length));
      if (ci === 0) continue;
      const idx = Math.min(palette.length - 1, Math.floor(norm * palette.length));
      ctx.fillStyle = palette[idx];
      ctx.globalAlpha = ALPHA_MIN + norm * (ALPHA_MAX - ALPHA_MIN);
      ctx.fillText(CHARS[ci], px, py);
    }
  }
  ctx.globalAlpha = 1;
}

// --- Init ---
const instances: { state: { rafId: number | null }; observer: IntersectionObserver; themeObserver: MutationObserver }[] = [];

function init() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll<HTMLCanvasElement>('[data-ascii-name]').forEach(renderStatic);
    return;
  }
  document.querySelectorAll<HTMLCanvasElement>('[data-ascii-name]').forEach(c => {
    const result = setupAsciiName(c);
    if (result) instances.push(result);
  });
}

function cleanup() {
  for (const s of instances) {
    if (s.state.rafId !== null) cancelAnimationFrame(s.state.rafId);
    s.observer.disconnect();
    s.themeObserver.disconnect();
  }
  instances.length = 0;
}

document.addEventListener('astro:before-swap', cleanup);
init();
document.addEventListener('astro:after-swap', init);
