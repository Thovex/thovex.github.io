import { useMemo } from 'react';
import { useGameStore } from '../game/store';
import { STAT_UNLOCKS } from '../config/stats';
import { ACHIEVEMENTS } from '../config/achievements';
import { GENERATORS } from '../config/generators';
import { getFluxPerSecond, getGeneratorFluxPerSecond, getClickValue, getDataPerSecond, getGlobalMultiplier, getGeneratorMultiplier, getEchoGain, getResearchSpeed, getOfflineEfficiency } from '../game/engine';
import { getMilestoneMultiplier } from '../config/milestones';
import { formatNumber, formatTime } from '../utils/numberFormatting';
import { playBuySound } from '../audio/SoundManager';
import { entityStore } from './reactor/entityStore';
import { sessionHistory } from '../utils/sessionHistory';
import { Sparkline } from './Sparkline';
import './StatsPanel.css';

function ProgressBar({ value, max, color, label, showPct }: { value: number; max: number; color: string; label?: string; showPct?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="progress-bar-container">
      {label && <div className="progress-bar-label">{label}</div>}
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)`, boxShadow: `0 0 8px ${color}44` }} />
      </div>
      {showPct && <span className="progress-bar-pct">{pct.toFixed(0)}%</span>}
    </div>
  );
}

export function StatsPanel() {
  const state = useGameStore();
  const buyStatUnlock = useGameStore((s) => s.buyStatUnlock);

  const totalOwned = Object.values(state.generators).reduce((s, g) => s + g.owned, 0);
  const fps = getFluxPerSecond(state);
  const clickVal = getClickValue(state);
  const dps = getDataPerSecond(state);
  const globalMult = getGlobalMultiplier(state);
  const researchCompleted = Object.values(state.research).filter(r => r.completed).length;
  const echoGain = getEchoGain(state);
  const researchSpeed = getResearchSpeed(state);
  const offlineEff = getOfflineEfficiency(state);

  // Compute generator production shares for the donut chart
  const genShares = useMemo(() => {
    const shares: { name: string; value: number; color: string }[] = [];
    const colors = ['#4db8d8', '#3ddc84', '#b06aff', '#ffaa22', '#ff4444', '#00d4aa', '#7ec8e3', '#d4a5ff', '#a8e6cf', '#ffd166'];
    for (let i = 0; i < GENERATORS.length; i++) {
      const g = GENERATORS[i];
      const owned = state.generators[g.id]?.owned ?? 0;
      if (owned === 0) continue;
      const genFps = getGeneratorFluxPerSecond(g.id, state);
      if (genFps > 0) shares.push({ name: g.name, value: genFps, color: colors[i % colors.length] });
    }
    return shares;
  }, [state]);

  const categories = ['production', 'clicking', 'efficiency', 'time', 'advanced'] as const;
  const categoryLabels: Record<string, string> = {
    production: '📈 PRODUCTION',
    clicking: '🖱️ CLICKING',
    efficiency: '💰 EFFICIENCY',
    time: '⏱ TIME & PROGRESS',
    advanced: '◇ ADVANCED',
  };

  const renderStatValue = (statId: string) => {
    switch (statId) {
      case 'stat_fps':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Total Flux/sec</span><span>{formatNumber(fps)}</span></div>
            {sessionHistory.length >= 2 && (
              <div className="stat-chart">
                <div className="stat-chart-label">Flux/sec over session</div>
                <Sparkline data={sessionHistory.map(s => s.fluxPerSec)} color="#a8e6cf" />
              </div>
            )}
            {GENERATORS.map(g => {
              const owned = state.generators[g.id]?.owned ?? 0;
              if (owned === 0) return null;
              const genFps = getGeneratorFluxPerSecond(g.id, state);
              const pct = fps > 0 ? (genFps / fps * 100).toFixed(1) : '0';
              return (
                <div key={g.id} className="stat-row sub">
                  <span>{g.name}</span>
                  <span>{formatNumber(genFps)}/s ({pct}%)</span>
                </div>
              );
            })}
          </div>
        );
      case 'stat_total_flux':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Lifetime Flux</span><span>{formatNumber(state.totalFluxEarned)}</span></div>
            {sessionHistory.length >= 2 && (
              <div className="stat-chart">
                <div className="stat-chart-label">Total flux over session</div>
                <Sparkline data={sessionHistory.map(s => s.totalFlux)} color="#7ec8e3" />
              </div>
            )}
          </div>
        );
      case 'stat_total_data':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Lifetime Data</span><span>{formatNumber(state.totalDataEarned)}</span></div>
            <div className="stat-row"><span>Data/sec</span><span>{formatNumber(dps)}</span></div>
            {sessionHistory.length >= 2 && (
              <div className="stat-chart">
                <div className="stat-chart-label">Data/sec over session</div>
                <Sparkline data={sessionHistory.map(s => s.dataPerSec)} color="#d4a5ff" />
              </div>
            )}
          </div>
        );
      case 'stat_gen_breakdown':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Total Entities</span><span>{totalOwned}</span></div>
            {GENERATORS.map(g => {
              const owned = state.generators[g.id]?.owned ?? 0;
              if (owned === 0) return null;
              return <div key={g.id} className="stat-row sub"><span>{g.name}</span><span>×{owned}</span></div>;
            })}
          </div>
        );
      case 'stat_multipliers':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Global Multiplier</span><span>×{globalMult.toFixed(2)}</span></div>
            {GENERATORS.map(g => {
              const owned = state.generators[g.id]?.owned ?? 0;
              if (owned === 0) return null;
              const genMult = getGeneratorMultiplier(g.id, state);
              const mileMult = getMilestoneMultiplier(owned);
              return <div key={g.id} className="stat-row sub"><span>{g.name}</span><span>gen ×{genMult.toFixed(1)} · mile ×{mileMult}</span></div>;
            })}
          </div>
        );
      case 'stat_clicks':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Total Clicks</span><span>{formatNumber(state.totalClicks)}</span></div>
            <div className="stat-row"><span>Click Value</span><span>{formatNumber(clickVal)}</span></div>
          </div>
        );
      case 'stat_combo':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Current Combo</span><span>×{entityStore.comboCount}</span></div>
            <div className="stat-row"><span>Max Combo</span><span>×{state.maxCombo}</span></div>
          </div>
        );
      case 'stat_crits':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Crit Chance</span><span>8%</span></div>
            <div className="stat-row"><span>Crit Multiplier</span><span>×3</span></div>
          </div>
        );
      case 'stat_frenzy':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Frenzy Activations</span><span>{state.frenzyCount}</span></div>
            <div className="stat-row"><span>Charge per Click</span><span>6%</span></div>
            <div className="stat-row"><span>Duration</span><span>6s</span></div>
          </div>
        );
      case 'stat_flux_per_click':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Flux per Click</span><span>{formatNumber(clickVal)}</span></div>
            <div className="stat-row"><span>Avg Flux/Click</span><span>{state.totalClicks > 0 ? formatNumber(state.totalFluxEarned / state.totalClicks) : '0'}</span></div>
          </div>
        );
      case 'stat_best_generator': {
        let bestGen = '';
        let bestFps = 0;
        for (const g of GENERATORS) {
          const gFps = getGeneratorFluxPerSecond(g.id, state);
          if (gFps > bestFps) { bestFps = gFps; bestGen = g.name; }
        }
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Top Generator</span><span>{bestGen || 'None'}</span></div>
            <div className="stat-row"><span>Production</span><span>{formatNumber(bestFps)}/s</span></div>
          </div>
        );
      }
      case 'stat_cost_efficiency':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Flux/sec per Entity</span><span>{totalOwned > 0 ? formatNumber(fps / totalOwned) : '0'}</span></div>
          </div>
        );
      case 'stat_time':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Total Time Played</span><span>{formatTime(state.totalTimePlayed)}</span></div>
          </div>
        );
      case 'stat_prestige':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Prestige Count</span><span>{state.prestigeCount}</span></div>
            <div className="stat-row"><span>Total Echoes</span><span>{formatNumber(state.totalEchoes)}</span></div>
            <div className="stat-row"><span>Current Echoes</span><span>{formatNumber(state.echoes)}</span></div>
          </div>
        );
      case 'stat_events':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Events Unlocked</span><span>{state.seenEvents.length} / 28</span></div>
          </div>
        );
      case 'stat_research':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Research Complete</span><span>{researchCompleted} / 18</span></div>
          </div>
        );
      case 'stat_achievements':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Achievements</span><span>{state.unlockedAchievements.length} / {ACHIEVEMENTS.length}</span></div>
          </div>
        );
      case 'stat_rifts':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Rifts Clicked</span><span>{state.riftsClicked}</span></div>
          </div>
        );
      case 'stat_random_events':
        return (
          <div className="stat-detail">
            <div className="stat-row"><span>Active Events</span><span>{entityStore.randomEvents.length}</span></div>
            {entityStore.randomEvents.map(evt => (
              <div key={evt.id} className="stat-row sub"><span>{evt.label}</span><span>{(evt.duration - evt.elapsed).toFixed(1)}s</span></div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  // Find best generator
  let bestGenName = 'None';
  let bestGenFps = 0;
  for (const g of GENERATORS) {
    const gFps = getGeneratorFluxPerSecond(g.id, state);
    if (gFps > bestGenFps) { bestGenFps = gFps; bestGenName = g.name; }
  }

  const totalGeneratorsAvailable = GENERATORS.filter(g => state.totalFluxEarned >= g.unlockAt).length;

  return (
    <div className="stats-panel">
      <div className="panel-header">
        <h2>COMMAND CENTER</h2>
        <span className="stats-count">{state.unlockedStats.length}/{STAT_UNLOCKS.length} intel</span>
      </div>

      {/* ══════ HERO DASHBOARD ══════ */}
      <div className="stats-hero">
        <div className="hero-grid">
          <div className="hero-tile flux">
            <div className="hero-tile-icon">⚡</div>
            <div className="hero-tile-content">
              <div className="hero-tile-value">{formatNumber(state.totalFluxEarned)}</div>
              <div className="hero-tile-label">LIFETIME FLUX</div>
              <div className="hero-tile-sub">{formatNumber(fps)}/sec</div>
            </div>
            {sessionHistory.length >= 2 && (
              <div className="hero-sparkline">
                <Sparkline data={sessionHistory.map(s => s.fluxPerSec)} color="#4db8d8" height={28} />
              </div>
            )}
          </div>
          <div className="hero-tile data">
            <div className="hero-tile-icon">📊</div>
            <div className="hero-tile-content">
              <div className="hero-tile-value">{formatNumber(state.totalDataEarned)}</div>
              <div className="hero-tile-label">LIFETIME DATA</div>
              <div className="hero-tile-sub">{formatNumber(dps)}/sec</div>
            </div>
            {sessionHistory.length >= 2 && (
              <div className="hero-sparkline">
                <Sparkline data={sessionHistory.map(s => s.dataPerSec)} color="#b06aff" height={28} />
              </div>
            )}
          </div>
          <div className="hero-tile clicks">
            <div className="hero-tile-icon">🖱️</div>
            <div className="hero-tile-content">
              <div className="hero-tile-value">{formatNumber(state.totalClicks)}</div>
              <div className="hero-tile-label">TOTAL CLICKS</div>
              <div className="hero-tile-sub">{formatNumber(clickVal)} per click</div>
            </div>
          </div>
          <div className="hero-tile time">
            <div className="hero-tile-icon">⏱</div>
            <div className="hero-tile-content">
              <div className="hero-tile-value">{formatTime(state.totalTimePlayed)}</div>
              <div className="hero-tile-label">TIME PLAYED</div>
              <div className="hero-tile-sub">×{globalMult.toFixed(2)} global mult</div>
            </div>
          </div>
          <div className="hero-tile prestige">
            <div className="hero-tile-icon">◈</div>
            <div className="hero-tile-content">
              <div className="hero-tile-value">{state.prestigeCount}</div>
              <div className="hero-tile-label">PRESTIGES</div>
              <div className="hero-tile-sub">{formatNumber(state.totalEchoes)} total echoes</div>
            </div>
          </div>
          <div className="hero-tile entities">
            <div className="hero-tile-icon">⚙</div>
            <div className="hero-tile-content">
              <div className="hero-tile-value">{totalOwned}</div>
              <div className="hero-tile-label">ENTITIES</div>
              <div className="hero-tile-sub">{totalGeneratorsAvailable} types unlocked</div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ PRODUCTION BREAKDOWN (horizontal stacked bar) ══════ */}
      {genShares.length > 0 && (
        <div className="production-breakdown">
          <div className="breakdown-header">
            <span className="breakdown-title">⚡ PRODUCTION BREAKDOWN</span>
            <span className="breakdown-total">{formatNumber(fps)}/sec</span>
          </div>
          <div className="stacked-bar">
            {genShares.map(s => {
              const pct = fps > 0 ? (s.value / fps) * 100 : 0;
              if (pct < 0.5) return null;
              return (
                <div
                  key={s.name}
                  className="stacked-segment"
                  style={{ width: `${pct}%`, background: s.color }}
                  title={`${s.name}: ${formatNumber(s.value)}/s (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          <div className="breakdown-legend">
            {genShares.map(s => {
              const pct = fps > 0 ? (s.value / fps) * 100 : 0;
              if (pct < 0.5) return null;
              return (
                <div key={s.name} className="legend-item">
                  <span className="legend-dot" style={{ background: s.color }} />
                  <span className="legend-name">{s.name}</span>
                  <span className="legend-pct">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════ KEY MULTIPLIERS ══════ */}
      <div className="multipliers-strip">
        <div className="mult-item">
          <span className="mult-label">Global</span>
          <span className="mult-value">×{globalMult.toFixed(2)}</span>
        </div>
        <div className="mult-item">
          <span className="mult-label">Click</span>
          <span className="mult-value">{formatNumber(clickVal)}</span>
        </div>
        <div className="mult-item">
          <span className="mult-label">Research</span>
          <span className="mult-value">×{researchSpeed.toFixed(2)}</span>
        </div>
        <div className="mult-item">
          <span className="mult-label">Echo Gain</span>
          <span className="mult-value">{formatNumber(echoGain)}</span>
        </div>
        <div className="mult-item">
          <span className="mult-label">Offline</span>
          <span className="mult-value">{(offlineEff * 100).toFixed(0)}%</span>
        </div>
        {bestGenFps > 0 && (
          <div className="mult-item highlight">
            <span className="mult-label">Top Gen</span>
            <span className="mult-value">{bestGenName.split(' ')[0]}</span>
          </div>
        )}
      </div>

      {/* ══════ PROGRESS OVERVIEW ══════ */}
      <div className="progress-overview">
        <div className="progress-header">◈ PROGRESS</div>
        <ProgressBar value={state.unlockedAchievements.length} max={ACHIEVEMENTS.length} color="#ffaa22" label={`Achievements ${state.unlockedAchievements.length}/${ACHIEVEMENTS.length}`} showPct />
        <ProgressBar value={researchCompleted} max={18} color="#b06aff" label={`Research ${researchCompleted}/18`} showPct />
        <ProgressBar value={state.seenEvents.length} max={28} color="#4db8d8" label={`Events ${state.seenEvents.length}/28`} showPct />
        <ProgressBar value={state.unlockedStats.length} max={STAT_UNLOCKS.length} color="#3ddc84" label={`Intel Unlocked ${state.unlockedStats.length}/${STAT_UNLOCKS.length}`} showPct />
        <ProgressBar value={state.riftsClicked} max={Math.max(state.riftsClicked, 50)} color="#ff4444" label={`Void Rifts ${state.riftsClicked}`} />
      </div>

      {/* ══════ ACHIEVEMENTS ══════ */}
      <div className="achievements-summary">
        <div className="achievements-header">
          <span className="achievements-label">🏅 ACHIEVEMENTS</span>
          <span className="achievements-count">{state.unlockedAchievements.length}/{ACHIEVEMENTS.length}</span>
        </div>
        <div className="achievements-grid">
          {ACHIEVEMENTS.map(ach => {
            const unlocked = state.unlockedAchievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`achievement-badge ${unlocked ? 'unlocked' : 'locked'}`}
                title={unlocked ? `${ach.name}: ${ach.description}` : '???'}
              >
                <span className="achievement-icon">{unlocked ? ach.icon : '?'}</span>
                {unlocked && <span className="achievement-name">{ach.name}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════ SESSION SPARKLINES ══════ */}
      {sessionHistory.length >= 2 && (
        <div className="session-graphs">
          <div className="session-graphs-header">◈ SESSION TRENDS</div>
          <div className="session-graph-row">
            <div className="session-graph-card">
              <div className="stat-chart-label">⚡ Flux/sec</div>
              <Sparkline data={sessionHistory.map(s => s.fluxPerSec)} color="#4db8d8" height={36} />
            </div>
            <div className="session-graph-card">
              <div className="stat-chart-label">📊 Data/sec</div>
              <Sparkline data={sessionHistory.map(s => s.dataPerSec)} color="#b06aff" height={36} />
            </div>
          </div>
          <div className="session-graph-row">
            <div className="session-graph-card wide">
              <div className="stat-chart-label">⚡ Total Flux</div>
              <Sparkline data={sessionHistory.map(s => s.totalFlux)} color="#3ddc84" height={36} />
            </div>
          </div>
        </div>
      )}

      {/* ══════ DETAILED INTEL (unlockable) ══════ */}
      <div className="stats-categories">
        <div className="intel-header">◈ DETAILED INTEL</div>
        {categories.map(cat => {
          const statsInCat = STAT_UNLOCKS.filter(s => s.category === cat);
          return (
            <div key={cat} className="stats-category">
              <div className="stats-category-label">{categoryLabels[cat]}</div>
              {statsInCat.map(stat => {
                const isUnlocked = state.unlockedStats.includes(stat.id);
                const resource = stat.costResource === 'data' ? state.data : state.flux;
                const canAfford = resource >= stat.cost;
                const resourceSymbol = stat.costResource === 'data' ? '📊' : '⚡';

                return (
                  <div key={stat.id} className={`stat-card ${isUnlocked ? 'unlocked' : ''}`}>
                    <div className="stat-card-header">
                      <span className="stat-card-icon">{stat.icon}</span>
                      <span className="stat-card-name">{stat.name}</span>
                    </div>
                    {isUnlocked ? (
                      renderStatValue(stat.id)
                    ) : (
                      <div className="stat-locked">
                        <div className="stat-desc">{stat.description}</div>
                        <button
                          className={`stat-buy-btn ${canAfford ? 'can-afford' : ''}`}
                          onClick={() => { buyStatUnlock(stat.id); playBuySound(); }}
                          disabled={!canAfford}
                        >
                          {resourceSymbol} {formatNumber(stat.cost)} — UNLOCK
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
