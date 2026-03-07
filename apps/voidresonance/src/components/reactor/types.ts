export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  isCritical?: boolean;
  driftX?: number;
}

// Persistent entity — stays alive, never rebuilt
export interface Entity {
  genId: string;
  index: number;
  // Stable orbital parameters (set once, never changed)
  baseAngle: number;
  speed: number;
  orbitRadius: number; // fraction of maxR
  size: number;
  wobblePhase: number;
  rotPhase: number;
  // Spawn animation
  spawnTime: number;
  // Departure animation (for expedition leave)
  departureTime?: number;
}

// Click ripple effect
export interface Ripple {
  x: number;
  y: number;
  birth: number;
  maxRadius: number;
  duration: number;
}

// Spawn flash particle
export interface SpawnParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  size: number;
  _orbitR: number;
  _angle: number;
}

// Entity info line shown periodically
export interface EntityInfoLine {
  genId: string;
  genName: string;
  powerPercent: number;
  life: number;
  maxLife: number;
  orbitRadius: number;
  angle: number;
}

// Lightning bolt between points
export interface LightningBolt {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  fromCenter?: boolean; // if true, x1/y1 and x2/y2 are relative to canvas center
}

// Ambient void whisper message on the reactor
export interface VoidWhisper {
  text: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  angle: number;
  speed: number;
}

// Challenge goal definition
export interface Challenge {
  id: string;
  text: string;
  target: number;
  current: number;
  reward: number;
  type: 'clicks' | 'flux' | 'generators' | 'combo';
  completed: boolean;
}

// Random event (surge / dark)
export interface RandomEvent {
  id: string;
  type: 'surge' | 'dark' | 'clickFrenzy' | 'dataStorm';
  label: string;
  description: string;
  duration: number;
  elapsed: number;
  targetGenId?: string; // for surge: which generator is boosted
  multiplier: number;   // surge: production mult; dark: dim factor
}

// Void Rift — clickable target on the reactor canvas
export interface VoidRift {
  x: number;       // fraction of canvas width (0-1)
  y: number;       // fraction of canvas height (0-1)
  radius: number;  // visual radius in pixels
  life: number;    // seconds remaining
  maxLife: number;
  reward: number;  // flux reward
  speedBoost: number; // temporary production multiplier
  boostDuration: number; // how long the speed boost lasts
  clicked: boolean;
}
