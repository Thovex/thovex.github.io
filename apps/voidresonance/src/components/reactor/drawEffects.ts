import type { GameState } from '../../game/types';
import type { GraphicsQuality } from '../../store/settingsStore';
import { entityStore } from './entityStore';
import { GEN_COLORS } from './constants';
import { getMilestoneLevel } from './drawUtils';
import { GENERATORS } from '../../config/generators';
import { formatNumber } from '../../utils/numberFormatting';

const MIN_ENTITIES_FOR_CONNECTIONS = 64;

export function drawBackgroundGrid(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  intensity: number, totalIntensity: number, gfx: GraphicsQuality = 'high',
) {
  if (gfx === 'low') return;
  const frenzyBoost = entityStore.frenzyActive ? 0.04 : 0;
  const gridAlpha = 0.025 + intensity * 0.015 + totalIntensity * 0.015 + frenzyBoost;
  const gridColor = entityStore.frenzyActive
    ? `rgba(200, 255, 100, ${gridAlpha})`
    : `rgba(126, 200, 227, ${gridAlpha})`;
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  const gridSize = 30;
  for (let gx = 0; gx < w; gx += gridSize) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
  }
  for (let gy = 0; gy < h; gy += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }
}

export function drawClickRipples(ctx: CanvasRenderingContext2D, t: number, gfx: GraphicsQuality = 'high') {
  const ripples = entityStore.ripples;
  for (let i = ripples.length - 1; i >= 0; i--) {
    const rip = ripples[i];
    const age = t - rip.birth;
    if (age > rip.duration) { ripples.splice(i, 1); continue; }
    // Skip ripples that haven't started yet (birth in the future)
    if (age < 0) continue;
    const progress = age / rip.duration;
    const r = rip.maxRadius * progress;

    // Main ripple ring
    const alpha = (1 - progress) * 0.5;
    ctx.strokeStyle = `rgba(168, 230, 207, ${alpha})`;
    ctx.lineWidth = gfx === 'low' ? 1.5 : (2.5 * (1 - progress) + 0.5);
    ctx.beginPath();
    ctx.arc(rip.x, rip.y, r, 0, Math.PI * 2);
    ctx.stroke();

    if (gfx === 'low') continue;

    // Inner ring
    if (progress < 0.6) {
      ctx.strokeStyle = `rgba(126, 200, 227, ${alpha * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Flash at click origin
    if (progress < 0.15) {
      const flashAlpha = (1 - progress / 0.15) * 0.25;
      const flashR = 8 + progress * 30;
      const glow = ctx.createRadialGradient(rip.x, rip.y, 0, rip.x, rip.y, flashR);
      glow.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
      glow.addColorStop(0.5, `rgba(168, 230, 207, ${flashAlpha * 0.5})`);
      glow.addColorStop(1, `rgba(168, 230, 207, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, flashR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawOrbitRings(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, maxR: number, t: number,
  state: GameState, intensity: number, gfx: GraphicsQuality = 'high',
) {
  for (const gen of GENERATORS) {
    const owned = state.generators[gen.id]?.owned ?? 0;
    if (owned === 0) continue;
    const genIndex = GENERATORS.indexOf(gen);
    const baseOrbit = 0.18 + genIndex * 0.06;
    const orbitPx = baseOrbit * maxR;
    const color = GEN_COLORS[gen.id] || { r: 126, g: 200, b: 227 };
    const ml = getMilestoneLevel(owned);

    // Low graphics: simple static circle
    if (gfx === 'low') {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.12)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, orbitPx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    // Ring alpha scales dramatically with milestones
    const ringAlpha = 0.03 + ml * 0.035 + intensity * 0.02;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.03 * (genIndex % 2 === 0 ? 1 : -1));

    // Base ring — becomes more solid with milestones
    const dashGap = Math.max(1, 10 - ml * 2);
    ctx.setLineDash([2 + ml * 3, dashGap]);
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${ringAlpha})`;
    ctx.lineWidth = 0.6 + ml * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, orbitPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // ML 1+: Subtle inner glow ring
    if (ml >= 1) {
      const pulse = 0.5 + Math.sin(t * 1.5 + genIndex) * 0.5;
      const glowAlpha = (0.02 + ml * 0.015) * pulse;
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${glowAlpha})`;
      ctx.lineWidth = 2 + ml;
      ctx.beginPath();
      ctx.arc(0, 0, orbitPx, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ML 2+: Rotating arc segments
    if (ml >= 2) {
      const segCount = ml;
      const segLen = Math.PI * 0.3 + ml * 0.1;
      const segAlpha = 0.06 + ml * 0.02;
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${segAlpha})`;
      ctx.lineWidth = 1.5 + ml * 0.3;
      for (let s = 0; s < segCount; s++) {
        const startAngle = t * (0.3 + s * 0.15) + (s / segCount) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(0, 0, orbitPx + 3, startAngle, startAngle + segLen);
        ctx.stroke();
      }
    }

    // ML 3+: Pulsing inner ring with glow
    if (ml >= 3) {
      const innerPulse = 0.5 + Math.sin(t * 2.5 + genIndex * 0.7) * 0.5;
      const innerR = orbitPx - 4 - ml;
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.04 * innerPulse + ml * 0.01})`;
      ctx.lineWidth = 0.5 + ml * 0.15;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(innerR, 1), 0, Math.PI * 2);
      ctx.stroke();
    }

    // ML 4+: Bright outer halo ring
    if (ml >= 4) {
      const haloR = orbitPx + 5 + ml * 2;
      const haloPulse = 0.6 + Math.sin(t * 1.8 + genIndex * 1.3) * 0.4;
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${(0.03 + ml * 0.015) * haloPulse})`;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, haloR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ML 5+: Energy fill between rings
    if (ml >= 5) {
      const fillPulse = 0.3 + Math.sin(t * 3 + genIndex * 0.5) * 0.3;
      const grad = ctx.createRadialGradient(0, 0, orbitPx - 6, 0, 0, orbitPx + 6);
      grad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      grad.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.015 * fillPulse})`);
      grad.addColorStop(0.6, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.02 * fillPulse})`);
      grad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, orbitPx + 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // ML 6: Double helix pattern
    if (ml >= 6) {
      const helixAlpha = 0.08 + Math.sin(t * 2) * 0.03;
      ctx.strokeStyle = `rgba(255, 255, 255, ${helixAlpha})`;
      ctx.lineWidth = 0.6;
      for (let h = 0; h < 2; h++) {
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 2; a += 0.1) {
          const wobble = Math.sin(a * 3 + t * 2 + h * Math.PI) * 5;
          const hx = Math.cos(a) * (orbitPx + wobble);
          const hy = Math.sin(a) * (orbitPx + wobble);
          if (a === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

export function drawOuterHexRing(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, maxR: number, t: number,
  intensity: number, totalIntensity: number,
) {
  const ringR = maxR * 0.88;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.12);
  ctx.strokeStyle = `rgba(126, 200, 227, ${0.06 + intensity * 0.12 + totalIntensity * 0.08})`;
  ctx.lineWidth = 0.8 + totalIntensity * 0.5;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    if (i === 0) ctx.moveTo(Math.cos(a) * ringR, Math.sin(a) * ringR);
    else ctx.lineTo(Math.cos(a) * ringR, Math.sin(a) * ringR);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

export function drawPulsingCore(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, t: number,
  intensity: number, clickIntensity: number, totalIntensity: number, gfx: GraphicsQuality = 'high',
) {
  const coreR = 10 + (gfx === 'low' ? 0 : Math.sin(t * 1.8) * 2.5) + intensity * 10 + totalIntensity * 7;

  // Low graphics: solid circle, no gradient glow
  if (gfx === 'low') {
    ctx.fillStyle = `rgba(126, 200, 227, ${0.65 + clickIntensity * 0.25})`;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fill();
    return coreR;
  }

  const coreGlow = Math.max(20 + intensity * 30 + totalIntensity * 18, 1);

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreGlow);
  gradient.addColorStop(0, `rgba(126, 200, 227, ${0.45 + intensity * 0.25 + totalIntensity * 0.15})`);
  gradient.addColorStop(0.35, `rgba(168, 230, 207, ${0.15 + intensity * 0.1})`);
  gradient.addColorStop(0.65, `rgba(212, 165, 255, ${0.04 + totalIntensity * 0.08})`);
  gradient.addColorStop(1, 'rgba(126, 200, 227, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, coreGlow, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(126, 200, 227, ${0.65 + clickIntensity * 0.25})`;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fill();

  const innerPulse = 0.25 + Math.sin(t * 3.5) * 0.08 + totalIntensity * 0.15;
  ctx.fillStyle = `rgba(255, 255, 255, ${innerPulse})`;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 0.35, 0, Math.PI * 2);
  ctx.fill();

  return coreR;
}

