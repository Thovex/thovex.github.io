import { useRef, useEffect, useCallback, useState } from 'react';
import { useGameStore } from '../../game/store';
import { getFluxPerSecond, getClickValue, getGeneratorFluxPerSecond, getDataPerSecond } from '../../game/engine';
import { useSettingsStore } from '../../store/settingsStore';
import { playClickSound } from '../../audio/SoundManager';
import { formatNumber } from '../../utils/numberFormatting';
import { entityStore, syncEntities, nextFloatId } from './entityStore';
import { GENERATORS } from '../../config/generators';
import { PRESTIGE_UPGRADES } from '../../config/prestige';
import { drawEntities } from './drawEntities';
import {
  drawBackgroundGrid,
  drawClickRipples,
  drawOrbitRings,
  drawOuterHexRing,
  drawPulsingCore,
  drawEnergyBeams,
  drawConstellationWebs,
  drawAuroraWaves,
  drawDataRing,
  drawSpawnParticles,
  drawEntityCount,
  drawFloatingNumbers,
  drawScanLines,
  drawEntityInfoLines,
  drawLightningBolts,
  drawFrenzyOverlay,
  drawComboCounter,
  drawGlitchEffect,
  drawFrenzyBar,
  drawVoidWhispers,
  drawChallengeHUD,
  drawRandomEventBanner,
  drawVoidRifts,
} from './drawEffects';

interface DisplayStats {
  fps: string;
  clickVal: string;
  totalOwned: number;
  overcharged: boolean;
  active: boolean;
  frenzyCharge: number;
  frenzyActive: boolean;
  comboCount: number;
  lowFpsDetected: boolean;
}

// Frenzy constants
const FRENZY_CHARGE_PER_CLICK = 0.06;
const FRENZY_DECAY_RATE = 0.015;
const FRENZY_DURATION = 6.0;
const FRENZY_SPEED_MULT = 2.5;
const FRENZY_DECELERATION_RATE = 0.67; // ~1.5s smooth deceleration
// Combo
const COMBO_WINDOW = 0.6;
// Critical hit
const CRITICAL_CHANCE = 0.08;
const CRITICAL_MULT = 3;
// Info line spawn interval
const INFO_LINE_INTERVAL = 3.5;
// Random events
const EVENT_MIN_INTERVAL = 45;
const EVENT_RANDOM_RANGE = 60;
// Void rifts
const RIFT_MIN_INTERVAL = 50;
const RIFT_RANDOM_RANGE = 70;

// Challenge generator
function generateChallenges(totalClicks: number, fps: number) {
  const challenges = [];
  const clickTarget = Math.max(10, totalClicks + 20 + Math.floor(Math.random() * 30));
  const fluxReward = Math.max(10, Math.floor(fps * 30));
  challenges.push({
    id: `ch_clicks_${Date.now()}`,
    text: `Click ${clickTarget} total times`,
    target: clickTarget,
    current: totalClicks,
    reward: fluxReward,
    type: 'clicks' as const,
    completed: false,
  });
  if (fps > 0) {
    const comboTarget = 5 + Math.floor(Math.random() * 10);
    challenges.push({
      id: `ch_combo_${Date.now()}`,
      text: `Reach ${comboTarget}× combo`,
      target: comboTarget,
      current: 0,
      reward: Math.floor(fluxReward * 1.5),
      type: 'combo' as const,
      completed: false,
    });
  }
  return challenges;
}

