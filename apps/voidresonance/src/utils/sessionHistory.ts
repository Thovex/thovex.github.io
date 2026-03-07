import { useGameStore } from '../game/store';
import { getFluxPerSecond, getDataPerSecond } from '../game/engine';

const MAX_HISTORY = 120; // ~10 minutes at 5s intervals
const SAMPLE_INTERVAL = 5_000; // 5 seconds

export interface HistorySnapshot {
  time: number; // seconds since session start
  totalFlux: number;
  totalData: number;
  fluxPerSec: number;
  dataPerSec: number;
}

export const sessionHistory: HistorySnapshot[] = [];

let startTime = Date.now();
let intervalId: ReturnType<typeof setInterval> | null = null;

function sample() {
  const state = useGameStore.getState();
  const elapsed = (Date.now() - startTime) / 1000;
  sessionHistory.push({
    time: elapsed,
    totalFlux: state.totalFluxEarned,
    totalData: state.totalDataEarned,
    fluxPerSec: getFluxPerSecond(state),
    dataPerSec: getDataPerSecond(state),
  });
  if (sessionHistory.length > MAX_HISTORY) {
    sessionHistory.shift();
  }
}

export function startSessionTracker() {
  if (intervalId) return;
  startTime = Date.now();
  sessionHistory.length = 0;
  sample(); // initial snapshot
  intervalId = setInterval(sample, SAMPLE_INTERVAL);
}

export function stopSessionTracker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
