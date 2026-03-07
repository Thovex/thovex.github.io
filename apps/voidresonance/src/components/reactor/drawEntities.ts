import type { GameState } from '../../game/types';
import type { GraphicsQuality } from '../../store/settingsStore';
import { entityStore } from './entityStore';
import { GEN_COLORS, GEN_SHAPES } from './constants';
import { drawShape, getMilestoneLevel } from './drawUtils';
import { GENERATORS } from '../../config/generators';

export function drawEntities(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, maxR: number, t: number,
  state: GameState, intensity: number, gfx: GraphicsQuality = 'high',
) {
  const entities = entityStore.entities;
  const hoveredGenId = entityStore.hoveredGenId;

  for (let ei = 0; ei < entities.length; ei++) {
    const e = entities[ei];
    const color = GEN_COLORS[e.genId] || { r: 126, g: 200, b: 227 };
    const shape = GEN_SHAPES[e.genId] || 'circle';
    const owned = state.generators[e.genId]?.owned ?? 0;
    const ml = getMilestoneLevel(owned);

    const isHovered = hoveredGenId === e.genId;
    const isDimmed = hoveredGenId !== null && !isHovered;

    const age = t - e.spawnTime;
    const spawnFade = Math.min(1, age / 1.2);
    const spawnScale = 0.3 + spawnFade * 0.7;

    // Departure animation
    const DEPARTURE_DURATION = 1.5;
    const isDeparting = e.departureTime != null;
    const departProgress = isDeparting ? Math.min(1, (t - e.departureTime!) / DEPARTURE_DURATION) : 0;
    // Ease-in acceleration curve
    const departEase = departProgress * departProgress;
    const departFade = isDeparting ? 1 - departProgress : 1;

    const orbitPx = e.orbitRadius * maxR;
    const angle = e.baseAngle + t * e.speed;
    const wobbleAmt = 1.5 + ml * 1.2;
    const wobbleX = Math.sin(t * 1.2 + e.wobblePhase) * wobbleAmt;
    const wobbleY = Math.cos(t * 1.5 + e.rotPhase) * wobbleAmt;
    // When departing, entities fly outward along their angle
    const departOffset = departEase * maxR * 1.5;
    const ex = cx + Math.cos(angle) * (orbitPx + departOffset) + wobbleX * departFade;
    const ey = cy + Math.sin(angle) * (orbitPx + departOffset) + wobbleY * departFade;

    // Skip rendering if fully departed
    if (departProgress >= 1) continue;

    // ── Departure trail effect ──
    if (isDeparting && departProgress < 0.9 && gfx !== 'low') {
      const trailLen = 5;
      for (let ti = 1; ti <= trailLen; ti++) {
        const trailOffset = departEase * maxR * 1.5 - ti * (departEase * maxR * 0.12);
        if (trailOffset < 0) continue;
        const tx = cx + Math.cos(angle) * (orbitPx + trailOffset);
        const ty = cy + Math.sin(angle) * (orbitPx + trailOffset);
        const trailAlpha = (0.3 - ti * 0.05) * departFade;
        const trailSize = e.size * (0.8 - ti * 0.1);
        if (trailAlpha > 0 && trailSize > 0) {
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${trailAlpha})`;
          ctx.beginPath();
          ctx.arc(tx, ty, trailSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Size scales dramatically: +25% per milestone (up to 2.5x at ml6)
    const entitySize = e.size * (1 + ml * 0.25) * spawnScale * (isHovered ? 1.4 : 1) * (isDeparting ? (1 + departEase * 0.5) : 1);
    const dimFactor = isDimmed ? 0.2 : 1;
    const hoverBoost = isHovered ? 0.3 : 0;
    const alpha = (0.5 + ml * 0.1 + intensity * 0.15 + hoverBoost) * spawnFade * dimFactor * departFade;
    const rotation = t * (e.speed > 0 ? 1.2 : -1.2) + e.rotPhase;

    const gen = GENERATORS.find(g => g.id === e.genId);
    const tier = gen ? gen.tier : 1;

    // ── ML 1+ (16 owned): Pulsing glow aura ──
    if (ml >= 1 && spawnFade > 0.3 && gfx !== 'low') {
      const pulse = 0.6 + Math.sin(t * 3 + e.rotPhase) * 0.4;
      const glowR = Math.max(entitySize * (2.5 + ml * 1.0), 0.1);
      const glowAlpha = (0.06 + ml * 0.04) * pulse * dimFactor;
      const glow = ctx.createRadialGradient(ex, ey, 0, ex, ey, glowR);
      glow.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${glowAlpha})`);
      glow.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${glowAlpha * 0.3})`);
      glow.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ex, ey, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── ML 2+ (32 owned): Orbiting ring around entity ──
    if (ml >= 2 && spawnFade > 0.5 && gfx !== 'low') {
      const ringR = entitySize * (1.8 + ml * 0.3);
      const ringAlpha = (0.15 + ml * 0.05) * dimFactor;
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${ringAlpha})`;
      ctx.lineWidth = 0.8 + ml * 0.2;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(t * 2 + e.rotPhase);
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 1.2);
      ctx.stroke();
      // Second partial ring going opposite direction
      ctx.rotate(Math.PI + t * -1.5);
      ctx.beginPath();
      ctx.arc(0, 0, ringR * 0.8, 0, Math.PI * 0.8);
      ctx.stroke();
      ctx.restore();
    }

    // ── ML 3+ (64 owned): Motion trails ──
    if (ml >= 3 && spawnFade > 0.5 && gfx !== 'low') {
      const trailCount = 3 + ml * 2;
      for (let tr = 1; tr <= trailCount; tr++) {
        const trailAngle = e.baseAngle + (t - tr * 0.035) * e.speed;
        const tx = cx + Math.cos(trailAngle) * orbitPx;
        const ty = cy + Math.sin(trailAngle) * orbitPx;
        const trailAlpha = alpha * (0.25 / tr);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${trailAlpha})`;
        ctx.beginPath();
        ctx.arc(tx, ty, entitySize * (0.8 / Math.sqrt(tr)), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── ML 4+ (128 owned): Bright electric connections every 2nd entity ──
    if (ml >= 4 && e.index % 2 === 0 && spawnFade > 0.8 && gfx !== 'low') {
      const next = entities.find(n => n.genId === e.genId && n.index === e.index + 1);
      if (next) {
        const nAngle = next.baseAngle + t * next.speed;
        const nwX = Math.sin(t * 1.2 + next.wobblePhase) * wobbleAmt;
        const nwY = Math.cos(t * 1.5 + next.rotPhase) * wobbleAmt;
        const nx = cx + Math.cos(nAngle) * next.orbitRadius * maxR + nwX;
        const ny = cy + Math.sin(nAngle) * next.orbitRadius * maxR + nwY;
        const connAlpha = (0.08 + ml * 0.03) * dimFactor;

        // Draw jagged electric connection
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${connAlpha})`;
        ctx.lineWidth = 0.6 + ml * 0.2;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        const segs = 4;
        for (let s = 1; s < segs; s++) {
          const frac = s / segs;
          const mx = ex + (nx - ex) * frac + (Math.random() - 0.5) * 6;
          const my = ey + (ny - ey) * frac + (Math.random() - 0.5) * 6;
          ctx.lineTo(mx, my);
        }
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }
    }

    // ── ML 5+ (256 owned): Radiating energy spikes ──
    if (ml >= 5 && spawnFade > 0.7 && gfx !== 'low') {
      const spikeCount = 6;
      const spikeLen = entitySize * (2.5 + ml);
      const spikeAlpha = (0.12 + ml * 0.03) * dimFactor;
      ctx.strokeStyle = `rgba(${Math.min(255, color.r + 60)}, ${Math.min(255, color.g + 60)}, ${Math.min(255, color.b + 60)}, ${spikeAlpha})`;
      ctx.lineWidth = 0.5 + ml * 0.15;
      for (let s = 0; s < spikeCount; s++) {
        const sAngle = (s / spikeCount) * Math.PI * 2 + t * 1.5 + e.rotPhase;
        const pulse = 0.7 + Math.sin(t * 4 + s) * 0.3;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(
          ex + Math.cos(sAngle) * spikeLen * pulse,
          ey + Math.sin(sAngle) * spikeLen * pulse,
        );
        ctx.stroke();
      }
    }

    // ── ML 6 (512 owned): Blazing corona + electric field ──
    if (ml >= 6 && spawnFade > 0.5 && gfx !== 'low') {
      // Bright corona
      const coronaR = Math.max(entitySize * 5, 0.1);
      const coronaPulse = 0.6 + Math.sin(t * 5 + e.wobblePhase) * 0.4;
      const corona = ctx.createRadialGradient(ex, ey, entitySize * 0.5, ex, ey, coronaR);
      corona.addColorStop(0, `rgba(255, 255, 255, ${0.1 * coronaPulse * dimFactor})`);
      corona.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.08 * coronaPulse * dimFactor})`);
      corona.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      ctx.fillStyle = corona;
      ctx.beginPath();
      ctx.arc(ex, ey, coronaR, 0, Math.PI * 2);
      ctx.fill();

      // Random micro-bolts
      if (Math.random() < 0.3) {
        const bAngle = Math.random() * Math.PI * 2;
        const bLen = entitySize * (2 + Math.random() * 4);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 * dimFactor})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        const bSegs = 3;
        for (let bs = 1; bs <= bSegs; bs++) {
          const bf = bs / bSegs;
          ctx.lineTo(
            ex + Math.cos(bAngle) * bLen * bf + (Math.random() - 0.5) * 5,
            ey + Math.sin(bAngle) * bLen * bf + (Math.random() - 0.5) * 5,
          );
        }
        ctx.stroke();
      }
    }

    // Hover highlight glow
    if (isHovered && spawnFade > 0.3 && gfx !== 'low') {
      const glowR = Math.max(entitySize * 3.5, 0.1);
      const pulse = 0.7 + Math.sin(t * 6) * 0.3;
      const glow = ctx.createRadialGradient(ex, ey, 0, ex, ey, glowR);
      glow.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.2 * pulse * spawnFade})`);
      glow.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.08 * pulse * spawnFade})`);
      glow.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ex, ey, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Spawn effects — tier-scaled explosiveness
    const spawnDuration = 0.5 + tier * 0.2;

    if (age < spawnDuration && gfx !== 'low') {
      const flashProgress = age / spawnDuration;

      // Base flash — bigger for higher tiers
      const flashR = entitySize * (3 + tier * 2 + flashProgress * (6 + tier * 3));
      const glowR = Math.max(flashR, 0.1);
      const flashAlpha = (1 - flashProgress) * (0.2 + tier * 0.08) * dimFactor;
      const glow = ctx.createRadialGradient(ex, ey, 0, ex, ey, glowR);
      glow.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${flashAlpha})`);
      glow.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${flashAlpha * 0.5})`);
      glow.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ex, ey, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Tier 2+: expanding ring
      if (tier >= 2) {
        const ringR = entitySize * (2 + flashProgress * (8 + tier * 4));
        const ringAlpha = (1 - flashProgress) * 0.3 * dimFactor;
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${ringAlpha})`;
        ctx.lineWidth = 1.5 + tier * 0.3;
        ctx.beginPath();
        ctx.arc(ex, ey, Math.max(ringR, 0.1), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Tier 3+: radial spike lines (laser beams)
      if (tier >= 3 && flashProgress < 0.7) {
        const spikeCount = 4 + (tier - 2) * 2;
        const spikeLen = entitySize * (5 + tier * 3) * (1 - flashProgress);
        const spikeAlpha = (1 - flashProgress) * 0.35 * dimFactor;
        ctx.strokeStyle = `rgba(${Math.min(255, color.r + 80)}, ${Math.min(255, color.g + 80)}, ${Math.min(255, color.b + 80)}, ${spikeAlpha})`;
        ctx.lineWidth = 0.8 + tier * 0.2;
        for (let s = 0; s < spikeCount; s++) {
          const sAngle = (s / spikeCount) * Math.PI * 2 + age * 3;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex + Math.cos(sAngle) * spikeLen, ey + Math.sin(sAngle) * spikeLen);
          ctx.stroke();
        }
      }

      // Tier 4+: electric arcs from spawn point
      if (tier >= 4 && flashProgress < 0.6) {
        const arcCount = Math.max(1, tier - 2);
        const arcAlpha = (1 - flashProgress * 1.5) * 0.4 * dimFactor;
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, arcAlpha)})`;
        ctx.lineWidth = 1;
        for (let a = 0; a < arcCount; a++) {
          const arcAngle = (a / arcCount) * Math.PI * 2 + age * 8;
          const arcLen = entitySize * (4 + tier * 2) * (1 - flashProgress);
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          const segments = 5;
          for (let seg = 1; seg <= segments; seg++) {
            const frac = seg / segments;
            const jx = (Math.random() - 0.5) * 8 * (1 - flashProgress);
            const jy = (Math.random() - 0.5) * 8 * (1 - flashProgress);
            ctx.lineTo(
              ex + Math.cos(arcAngle) * arcLen * frac + jx,
              ey + Math.sin(arcAngle) * arcLen * frac + jy,
            );
          }
          ctx.stroke();
        }
      }

      // Tier 5+: secondary shockwave ring
      if (tier >= 5 && flashProgress > 0.1) {
        const wave2R = entitySize * (1 + (flashProgress - 0.1) * (15 + tier * 5));
        const wave2Alpha = Math.max(0, (1 - (flashProgress - 0.1) * 1.3)) * 0.2 * dimFactor;
        ctx.strokeStyle = `rgba(255, 255, 255, ${wave2Alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ex, ey, Math.max(wave2R, 0.1), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Tier 6: white-hot center flash
      if (tier >= 6 && flashProgress < 0.3) {
        const coreFlash = (1 - flashProgress / 0.3) * 0.6 * dimFactor;
        ctx.fillStyle = `rgba(255, 255, 255, ${coreFlash})`;
        ctx.beginPath();
        ctx.arc(ex, ey, entitySize * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Draw main shape ──
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    drawShape(ctx, shape, ex, ey, entitySize, rotation);
    ctx.fill();

    // White core — from ml 2+
    if (ml >= 2 && spawnFade > 0.5 && gfx !== 'low') {
      const coreSize = entitySize * (0.2 + ml * 0.05);
      const corePulse = 0.2 + Math.sin(t * 3 + e.rotPhase) * 0.15 + ml * 0.05;
      ctx.fillStyle = `rgba(255, 255, 255, ${corePulse * spawnFade * dimFactor})`;
      ctx.beginPath();
      ctx.arc(ex, ey, coreSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw hovered orbit ring highlight
  if (hoveredGenId && gfx !== 'low') {
    const genIndex = GENERATORS.findIndex(g => g.id === hoveredGenId);
    if (genIndex >= 0) {
      const color = GEN_COLORS[hoveredGenId] || { r: 126, g: 200, b: 227 };
      const baseOrbit = 0.18 + genIndex * 0.06;
      const orbitPx = baseOrbit * maxR;
      const pulse = 0.5 + Math.sin(t * 4) * 0.3;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.15 * pulse})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.4)`;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, orbitPx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }
}
