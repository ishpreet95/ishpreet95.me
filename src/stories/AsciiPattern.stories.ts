import type { Meta, StoryObj } from '@storybook/html';
import { fbm, CHARS } from '../lib/noise';

function renderAsciiCanvas(canvas: HTMLCanvasElement, seed: string, animate: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const parent = canvas.parentElement;
  if (!parent) return;
  const dpr = Math.min(window.devicePixelRatio, 2);
  const w = parent.clientWidth, h = parent.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cellW = 10, cellH = 14;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  const ox = (hash & 0xffff) * 0.01, oy = ((hash >> 16) & 0xffff) * 0.01;

  function draw() {
    const t = animate ? performance.now() * 0.00004 : 0;
    const cols = Math.ceil(w / cellW) + 1, rows = Math.ceil(h / cellH) + 1;
    ctx.clearRect(0, 0, w, h);
    ctx.font = `${cellH - 2}px 'Geist Mono', 'SF Mono', monospace`;
    ctx.textBaseline = 'top';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const n = fbm(c * 0.12 + ox + t, r * 0.12 + oy + t * 0.7, 3);
        const norm = (n + 1) * 0.5;
        const ci = Math.min(CHARS.length - 1, Math.floor(norm * CHARS.length));
        if (CHARS[ci] === ' ') continue;
        ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--primary').trim() || '#bbcbbb';
        ctx.globalAlpha = 0.08 + norm * 0.45;
        ctx.fillText(CHARS[ci], c * cellW, r * cellH);
      }
    }
    ctx.globalAlpha = 1;
    if (animate) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

function coverWrapper(height: number, seed: string, label?: string): string {
  const labelHtml = label
    ? `<div style="position:absolute;left:14px;bottom:12px;font-family:var(--font-mono);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--on-surface-variant);background:var(--surface-low);padding:3px 8px;border-radius:4px;">${label}</div>`
    : '';
  return `<div style="position:relative;height:${height}px;background:var(--surface-low);border-radius:12px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--ghost-border);">
    <canvas data-story-ascii data-seed="${seed}" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>
    ${labelHtml}
  </div>`;
}

const meta: Meta = {
  title: 'Components/AsciiPattern',
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => coverWrapper(220, 'claude-code-token-metrics', 'Cover · Issue 03'),
  play: ({ canvasElement }) => {
    const canvas = canvasElement.querySelector<HTMLCanvasElement>('[data-story-ascii]');
    if (canvas) renderAsciiCanvas(canvas, canvas.dataset.seed || 'default', true);
  },
};

export const HeroCover: Story = {
  render: () => `<div style="max-width:1200px;padding:0 24px;">${coverWrapper(220, 'claude-code-token-metrics', 'Cover · Issue 03')}</div>`,
  play: ({ canvasElement }) => {
    const canvas = canvasElement.querySelector<HTMLCanvasElement>('[data-story-ascii]');
    if (canvas) renderAsciiCanvas(canvas, canvas.dataset.seed || 'default', true);
  },
};

export const Thumbnail: Story = {
  render: () => `<div style="display:flex;gap:16px;align-items:center;">
    <div style="width:64px;">${coverWrapper(44, 'appendix-02')}</div>
    <span style="font-family:var(--font-mono);font-size:12px;color:var(--on-surface-variant);">44px thumbnail</span>
  </div>`,
  play: ({ canvasElement }) => {
    const canvas = canvasElement.querySelector<HTMLCanvasElement>('[data-story-ascii]');
    if (canvas) renderAsciiCanvas(canvas, canvas.dataset.seed || 'default', false);
  },
};

export const MultipleSeeds: Story = {
  render: () => {
    const seeds = ['claude-code-token-metrics', 'appendix-02', 'harness-01', 'wave-demo', 'cluster-test', 'diagonal-rain'];
    const panels = seeds.map(seed => `<div style="display:grid;gap:8px;">
      <div style="font-family:var(--font-mono);font-size:11px;color:var(--on-surface-variant);letter-spacing:0.08em;">${seed}</div>
      ${coverWrapper(140, seed)}
    </div>`).join('');
    return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:24px;">${panels}</div>`;
  },
  play: ({ canvasElement }) => {
    canvasElement.querySelectorAll<HTMLCanvasElement>('[data-story-ascii]').forEach(canvas => {
      renderAsciiCanvas(canvas, canvas.dataset.seed || 'default', true);
    });
  },
};

export const Static: Story = {
  render: () => coverWrapper(220, 'claude-code-token-metrics', 'No animation'),
  play: ({ canvasElement }) => {
    const canvas = canvasElement.querySelector<HTMLCanvasElement>('[data-story-ascii]');
    if (canvas) renderAsciiCanvas(canvas, canvas.dataset.seed || 'default', false);
  },
};
