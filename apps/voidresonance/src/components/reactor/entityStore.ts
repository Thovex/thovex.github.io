import type { Entity, FloatingText, Ripple, SpawnParticle, EntityInfoLine, LightningBolt, VoidWhisper, Challenge, RandomEvent, VoidRift } from './types';
import { GEN_COLORS } from './constants';
import { seededRand, getVisualCount } from './drawUtils';
import { useGameStore } from '../../game/store';
import { GENERATORS } from '../../config/generators';

let floatId = 0;

export function nextFloatId(): number {
  return ++floatId;
}

function createEntity(genId: string, index: number, now: number): Entity {
  const genIndex = GENERATORS.findIndex(g => g.id === genId);
  const gen = GENERATORS[genIndex];
  const seed = genIndex * 10000 + index;
  const baseOrbit = 0.18 + genIndex * 0.06;
  const spread = 0.1 * (1 + genIndex * 0.12);
  return {
    genId,
    index,
    baseAngle: seededRand(seed) * Math.PI * 2,
    speed: (0.15 + seededRand(seed + 1) * 0.35) * (seededRand(seed + 2) > 0.5 ? 1 : -1),
    orbitRadius: baseOrbit + (seededRand(seed + 3) - 0.5) * spread,
    size: 1.8 + (gen ? (gen.tier - 1) * 0.5 : 0),
    wobblePhase: seededRand(seed + 4) * Math.PI * 2,
    rotPhase: seededRand(seed + 5) * Math.PI * 2,
    spawnTime: now,
  };
}

// ── All mutable state lives outside the component to survive any re-mount ──
export const entityStore = {
  entities: [] as Entity[],
  lastOwned: {} as Record<string, number>,
  ripples: [] as Ripple[],
  spawnParticles: [] as SpawnParticle[],
  floats: [] as FloatingText[],
  shake: 0,
  // Frenzy system
  frenzyCharge: 0,
  frenzyActive: false,
  frenzyTimer: 0,
  // Combo system
  comboCount: 0,
  comboTimer: 0,
  lastClickTime: 0,
  // Entity info lines
  infoLines: [] as EntityInfoLine[],
  infoLineTimer: 0,
  // Lightning bolts
  bolts: [] as LightningBolt[],
  // Glitch timer
  glitchTimer: 0,
  glitchOffset: 0,
  // Hovered generator ID (set from GeneratorPanel)
  hoveredGenId: null as string | null,
  // Void whispers
  whispers: [] as VoidWhisper[],
  whisperTimer: 0,
  // Challenges
  challenges: [] as Challenge[],
  challengeRotateTimer: 0,
  // Random events (surge/dark)
  randomEvents: [] as RandomEvent[],
  randomEventTimer: 30 + Math.random() * 30, // first event in 30-60s
  // Void rifts
  rifts: [] as VoidRift[],
  riftTimer: 60 + Math.random() * 40, // first rift in 60-100s
  // Frenzy lerp — smooth deceleration when frenzy ends
  frenzyIntensity: 0, // 0..1, lerps smoothly
  // Accumulated visual time (avoids phase jumps when speedMult changes)
  visualTime: 0,
};

let initialSyncDone = false;

/** Clear all reactor visuals — call on prestige / collapse / singularity */
export function resetEntityStore() {
  entityStore.entities.length = 0;
  entityStore.ripples.length = 0;
  entityStore.spawnParticles.length = 0;
  entityStore.floats.length = 0;
  entityStore.bolts.length = 0;
  entityStore.infoLines.length = 0;
  entityStore.whispers.length = 0;
  entityStore.challenges.length = 0;
  entityStore.randomEvents.length = 0;
  entityStore.rifts.length = 0;
  entityStore.shake = 0;
  entityStore.frenzyCharge = 0;
  entityStore.frenzyActive = false;
  entityStore.frenzyTimer = 0;
  entityStore.frenzyIntensity = 0;
  entityStore.comboCount = 0;
  entityStore.comboTimer = 0;
  entityStore.lastClickTime = 0;
  entityStore.infoLineTimer = 0;
  entityStore.glitchTimer = 0;
  entityStore.glitchOffset = 0;
  entityStore.whisperTimer = 0;
  entityStore.challengeRotateTimer = 0;
  entityStore.randomEventTimer = 30 + Math.random() * 30;
  entityStore.riftTimer = 60 + Math.random() * 40;
  // Reset lastOwned so syncEntities treats next call like initial
  for (const key of Object.keys(entityStore.lastOwned)) {
    delete entityStore.lastOwned[key];
  }
  initialSyncDone = false;
}

