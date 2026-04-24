/**
 * ASCII character pattern — generative background with Perlin noise.
 * Renders a grid of ASCII characters with hue-shift coloring on a <canvas>.
 * Each seed gets a unique color palette. Animated with slow drift.
 * ~10fps throttled. Zero dependencies.
 */

import { fbm, CHARS } from '../lib/noise';
import { isLightMode, getAccentHueCss, buildPalette } from '../lib/theme';

// --- Constants ---
const CELL_W = 8;
const CELL_H = 11;
const SKIP_THRESHOLD = 0.25;
const NOISE_SCALE = 0.1;
const TIME_SCALE = 0.00003;
const FRAME_INTERVAL = 100; // ~10fps

function getColor(norm: number, palette: string[], light: boolean): { color: string; alpha: number } {
  const idx = Math.min(palette.length - 1, Math.floor(norm * palette.length));
  const alpha = light
    ? 0.10 + norm * norm * 0.85
    : 0.05 + norm * norm * 0.90;
  return { color: palette[idx], alpha };
}

// --- Canvas renderer ---

interface AsciiState {
  rafId: number | null;
  observer: IntersectionObserver | null;
}

const instances: AsciiState[] = [];

function setupCanvas(canvas: HTMLCanvasElement) {
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

  const seed = canvas.dataset.asciiSeed || 'default';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  const offsetX = (Math.abs(hash) & 0xffff) * 0.01;
  const offsetY = ((Math.abs(hash) >> 16) & 0xffff) * 0.01;
  const state: AsciiState = { rafId: null, observer: null };

  let lastFrame = 0;

  function draw(now: number) {
    state.rafId = requestAnimationFrame(draw);
    if (now - lastFrame < FRAME_INTERVAL) return;
    lastFrame = now;

    const light = isLightMode();
    const palette = buildPalette(getAccentHueCss(), light);

    const t = now * TIME_SCALE;
    const cols = Math.ceil(w / CELL_W) + 1;
    const rows = Math.ceil(h / CELL_H) + 1;

    ctx.clearRect(0, 0, w, h);
    ctx.font = `${CELL_H - 2}px 'Geist Mono', 'SF Mono', 'Fira Code', monospace`;
    ctx.textBaseline = 'top';

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const nx = col * NOISE_SCALE + offsetX;
        const ny = row * NOISE_SCALE + offsetY;
        const n = fbm(nx + t, ny + t * 0.7, 3);
        const normalized = (n + 1) * 0.5;
        if (normalized < SKIP_THRESHOLD) continue;
        const charIdx = Math.min(CHARS.length - 1, Math.floor(normalized * CHARS.length));
        const char = CHARS[charIdx];
        if (char === ' ') continue;

        const { color, alpha } = getColor(normalized, palette, light);
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.fillText(char, col * CELL_W, row * CELL_H);
      }
    }
    ctx.globalAlpha = 1;
  }

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
  state.observer = observer;
  instances.push(state);
}

// --- Reduced motion: single static render ---

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

  const seed = canvas.dataset.asciiSeed || 'default';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  const ox = (Math.abs(hash) & 0xffff) * 0.01;
  const oy = ((Math.abs(hash) >> 16) & 0xffff) * 0.01;
  const light = isLightMode();
  const palette = buildPalette(getAccentHueCss(), light);

  ctx.font = `${CELL_H - 2}px 'Geist Mono', 'SF Mono', monospace`;
  ctx.textBaseline = 'top';
  const cols = Math.ceil(w / CELL_W) + 1, rows = Math.ceil(h / CELL_H) + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = fbm(c * NOISE_SCALE + ox, r * NOISE_SCALE + oy, 3);
      const norm = (n + 1) * 0.5;
      if (norm < SKIP_THRESHOLD) continue;
      const ci = Math.min(CHARS.length - 1, Math.floor(norm * CHARS.length));
      if (CHARS[ci] === ' ') continue;
      const { color, alpha } = getColor(norm, palette, light);
      ctx.fillStyle = color;
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillText(CHARS[ci], c * CELL_W, r * CELL_H);
    }
  }
  ctx.globalAlpha = 1;
}

// --- Init ---

function init() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll<HTMLCanvasElement>('[data-ascii-pattern]').forEach(renderStatic);
    return;
  }
  document.querySelectorAll<HTMLCanvasElement>('[data-ascii-pattern]').forEach(setupCanvas);
}

function cleanup() {
  for (const s of instances) {
    if (s.rafId !== null) cancelAnimationFrame(s.rafId);
    s.observer?.disconnect();
  }
  instances.length = 0;
}

document.addEventListener('astro:before-swap', cleanup);
init();
document.addEventListener('astro:after-swap', init);
