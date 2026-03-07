import { useGameStore } from '../game/store';
import { ASCENDANCY_PATHS } from '../config/ascendancy';
import { getMasteryTier } from '../config/constants';
import { getPathMasteryBonus } from '../game/engine';
import type { AscendancyPathId } from '../game/types';
import { playBuySound } from '../audio/SoundManager';
import { triggerPrestigeAnimation } from './prestigeAnimationTrigger';
import './AscendancyPanel.css';

export function AscendancyPanel() {
  const state = useGameStore();
  const chooseAscendancyPath = useGameStore((s) => s.chooseAscendancyPath);

  const unlocked = state.voidCollapseCount >= 1;

  if (!unlocked) {
    return (
      <div className="ascendancy-panel">
        <div className="panel-header">
          <h2>Ascendancy Paths</h2>
        </div>
        <div className="ascendancy-locked">
          <div className="lock-icon"><span className="icon-lock" /></div>
          <p>Ascendancy Paths are sealed.</p>
          <p className="lock-hint">Complete your first Void Collapse to unlock Ascendancy Paths.</p>
        </div>
      </div>
    );
  }

  const activePath = state.ascendancy.activePath;
  const activePathDef = activePath ? ASCENDANCY_PATHS.find(p => p.id === activePath) : null;

  return (
    <div className="ascendancy-panel">
      <div className="panel-header">
        <h2>Ascendancy Paths</h2>
      </div>

      {activePathDef && (
        <div className="ascendancy-active" style={{ borderColor: activePathDef.color.primary }}>
          <div className="ascendancy-active-label">ACTIVE PATH</div>
          <div className="ascendancy-active-name" style={{ color: activePathDef.color.primary }}>
            {activePathDef.name}
          </div>
          <div className="ascendancy-active-title">{activePathDef.title}</div>
          <div className="ascendancy-active-philosophy">&quot;{activePathDef.philosophy}&quot;</div>
        </div>
      )}

      {!activePath && (
        <div className="ascendancy-choose-hint">
          Choose your path. Each path fundamentally changes how you play.
          Your path resets on Void Collapse — try them all!
        </div>
      )}

      <div className="ascendancy-path-grid">
        {ASCENDANCY_PATHS.map(path => {
          const mastery = state.ascendancy.pathMastery[path.id] ?? 0;
          const masteryBonus = getPathMasteryBonus(mastery);
          const isActive = activePath === path.id;
          const canChoose = !activePath;

          return (
            <div
              key={path.id}
              className={`ascendancy-path-card ${isActive ? 'active' : ''} ${canChoose ? 'choosable' : ''}`}
              style={{ borderColor: isActive ? path.color.primary : undefined }}
            >
              <div className="ap-header" style={{ color: path.color.primary }}>
                <div className="ap-name">{path.name}</div>
                <div className="ap-title">{path.title}</div>
              </div>

              <div className="ap-philosophy">&quot;{path.philosophy}&quot;</div>

              <div className="ap-modifiers">
                {path.modifiers.productionMult && path.modifiers.productionMult !== 1 && (
                  <div className="ap-mod">Production ×{path.modifiers.productionMult}</div>
                )}
                {path.modifiers.clickMult && path.modifiers.clickMult !== 1 && (
                  <div className="ap-mod">Click ×{path.modifiers.clickMult}</div>
                )}
                {path.modifiers.generatorCostMult && path.modifiers.generatorCostMult !== 1 && (
                  <div className="ap-mod">Gen Costs ×{path.modifiers.generatorCostMult}</div>
                )}
                {path.modifiers.dataRateMult && path.modifiers.dataRateMult !== 1 && (
                  <div className="ap-mod">Data Rate ×{path.modifiers.dataRateMult}</div>
                )}
                {path.modifiers.researchSpeedMult && path.modifiers.researchSpeedMult !== 1 && (
                  <div className="ap-mod">Research ×{path.modifiers.researchSpeedMult}</div>
                )}
                {path.modifiers.offlineEfficiency !== undefined && path.modifiers.offlineEfficiency > 0 && (
                  <div className="ap-mod">Offline +{Math.round(path.modifiers.offlineEfficiency * 100)}%</div>
                )}
              </div>

              <div className="ap-mastery">
                <span className="ap-mastery-title">{getMasteryTier(mastery).name}</span>
                <span className="ap-mastery-uses">{mastery} uses</span>
                {masteryBonus > 0 && (
                  <span className="ap-mastery-bonus">+{Math.round(masteryBonus * 100)}% bonus</span>
                )}
              </div>

              {canChoose && (
                <button
                  className="ap-choose-btn"
                  style={{ borderColor: path.color.primary, color: path.color.primary }}
                  onClick={() => {
                    triggerPrestigeAnimation('ascendancy', {
                      details: [path.name, path.philosophy],
                    });
                    chooseAscendancyPath(path.id as AscendancyPathId);
                    playBuySound();
                  }}
                >
                  Choose {path.name}
                </button>
              )}

              {isActive && (
                <div className="ap-active-badge" style={{ color: path.color.primary }}>
                  ✓ ACTIVE
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
