import type { Meta, StoryObj } from '@storybook/html';
import { fbm2, CHARS } from '../lib/noise';
import { buildPalette } from '../lib/theme';

const meta: Meta = {
  title: 'ASCII Name Art',
};
export default meta;

// --- Pre-rendered character atlas for fast blitting ---
const ALPHA_STEPS = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

function buildAtlas(cellW: number, cellH: number, palette: string[], dpr: number) {
  const tiles = new Map<string, CanvasImageSource>();
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
function createMask(
  text: string, w: number, h: number,
  fontFamily: string, fontWeight: string, fontStyle: string,
  fontSize: number, letterSpacing: number
): ImageData {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'middle';

  if (letterSpacing > 0) {
    const chars = text.split('');
    let totalW = 0;
    chars.forEach(ch => { totalW += ctx.measureText(ch).width + letterSpacing; });
    totalW -= letterSpacing;
    let x = (w - totalW) / 2;
    chars.forEach(ch => {
      ctx.fillText(ch, x, h / 2);
      x += ctx.measureText(ch).width + letterSpacing;
    });
  } else {
    ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, h / 2);
  }
  return ctx.getImageData(0, 0, w, h);
}

// --- Renderer ---
interface RenderOpts {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  letterSpacing: number;
  cellW: number;
  cellH: number;
  canvasW: number;
  canvasH: number;
  hue: number;
  alphaMin: number;
  alphaMax: number;
  skipThreshold: number;
  scatter: boolean;
}

function renderAsciiName(container: HTMLElement, opts: RenderOpts) {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio, 2);
  canvas.width = opts.canvasW * dpr;
  canvas.height = opts.canvasH * dpr;
  canvas.style.cssText = `width:${opts.canvasW}px;height:${opts.canvasH}px;`;
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const mask = createMask(
    opts.text, opts.canvasW, opts.canvasH,
    opts.fontFamily, opts.fontWeight, opts.fontStyle,
    opts.fontSize, opts.letterSpacing
  );
  const palette = buildPalette(opts.hue, false);
  const atlas = buildAtlas(opts.cellW, opts.cellH, palette, dpr);

  const cols = Math.ceil(opts.canvasW / opts.cellW) + 1;
  const rows = Math.ceil(opts.canvasH / opts.cellH) + 1;
  const maskCache = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = Math.floor(c * opts.cellW);
      const py = Math.floor(r * opts.cellH);
      if (px < mask.width && py < mask.height) {
        maskCache[r * cols + c] = mask.data[(py * mask.width + px) * 4] > 128 ? 1 : 0;
      }
    }
  }

  let lastFrame = 0;

  function draw(now: number) {
    requestAnimationFrame(draw);
    if (now - lastFrame < 100) return;
    lastFrame = now;

    const t = now * 0.00003;
    ctx.clearRect(0, 0, opts.canvasW, opts.canvasH);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const inMask = maskCache[r * cols + c];
        const n = fbm2(c * 0.1 + t, r * 0.1 + t * 0.7);
        const norm = (n + 1) * 0.5;

        if (!inMask) {
          if (!opts.scatter || norm < 0.72) continue;
          const ci = Math.min(CHARS.length - 1, Math.floor(norm * CHARS.length));
          if (ci === 0) continue;
          const pi = Math.min(palette.length - 1, Math.floor(norm * palette.length));
          const tile = atlas.get(`${ci}-${pi}-0`);
          if (tile) ctx.drawImage(tile, c * opts.cellW, r * opts.cellH, opts.cellW, opts.cellH);
          continue;
        }

        if (norm < opts.skipThreshold) continue;
        const ci = Math.min(CHARS.length - 1, Math.floor(norm * CHARS.length));
        if (ci === 0) continue;
        const pi = Math.min(palette.length - 1, Math.floor(norm * palette.length));
        const rawAlpha = opts.alphaMin + norm * (opts.alphaMax - opts.alphaMin);
        const ai = Math.min(
          ALPHA_STEPS.length - 1,
          Math.floor(((rawAlpha - ALPHA_STEPS[0]) / (ALPHA_STEPS[ALPHA_STEPS.length - 1] - ALPHA_STEPS[0])) * ALPHA_STEPS.length),
        );
        const tile = atlas.get(`${ci}-${pi}-${Math.max(0, ai)}`);
        if (tile) ctx.drawImage(tile, c * opts.cellW, r * opts.cellH, opts.cellW, opts.cellH);
      }
    }
  }
  requestAnimationFrame(draw);
}

// ══════════════════════════════════════════════════════════════
// Interactive Controls
// ══════════════════════════════════════════════════════════════

export const Controls: StoryObj = {
  name: 'Interactive Controls',
  argTypes: {
    fontFamily: {
      control: 'select',
      options: [
        'Georgia, serif',
        "'Times New Roman', serif",
        'serif',
        "'Newsreader Variable', Georgia, serif",
        'Impact, sans-serif',
        "'Arial Black', sans-serif",
      ],
    },
    fontWeight: {
      control: 'select',
      options: ['normal', 'bold', '500', '600', '700', '800', '900'],
    },
    fontStyle: {
      control: 'select',
      options: ['normal', 'italic'],
    },
    fontSize: { control: { type: 'range', min: 60, max: 200, step: 5 } },
    letterSpacing: { control: { type: 'range', min: 0, max: 30, step: 1 } },
    cellW: { control: { type: 'range', min: 3, max: 10, step: 1 } },
    cellH: { control: { type: 'range', min: 4, max: 14, step: 1 } },
    hue: { control: { type: 'range', min: 0, max: 360, step: 5 } },
    alphaMin: { control: { type: 'range', min: 0, max: 0.5, step: 0.05 } },
    alphaMax: { control: { type: 'range', min: 0.3, max: 1, step: 0.05 } },
    skipThreshold: { control: { type: 'range', min: 0, max: 0.5, step: 0.05 } },
    scatter: { control: 'boolean' },
  },
  args: {
    fontFamily: 'Georgia, serif',
    fontWeight: 'bold',
    fontStyle: 'normal',
    fontSize: 140,
    letterSpacing: 0,
    cellW: 4,
    cellH: 6,
    hue: 155,
    alphaMin: 0.15,
    alphaMax: 0.90,
    skipThreshold: 0,
    scatter: false,
  },
  render: (args) => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

    const label = document.createElement('p');
    label.style.cssText = 'font-family:"Geist Mono",monospace;font-size:11px;color:#a8abb0;letter-spacing:0.06em;margin:0;';
    label.textContent = 'Tune with controls panel \u2192 (atlas pre-renders chars, drawImage instead of fillText)';
    wrapper.appendChild(label);

    const container = document.createElement('div');
    container.style.cssText = 'background:#0c0e10;border-radius:16px;padding:40px;display:flex;justify-content:center;align-items:center;border:1px solid rgba(168,171,176,0.08);';

    renderAsciiName(container, {
      text: 'ishpreet',
      fontFamily: args.fontFamily as string,
      fontWeight: args.fontWeight as string,
      fontStyle: args.fontStyle as string,
      fontSize: args.fontSize as number,
      letterSpacing: args.letterSpacing as number,
      cellW: args.cellW as number,
      cellH: args.cellH as number,
      canvasW: 720,
      canvasH: 200,
      hue: args.hue as number,
      alphaMin: args.alphaMin as number,
      alphaMax: args.alphaMax as number,
      skipThreshold: args.skipThreshold as number,
      scatter: args.scatter as boolean,
    });

    wrapper.appendChild(container);
    return wrapper;
  },
};
