import { useGameStore } from '../game/store';
import { PRESTIGE_UPGRADES } from '../config/prestige';
import { getEchoGain, isPrestigeUnlocked, getPrestigeUpgradeCost } from '../game/engine';
import { formatNumber } from '../utils/numberFormatting';
import { playPrestigeSound, playBuySound } from '../audio/SoundManager';
import { triggerPrestigeAnimation } from './prestigeAnimationTrigger';
import type { PrestigeUpgradeDef } from '../game/types';
import './PrestigePanel.css';

function getPrestigeEffectShort(def: PrestigeUpgradeDef): string {
  const e = def.effect;
  switch (e.type) {
    case 'productionMultiplier': return `Prod ×${e.value}/lv`;
    case 'startingFlux': return `+${e.value} start`;
    case 'clickPower': return `Click ×${e.value}/lv`;
    case 'costReduction': return `-${Math.round(e.value * 100)}% cost/lv`;
    case 'offlineBonus': return `Offline +${Math.round(e.value * 100)}%`;
    case 'echoGainBonus': return `Echo +${Math.round(e.value * 100)}%/lv`;
    case 'dataRateBonus': return `Data +${Math.round(e.value * 100)}%/lv`;
    case 'researchSpeedBonus': return `Research +${Math.round(e.value * 100)}%`;
    case 'researchTapBonus': return `Smash +${Math.round(e.value * 100)}%/lv`;
    case 'riftFrequency': return `Rifts +${Math.round(e.value * 100)}%/lv`;
    default: return `${e.type}`;
  }
}

function getPrestigeEffectLong(def: PrestigeUpgradeDef): string {
  const e = def.effect;
  switch (e.type) {
    case 'productionMultiplier': return `All production ×${e.value} per level`;
    case 'startingFlux': return `Start each run with ${e.value} × level flux`;
    case 'clickPower': return `Click power ×${e.value} per level`;
    case 'costReduction': return `Generator costs -${Math.round(e.value * 100)}% per level`;
    case 'offlineBonus': return `Offline efficiency +${Math.round(e.value * 100)}% per level`;
    case 'echoGainBonus': return `Echo gain +${Math.round(e.value * 100)}% per level`;
    case 'dataRateBonus': return `Data generation +${Math.round(e.value * 100)}% per level`;
    case 'researchSpeedBonus': return `Research speed +${Math.round(e.value * 100)}% per level`;
    case 'researchTapBonus': return `Research smash +${Math.round(e.value * 100)}% per level`;
    case 'riftFrequency': return `Void rifts +${Math.round(e.value * 100)}% more often per level`;
    default: return `Effect: ${e.type}`;
  }
}

// Store prestige snapshots — persists across renders but not page reloads
const prestigeSnapshots: { dataUrl: string; echoes: number; timestamp: number }[] = [];