export function drawEnergyBeams(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, maxR: number, t: number,
  state: GameState, intensity: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  const ownedGens = GENERATORS.filter(g => (state.generators[g.id]?.owned ?? 0) > 0);
  for (let i = 0; i < ownedGens.length; i++) {
    const gen = ownedGens[i];
    const owned = state.generators[gen.id]?.owned ?? 0;
    const color = GEN_COLORS[gen.id] || { r: 126, g: 200, b: 227 };
    const genIndex = GENERATORS.indexOf(gen);
    const a = (Math.PI * 2 * i) / Math.max(ownedGens.length, 1) + t * 0.08;
    const beamLen = (0.18 + genIndex * 0.06) * maxR;
    const ml = getMilestoneLevel(owned);

    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.03 + ml * 0.015 + intensity * 0.03})`;
    ctx.lineWidth = 0.4 + ml * 0.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * beamLen, Math.sin(a) * beamLen);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawConstellationWebs(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, maxR: number, t: number,
  state: GameState,
) {
  const entities = entityStore.entities;

  // Intra-generator connections (existing, lowered threshold)
  for (const gen of GENERATORS) {
    const owned = state.generators[gen.id]?.owned ?? 0;
    if (owned < MIN_ENTITIES_FOR_CONNECTIONS) continue;
    const color = GEN_COLORS[gen.id] || { r: 126, g: 200, b: 227 };
    const genEntities = entities.filter(e => e.genId === gen.id);
    const step = Math.max(1, Math.floor(genEntities.length / 12));

    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.05)`;
    ctx.lineWidth = 0.4;
    for (let i = 0; i < genEntities.length; i += step) {
      const e1 = genEntities[i];
      const e2 = genEntities[(i + step) % genEntities.length];
      const a1 = e1.baseAngle + t * e1.speed;
      const a2 = e2.baseAngle + t * e2.speed;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a1) * e1.orbitRadius * maxR, cy + Math.sin(a1) * e1.orbitRadius * maxR);
      ctx.lineTo(cx + Math.cos(a2) * e2.orbitRadius * maxR, cy + Math.sin(a2) * e2.orbitRadius * maxR);
      ctx.stroke();
    }
  }

  // Inter-generator connections — connect nearby entities from different generators
  const ownedGens = GENERATORS.filter(g => (state.generators[g.id]?.owned ?? 0) >= 16);
  if (ownedGens.length < 2) return;

  for (let gi = 0; gi < ownedGens.length - 1; gi++) {
    const gen1 = ownedGens[gi];
    const gen2 = ownedGens[gi + 1];
    const c1 = GEN_COLORS[gen1.id] || { r: 126, g: 200, b: 227 };
    const c2 = GEN_COLORS[gen2.id] || { r: 126, g: 200, b: 227 };
    const ents1 = entities.filter(e => e.genId === gen1.id);
    const ents2 = entities.filter(e => e.genId === gen2.id);
    if (ents1.length === 0 || ents2.length === 0) continue;

    // Connect a few entities between adjacent generators
    const connCount = Math.min(3, Math.min(ents1.length, ents2.length));
    const step1 = Math.max(1, Math.floor(ents1.length / connCount));
    const step2 = Math.max(1, Math.floor(ents2.length / connCount));

    for (let ci = 0; ci < connCount; ci++) {
      const e1 = ents1[ci * step1 % ents1.length];
      const e2 = ents2[ci * step2 % ents2.length];
      const a1 = e1.baseAngle + t * e1.speed;
      const a2 = e2.baseAngle + t * e2.speed;
      const x1 = cx + Math.cos(a1) * e1.orbitRadius * maxR;
      const y1 = cy + Math.sin(a1) * e1.orbitRadius * maxR;
      const x2 = cx + Math.cos(a2) * e2.orbitRadius * maxR;
      const y2 = cy + Math.sin(a2) * e2.orbitRadius * maxR;

      // Blend colors between the two generators
      const mr = Math.round((c1.r + c2.r) / 2);
      const mg = Math.round((c1.g + c2.g) / 2);
      const mb = Math.round((c1.b + c2.b) / 2);

      // Curved connection with slight waviness
      const midX = (x1 + x2) / 2 + Math.sin(t * 1.5 + ci) * 8;
      const midY = (y1 + y2) / 2 + Math.cos(t * 1.8 + ci) * 8;

      ctx.strokeStyle = `rgba(${mr}, ${mg}, ${mb}, 0.035)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(midX, midY, x2, y2);
      ctx.stroke();
    }
  }
}

export function drawAuroraWaves(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, maxR: number, t: number,
  state: GameState,
) {
  for (const gen of GENERATORS) {
    const owned = state.generators[gen.id]?.owned ?? 0;
    if (owned < 512) continue;
    const color = GEN_COLORS[gen.id] || { r: 126, g: 200, b: 227 };
    const genIndex = GENERATORS.indexOf(gen);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = 0.035 + Math.sin(t * 0.4 + genIndex) * 0.015;
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.12)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.04) {
      const wave = Math.sin(a * 5 + t * 1.5 + genIndex) * 12 + Math.sin(a * 8 + t * 2.2) * 5;
      const r = maxR * 0.45 + wave + genIndex * maxR * 0.06;
      if (a === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

export function drawDataRing(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, maxR: number, t: number,
  state: GameState, intensity: number,
) {
  if (state.totalDataEarned <= 0) return;
  const ringR = maxR * 0.88;
  const dataRingR = ringR * 0.93;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-t * 0.1);
  ctx.setLineDash([4, 14]);
  ctx.strokeStyle = `rgba(168, 230, 207, ${0.04 + intensity * 0.06})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, dataRingR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawSpawnParticles(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, maxR: number, dt: number,
) {
  const particles = entityStore.spawnParticles;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    const basePx = cx + Math.cos(p._angle) * p._orbitR * maxR;
    const basePy = cy + Math.sin(p._angle) * p._orbitR * maxR;
    const elapsed = p.maxLife - p.life;
    const px = basePx + p.vx * elapsed * 40;
    const py = basePy + p.vy * elapsed * 40;
    const palpha = (p.life / p.maxLife) * 0.6;
    ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${palpha})`;
    ctx.beginPath();
    ctx.arc(px, py, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawEntityCount(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, coreR: number,
  totalOwned: number, totalIntensity: number,
) {
  if (totalOwned <= 0) return;
  const fontSize = 14 + totalIntensity * 5;
  ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Text outline for clarity
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.lineWidth = 3;
  ctx.strokeText(`${totalOwned}`, cx, cy + coreR + 18);
  ctx.fillStyle = `rgba(220, 240, 255, ${0.5 + totalIntensity * 0.35})`;
  ctx.fillText(`${totalOwned}`, cx, cy + coreR + 18);

  ctx.font = 'bold 9px "JetBrains Mono", monospace';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeText('ENTITIES', cx, cy + coreR + 32);
  ctx.fillStyle = 'rgba(200, 219, 230, 0.4)';
  ctx.fillText('ENTITIES', cx, cy + coreR + 32);
}

export function drawFloatingNumbers(ctx: CanvasRenderingContext2D, dt: number) {
  const floats = entityStore.floats;
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.life -= dt;
    f.y -= 1.2;
    f.x += (f.driftX ?? 0);
    const falpha = Math.max(0, f.life / f.maxLife);
    const scale = 0.9 + (1 - falpha) * 0.4;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(scale, scale);
    if (f.isCritical) {
      // Critical hit: bigger, gold text with glow
      ctx.font = 'bold 22px "JetBrains Mono", monospace';
      ctx.shadowColor = 'rgba(255, 200, 50, 0.8)';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = `rgba(255, 220, 80, ${falpha})`;
      ctx.fillText(f.text, 0, 0);
      ctx.shadowBlur = 0;
    } else {
      ctx.font = 'bold 17px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = `rgba(168, 230, 207, ${falpha})`;
      ctx.fillText(f.text, 0, 0);
    }
    ctx.restore();
    if (f.life <= 0) floats.splice(i, 1);
  }
}

export function drawScanLines(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const frenzyBoost = entityStore.frenzyActive ? 0.015 : 0;
  ctx.fillStyle = `rgba(0, 0, 0, ${0.03 + frenzyBoost})`;
  for (let y = 0; y < h; y += 2.5) {
    ctx.fillRect(0, y, w, 1);
  }
}

// ── New effects ──

// Draw entity info lines that periodically appear near orbit rings
export function drawEntityInfoLines(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, maxR: number, t: number,
  dt: number,
) {
  const store = entityStore;

  // Update existing info lines
  for (let i = store.infoLines.length - 1; i >= 0; i--) {
    store.infoLines[i].life -= dt;
    if (store.infoLines[i].life <= 0) {
      store.infoLines.splice(i, 1);
    }
  }

  // Draw active info lines
  for (const info of store.infoLines) {
    const progress = info.life / info.maxLife;
    const fadeIn = Math.min(1, (info.maxLife - info.life) / 0.4);
    const fadeOut = Math.min(1, info.life / 0.5);
    const alpha = Math.min(fadeIn, fadeOut) * 0.9;

    const orbitPx = info.orbitRadius * maxR;
    const angle = info.angle + t * 0.05;
    const lx = cx + Math.cos(angle) * orbitPx;
    const ly = cy + Math.sin(angle) * orbitPx;

    const color = GEN_COLORS[info.genId] || { r: 126, g: 200, b: 227 };

    // Draw connecting line from orbit to text
    const textOffsetX = Math.cos(angle) * 35;
    const textOffsetY = Math.sin(angle) * 35;
    const tx = lx + textOffsetX;
    const ty = ly + textOffsetY;

    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    // Dot at connection point
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.8})`;
    ctx.beginPath();
    ctx.arc(lx, ly, 2, 0, Math.PI * 2);
    ctx.fill();

    // Glitch offset for punk feel
    const glitchX = (Math.random() > 0.92 ? (Math.random() - 0.5) * 3 : 0) * (1 - progress);

    // Entity name
    ctx.save();
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = Math.cos(angle) > 0 ? 'left' : 'right';
    ctx.textBaseline = 'bottom';
    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.7})`;
    ctx.lineWidth = 3;
    ctx.strokeText(info.genName.toUpperCase(), tx + glitchX, ty - 3);
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    ctx.fillText(info.genName.toUpperCase(), tx + glitchX, ty - 3);

    // Power percentage
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    const pctText = `${info.powerPercent.toFixed(1)}% PWR`;
    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.6})`;
    ctx.lineWidth = 2;
    ctx.strokeText(pctText, tx + glitchX, ty + 1);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
    ctx.fillText(pctText, tx + glitchX, ty + 1);
    ctx.restore();
  }
}

