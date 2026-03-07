import { useGameStore } from '../game/store';
import { SINGULARITY_UPGRADES, SINGULARITY_COLLAPSE_THRESHOLD, SINGULARITY_MASTERY_THRESHOLD } from '../config/singularity';
import { getRealityFragmentGain, isSingularityUnlocked } from '../game/engine';
import { formatNumber } from '../utils/numberFormatting';
import { playPrestigeSound, playBuySound } from '../audio/SoundManager';
import { triggerPrestigeAnimation } from './prestigeAnimationTrigger';
import type { SingularityUpgradeDef } from '../game/types';
import './SingularityPanel.css';

const BRANCH_LABELS: Record<string, { name: string; icon: string; color: string }> = {
  temporal: { name: 'Temporal Mastery', icon: '⏳', color: 'temporal' },
  dimensional: { name: 'Dimensional Expansion', icon: '🌀', color: 'dimensional' },
  meta: { name: 'Meta-Progression', icon: '♾️', color: 'meta' },
};

function getSingularityTitle(totalFragments: number): string {
  if (totalFragments >= 1000) return 'The Void Itself';
  if (totalFragments >= 500) return 'Void Sovereign';
  if (totalFragments >= 250) return 'Void Archon';
  if (totalFragments >= 100) return 'Void Sage';
  if (totalFragments >= 50) return 'Void Master';
  if (totalFragments >= 10) return 'Void Adept';
  if (totalFragments >= 1) return 'Void Initiate';
  return '';
}

function getSinguEffectShort(def: SingularityUpgradeDef): string {
  const e = def.effect;
  switch (e.type) {
    case 'tickSpeed': return `Tick +${Math.round(e.value * 100)}%/lv`;
    case 'unlockFeature': return '★ Unlock';
    case 'offlineBonus': return `Offline ${Math.round(e.value * 100)}%`;
    case 'productionMultiplier': return `Prod ×${e.value}/lv`;
    case 'echoMultiplier': return `Echo ×${e.value}/lv`;
    case 'shardMultiplier': return `Shard ×${e.value}/lv`;
    case 'fragmentGainBonus': return `Frag +${Math.round(e.value * 100)}%/lv`;
    default: return `${e.type}`;
  }
}

function getSinguEffectLong(def: SingularityUpgradeDef): string {
  const e = def.effect;
  switch (e.type) {
    case 'tickSpeed': return `Game tick speed +${Math.round(e.value * 100)}% per level`;
    case 'unlockFeature': return def.description;
    case 'offlineBonus': return `Offline progress at ${Math.round(e.value * 100)}% efficiency`;
    case 'productionMultiplier': return `All production ×${e.value} per level`;
    case 'echoMultiplier': return `Echo gain ×${e.value} per level`;
    case 'shardMultiplier': return `Void Shard gain ×${e.value} per level`;
    case 'fragmentGainBonus': return `Reality Fragment gain +${Math.round(e.value * 100)}% per level`;
    default: return `Effect: ${e.type}`;
  }
}

