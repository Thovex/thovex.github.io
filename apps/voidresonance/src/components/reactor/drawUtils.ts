import { MILESTONES } from '../../config/milestones';

// Seeded pseudo-random for deterministic entity placement
export function seededRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function getVisualCount(owned: number): number {
  if (owned <= 32) return owned;
  if (owned <= 128) return 32 + Math.floor((owned - 32) / 4);
  if (owned <= 512) return 56 + Math.floor((owned - 128) / 8);
  return Math.min(180, 104 + Math.floor((owned - 512) / 16));
}

export function drawShape(ctx: CanvasRenderingContext2D, shape: string, x: number, y: number, size: number, rotation: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  switch (shape) {
    case 'circle':
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      break;
    case 'diamond':
      ctx.moveTo(0, -size); ctx.lineTo(size, 0); ctx.lineTo(0, size); ctx.lineTo(-size, 0);
      ctx.closePath();
      break;
    case 'triangle':
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 * i) / 3 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * size, Math.sin(a) * size);
        else ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
      }
      ctx.closePath();
      break;
    case 'square':
      ctx.rect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
      break;
    case 'hex':
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6;
        if (i === 0) ctx.moveTo(Math.cos(a) * size, Math.sin(a) * size);
        else ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
      }
      ctx.closePath();
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
        const r = i % 2 === 0 ? size : size * 0.45;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      break;
  }
  ctx.restore();
}

export function getMilestoneLevel(owned: number): number {
  let level = 0;
  for (const m of MILESTONES) {
    if (owned >= m.threshold) level++;
  }
  return level;
}
