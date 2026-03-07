import { useState } from 'react';
import type { GameState } from '../game/types';
import { useGameStore } from '../game/store';
import { GENERATORS } from '../config/generators';
import { getBulkCost, getMaxBuyable, getGeneratorCost, getGeneratorMultiplier, getGlobalMultiplier, getFluxPerSecond, getGeneratorFluxPerSecond } from '../game/engine';
import { MILESTONES, getMilestoneMultiplier, getNextMilestone, getHighestMilestone } from '../config/milestones';
import { formatNumber } from '../utils/numberFormatting';
import { playBuySound, playTabSound } from '../audio/SoundManager';
import { entityStore } from './reactor/entityStore';
import './GeneratorPanel.css';

function hasResearch(state: GameState, researchId: string): boolean {
  return state.research[researchId]?.completed === true;
}

export function GeneratorPanel() {
  const state = useGameStore();
  const buyGenerator = useGameStore((s) => s.buyGenerator);
  const setBuyMode = useGameStore((s) => s.setBuyMode);
  const toggleAutoBuy = useGameStore((s) => s.toggleAutoBuy);
  const [hoveredBuyId, setHoveredBuyId] = useState<string | null>(null);

  const visibleGenerators = GENERATORS.filter(g => state.totalFluxEarned >= g.unlockAt || (state.generators[g.id]?.owned ?? 0) > 0);
  const totalFps = getFluxPerSecond(state);
  const showPowerPct = hasResearch(state, 'r_power_analysis');
  const showUpgradePreview = hasResearch(state, 'r_upgrade_forecast');

  const handleBuy = (id: string) => {
    buyGenerator(id);
    playBuySound();
  };

  return (
    <div className="generator-panel">
      <div className="panel-header">
        <h2>GENERATORS</h2>
        <div className="buy-mode-selector">
          {([1, 10, 100, -1] as const).map(mode => (
            <button
              key={mode}
              className={`buy-mode-btn ${state.buyMode === mode ? 'active' : ''}`}
              onClick={() => setBuyMode(mode)}
            >
              {mode === -1 ? 'MAX' : `×${mode}`}
            </button>
          ))}
          {state.isPremium && (
            <button
              className={`auto-buy-toggle ${state.autoBuyEnabled ? 'active' : ''}`}
              onClick={() => { toggleAutoBuy(); playTabSound(); }}
              title="Toggle automatic purchasing of cheapest generator"
            >
              {state.autoBuyEnabled ? '⚡ AUTO' : '○ AUTO'}
            </button>
          )}
        </div>
      </div>

      <div className="generator-list">
        {visibleGenerators.map(def => {
          const owned = state.generators[def.id]?.owned ?? 0;
          const buyAmount = state.buyMode === -1
            ? getMaxBuyable(def, owned, state.flux, state)
            : state.buyMode;
          const cost = state.buyMode === -1
            ? (buyAmount > 0 ? getBulkCost(def, owned, buyAmount, state) : getGeneratorCost(def, owned, state))
            : getBulkCost(def, owned, state.buyMode, state);
          const canAfford = state.flux >= cost && buyAmount > 0;
          const genMult = getGeneratorMultiplier(def.id, state);
          const globalMult = getGlobalMultiplier(state);
          const milestoneMult = getMilestoneMultiplier(owned);
          const production = def.baseProduction * owned * genMult * globalMult * milestoneMult;
          const highestMilestone = getHighestMilestone(owned);
          const nextMilestone = getNextMilestone(owned);

          // Power % of total
          const genFps = getGeneratorFluxPerSecond(def.id, state);
          const powerPct = totalFps > 0 ? (genFps / totalFps) * 100 : 0;

          // Upgrade preview: calculate what production would be after buying
          let upgradePreviewPct = 0;
          if (showUpgradePreview && hoveredBuyId === def.id && canAfford && buyAmount > 0) {
            const newOwned = owned + buyAmount;
            const newMilestoneMult = getMilestoneMultiplier(newOwned);
            const newProduction = def.baseProduction * newOwned * genMult * globalMult * newMilestoneMult;
            const newTotalFps = totalFps - genFps + newProduction;
            upgradePreviewPct = totalFps > 0
              ? ((newTotalFps - totalFps) / totalFps) * 100
              : (newProduction > 0 ? 100 : 0);
          }

          return (
            <div
              key={def.id}
              className={`generator-card tier-${def.tier}`}
              onMouseEnter={() => { entityStore.hoveredGenId = def.id; }}
              onMouseLeave={() => { entityStore.hoveredGenId = null; }}
            >
              <div className="gen-info">
                <div className="gen-name">{def.name}</div>
                <div className="gen-desc">{def.description}</div>
                <div className="gen-stats">
                  <span className="gen-owned">×{owned}</span>
                  <span className="gen-production">+{formatNumber(production)}/s</span>
                  {showPowerPct && owned > 0 && (
                    <span className="gen-power-pct">{powerPct.toFixed(1)}%</span>
                  )}
                  {milestoneMult > 1 && (
                    <span className="gen-milestone-mult">⚡×{milestoneMult}</span>
                  )}
                </div>
                {/* Milestone badges */}
                {owned > 0 && (
                  <div className="gen-milestones">
                    {MILESTONES.map((m, i) => {
                      const isReached = i <= highestMilestone;
                      const isNext = nextMilestone?.threshold === m.threshold;
                      return (
                        <span
                          key={m.threshold}
                          className={`milestone-badge ${isReached ? 'reached' : isNext ? 'next' : 'locked'}`}
                          title={isReached ? m.effectDesc : `Reach ${m.threshold} for: ${m.effectDesc}`}
                        >
                          {m.icon}{m.label}
                        </span>
                      );
                    })}
                  </div>
                )}
                {highestMilestone >= 0 && (
                  <div className="milestone-effect">
                    {MILESTONES[highestMilestone].icon} {MILESTONES[highestMilestone].effectDesc}
                  </div>
                )}
              </div>
              <div className="gen-buy-wrapper">
                <button
                  className={`gen-buy-btn ${canAfford ? 'can-afford' : 'cannot-afford'}`}
                  onClick={() => handleBuy(def.id)}
                  disabled={!canAfford}
                  title={`Buy ${state.buyMode === -1 ? buyAmount : state.buyMode} for ${formatNumber(cost)} flux`}
                  onMouseEnter={() => setHoveredBuyId(def.id)}
                  onMouseLeave={() => setHoveredBuyId(null)}
                >
                  <span className="gen-buy-amount">
                    {state.buyMode === -1 ? `+${buyAmount}` : `+${state.buyMode}`}
                  </span>
                  <span className="gen-buy-cost">{formatNumber(cost)} ⚡</span>
                </button>
                {showUpgradePreview && hoveredBuyId === def.id && canAfford && upgradePreviewPct > 0 && (
                  <div className="gen-upgrade-preview">
                    +{upgradePreviewPct.toFixed(1)}% total flux
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {visibleGenerators.length === 0 && (
          <div className="empty-message">Click the reactor to generate flux...</div>
        )}
      </div>
    </div>
  );
}