export function ReactorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const measuredFpsRef = useRef(60);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    let lastSyncTime = 0;
    let running = true;
    let lastFrameTime = performance.now() / 1000;
    let fpsAccum = 0;
    let fpsFrameCount = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      if (!running) return;

      try {
        // Re-check size every frame to catch layout changes
        resize();

        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        if (w === 0 || h === 0) { raf = requestAnimationFrame(draw); return; }

        const cx = w / 2;
        const cy = h / 2;
        const now = performance.now() / 1000;
        const rawDt = now - lastFrameTime;
        // Skip frame if tab was hidden (rawDt > 0.5s means alt-tab/minimize)
        if (rawDt > 0.5) {
          lastFrameTime = now;
          raf = requestAnimationFrame(draw);
          return;
        }
        const dt = Math.min(rawDt, 1 / 30);
        lastFrameTime = now;

        // FPS measurement
        fpsAccum += dt;
        fpsFrameCount++;
        if (fpsAccum >= 1) {
          measuredFpsRef.current = fpsFrameCount / fpsAccum;
          fpsFrameCount = 0;
          fpsAccum = 0;
        }

        // Apply frenzy speed multiplier to visual time — smooth lerp
        // Instant ramp up, slow deceleration
        const frenzyTarget = entityStore.frenzyActive ? 1 : 0;
        if (frenzyTarget > entityStore.frenzyIntensity) {
          // Instant speed up
          entityStore.frenzyIntensity = frenzyTarget;
        } else if (entityStore.frenzyIntensity > 0) {
          // Smooth deceleration over ~1.5 seconds
          entityStore.frenzyIntensity = Math.max(0, entityStore.frenzyIntensity - dt * FRENZY_DECELERATION_RATE);
        }
        const speedMult = 1 + entityStore.frenzyIntensity * (FRENZY_SPEED_MULT - 1);
        entityStore.visualTime += dt * speedMult;
        const t = entityStore.visualTime;
        const maxR = Math.min(cx, cy);

        // Update frenzy system
        if (entityStore.frenzyActive) {
          entityStore.frenzyTimer -= dt;
          if (entityStore.frenzyTimer <= 0) {
            entityStore.frenzyActive = false;
            entityStore.frenzyCharge = 0;
            entityStore.frenzyTimer = 0;
          }
          // Spawn lightning bolts during frenzy
          if (Math.random() < 0.3) {
            const a1 = Math.random() * Math.PI * 2;
            const a2 = a1 + (Math.random() - 0.5) * 1.5;
            const r1 = maxR * (0.2 + Math.random() * 0.4);
            const r2 = maxR * (0.2 + Math.random() * 0.4);
            entityStore.bolts.push({
              x1: cx + Math.cos(a1) * r1,
              y1: cy + Math.sin(a1) * r1,
              x2: cx + Math.cos(a2) * r2,
              y2: cy + Math.sin(a2) * r2,
              life: 0.12 + Math.random() * 0.1,
              maxLife: 0.15,
              r: 100 + Math.floor(Math.random() * 100),
              g: 255,
              b: 50 + Math.floor(Math.random() * 100),
            });
          }
        } else {
          // Decay frenzy charge
          if (entityStore.frenzyCharge > 0) {
            entityStore.frenzyCharge = Math.max(0, entityStore.frenzyCharge - FRENZY_DECAY_RATE * dt);
          }
        }

        // Decay combo
        if (entityStore.comboTimer > 0) {
          entityStore.comboTimer -= dt;
          if (entityStore.comboTimer <= 0) {
            entityStore.comboCount = 0;
          }
        }

        // Sync entities every 300ms
        if (now - lastSyncTime > 0.3) {
          syncEntities();
          lastSyncTime = now;
        }

        // Spawn entity info lines periodically
        entityStore.infoLineTimer -= dt;
        if (entityStore.infoLineTimer <= 0) {
          entityStore.infoLineTimer = INFO_LINE_INTERVAL + Math.random() * 2;
          const state = useGameStore.getState();
          const totalFps = getFluxPerSecond(state);
          const ownedGens = GENERATORS.filter(g => (state.generators[g.id]?.owned ?? 0) > 0);
          if (ownedGens.length > 0 && totalFps > 0) {
            const gen = ownedGens[Math.floor(Math.random() * ownedGens.length)];
            const genIndex = GENERATORS.indexOf(gen);
            // Calculate this generator's contribution to total flux (with all multipliers)
            const genFps = getGeneratorFluxPerSecond(gen.id, state);
            const powerPercent = totalFps > 0 ? (genFps / totalFps) * 100 : 0;
            const baseOrbit = 0.18 + genIndex * 0.06;
            entityStore.infoLines.push({
              genId: gen.id,
              genName: gen.name,
              powerPercent: Math.min(powerPercent, 100),
              life: 4.0,
              maxLife: 4.0,
              orbitRadius: baseOrbit,
              angle: Math.random() * Math.PI * 2,
            });
          }
        }

        // Spawn void whispers periodically
        entityStore.whisperTimer -= dt;
        if (entityStore.whisperTimer <= 0) {
          entityStore.whisperTimer = 8 + Math.random() * 12;
          const whisperTexts = [
            '...the void hums...', '...signal lost...', '...flux detected...',
            '...entropy rising...', '...echo returning...', '...frequency shift...',
            '...pattern found...', '...resonance...', '...data corrupted...',
            '...transmission incoming...', '...void stable...', '...anomaly nearby...',
            '...calibrating...', '...noise floor rising...', '...quantum drift...',
          ];
          const text = whisperTexts[Math.floor(Math.random() * whisperTexts.length)];
          entityStore.whispers.push({
            text,
            x: Math.random() * w,
            y: Math.random() * h,
            life: 6 + Math.random() * 4,
            maxLife: 8,
            angle: (Math.random() - 0.5) * 0.5,
            speed: 0.3 + Math.random() * 0.5,
          });
        }

        // Challenge system — generate new challenges when empty
        if (entityStore.challenges.length === 0 || entityStore.challenges.every(c => c.completed)) {
          entityStore.challengeRotateTimer -= dt;
          if (entityStore.challengeRotateTimer <= 0 || entityStore.challenges.length === 0) {
            entityStore.challengeRotateTimer = 120;
            const state2 = useGameStore.getState();
            const fps2 = getFluxPerSecond(state2);
            entityStore.challenges = generateChallenges(state2.totalClicks, fps2);
          }
        }
        // Update challenge progress
        {
          const state2 = useGameStore.getState();
          for (const ch of entityStore.challenges) {
            if (ch.completed) continue;
            switch (ch.type) {
              case 'clicks': ch.current = state2.totalClicks; break;
              case 'flux': ch.current = state2.totalFluxEarned; break;
              case 'generators': {
                ch.current = Object.values(state2.generators).reduce((s, g) => s + g.owned, 0);
                break;
              }
              case 'combo': ch.current = entityStore.comboCount; break;
            }
            if (ch.current >= ch.target && !ch.completed) {
              ch.completed = true;
              // Reward — add flux
              useGameStore.setState((s) => ({
                flux: s.flux + ch.reward,
                totalFluxEarned: s.totalFluxEarned + ch.reward,
              }));
              entityStore.floats.push({
                id: nextFloatId(),
                x: w / 2,
                y: h / 2 - 20,
                text: `🏆 +${formatNumber(ch.reward)}`,
                life: 2.5,
                maxLife: 2.5,
                isCritical: true,
              });
            }
          }
        }

        // Random event system — spawn surge/dark events periodically
        entityStore.randomEventTimer -= dt;
        if (entityStore.randomEventTimer <= 0 && entityStore.randomEvents.length === 0) {
          entityStore.randomEventTimer = EVENT_MIN_INTERVAL + Math.random() * EVENT_RANDOM_RANGE;
          const state3 = useGameStore.getState();
          const ownedGens3 = GENERATORS.filter(g => (state3.generators[g.id]?.owned ?? 0) > 0);
          if (ownedGens3.length > 0) {
            const roll = Math.random();
            if (roll < 0.45) {
              // Surge — boost a random generator
              const gen = ownedGens3[Math.floor(Math.random() * ownedGens3.length)];
              entityStore.randomEvents.push({
                id: `surge_${performance.now()}`,
                type: 'surge',
                label: '⚡ SURGE',
                description: `${gen.name} production ×3!`,
                duration: 10 + Math.random() * 8,
                elapsed: 0,
                targetGenId: gen.id,
                multiplier: 3,
              });
            } else if (roll < 0.7) {
              // Click frenzy — clicks worth more
              entityStore.randomEvents.push({
                id: `click_${performance.now()}`,
                type: 'clickFrenzy',
                label: '🖱️ CLICK STORM',
                description: 'Click power ×5!',
                duration: 8 + Math.random() * 5,
                elapsed: 0,
                multiplier: 5,
              });
            } else if (roll < 0.88) {
              // Data storm — data rate boosted
              entityStore.randomEvents.push({
                id: `data_${performance.now()}`,
                type: 'dataStorm',
                label: '📊 DATA STORM',
                description: 'Data rate ×4!',
                duration: 12 + Math.random() * 8,
                elapsed: 0,
                multiplier: 4,
              });
            } else {
              // Dark event — brief dimming (cosmetic only, no gameplay penalty)
              entityStore.randomEvents.push({
                id: `dark_${performance.now()}`,
                type: 'dark',
                label: '◉ VOID FLICKER',
                description: 'The void stirs briefly...',
                duration: 4 + Math.random() * 3,
                elapsed: 0,
                multiplier: 0.5,
              });
            }
          }
        }
        // Update active random events
        for (let i = entityStore.randomEvents.length - 1; i >= 0; i--) {
          entityStore.randomEvents[i].elapsed += dt;
          if (entityStore.randomEvents[i].elapsed >= entityStore.randomEvents[i].duration) {
            entityStore.randomEvents.splice(i, 1);
          }
        }

        // Void rift spawning
        entityStore.riftTimer -= dt;
        if (entityStore.riftTimer <= 0 && entityStore.rifts.filter(r => !r.clicked).length === 0) {
          const state4 = useGameStore.getState();
          // Apply rift frequency prestige upgrades
          let riftFreqMult = 1;
          for (const pDef of PRESTIGE_UPGRADES) {
            const level = state4.prestigeUpgrades[pDef.id] ?? 0;
            if (level === 0) continue;
            if (pDef.effect.type === 'riftFrequency') {
              riftFreqMult *= 1 - pDef.effect.value * level; // 20% faster per level
            }
          }
          const baseTimer = RIFT_MIN_INTERVAL + Math.random() * RIFT_RANDOM_RANGE;
          entityStore.riftTimer = baseTimer * Math.max(0.2, riftFreqMult);
          const fps4 = getFluxPerSecond(state4);
          if (fps4 > 0) {
            // Rift appears at a random position (avoiding edges)
            const rx = 0.2 + Math.random() * 0.6;
            const ry = 0.2 + Math.random() * 0.6;
            const reward = Math.floor(fps4 * (15 + Math.random() * 15));
            entityStore.rifts.push({
              x: rx, y: ry,
              radius: 18 + Math.random() * 12,
              life: 8 + Math.random() * 6, // 8-14s to click it
              maxLife: 12,
              reward,
              speedBoost: 2 + Math.random() * 2, // 2x-4x boost
              boostDuration: 8 + Math.random() * 7,
              clicked: false,
            });
          }
        }
        // Update void rifts
        for (let i = entityStore.rifts.length - 1; i >= 0; i--) {
          const rift = entityStore.rifts[i];
          rift.life -= dt;
          if (rift.life <= 0 || rift.clicked) {
            entityStore.rifts.splice(i, 1);
          }
        }

        ctx.clearRect(0, 0, w, h);

        const state = useGameStore.getState();
        const settings = useSettingsStore.getState();
        const gfx = settings.graphicsQuality;
        const fps = getFluxPerSecond(state);
        const intensity = Math.min(1, Math.log10(Math.max(1, fps)) / 10);
        const clickVal = getClickValue(state);
        const clickIntensity = Math.min(1, Math.log10(Math.max(1, clickVal)) / 6);
        const totalOwned = Object.values(state.generators).reduce((sum, g) => sum + g.owned, 0);
        const totalIntensity = Math.min(1, totalOwned / 200);

        // Shake — time-based decay so it's framerate-independent
        // Safety caps on effect arrays to prevent memory issues
        if (entityStore.spawnParticles.length > 500) entityStore.spawnParticles.splice(0, entityStore.spawnParticles.length - 500);
        if (entityStore.bolts.length > 50) entityStore.bolts.splice(0, entityStore.bolts.length - 50);
        if (entityStore.floats.length > 30) entityStore.floats.splice(0, entityStore.floats.length - 30);
        if (entityStore.ripples.length > 20) entityStore.ripples.splice(0, entityStore.ripples.length - 20);

        let sx = 0, sy = 0;
        entityStore.shake = Math.min(entityStore.shake, 3); // hard safety clamp
        if (entityStore.shake > 0) {
          sx = (Math.random() - 0.5) * entityStore.shake * 2;
          sy = (Math.random() - 0.5) * entityStore.shake * 2;
          entityStore.shake *= Math.pow(0.002, dt); // ~0.88^60 per second
          if (entityStore.shake < 0.01) entityStore.shake = 0;
        }
        ctx.save();
        ctx.translate(sx, sy);

        drawBackgroundGrid(ctx, w, h, intensity, totalIntensity, gfx);
        drawClickRipples(ctx, t, gfx);
        drawOrbitRings(ctx, cx, cy, maxR, t, state, intensity, gfx);
        if (gfx !== 'low') drawOuterHexRing(ctx, cx, cy, maxR, t, intensity, totalIntensity);
        drawEntities(ctx, cx, cy, maxR, t, state, intensity, gfx);
        const coreR = drawPulsingCore(ctx, cx, cy, t, intensity, clickIntensity, totalIntensity, gfx);
        if (gfx !== 'low') drawEnergyBeams(ctx, cx, cy, maxR, t, state, intensity);
        if (gfx === 'high') drawConstellationWebs(ctx, cx, cy, maxR, t, state);
        if (gfx === 'high') drawAuroraWaves(ctx, cx, cy, maxR, t, state);
        if (gfx !== 'low') drawDataRing(ctx, cx, cy, maxR, t, state, intensity);
        if (gfx !== 'low') drawSpawnParticles(ctx, cx, cy, maxR, dt);
        drawEntityCount(ctx, cx, cy, coreR, totalOwned, totalIntensity);
        if (gfx === 'high') drawEntityInfoLines(ctx, cx, cy, maxR, now, dt);
        if (gfx !== 'low') drawLightningBolts(ctx, dt, cx, cy);
        if (gfx !== 'low') drawFloatingNumbers(ctx, dt);
        if (gfx !== 'low') drawFrenzyOverlay(ctx, w, h, t);
        if (gfx !== 'low') drawComboCounter(ctx, w, t);
        if (gfx !== 'low') drawFrenzyBar(ctx, w, h, t);
        if (gfx === 'high') drawVoidWhispers(ctx, w, h, dt);
        drawChallengeHUD(ctx, w, h);
        drawRandomEventBanner(ctx, w, h, t);
        if (gfx !== 'low') drawVoidRifts(ctx, w, h, t);

        ctx.restore();

        // Scan lines & glitch (post-restore so they affect everything)
        if (settings.scanLines && gfx !== 'low') {
          drawScanLines(ctx, w, h);
        }
        if (gfx !== 'low') drawGlitchEffect(ctx, w, h);
      } catch (err) {
        console.warn('ReactorCanvas draw error:', err);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Click handler — entirely imperative, no React deps
  const handleClick = useCallback((e: React.MouseEvent) => {
    const settings = useSettingsStore.getState();
    const now = performance.now() / 1000;

    // Critical hit check
    const isCritical = Math.random() < CRITICAL_CHANCE;
    const critMult = isCritical ? CRITICAL_MULT : 1;

    // Apply click(s)
    useGameStore.getState().clickFlux();
    if (isCritical) {
      useGameStore.getState().clickFlux();
      useGameStore.getState().clickFlux();
    }
    playClickSound();

    const state = useGameStore.getState();
    const clickVal = getClickValue(state) * critMult;

    // Combo tracking
    if (now - entityStore.lastClickTime < COMBO_WINDOW) {
      entityStore.comboCount++;
    } else {
      entityStore.comboCount = 1;
    }
    entityStore.comboTimer = COMBO_WINDOW;
    entityStore.lastClickTime = now;

    // Frenzy charging
    if (!entityStore.frenzyActive) {
      entityStore.frenzyCharge = Math.min(1, entityStore.frenzyCharge + FRENZY_CHARGE_PER_CLICK);
      if (entityStore.frenzyCharge >= 1) {
        entityStore.frenzyActive = true;
        entityStore.frenzyTimer = FRENZY_DURATION;
        entityStore.shake = Math.min(entityStore.shake + 1.0, 3);
        // Track frenzy count for achievements
        useGameStore.setState((s) => ({ frenzyCount: s.frenzyCount + 1 }));
      }
    }

    // Track max combo for achievements
    if (entityStore.comboCount > state.maxCombo) {
      useGameStore.setState({ maxCombo: entityStore.comboCount });
    }

    // Screen shake — always some feedback, more for crits and combos
    const comboShake = Math.min(entityStore.comboCount * 0.05, 0.5);
    if (settings.screenShake) {
      entityStore.shake = Math.max(entityStore.shake, isCritical ? 1.5 : 0.4 + comboShake);
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Primary ripple — bigger, bolder
      entityStore.ripples.push({
        x, y,
        birth: now,
        maxRadius: isCritical ? 120 + Math.random() * 60 : 70 + Math.random() * 30,
        duration: isCritical ? 1.0 : 0.6 + Math.random() * 0.2,
      });
      // Secondary delayed ripple
      entityStore.ripples.push({
        x, y,
        birth: now + 0.06,
        maxRadius: isCritical ? 160 + Math.random() * 70 : 100 + Math.random() * 40,
        duration: 0.9,
      });
      // Combo ripple — extra for high combos
      if (entityStore.comboCount >= 5) {
        entityStore.ripples.push({
          x, y,
          birth: now + 0.03,
          maxRadius: 50 + entityStore.comboCount * 5,
          duration: 0.5,
        });
      }

      // Burst particles on every click
      const particleCount = isCritical ? 8 : 3 + Math.min(entityStore.comboCount, 5);
      for (let p = 0; p < particleCount; p++) {
        const pAngle = (p / particleCount) * Math.PI * 2 + Math.random() * 0.5;
        const life = 0.4 + Math.random() * 0.3;
        entityStore.floats.push({
          id: nextFloatId(),
          x: x + Math.cos(pAngle) * 5,
          y: y + Math.sin(pAngle) * 5,
          text: '·',
          life,
          maxLife: life,
          isCritical: false,
        });
      }

      // Lightning bolts on critical hit
      if (isCritical) {
        for (let i = 0; i < 5; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 40 + Math.random() * 80;
          entityStore.bolts.push({
            x1: x,
            y1: y,
            x2: x + Math.cos(angle) * dist,
            y2: y + Math.sin(angle) * dist,
            life: 0.25 + Math.random() * 0.15,
            maxLife: 0.3,
            r: 255, g: 220, b: 80,
          });
        }
      }

      // Lightning bolts on high combos too
      if (entityStore.comboCount >= 8 && entityStore.comboCount % 3 === 0) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 50;
        entityStore.bolts.push({
          x1: x,
          y1: y,
          x2: x + Math.cos(angle) * dist,
          y2: y + Math.sin(angle) * dist,
          life: 0.2,
          maxLife: 0.2,
          r: 126, g: 200, b: 227,
        });
      }

      if (settings.floatingNumbers) {
        const text = isCritical
          ? `CRIT! +${formatNumber(clickVal)}`
          : `+${formatNumber(clickVal)}`;
        const offsetX = (Math.random() - 0.5) * 60;
        const offsetY = (Math.random() - 0.5) * 30;
        entityStore.floats.push({
          id: nextFloatId(),
          x: x + offsetX,
          y: y - 10 + offsetY,
          text,
          life: isCritical ? 1.8 : 1.2,
          maxLife: isCritical ? 1.8 : 1.2,
          isCritical,
          driftX: (Math.random() - 0.5) * 1.5,
        });
      }

      // Check void rift clicks
      for (const rift of entityStore.rifts) {
        if (rift.clicked) continue;
        const rx = rift.x * rect.width;
        const ry = rift.y * rect.height;
        const dist = Math.sqrt((x - rx) ** 2 + (y - ry) ** 2);
        if (dist <= rift.radius * 1.5) {
          rift.clicked = true;
          // Award reward
          useGameStore.setState((s) => ({
            flux: s.flux + rift.reward,
            totalFluxEarned: s.totalFluxEarned + rift.reward,
            riftsClicked: s.riftsClicked + 1,
          }));
          // Spawn speed boost as a random event
          if (rift.speedBoost > 1) {
            entityStore.randomEvents.push({
              id: `rift_boost_${performance.now()}`,
              type: 'surge',
              label: '◉ RIFT SURGE',
              description: `All production ×${rift.speedBoost.toFixed(1)} from void rift!`,
              duration: rift.boostDuration,
              elapsed: 0,
              multiplier: rift.speedBoost,
            });
          }
          // Big visual feedback
          entityStore.shake = Math.min(entityStore.shake + 1.5, 3);
          entityStore.floats.push({
            id: nextFloatId(),
            x: rx, y: ry - 15,
            text: `◉ RIFT! +${formatNumber(rift.reward)}`,
            life: 2.5, maxLife: 2.5,
            isCritical: true,
          });
          // Lightning burst from rift
          for (let b = 0; b < 8; b++) {
            const bAngle = (b / 8) * Math.PI * 2;
            const bDist = 50 + Math.random() * 100;
            entityStore.bolts.push({
              x1: rx, y1: ry,
              x2: rx + Math.cos(bAngle) * bDist,
              y2: ry + Math.sin(bAngle) * bDist,
              life: 0.4, maxLife: 0.4,
              r: 200, g: 150, b: 255,
            });
          }
          playClickSound();
          break;
        }
      }

      // Data burst — each click generates a small amount of data
      const dps = getDataPerSecond(state);
      if (dps > 0) {
        const dataBurst = dps * 0.5; // Each click = 0.5s worth of data
        useGameStore.setState((s) => ({
          data: s.data + dataBurst,
          totalDataEarned: s.totalDataEarned + dataBurst,
        }));
      }
    }
  }, []);

  // Throttled display stats — only thing that causes re-renders, at ~4fps
  const [displayStats, setDisplayStats] = useState<DisplayStats>({
    fps: '0', clickVal: '0', totalOwned: 0, overcharged: false, active: false,
    frenzyCharge: 0, frenzyActive: false, comboCount: 0, lowFpsDetected: false,
  });
  useEffect(() => {
    const iv = setInterval(() => {
      const s = useGameStore.getState();
      const f = getFluxPerSecond(s);
      const cv = getClickValue(s);
      const tot = Object.values(s.generators).reduce((sum, g) => sum + g.owned, 0);
      setDisplayStats({
        fps: formatNumber(f),
        clickVal: formatNumber(cv),
        totalOwned: tot,
        overcharged: tot > 100,
        active: f > 0,
        frenzyCharge: entityStore.frenzyCharge,
        frenzyActive: entityStore.frenzyActive,
        comboCount: entityStore.comboCount,
        lowFpsDetected: measuredFpsRef.current < 25,
      });
    }, 250);
    return () => clearInterval(iv);
  }, []);

  return {
    canvasRef,
    handleClick,
    displayStats,
  };
}