// Draw lightning bolts
export function drawLightningBolts(
  ctx: CanvasRenderingContext2D,
  dt: number, cx?: number, cy?: number,
) {
  const bolts = entityStore.bolts;
  const offsetX = cx ?? 0;
  const offsetY = cy ?? 0;

  for (let i = bolts.length - 1; i >= 0; i--) {
    const bolt = bolts[i];
    bolt.life -= dt;
    if (bolt.life <= 0) { bolts.splice(i, 1); continue; }

    // Apply center offset for bolts spawned relative to center
    const bx1 = bolt.fromCenter ? bolt.x1 + offsetX : bolt.x1;
    const by1 = bolt.fromCenter ? bolt.y1 + offsetY : bolt.y1;
    const bx2 = bolt.fromCenter ? bolt.x2 + offsetX : bolt.x2;
    const by2 = bolt.fromCenter ? bolt.y2 + offsetY : bolt.y2;

    const alpha = (bolt.life / bolt.maxLife) * 0.7;
    const segments = 8 + Math.floor(Math.random() * 4);
    const dx = bx2 - bx1;
    const dy = by2 - by1;

    ctx.strokeStyle = `rgba(${bolt.r}, ${bolt.g}, ${bolt.b}, ${alpha})`;
    ctx.lineWidth = 1.5 + Math.random();
    ctx.shadowColor = `rgba(${bolt.r}, ${bolt.g}, ${bolt.b}, ${alpha * 0.5})`;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(bx1, by1);
    for (let s = 1; s < segments; s++) {
      const frac = s / segments;
      const px = bx1 + dx * frac + (Math.random() - 0.5) * 15;
      const py = by1 + dy * frac + (Math.random() - 0.5) * 15;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(bx2, by2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

// Draw frenzy visual overlay when active
export function drawFrenzyOverlay(
  ctx: CanvasRenderingContext2D,
  w: number, h: number, t: number,
) {
  if (!entityStore.frenzyActive) return;

  const pulse = Math.sin(t * 12) * 0.5 + 0.5;

  // Screen border glow
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, `rgba(100, 255, 100, ${0.04 + pulse * 0.03})`);
  grad.addColorStop(0.3, 'rgba(100, 255, 100, 0)');
  grad.addColorStop(0.7, 'rgba(100, 255, 100, 0)');
  grad.addColorStop(1, `rgba(100, 255, 100, ${0.04 + pulse * 0.03})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const grad2 = ctx.createLinearGradient(0, 0, w, 0);
  grad2.addColorStop(0, `rgba(200, 255, 50, ${0.03 + pulse * 0.02})`);
  grad2.addColorStop(0.3, 'rgba(200, 255, 50, 0)');
  grad2.addColorStop(0.7, 'rgba(200, 255, 50, 0)');
  grad2.addColorStop(1, `rgba(200, 255, 50, ${0.03 + pulse * 0.02})`);
  ctx.fillStyle = grad2;
  ctx.fillRect(0, 0, w, h);

  // Electric interference lines
  for (let i = 0; i < 3; i++) {
    const y = (Math.sin(t * 8 + i * 2.1) * 0.5 + 0.5) * h;
    ctx.strokeStyle = `rgba(150, 255, 100, ${0.06 + pulse * 0.04})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < w; x += 10) {
      ctx.lineTo(x, y + (Math.random() - 0.5) * 4);
    }
    ctx.stroke();
  }

  // "FRENZY" text on canvas — positioned below the HTML frenzy indicator
  ctx.save();
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const glitch = Math.random() > 0.85 ? (Math.random() - 0.5) * 6 : 0;
  ctx.strokeStyle = `rgba(0, 0, 0, 0.6)`;
  ctx.lineWidth = 3;
  ctx.strokeText('⚡ FRENZY ⚡', w / 2 + glitch, 32);
  ctx.fillStyle = `rgba(200, 255, 80, ${0.7 + pulse * 0.3})`;
  ctx.shadowColor = 'rgba(100, 255, 50, 0.6)';
  ctx.shadowBlur = 10;
  ctx.fillText('⚡ FRENZY ⚡', w / 2 + glitch, 32);
  ctx.shadowBlur = 0;
  ctx.restore();
}

// Draw combo counter
export function drawComboCounter(
  ctx: CanvasRenderingContext2D,
  w: number, t: number,
) {
  if (entityStore.comboCount < 3) return;

  const combo = entityStore.comboCount;
  const pulse = Math.sin(t * 10) * 0.15 + 0.85;
  const size = Math.min(20, 13 + combo * 0.3);

  ctx.save();
  ctx.font = `bold ${size}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';

  const comboText = `x${combo} COMBO`;
  const x = w - 10;
  const y = 10;

  // Color escalation with combo
  let r = 168, g = 230, b = 207;
  if (combo >= 10) { r = 255; g = 220; b = 80; }
  if (combo >= 20) { r = 255; g = 100; b = 100; }
  if (combo >= 30) { r = 255; g = 50; b = 200; }

  const glitch = Math.random() > 0.88 ? (Math.random() - 0.5) * 4 : 0;

  ctx.strokeStyle = `rgba(0, 0, 0, 0.7)`;
  ctx.lineWidth = 3;
  ctx.strokeText(comboText, x + glitch, y);
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulse})`;
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
  ctx.shadowBlur = 8;
  ctx.fillText(comboText, x + glitch, y);
  ctx.shadowBlur = 0;
  ctx.restore();
}

// Draw glitch effect (random horizontal offset slices)
export function drawGlitchEffect(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
) {
  // Glitch triggers randomly, more often during frenzy
  const glitchChance = entityStore.frenzyActive ? 0.15 : 0.03;
  if (Math.random() > glitchChance) return;

  const dpr = window.devicePixelRatio || 1;
  const pw = Math.floor(w * dpr);
  const ph = Math.floor(h * dpr);

  const sliceCount = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < sliceCount; i++) {
    const sliceY = Math.floor(Math.random() * ph);
    const sliceH = Math.max(1, Math.floor((2 + Math.random() * 8) * dpr));
    const offset = Math.floor((Math.random() - 0.5) * 12 * dpr);
    const readH = Math.min(sliceH, ph - sliceY);
    if (readH <= 0 || pw <= 0) continue;
    try {
      const imgData = ctx.getImageData(0, sliceY, pw, readH);
      ctx.putImageData(imgData, offset, sliceY);
    } catch {
      // Canvas may be tainted or too small, skip
    }
  }
}

// Draw frenzy charge bar at bottom of canvas
export function drawFrenzyBar(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
) {
  const charge = entityStore.frenzyCharge;
  if (charge <= 0 && !entityStore.frenzyActive) return;

  const barH = 4;
  const barY = h - barH;
  const barW = w;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, barY, barW, barH);

  if (entityStore.frenzyActive) {
    // Full bar, electric pulse
    const pulse = Math.sin(t * 15) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(100, 255, 80, ${pulse})`;
    ctx.fillRect(0, barY, barW, barH);
    ctx.shadowColor = 'rgba(100, 255, 50, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillRect(0, barY, barW, barH);
    ctx.shadowBlur = 0;
  } else {
    // Charging bar
    const fillW = barW * charge;
    const gradient = ctx.createLinearGradient(0, barY, fillW, barY);
    gradient.addColorStop(0, 'rgba(80, 180, 255, 0.6)');
    gradient.addColorStop(0.5, 'rgba(120, 255, 120, 0.7)');
    gradient.addColorStop(1, 'rgba(200, 255, 80, 0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, barY, fillW, barH);

    // Sparkle at the edge
    if (charge > 0.1) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(t * 8) * 0.3})`;
      ctx.beginPath();
      ctx.arc(fillW, barY + barH / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Draw ambient void whispers floating across the reactor
export function drawVoidWhispers(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  dt: number,
) {
  const whispers = entityStore.whispers;
  for (let i = whispers.length - 1; i >= 0; i--) {
    const wh = whispers[i];
    wh.life -= dt;
    if (wh.life <= 0) { whispers.splice(i, 1); continue; }

    // Drift
    wh.x += Math.cos(wh.angle) * wh.speed * dt * 30;
    wh.y += Math.sin(wh.angle) * wh.speed * dt * 30;

    // Wrap around
    if (wh.x < -50) wh.x = w + 50;
    if (wh.x > w + 50) wh.x = -50;
    if (wh.y < -20) wh.y = h + 20;
    if (wh.y > h + 20) wh.y = -20;

    const fadeIn = Math.min(1, (wh.maxLife - wh.life) / 1.5);
    const fadeOut = Math.min(1, wh.life / 2.0);
    const alpha = fadeIn * fadeOut * 0.12;

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = `rgba(126, 200, 227, ${alpha})`;
    ctx.fillText(wh.text, wh.x, wh.y);
  }
}

// Draw challenge progress in the top-left area
export function drawChallengeHUD(
  ctx: CanvasRenderingContext2D,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  w: number, _h: number,
) {
  const challenges = entityStore.challenges;
  if (challenges.length === 0) return;

  const active = challenges.filter(c => !c.completed);
  if (active.length === 0) return;

  const ch = active[0];
  const progress = Math.min(1, ch.current / ch.target);
  const bx = 10;
  const bw = Math.min(200, w * 0.38);
  const boxH = 52;
  const by = 34;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(bx - 4, by - 4, bw + 8, boxH + 8);
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx - 4, by - 4, bw + 8, boxH + 8);

  // Title
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(255, 209, 102, 0.9)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('⚡ CHALLENGE', bx + 2, by + 2);

  // Description
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(200, 220, 240, 0.85)';
  ctx.fillText(ch.text, bx + 2, by + 16);

  // Reward
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(168, 230, 207, 0.8)';
  ctx.fillText(`Reward: +${formatNumber(ch.reward)} flux`, bx + 2, by + 29);

  // Progress bar
  const barY = by + boxH - 8;
  ctx.fillStyle = 'rgba(30, 50, 80, 0.6)';
  ctx.fillRect(bx, barY, bw, 6);

  ctx.fillStyle = progress >= 1
    ? 'rgba(168, 230, 207, 0.9)'
    : 'rgba(126, 200, 227, 0.7)';
  ctx.fillRect(bx, barY, bw * progress, 6);
}

// Draw active random events banner
export function drawRandomEventBanner(
  ctx: CanvasRenderingContext2D,
  w: number, h: number, t: number,
) {
  const events = entityStore.randomEvents;
  if (events.length === 0) return;

  const evt = events[0];
  const remaining = evt.duration - evt.elapsed;
  const progress = evt.elapsed / evt.duration;
  const pulse = Math.sin(t * 8) * 0.15 + 0.85;

  // Banner at top-right, below charge bar (offset further if combo counter is showing)
  const bw = Math.min(200, w * 0.35);
  const bh = 42;
  const bx = w - bw - 10;
  const comboOffset = entityStore.comboCount >= 3 ? 28 : 0;
  const by = 34 + comboOffset;

  // Event type colors
  let r = 126, g = 200, b = 227;
  if (evt.type === 'surge') { r = 255; g = 220; b = 80; }
  else if (evt.type === 'clickFrenzy') { r = 168; g = 230; b = 207; }
  else if (evt.type === 'dataStorm') { r = 212; g = 165; b = 255; }
  else if (evt.type === 'dark') { r = 180; g = 100; b = 100; }

  // Background
  ctx.fillStyle = `rgba(0, 0, 0, 0.6)`;
  ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.4 * pulse})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(bx - 2, by - 2, bw + 4, bh + 4);

  // Label
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulse})`;
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
  ctx.shadowBlur = 6;
  ctx.fillText(evt.label, bx + 4, by + 2);
  ctx.shadowBlur = 0;

  // Description
  ctx.font = '8px "JetBrains Mono", monospace';
  ctx.fillStyle = `rgba(200, 220, 240, 0.8)`;
  ctx.fillText(evt.description, bx + 4, by + 15);

  // Timer
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
  ctx.fillText(`${remaining.toFixed(1)}s`, bx + 4, by + 26);

  // Progress bar (countdown)
  ctx.fillStyle = 'rgba(30, 50, 80, 0.5)';
  ctx.fillRect(bx + 4, by + 36, bw - 8, 3);
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
  ctx.fillRect(bx + 4, by + 36, (bw - 8) * (1 - progress), 3);

  // Dark event: dim overlay
  if (evt.type === 'dark') {
    const dimAlpha = 0.15 * (1 - Math.abs(progress - 0.5) * 2); // fade in/out
    ctx.fillStyle = `rgba(0, 0, 20, ${dimAlpha})`;
    ctx.fillRect(0, 0, w, h);
  }
}

// Draw void rifts — pulsing clickable targets
export function drawVoidRifts(
  ctx: CanvasRenderingContext2D,
  w: number, h: number, t: number,
) {
  const rifts = entityStore.rifts;
  for (const rift of rifts) {
    if (rift.clicked) continue;

    const rx = rift.x * w;
    const ry = rift.y * h;
    const timeLeft = rift.life / rift.maxLife;
    const pulse = 0.6 + Math.sin(t * 6) * 0.4;
    const urgencyPulse = timeLeft < 0.3 ? Math.sin(t * 20) * 0.5 + 0.5 : 1;

    // Outer glow
    const glowR = rift.radius * (2.5 + Math.sin(t * 3) * 0.5);
    const glow = ctx.createRadialGradient(rx, ry, 0, rx, ry, glowR);
    glow.addColorStop(0, `rgba(180, 120, 255, ${0.15 * pulse * urgencyPulse})`);
    glow.addColorStop(0.5, `rgba(120, 80, 220, ${0.08 * pulse})`);
    glow.addColorStop(1, 'rgba(80, 40, 180, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(rx, ry, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Rotating ring
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(t * 3);
    ctx.strokeStyle = `rgba(200, 150, 255, ${0.4 * pulse * urgencyPulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, rift.radius, 0, Math.PI * 1.4);
    ctx.stroke();
    ctx.rotate(Math.PI);
    ctx.beginPath();
    ctx.arc(0, 0, rift.radius * 0.7, 0, Math.PI * 1.0);
    ctx.stroke();
    ctx.restore();

    // Inner core
    const coreGrad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rift.radius * 0.6);
    coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.3 * pulse * urgencyPulse})`);
    coreGrad.addColorStop(0.5, `rgba(200, 150, 255, ${0.15 * pulse})`);
    coreGrad.addColorStop(1, 'rgba(150, 100, 220, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(rx, ry, rift.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // "CLICK!" label
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeText('◉ RIFT', rx, ry + rift.radius + 4);
    ctx.fillStyle = `rgba(200, 150, 255, ${0.7 * urgencyPulse})`;
    ctx.fillText('◉ RIFT', rx, ry + rift.radius + 4);

    // Time remaining bar
    const barW = rift.radius * 2;
    const barH = 3;
    ctx.fillStyle = 'rgba(30, 20, 50, 0.5)';
    ctx.fillRect(rx - barW / 2, ry + rift.radius + 16, barW, barH);
    ctx.fillStyle = timeLeft < 0.3
      ? `rgba(255, 100, 100, ${urgencyPulse})`
      : 'rgba(200, 150, 255, 0.7)';
    ctx.fillRect(rx - barW / 2, ry + rift.radius + 16, barW * timeLeft, barH);
  }
}
