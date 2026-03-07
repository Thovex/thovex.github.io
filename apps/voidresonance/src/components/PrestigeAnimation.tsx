import { useEffect, useRef, useState, useCallback } from 'react';
import type { PrestigeAnimationType, AnimationContext } from './prestigeAnimationTrigger';
import { onPrestigeAnimation } from './prestigeAnimationTrigger';
import './PrestigeAnimation.css';

// ─── Color palettes per tier ───
interface TierPalette {
  primary: string;
  secondary: string;
  glow: string;
  flash: string;
  particles: string[];
  label: string;
  sublabel: string;
}

const PALETTES: Record<PrestigeAnimationType, TierPalette> = {
  prestige: {
    primary: '#4db8d8',
    secondary: '#00d4aa',
    glow: 'rgba(77, 184, 216, 0.6)',
    flash: 'rgba(77, 184, 216, 0.25)',
    particles: ['#4db8d8', '#00d4aa', '#80e0f0', '#3ddc84', '#a0f0ff', '#ffffff'],
    label: 'PRESTIGE',
    sublabel: 'Reality echoes...',
  },
  voidCollapse: {
    primary: '#b06aff',
    secondary: '#7b2fff',
    glow: 'rgba(176, 106, 255, 0.6)',
    flash: 'rgba(123, 47, 255, 0.25)',
    particles: ['#b06aff', '#7b2fff', '#d4a0ff', '#ff44aa', '#6040e0', '#ffffff'],
    label: 'VOID COLLAPSE',
    sublabel: 'The void shatters...',
  },
  singularity: {
    primary: '#ffaa22',
    secondary: '#ff6644',
    glow: 'rgba(255, 170, 34, 0.6)',
    flash: 'rgba(255, 200, 100, 0.3)',
    particles: ['#ffaa22', '#ff6644', '#ffdd66', '#ffffff', '#ff8844', '#ffe0a0'],
    label: 'SINGULARITY',
    sublabel: 'Reality fractures...',
  },
  expedition: {
    primary: '#00d4aa',
    secondary: '#4db8d8',
    glow: 'rgba(0, 212, 170, 0.5)',
    flash: 'rgba(0, 212, 170, 0.2)',
    particles: ['#00d4aa', '#4db8d8', '#80f0d0', '#3ddc84', '#00ffcc', '#ffffff'],
    label: 'EXPEDITION LAUNCHED',
    sublabel: 'Venturing into the void...',
  },
  ascendancy: {
    primary: '#ffcc44',
    secondary: '#ff8800',
    glow: 'rgba(255, 204, 68, 0.5)',
    flash: 'rgba(255, 180, 50, 0.2)',
    particles: ['#ffcc44', '#ff8800', '#ffe080', '#ffaa22', '#ffd866', '#ffffff'],
    label: 'PATH CHOSEN',
    sublabel: 'Ascendancy awakens...',
  },
  allGenerators: {
    primary: '#3ddc84',
    secondary: '#4db8d8',
    glow: 'rgba(61, 220, 132, 0.5)',
    flash: 'rgba(61, 220, 132, 0.2)',
    particles: ['#3ddc84', '#4db8d8', '#80f0b0', '#00d4aa', '#a0ffc0', '#ffffff'],
    label: 'FULL ARSENAL',
    sublabel: 'All generators online!',
  },
  systemUnlock: {
    primary: '#4db8d8',
    secondary: '#b06aff',
    glow: 'rgba(77, 184, 216, 0.6)',
    flash: 'rgba(176, 106, 255, 0.3)',
    particles: ['#4db8d8', '#b06aff', '#80e0f0', '#d4a0ff', '#a0f0ff', '#ffffff'],
    label: 'SYSTEM UNLOCKED',
    sublabel: 'New power awaits...',
  },
};

// ─── Which animation types use the "prestige-style" (big burst) vs "event-style" (lighter) ───
const PRESTIGE_TYPES: ReadonlySet<PrestigeAnimationType> = new Set(['prestige', 'voidCollapse', 'singularity']);

function getAnimDuration(type: PrestigeAnimationType): number {
  if (type === 'singularity') return 5000;
  if (PRESTIGE_TYPES.has(type)) return 4000;
  return 3000;
}

