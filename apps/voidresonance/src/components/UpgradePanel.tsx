import { useGameStore } from '../game/store';
import { UPGRADES } from '../config/upgrades';
import { getUpgradeCost } from '../game/engine';
import type { UpgradeEffect, UpgradeDef } from '../game/types';
import { formatNumber } from '../utils/numberFormatting';
import { playBuySound } from '../audio/SoundManager';
import './UpgradePanel.css';

type UpgradeCategory = 'click' | 'generator' | 'global' | 'utility';

function categorize(def: UpgradeDef): UpgradeCategory {
  if (def.effect.type === 'clickFlat' || def.effect.type === 'clickMultiplier' || def.effect.type === 'clickPercent') return 'click';
  if (def.effect.type === 'generatorMultiplier') return 'generator';
  if (def.effect.type === 'globalMultiplier') return 'global';
  return 'utility';
}

const CATEGORY_META: Record<UpgradeCategory, { label: string }> = {
  click: { label: 'CLICK' },
  generator: { label: 'GENERATORS' },
  global: { label: 'GLOBAL' },
  utility: { label: 'UTILITY' },
};

const CATEGORY_ORDER: UpgradeCategory[] = ['click', 'generator', 'global', 'utility'];

function getEffectShort(effect: UpgradeEffect): string {
  switch (effect.type) {
    case 'clickFlat': return `+${effect.value} click`;
    case 'clickMultiplier': return `Click ×${effect.value}`;
    case 'clickPercent': return `Click +${Math.round(effect.value * 100)}%`;
    case 'generatorMultiplier': return `${effect.targetId ?? 'Gen'} ×${effect.value}`;
    case 'globalMultiplier':
      return effect.value >= 2 ? `×${effect.value} prod` : `+${Math.round((effect.value - 1) * 100)}% prod`;
    case 'offlineEfficiency': return `Offline +${Math.round(effect.value * 100)}%`;
    case 'researchSpeed': return `Research +${Math.round(effect.value * 100)}%`;
    default: return `${effect.type}`;
  }
}

function getEffectLong(effect: UpgradeEffect): string {
  switch (effect.type) {
    case 'clickFlat': return `+${effect.value} flux per click`;
    case 'clickMultiplier': return `Click power ×${effect.value}`;
    case 'clickPercent': return `Clicks +${Math.round(effect.value * 100)}% of flux/sec`;
    case 'generatorMultiplier': return `${effect.targetId ?? 'Generator'} ×${effect.value}`;
    case 'globalMultiplier':
      return effect.value >= 2 ? `All production ×${effect.value}` : `All production +${Math.round((effect.value - 1) * 100)}%`;
    case 'offlineEfficiency': return `Offline efficiency +${Math.round(effect.value * 100)}%`;
    case 'researchSpeed': return `Research speed +${Math.round(effect.value * 100)}%`;
    default: return `Effect: ${effect.type}`;
  }
}

export function UpgradePanel() {
  const state = useGameStore();
  const buyUpgrade = useGameStore((s) => s.buyUpgrade);

  const visibleUpgrades = UPGRADES.filter(u => state.totalFluxEarned >= u.unlockAt);

  // Group by category
  const grouped = new Map<UpgradeCategory, UpgradeDef[]>();
  for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
  for (const u of visibleUpgrades) {
    const cat = categorize(u);
    grouped.get(cat)!.push(u);
  }

  const totalDone = visibleUpgrades.filter(u => (state.upgrades[u.id]?.level ?? 0) >= u.maxLevel).length;

  const handleBuy = (id: string) => {
    buyUpgrade(id);
    playBuySound();
  };

  return (
    <div className="upgrade-panel">
      <div className="panel-header">
        <h2>UPGRADES</h2>
        <span className="upgrade-count">{totalDone}/{visibleUpgrades.length}</span>
      </div>

      {/* Category legend */}
      <div className="upgrade-legend">
        {CATEGORY_ORDER.map(c => {
          const count = grouped.get(c)?.length ?? 0;
          if (count === 0) return null;
          return (
            <span key={c} className={`upgrade-legend-item cat-${c}`}>
              <span className={`cat-dot cat-${c}`} /> {CATEGORY_META[c].label}
            </span>
          );
        })}
      </div>

      <div className="upgrade-tree">
        {CATEGORY_ORDER.map(cat => {
          const items = grouped.get(cat) ?? [];
          if (items.length === 0) return null;
          const catDone = items.filter(u => (state.upgrades[u.id]?.level ?? 0) >= u.maxLevel).length;

          return (
            <div key={cat} className="upgrade-tier">
              <div className="upgrade-tier-header">
                <div className="upgrade-tier-line" />
                <span className="upgrade-tier-label"><span className={`cat-dot cat-${cat}`} /> {CATEGORY_META[cat].label}</span>
                <span className="upgrade-tier-progress">{catDone}/{items.length}</span>
                <div className="upgrade-tier-line" />
              </div>

              <div className="upgrade-tier-nodes">
                {items.map(def => {
                  const level = state.upgrades[def.id]?.level ?? 0;
                  const isMaxed = level >= def.maxLevel;
                  const cost = isMaxed ? 0 : getUpgradeCost(def, level);
                  const resource = def.costResource === 'data' ? state.data : state.flux;
                  const canAfford = !isMaxed && resource >= cost;
                  const resourceSymbol = def.costResource === 'data' ? '◈' : '⚡';

                  let statusClass = '';
                  if (isMaxed) statusClass = 'completed';
                  else if (canAfford) statusClass = 'available';
                  else statusClass = 'unavailable';

                  return (
                    <div key={def.id} className={`upgrade-node ${statusClass} cat-${cat}`}>
                      <div className={`upgrade-node-icon cat-dot cat-${cat}`} />
                      <div className="upgrade-node-name">{def.name}</div>
                      <div className="upgrade-node-effect">{getEffectShort(def.effect)}</div>

                      {isMaxed && <span className="icon-check" />}

                      {!isMaxed && (
                        <>
                          {def.maxLevel > 1 && (
                            <div className="upgrade-node-level">{level}/{def.maxLevel}</div>
                          )}
                          <div className={`upgrade-node-cost ${canAfford ? 'affordable' : 'expensive'}`}>
                            {resourceSymbol} {formatNumber(cost)}
                          </div>
                          <button
                            className="upgrade-node-btn"
                            onClick={() => handleBuy(def.id)}
                            disabled={!canAfford}
                          >
                            BUY
                          </button>
                        </>
                      )}

                      {/* Tooltip */}
                      <div className="upgrade-tooltip">
                        <div className="upgrade-tooltip-name">{def.name}</div>
                        <div className="upgrade-tooltip-effect">{getEffectLong(def.effect)}</div>
                        <div className="upgrade-tooltip-desc">{def.description}</div>
                        {def.flavorText && <div className="upgrade-tooltip-flavor">"{def.flavorText}"</div>}
                        {!isMaxed && (
                          <div className="upgrade-tooltip-cost">
                            {resourceSymbol} {formatNumber(cost)} {def.costResource === 'data' ? 'DATA' : 'FLUX'}
                          </div>
                        )}
                        {def.maxLevel > 1 && (
                          <div className="upgrade-tooltip-level">Level {level}/{def.maxLevel}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {visibleUpgrades.length === 0 && (
          <div className="empty-message">Upgrades unlock as you earn more flux...</div>
        )}
      </div>
    </div>
  );
}
