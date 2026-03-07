import { useGameStore } from '../game/store';
import { VOID_SHARD_UPGRADES, VOID_COLLAPSE_ECHO_THRESHOLD, VOID_COLLAPSE_TEASE_THRESHOLD } from '../config/voidShards';
import { getVoidShardGain, isVoidCollapseUnlocked } from '../game/engine';
import { formatNumber } from '../utils/numberFormatting';
import { playPrestigeSound, playBuySound } from '../audio/SoundManager';
import { triggerPrestigeAnimation } from './prestigeAnimationTrigger';
import type { VoidShardUpgradeDef } from '../game/types';
import './VoidShardPanel.css';

function getVoidEffectShort(def: VoidShardUpgradeDef): string {
  const e = def.effect;
  switch (e.type) {
    case 'startingFlux': return `+${e.value} start/lv`;
    case 'echoMultiplier': return `Echo ×${e.value}/lv`;
    case 'researchSpeed': return `Research +${Math.round(e.value * 100)}%`;
    case 'startingGenerators': return `+${e.value} T1 gens/lv`;
    case 'productionMultiplier': return `Prod +${Math.round(e.value * 100)}%/lv`;
    case 'riftFrequency': return `Rifts +${Math.round(e.value * 100)}%/lv`;
    case 'shardGainBonus': return `Shards +${Math.round(e.value * 100)}%/lv`;
    case 'unlockFeature': return '⭐ Unlock';
    default: return `${e.type}`;
  }
}

function getVoidEffectLong(def: VoidShardUpgradeDef): string {
  const e = def.effect;
  switch (e.type) {
    case 'startingFlux': return `Start with ${e.value} × level flux each echo run`;
    case 'echoMultiplier': return `Echo gain ×${e.value} per level`;
    case 'researchSpeed': return `Research speed +${Math.round(e.value * 100)}% per level`;
    case 'startingGenerators': return `Start with ${e.value} × level Tier 1 generators`;
    case 'productionMultiplier': return `All production +${Math.round(e.value * 100)}% per level`;
    case 'riftFrequency': return `Void rift frequency +${Math.round(e.value * 100)}% per level`;
    case 'shardGainBonus': return `Shard gain +${Math.round(e.value * 100)}% per level`;
    case 'unlockFeature': return def.description;
    default: return `Effect: ${e.type}`;
  }
}

export function VoidShardPanel() {
  const state = useGameStore();
  const voidCollapse = useGameStore((s) => s.voidCollapse);
  const buyVoidShardUpgrade = useGameStore((s) => s.buyVoidShardUpgrade);
  const respecVoidShards = useGameStore((s) => s.respecVoidShards);

  const unlocked = isVoidCollapseUnlocked(state);
  const shardGain = getVoidShardGain(state);

  if (!unlocked) {
    return (
      <div className="voidshard-panel">
        <div className="panel-header">
          <h2>Void Collapse</h2>
        </div>
        <div className="voidshard-locked">
          <div className="lock-icon"><span className="icon-lock" /></div>
          <p>The void trembles at the edge of collapse.</p>
          <p className="lock-hint">Complete &quot;Void Collapse Theory&quot; research and earn {formatNumber(VOID_COLLAPSE_ECHO_THRESHOLD)}+ total echoes to unlock.</p>
          {state.totalEchoes >= VOID_COLLAPSE_TEASE_THRESHOLD && (
            <p className="voidshard-tease">Something stirs beyond the Echo...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="voidshard-panel">
      <div className="panel-header">
        <h2>Void Collapse</h2>
        <span className="collapse-count">Collapses: {state.voidCollapseCount}</span>
      </div>

      <div className="voidshard-info">
        <div className="voidshard-currency">
          <span className="voidshard-label">Void Shards</span>
          <span className="voidshard-value">{formatNumber(state.voidShards)}</span>
        </div>

        <div className="voidshard-gain">
          <span className="voidshard-label">Shards on Collapse</span>
          <span className="voidshard-gain-value">+{formatNumber(shardGain)}</span>
        </div>

        <button
          className={`voidshard-btn ${shardGain > 0 ? 'available' : 'unavailable'}`}
          onClick={() => {
            if (shardGain > 0 && window.confirm(
              `Void Collapse for ${formatNumber(shardGain)} Void Shards?\n\nThis will reset ALL progress including echoes, prestige upgrades, and generators. Void Shard upgrades are permanent.`
            )) {
              triggerPrestigeAnimation('voidCollapse', {
                details: [`+${formatNumber(shardGain)} Void Shards`, `Collapse #${state.voidCollapseCount + 1}`],
              });
              voidCollapse();
              playPrestigeSound();
            }
          }}
          disabled={shardGain <= 0}
        >
          {shardGain > 0
            ? `Collapse for ${formatNumber(shardGain)} Void Shards`
            : 'Need more echoes (100+ total)'}
        </button>

        <p className="voidshard-explain">
          Void Shards are earned by collapsing reality. Everything resets — including echoes and prestige upgrades.
          Void Shard upgrades persist permanently. Formula: log₁₀(totalEchoes / 100) × 2.
        </p>
      </div>

      <div className="voidshard-upgrades">
        <div className="vsu-tier-header">
          <span className="vsu-tier-line" />
          <span className="vsu-tier-label">◆ VOID SHARD UPGRADES</span>
          <span className="vsu-tier-line" />
        </div>
        <div className="vsu-grid">
          {VOID_SHARD_UPGRADES.map(def => {
            const level = state.voidShardUpgrades[def.id] ?? 0;
            const isMaxed = level >= def.maxLevel;
            const canAfford = state.voidShards >= def.cost;
            const status = isMaxed ? 'completed' : canAfford ? 'available' : 'unavailable';

            return (
              <div key={def.id} className={`vsu-node ${status}`}>
                <span className="vsu-node-name">{def.name}</span>
                <span className="vsu-node-effect">{getVoidEffectShort(def)}</span>
                <span className="vsu-node-level">Lv {level}/{def.maxLevel}</span>

                {isMaxed ? (
                  <span className="icon-check" />
                ) : (
                  <>
                    <span className={`vsu-node-cost ${canAfford ? 'affordable' : 'expensive'}`}>{def.cost} ◆</span>
                    <button
                      className="vsu-node-btn"
                      onClick={() => { buyVoidShardUpgrade(def.id); playBuySound(); }}
                      disabled={!canAfford}
                    >BUY</button>
                  </>
                )}
                <div className="vsu-tooltip">
                  <div className="vsu-tooltip-name">{def.name}</div>
                  <div className="vsu-tooltip-effect">{getVoidEffectLong(def)}</div>
                  <div className="vsu-tooltip-desc">{def.description}</div>
                  <div className="vsu-tooltip-level">Level {level}/{def.maxLevel}</div>
                  {!isMaxed && <div className="vsu-tooltip-cost">Cost: {def.cost} ◆</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Respec */}
      <div className="voidshard-respec">
        <button
          className="voidshard-respec-btn"
          onClick={() => {
            if (window.confirm('Refund all void shard upgrades? Your upgrades will be reset but you keep your shards.')) {
              respecVoidShards();
            }
          }}
          disabled={Object.values(state.voidShardUpgrades).every(v => v === 0)}
        >
          ↺ Respec Shard Upgrades
        </button>
      </div>
    </div>
  );
}