// ─── Animation timing constants ───
const FLASH_DURATION = 500;
const IMPLOSION_DURATION = 500;
const BURST_DELAY = 300;
const SHARD_DELAY = 400;
const TEXT_FADE_IN_START = 200;
const TEXT_FADE_IN_DURATION = 400;
const SCALE_PUNCH_END = 600;

function getTextFadeOutStart(type: PrestigeAnimationType): number {
  if (type === 'singularity') return 3500;
  if (PRESTIGE_TYPES.has(type)) return 2600;
  return 1800;
}

// ─── Data types ───
interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; life: number; maxLife: number; delay: number;
}

interface Ring {
  x: number; y: number; radius: number; maxRadius: number;
  speed: number; width: number; color: string; born: number;
}

interface Shard {
  x: number; y: number; vx: number; vy: number;
  angle: number; angularVel: number; size: number;
  color: string; life: number; maxLife: number;
}

interface WarpLine {
  angle: number; startDist: number; speed: number;
  length: number; width: number; color: string;
}

// ─── Main Component ───
export function PrestigeAnimation() {
  const [activeType, setActiveType] = useState<PrestigeAnimationType | null>(null);
  const [activeContext, setActiveContext] = useState<AnimationContext>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const prevFrameRef = useRef<number>(0);

  const handleTrigger = useCallback((type: PrestigeAnimationType, context: AnimationContext) => {
    setActiveType(type);
    setActiveContext(context);
  }, []);

  useEffect(() => {
    return onPrestigeAnimation(handleTrigger);
  }, [handleTrigger]);

  useEffect(() => {
    if (!activeType) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const palette = PALETTES[activeType];
    const cx = w / 2;
    const cy = h / 2;
    const maxDim = Math.max(w, h);
    const isPrestigeStyle = PRESTIGE_TYPES.has(activeType);
    const animDuration = getAnimDuration(activeType);
    const textFadeOutStart = getTextFadeOutStart(activeType);
    const details = activeContext.details ?? [];

    // ─── Generate particles ───
    const particles: Particle[] = [];
    const particleCount = isPrestigeStyle ? 200 : 120;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = isPrestigeStyle ? 2 + Math.random() * 8 : 1.5 + Math.random() * 5;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * (isPrestigeStyle ? 4 : 3),
        color: palette.particles[Math.floor(Math.random() * palette.particles.length)],
        life: 1,
        maxLife: isPrestigeStyle ? 1500 + Math.random() * 1200 : 1000 + Math.random() * 800,
        delay: Math.random() * 400,
      });
    }

    // ─── Generate rings ───
    const rings: Ring[] = [];
    const ringCount = activeType === 'singularity' ? 5 : isPrestigeStyle ? 3 : 2;
    for (let i = 0; i < ringCount; i++) {
      rings.push({
        x: cx, y: cy, radius: 0, maxRadius: maxDim * 0.9,
        speed: (3 + i * 1.5) * (maxDim / 1000),
        width: 3 - i * 0.4,
        color: i === 0 ? palette.primary : palette.secondary,
        born: 300 + i * 200,
      });
    }

    // ─── Generate shards (void/singularity) ───
    const shards: Shard[] = [];
    if (activeType === 'voidCollapse' || activeType === 'singularity') {
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 5;
        shards.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          angle: Math.random() * Math.PI * 2,
          angularVel: (Math.random() - 0.5) * 0.15,
          size: 6 + Math.random() * 14,
          color: palette.particles[Math.floor(Math.random() * palette.particles.length)],
          life: 1, maxLife: 1800 + Math.random() * 800,
        });
      }
    }

    // ─── Generate streaks ───
    const streakCount = activeType === 'singularity' ? 60 : isPrestigeStyle ? 36 : 24;
    const streaks: { angle: number; speed: number; width: number; color: string; delay: number }[] = [];
    for (let i = 0; i < streakCount; i++) {
      streaks.push({
        angle: (i / streakCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.1,
        speed: (4 + Math.random() * 6) * (maxDim / 1000),
        width: 0.5 + Math.random() * 1.5,
        color: palette.particles[Math.floor(Math.random() * palette.particles.length)],
        delay: 200 + Math.random() * 300,
      });
    }

    // ─── Generate warp lines (expedition) ───
    const warpLines: WarpLine[] = [];
    if (activeType === 'expedition') {
      for (let i = 0; i < 80; i++) {
        warpLines.push({
          angle: Math.random() * Math.PI * 2,
          startDist: 80 + Math.random() * maxDim * 0.5,
          speed: 3 + Math.random() * 6,
          length: 30 + Math.random() * 80,
          width: 0.5 + Math.random() * 2,
          color: palette.particles[Math.floor(Math.random() * palette.particles.length)],
        });
      }
    }

    startRef.current = performance.now();
    prevFrameRef.current = startRef.current;

    const draw = (now: number) => {
      const elapsed = now - startRef.current;
      const dt = now - prevFrameRef.current;
      prevFrameRef.current = now;
      const progress = Math.min(elapsed / animDuration, 1);

      ctx.clearRect(0, 0, w, h);

      // ─── Flash ───
      if (elapsed < FLASH_DURATION) {
        const flashAlpha = Math.sin((elapsed / FLASH_DURATION) * Math.PI) * (isPrestigeStyle ? 0.4 : 0.25);
        ctx.fillStyle = palette.flash.replace(/[\d.]+\)$/, `${flashAlpha})`);
        ctx.fillRect(0, 0, w, h);
      }

      // ─── Background darken ───
      const maxBg = isPrestigeStyle ? 0.7 : 0.5;
      const bgAlpha = progress < 0.1
        ? progress / 0.1 * maxBg
        : progress > 0.75
          ? (1 - progress) / 0.25 * maxBg
          : maxBg;
      ctx.fillStyle = `rgba(0, 0, 0, ${bgAlpha})`;
      ctx.fillRect(0, 0, w, h);

      // ─── Center glow ───
      if (elapsed > 100 && elapsed < animDuration * 0.73) {
        const glowProg = Math.min((elapsed - 100) / 600, 1);
        const glowFade = elapsed > animDuration * 0.47 ? Math.max(0, 1 - (elapsed - animDuration * 0.47) / (animDuration * 0.27)) : 1;
        const glowR = 50 + glowProg * maxDim * 0.15;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
        grad.addColorStop(0, palette.glow.replace(/[\d.]+\)$/, `${0.8 * glowFade})`));
        grad.addColorStop(0.4, palette.glow.replace(/[\d.]+\)$/, `${0.3 * glowFade})`));
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // ─── Implosion (prestige-style only) ───
      if (isPrestigeStyle && elapsed < IMPLOSION_DURATION) {
        const impP = elapsed / IMPLOSION_DURATION;
        const count = Math.floor(impP * 80);
        for (let i = 0; i < count; i++) {
          const a = (i / 80) * Math.PI * 2;
          const d = maxDim * 0.4 * (1 - impP * 0.8);
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1 + impP * 3, 0, Math.PI * 2);
          ctx.globalAlpha = impP * 0.7;
          ctx.fillStyle = palette.particles[i % palette.particles.length];
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // ─── Warp tunnel (expedition) ───
      if (activeType === 'expedition') {
        const warpFade = elapsed < 400 ? elapsed / 400 : elapsed > animDuration * 0.7 ? Math.max(0, (1 - elapsed / animDuration) / 0.3) : 1;
        for (const wl of warpLines) {
          const convergeProg = Math.min(elapsed / 1500, 1);
          const dist = wl.startDist * (1 - convergeProg * 0.6);
          const lineEnd = Math.max(0, dist - wl.length);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(wl.angle) * dist, cy + Math.sin(wl.angle) * dist);
          ctx.lineTo(cx + Math.cos(wl.angle) * lineEnd, cy + Math.sin(wl.angle) * lineEnd);
          ctx.strokeStyle = wl.color;
          ctx.lineWidth = wl.width;
          ctx.globalAlpha = warpFade * 0.6;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // Portal ring
        if (elapsed > 200) {
          const pp = Math.min((elapsed - 200) / 800, 1);
          const pf = elapsed > animDuration * 0.65 ? Math.max(0, (1 - elapsed / animDuration) / 0.35) : 1;
          const pr = 30 + pp * 60;
          ctx.beginPath();
          ctx.arc(cx, cy, pr, 0, Math.PI * 2);
          ctx.strokeStyle = palette.primary;
          ctx.lineWidth = 3;
          ctx.globalAlpha = pf * 0.8;
          ctx.stroke();
          const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, pr);
          pg.addColorStop(0, palette.glow.replace(/[\d.]+\)$/, `${0.4 * pf})`));
          pg.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = pg;
          ctx.globalAlpha = pf;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // ─── Rising energy columns (ascendancy) ───
      if (activeType === 'ascendancy') {
        const cFade = elapsed < 300 ? elapsed / 300 : elapsed > animDuration * 0.7 ? Math.max(0, (1 - elapsed / animDuration) / 0.3) : 1;
        for (let i = 0; i < 5; i++) {
          const colX = w * (0.15 + (i / 4) * 0.7);
          const colH = h * Math.min((elapsed - 100) / 1000, 1) * (0.6 + Math.sin(i * 1.2 + elapsed * 0.003) * 0.2);
          if (colH <= 0) continue;
          const colW = 20 + Math.sin(elapsed * 0.005 + i) * 8;
          const grad = ctx.createLinearGradient(colX, h, colX, h - colH);
          grad.addColorStop(0, palette.primary);
          grad.addColorStop(0.5, palette.secondary);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.globalAlpha = cFade * 0.35;
          ctx.fillRect(colX - colW / 2, h - colH, colW, colH);
          ctx.globalAlpha = 1;
        }
      }

      // ─── Cascading rings (allGenerators) ───
      if (activeType === 'allGenerators') {
        for (let i = 0; i < 6; i++) {
          const rd = 100 + i * 150;
          if (elapsed < rd) continue;
          const re = elapsed - rd;
          const rr = re * 0.15 * (maxDim / 1000) * (i + 2);
          const rm = maxDim * 0.5;
          if (rr > rm) continue;
          const rf = rr > rm * 0.5 ? Math.max(0, 1 - (rr - rm * 0.5) / (rm * 0.5)) : Math.min(1, re / 200);
          ctx.beginPath();
          ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.strokeStyle = i % 2 === 0 ? palette.primary : palette.secondary;
          ctx.lineWidth = 2;
          ctx.globalAlpha = rf * 0.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // ─── Lock-break shatter (systemUnlock) ───
      if (activeType === 'systemUnlock' && elapsed > 200 && elapsed < 1200) {
        const sp = Math.min((elapsed - 200) / 600, 1);
        const sf = elapsed > 800 ? Math.max(0, 1 - (elapsed - 800) / 400) : 1;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const d = sp * maxDim * 0.15;
          ctx.save();
          ctx.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
          ctx.rotate(a + sp * 2);
          ctx.globalAlpha = sf * 0.7;
          ctx.fillStyle = palette.particles[i % palette.particles.length];
          const fs = 4 + Math.random() * 6;
          ctx.fillRect(-fs / 2, -fs / 2, fs, fs);
          ctx.restore();
          ctx.globalAlpha = 1;
        }
      }

      // ─── Streaks ───
      for (const streak of streaks) {
        if (elapsed < streak.delay) continue;
        const se = elapsed - streak.delay;
        const sLen = Math.min(streak.speed * se * 0.3, maxDim * 0.7);
        const fadeStart = isPrestigeStyle ? 1500 : 1000;
        const sf = se > fadeStart ? Math.max(0, 1 - (se - fadeStart) / 1000) : Math.min(1, se / 200);
        if (sf <= 0) continue;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(streak.angle) * 20, cy + Math.sin(streak.angle) * 20);
        ctx.lineTo(cx + Math.cos(streak.angle) * sLen, cy + Math.sin(streak.angle) * sLen);
        ctx.strokeStyle = streak.color;
        ctx.lineWidth = streak.width;
        ctx.globalAlpha = sf * 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ─── Rings (shockwaves) ───
      for (const ring of rings) {
        if (elapsed < ring.born) continue;
        const re = elapsed - ring.born;
        ring.radius = ring.speed * re * 0.4;
        if (ring.radius > ring.maxRadius) continue;
        const rf = ring.radius > ring.maxRadius * 0.6
          ? Math.max(0, 1 - (ring.radius - ring.maxRadius * 0.6) / (ring.maxRadius * 0.4))
          : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = ring.width * (1 + rf);
        ctx.globalAlpha = rf * 0.7;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ─── Particles ───
      const dtScale = dt / 16;
      for (const p of particles) {
        if (elapsed < p.delay + BURST_DELAY) continue;
        const pe = elapsed - p.delay - BURST_DELAY;
        if (pe > p.maxLife) { p.life = 0; continue; }
        p.x += p.vx * dtScale;
        p.y += p.vy * dtScale;
        p.vx *= Math.pow(0.995, dtScale);
        p.vy *= Math.pow(0.995, dtScale);
        p.life = 1 - pe / p.maxLife;
        if (p.life <= 0) continue;
        const alpha = p.life * p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + p.life * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        if (p.size > 2.5) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.15;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // ─── Shards ───
      for (const shard of shards) {
        if (elapsed < SHARD_DELAY) continue;
        const se = elapsed - SHARD_DELAY;
        if (se > shard.maxLife) { shard.life = 0; continue; }
        shard.x += shard.vx * dtScale;
        shard.y += shard.vy * dtScale;
        shard.angle += shard.angularVel * dtScale;
        shard.vx *= Math.pow(0.997, dtScale);
        shard.vy *= Math.pow(0.997, dtScale);
        shard.life = 1 - se / shard.maxLife;
        if (shard.life <= 0) continue;
        const alpha = shard.life * shard.life;
        ctx.save();
        ctx.translate(shard.x, shard.y);
        ctx.rotate(shard.angle);
        ctx.globalAlpha = alpha * 0.8;
        const s = shard.size * (0.6 + shard.life * 0.4);
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.4, 0);
        ctx.lineTo(0, s * 0.6);
        ctx.lineTo(-s * 0.4, 0);
        ctx.closePath();
        ctx.fillStyle = shard.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = alpha * 0.4;
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // ─── Center text + context details ───
      if (elapsed > TEXT_FADE_IN_START && elapsed < animDuration * 0.88) {
        const textFadeIn = Math.min(1, (elapsed - TEXT_FADE_IN_START) / TEXT_FADE_IN_DURATION);
        const textFadeOut = elapsed > textFadeOutStart ? Math.max(0, 1 - (elapsed - textFadeOutStart) / 700) : 1;
        const textAlpha = textFadeIn * textFadeOut;
        const scalePunch = elapsed < SCALE_PUNCH_END
          ? 1 + (1 - (elapsed - TEXT_FADE_IN_START) / TEXT_FADE_IN_DURATION) * 0.3
          : 1;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scalePunch, scalePunch);

        // Main label
        ctx.font = `800 ${Math.min(72, w * 0.06)}px 'Orbitron', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = palette.primary;
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = textAlpha;
        ctx.fillText(palette.label, 0, details.length > 0 ? -40 : -20);

        // Sublabel
        ctx.font = `400 ${Math.min(24, w * 0.025)}px 'JetBrains Mono', monospace`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = palette.secondary;
        ctx.fillStyle = palette.primary;
        ctx.globalAlpha = textAlpha * 0.8;
        ctx.fillText(palette.sublabel, 0, details.length > 0 ? -5 : 15);

        // Context details (rewards, path name, etc.)
        if (details.length > 0) {
          const detailFadeIn = Math.min(1, Math.max(0, (elapsed - 500) / 400));
          const detailAlpha = detailFadeIn * textFadeOut;
          ctx.font = `600 ${Math.min(28, w * 0.03)}px 'JetBrains Mono', monospace`;
          ctx.shadowBlur = 20;
          ctx.shadowColor = palette.primary;
          ctx.fillStyle = '#ffffff';

          for (let i = 0; i < details.length; i++) {
            ctx.globalAlpha = detailAlpha * 0.9;
            ctx.fillText(details[i], 0, 30 + i * 34);
          }
        }

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      if (progress < 1) {
        animRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, w, h);
        setActiveType(null);
        setActiveContext({});
      }
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [activeType, activeContext]);

  if (!activeType) return null;

  return (
    <div className="prestige-anim-overlay">
      <canvas ref={canvasRef} />
    </div>
  );
}