export function syncEntities() {
  const state = useGameStore.getState();
  const { entities, lastOwned, spawnParticles } = entityStore;
  const vt = entityStore.visualTime;

  // First sync after load: create all entities instantly without effects
  const isInitial = !initialSyncDone;
  if (isInitial) initialSyncDone = true;

  // Cap how many new entities we spawn per sync to avoid particle explosion
  // (unlimited on initial load)
  let spawnBudget = isInitial ? Infinity : 8;

  for (const gen of GENERATORS) {
    const owned = state.generators[gen.id]?.owned ?? 0;
    // Subtract generators on expedition from visual count
    const assigned = state.expeditions?.activeExpedition?.assignedGenerators[gen.id] ?? 0;
    const available = Math.max(0, owned - assigned);
    const prevOwned = lastOwned[gen.id] ?? 0;
    const targetVisual = getVisualCount(available);
    const prevVisual = getVisualCount(prevOwned);

    if (spawnBudget <= 0 && targetVisual > prevVisual) {
      // No budget left — don't update lastOwned so remaining spawn next frame
      continue;
    }

    if (targetVisual > prevVisual) {
      const color = GEN_COLORS[gen.id] || { r: 126, g: 200, b: 227 };
      const tier = gen.tier;
      const needed = targetVisual - prevVisual;
      const toSpawn = Math.min(needed, spawnBudget);
      for (let i = prevVisual; i < prevVisual + toSpawn; i++) {
        spawnBudget--;
        // On initial load, set spawnTime far in the past so spawn effects are skipped
        const e = createEntity(gen.id, i, isInitial ? vt - 100 : vt);
        entities.push(e);

        // Skip particles, bolts, and shake on initial load
        if (isInitial) continue;

        const spawnAngle = e.baseAngle;
        // Tier-scaled particle count: tier 1 = 4, tier 6 = 24
        const particleCount = 2 + tier * 4;
        const particleSpeed = 0.3 + tier * 0.15;
        const particleLife = 0.6 + tier * 0.2;
        const particleSize = 1.2 + tier * 0.5;

        for (let p = 0; p < particleCount; p++) {
          const pAngle = spawnAngle + (p / particleCount) * Math.PI * 2;
          const speed = particleSpeed + seededRand(i * 100 + p) * 0.6;
          spawnParticles.push({
            x: 0, y: 0,
            vx: Math.cos(pAngle) * speed,
            vy: Math.sin(pAngle) * speed,
            life: particleLife, maxLife: particleLife,
            r: color.r, g: color.g, b: color.b,
            size: particleSize + seededRand(i * 100 + p + 50) * 1.5,
            _orbitR: e.orbitRadius,
            _angle: spawnAngle,
          });
        }

        // Tier 3+: spawn lightning bolts from core to entity
        if (tier >= 3) {
          const boltCount = tier - 2; // 1 at tier 3, 4 at tier 6
          for (let b = 0; b < boltCount; b++) {
            const bAngle = spawnAngle + (Math.random() - 0.5) * 0.5;
            const bDist = e.orbitRadius * 0.3 + Math.random() * e.orbitRadius * 0.7;
            entityStore.bolts.push({
              x1: 0, y1: 0,
              x2: Math.cos(bAngle) * bDist * 200,
              y2: Math.sin(bAngle) * bDist * 200,
              life: 0.2 + tier * 0.06,
              maxLife: 0.25 + tier * 0.06,
              r: Math.min(255, color.r + 50),
              g: Math.min(255, color.g + 50),
              b: Math.min(255, color.b + 50),
              fromCenter: true,
            });
          }
        }

        // Tier 4+: extra screen shake on spawn
        if (tier >= 4) {
          entityStore.shake = Math.max(entityStore.shake, 0.3 + (tier - 3) * 0.3);
        }
      }
      // If we couldn't spawn all visuals, keep lastOwned partial so rest spawn next frame
      if (toSpawn < needed) {
        lastOwned[gen.id] = prevOwned + toSpawn;
      } else {
        lastOwned[gen.id] = available;
      }
    } else if (targetVisual < prevVisual) {
      // Mark entities for departure animation instead of instant removal
      let toDepart = prevVisual - targetVisual;
      for (let i = entities.length - 1; i >= 0 && toDepart > 0; i--) {
        if (entities[i].genId === gen.id && entities[i].departureTime === undefined) {
          entities[i].departureTime = vt;
          toDepart--;
        }
      }
      lastOwned[gen.id] = available;
    } else {
      lastOwned[gen.id] = available;
    }
  }

  // Clean up entities that have completed their departure animation
  const DEPARTURE_DURATION = 1.5;
  for (let i = entities.length - 1; i >= 0; i--) {
    if (entities[i].departureTime != null && (vt - entities[i].departureTime!) >= DEPARTURE_DURATION) {
      entities.splice(i, 1);
    }
  }
}
