// Web Audio API synthesized sound effects — smooth, non-obnoxious
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function getMasterVolume(): number {
  try {
    const raw = localStorage.getItem('clickerspace_settings');
    if (raw) {
      const s = JSON.parse(raw);
      if (typeof s.masterVolume === 'number') return s.masterVolume;
    }
  } catch { /* ignore */ }
  return 0.5;
}

function isSoundEnabled(): boolean {
  try {
    const raw = localStorage.getItem('clickerspace_settings');
    if (raw) {
      const s = JSON.parse(raw);
      if (typeof s.soundEnabled === 'boolean') return s.soundEnabled;
    }
  } catch { /* ignore */ }
  return true;
}

/** Soft resonant click — filtered sine tap */
export function playClickSound() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  const vol = getMasterVolume() * 0.12;
  const now = ctx.currentTime;

  // Soft sine with lowpass for warmth
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(380, now + 0.08);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(600, now + 0.1);
  filter.Q.setValueAtTime(2, now);

  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(vol * 0.3, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.start(now);
  osc.stop(now + 0.15);
}

/** Purchase — warm ascending two-note chord */
export function playBuySound() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  const vol = getMasterVolume() * 0.1;
  const now = ctx.currentTime;

  [440, 554].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.06);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + i * 0.06 + 0.15);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.Q.setValueAtTime(1, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + i * 0.06 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);

    osc.start(now + i * 0.06);
    osc.stop(now + i * 0.06 + 0.25);
  });
}

/** Research complete — gentle three-note rising chime */
export function playResearchCompleteSound() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  const vol = getMasterVolume() * 0.1;
  const now = ctx.currentTime;

  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.1);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4000, now);
    filter.Q.setValueAtTime(0.5, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + i * 0.1 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);

    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.4);
  });
}

/** Event/signal — subtle low hum with vibrato */
export function playEventSound() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  const vol = getMasterVolume() * 0.06;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.linearRampToValueAtTime(220, now + 0.2);
  osc.frequency.linearRampToValueAtTime(160, now + 0.5);

  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(6, now);
  lfoGain.gain.setValueAtTime(8, now);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, now);

  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  osc.start(now);
  lfo.start(now);
  osc.stop(now + 0.6);
  lfo.stop(now + 0.6);
}

/** Prestige — smooth sweeping pad */
export function playPrestigeSound() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  const vol = getMasterVolume() * 0.1;
  const now = ctx.currentTime;

  // Two detuned sines for pad feel
  [1, 1.005].forEach((detune) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220 * detune, now);
    osc.frequency.exponentialRampToValueAtTime(660 * detune, now + 0.5);
    osc.frequency.exponentialRampToValueAtTime(440 * detune, now + 1.0);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(3000, now + 0.4);
    filter.frequency.linearRampToValueAtTime(800, now + 1.0);
    filter.Q.setValueAtTime(2, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.1);
    gain.gain.linearRampToValueAtTime(vol * 0.6, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.start(now);
    osc.stop(now + 1.2);
  });
}

/** Error/denied — soft low thud */
export function playErrorSound() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  const vol = getMasterVolume() * 0.08;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, now);

  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.start(now);
  osc.stop(now + 0.2);
}

/** Tab switch — crisp, short UI blip */
export function playTabSound() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  const vol = getMasterVolume() * 0.07;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.06);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3000, now);
  filter.Q.setValueAtTime(1, now);

  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.start(now);
  osc.stop(now + 0.1);
}

// ─── Ambient Background (removed) ───
export function startAmbient() { /* no-op */ }
export function stopAmbient() { /* no-op */ }
export function updateAmbientVolume() { /* no-op */ }