export function SingularityPanel() {
  const state = useGameStore();
  const doSingularity = useGameStore((s) => s.singularity);
  const buySingularityUpgrade = useGameStore((s) => s.buySingularityUpgrade);

  const unlocked = isSingularityUnlocked(state);
  const fragmentGain = getRealityFragmentGain(state);

  if (!unlocked) {
    return (
      <div className="singularity-panel">
        <div className="panel-header">
          <h2>Void Singularity</h2>
        </div>
        <div className="singularity-locked">
          <div className="lock-icon"><span className="icon-lock" /></div>
          <p>The Singularity awaits beyond comprehension.</p>
          <p className="lock-hint">
            Requires {SINGULARITY_COLLAPSE_THRESHOLD}+ Void Collapses and Adept mastery ({SINGULARITY_MASTERY_THRESHOLD}+ uses) on at least one Ascendancy Path.
          </p>
          {state.voidCollapseCount >= 5 && (
            <p className="singularity-tease">The void converges...</p>
          )}
        </div>
      </div>
    );
  }

  const title = getSingularityTitle(state.totalRealityFragments);

  // Group upgrades by branch
  const branches = ['temporal', 'dimensional', 'meta'] as const;

  return (
    <div className="singularity-panel">
      <div className="panel-header">
        <h2>Void Singularity</h2>
        <span className="singularity-count">Singularities: {state.singularityCount}</span>
      </div>

      <div className="singularity-info">
        <div className="singularity-currency">
          <span className="singularity-label">Reality Fragments</span>
          <span className="singularity-value">{formatNumber(state.realityFragments)}</span>
        </div>

        {title && (
          <div className="singularity-title-display">
            <span className="singularity-title-label">Title</span>
            <span className="singularity-title-value">{title}</span>
          </div>
        )}

        <div className="singularity-gain">
          <span className="singularity-label">Fragments on Singularity</span>
          <span className="singularity-gain-value">+{formatNumber(fragmentGain)}</span>
        </div>

        <button
          className={`singularity-btn ${fragmentGain > 0 ? 'available' : 'unavailable'}`}
          onClick={() => {
            if (fragmentGain > 0 && window.confirm(
              `Enter the Void Singularity for ${formatNumber(fragmentGain)} Reality Fragments?\n\nThis resets EVERYTHING including Void Shards, Ascendancy Path mastery, and all prestige progress. Singularity upgrades are permanent.`
            )) {
              triggerPrestigeAnimation('singularity', {
                details: [`+${formatNumber(fragmentGain)} Reality Fragments`, `Singularity #${state.singularityCount + 1}`],
              });
              doSingularity();
              playPrestigeSound();
            }
          }}
          disabled={fragmentGain <= 0}
        >
          {fragmentGain > 0
            ? `Singularity for ${formatNumber(fragmentGain)} Fragments`
            : 'Need more Void Shards (10+ total)'}
        </button>

        <p className="singularity-explain">
          Reality Fragments are the ultimate currency. Everything resets — even Void Shards and Path mastery.
          Singularity upgrades persist forever. Formula: log₁₀(totalVoidShards / 10).
        </p>
      </div>

      {/* Upgrade Branches */}
      {branches.map(branch => {
        const branchInfo = BRANCH_LABELS[branch];
        const branchUpgrades = SINGULARITY_UPGRADES.filter(u => u.branch === branch);

        return (
          <div key={branch} className="singularity-branch">
            <div className="sgu-tier-header">
              <span className="sgu-tier-line" />
              <span className={`sgu-tier-label branch-${branch}`}>{branchInfo.icon} {branchInfo.name}</span>
              <span className="sgu-tier-line" />
            </div>
            <div className="sgu-grid">
              {branchUpgrades.map(def => {
                const level = state.singularityUpgrades[def.id] ?? 0;
                const isMaxed = level >= def.maxLevel;
                const canAfford = state.realityFragments >= def.cost;
                const status = isMaxed ? 'completed' : canAfford ? 'available' : 'unavailable';

                return (
                  <div key={def.id} className={`sgu-node ${status} branch-${branch}`}>
                    <span className="sgu-node-name">{def.name}</span>
                    <span className="sgu-node-effect">{getSinguEffectShort(def)}</span>
                    <span className="sgu-node-level">Lv {level}/{def.maxLevel}</span>

                    {isMaxed ? (
                      <span className="icon-check" />
                    ) : (
                      <>
                        <span className={`sgu-node-cost ${canAfford ? 'affordable' : 'expensive'}`}>{def.cost} ✦</span>
                        <button
                          className="sgu-node-btn"
                          onClick={() => { buySingularityUpgrade(def.id); playBuySound(); }}
                          disabled={!canAfford}
                        >BUY</button>
                      </>
                    )}
                    <div className="sgu-tooltip">
                      <div className="sgu-tooltip-name">{def.name}</div>
                      <div className="sgu-tooltip-effect">{getSinguEffectLong(def)}</div>
                      <div className="sgu-tooltip-desc">{def.description}</div>
                      <div className="sgu-tooltip-level">Level {level}/{def.maxLevel}</div>
                      {!isMaxed && <div className="sgu-tooltip-cost">Cost: {def.cost} ✦</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