function captureReactorSnapshot(): string | null {
  const canvas = document.querySelector('.reactor-canvas') as HTMLCanvasElement | null;
  if (!canvas) return null;
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export function PrestigePanel() {
  const state = useGameStore();
  const doPrestige = useGameStore((s) => s.prestige);
  const buyPrestigeUpgrade = useGameStore((s) => s.buyPrestigeUpgrade);
  const respecPrestige = useGameStore((s) => s.respecPrestige);

  const unlocked = isPrestigeUnlocked(state);
  const echoGain = getEchoGain(state);

  if (!unlocked) {
    return (
      <div className="prestige-panel">
        <div className="panel-header">
          <h2>Echo Chamber</h2>
        </div>
        <div className="prestige-locked">
          <div className="lock-icon"><span className="icon-lock" /></div>
          <p>The Echo Chamber is sealed.</p>
          <p className="lock-hint">Complete &quot;Echo Theory&quot; research to unlock the prestige system.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="prestige-panel">
      <div className="panel-header">
        <h2>Echo Chamber</h2>
        <span className="prestige-count">Resets: {state.prestigeCount}</span>
      </div>

      <div className="prestige-info">
        <div className="prestige-echoes">
          <span className="prestige-label">Available Echoes</span>
          <span className="prestige-value">{formatNumber(state.echoes)}</span>
        </div>

        <div className="prestige-gain">
          <span className="prestige-label">Echoes on Reset</span>
          <span className="prestige-gain-value">+{formatNumber(echoGain)}</span>
        </div>

        <button
          className={`prestige-btn ${echoGain > 0 ? 'available' : 'unavailable'}`}
          onClick={() => {
            if (echoGain > 0 && window.confirm(`Reset your run for ${formatNumber(echoGain)} echoes? All generators, upgrades, and research will be reset. Prestige upgrades are permanent.`)) {
              // Capture reactor snapshot before prestige
              const snapshot = captureReactorSnapshot();
              if (snapshot) {
                prestigeSnapshots.push({
                  dataUrl: snapshot,
                  echoes: echoGain,
                  timestamp: prestigeSnapshots.length,
                });
              }
              triggerPrestigeAnimation('prestige', {
                details: [`+${formatNumber(echoGain)} Echoes`, `Prestige #${state.prestigeCount + 1}`],
              });
              doPrestige();
              playPrestigeSound();
            }
          }}
          disabled={echoGain <= 0}
        >
          {echoGain > 0 ? `Reset for ${formatNumber(echoGain)} Echoes` : 'Need more flux (1M+ total)'}
        </button>

        <p className="prestige-explain">
          Echoes permanently boost future runs. You need 1M+ total flux earned per run to gain echoes.
          Formula: √(totalFlux / 1M) echoes.
        </p>
      </div>

      <div className="prestige-upgrades">
        <div className="pu-tier-header">
          <span className="pu-tier-line" />
          <span className="pu-tier-label">◈ PERMANENT UPGRADES</span>
          <span className="pu-tier-line" />
        </div>
        <div className="pu-grid">
          {PRESTIGE_UPGRADES.map(def => {
            const level = state.prestigeUpgrades[def.id] ?? 0;
            const isMaxed = level >= def.maxLevel;
            const nextCost = isMaxed ? 0 : getPrestigeUpgradeCost(def.cost, level);
            const canAfford = state.echoes >= nextCost;
            const isPremiumOnly = def.id === 'p_premium_bonus';
            const isLocked = isPremiumOnly && !state.isPremium;

            const status = isMaxed ? 'completed' : canAfford && !isLocked ? 'available' : 'unavailable';

            return (
              <div
                key={def.id}
                className={`pu-node ${status} ${isPremiumOnly ? 'premium' : ''}`}
              >
                <span className="pu-node-name">{def.name}</span>
                <span className="pu-node-effect">{getPrestigeEffectShort(def)}</span>
                <span className="pu-node-level">Lv {level}/{def.maxLevel}</span>

                {isMaxed ? (
                  <span className="icon-check" />
                ) : (
                  <>
                    <span className={`pu-node-cost ${canAfford ? 'affordable' : 'expensive'}`}>{nextCost} ◈</span>
                    <button
                      className="pu-node-btn"
                      onClick={() => { buyPrestigeUpgrade(def.id); playBuySound(); }}
                      disabled={!canAfford || isLocked}
                    >BUY</button>
                  </>
                )}
                {isLocked && <div className="pu-node-locked">★ Supporter</div>}
                <div className="pu-tooltip">
                  <div className="pu-tooltip-name">{def.name}</div>
                  <div className="pu-tooltip-effect">{getPrestigeEffectLong(def)}</div>
                  <div className="pu-tooltip-desc">{def.description}</div>
                  <div className="pu-tooltip-level">Level {level}/{def.maxLevel}</div>
                  {!isMaxed && <div className="pu-tooltip-cost">Cost: {nextCost} ◈</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Respec */}
      <div className="prestige-respec">
        <button
          className="prestige-respec-btn"
          onClick={() => {
            if (window.confirm('Refund all prestige upgrade echoes? Your upgrades will be reset but you keep your echoes.')) {
              respecPrestige();
            }
          }}
          disabled={Object.values(state.prestigeUpgrades).every(v => v === 0)}
        >
          ↺ Respec Upgrades
        </button>
      </div>

      {/* Prestige Snapshot Gallery */}
      {prestigeSnapshots.length > 0 && (
        <div className="prestige-snapshots">
          <h3>Past Reactors</h3>
          <div className="snapshot-grid">
            {prestigeSnapshots.map((snap, i) => (
              <div key={i} className="snapshot-card">
                <img src={snap.dataUrl} alt={`Prestige ${i + 1}`} className="snapshot-img" />
                <div className="snapshot-info">
                  +{formatNumber(snap.echoes)} echoes
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
