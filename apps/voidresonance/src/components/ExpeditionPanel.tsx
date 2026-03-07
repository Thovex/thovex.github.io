import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../game/store';
import { EXPEDITION_ZONES, EXPEDITION_ARTIFACTS, EXPEDITION_LORE } from '../config/expeditions';
import { GENERATORS } from '../config/generators';
import {
  isExpeditionZoneUnlocked,
  calculateExpeditionPower,
  getExpeditionSuccessChance,
  getProductionLossPercent,
  getAvailableGenerators,
} from '../game/engine';
import { formatNumber, formatTime } from '../utils/numberFormatting';
import { playBuySound } from '../audio/SoundManager';
import { triggerPrestigeAnimation } from './prestigeAnimationTrigger';
import './ExpeditionPanel.css';

type ExpeditionView = 'zones' | 'setup' | 'active' | 'results' | 'artifacts' | 'lore';

const BULK_ASSIGN_FRACTION = 4; // ++ assigns 25% of owned generators

export function ExpeditionPanel() {
  const state = useGameStore();
  const startExpedition = useGameStore((s) => s.startExpedition);
  const collectExpeditionRewards = useGameStore((s) => s.collectExpeditionRewards);
  const dismissExpeditionResult = useGameStore((s) => s.dismissExpeditionResult);

  const [view, setView] = useState<ExpeditionView>('zones');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [assignedGens, setAssignedGens] = useState<Record<string, number>>({});
  const [selectedDuration, setSelectedDuration] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Force periodic re-render for timer updates
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Derive effective view from state — don't use useEffect for state sync
  const effectiveView = state.expeditions.pendingResult
    ? 'results' as ExpeditionView
    : state.expeditions.activeExpedition && view !== 'artifacts' && view !== 'lore'
      ? 'active' as ExpeditionView
      : view;

  const handleSelectZone = useCallback((zoneId: string) => {
    const zone = EXPEDITION_ZONES.find(z => z.id === zoneId);
    if (!zone) return;
    setSelectedZone(zoneId);
    setAssignedGens({});
    setSelectedDuration(zone.minDuration);
    setView('setup');
  }, []);

  const handleAssignGen = useCallback((genId: string, delta: number) => {
    setAssignedGens(prev => {
      const current = prev[genId] ?? 0;
      const available = getAvailableGenerators(genId, state);
      const owned = state.generators[genId]?.owned ?? 0;
      const maxAssignable = Math.min(owned, available);
      const newCount = Math.max(0, Math.min(maxAssignable, current + delta));
      return { ...prev, [genId]: newCount };
    });
  }, [state]);

  const handleLaunch = useCallback(() => {
    if (!selectedZone) return;
    // Filter out zero-assigned generators
    const filteredGens: Record<string, number> = {};
    for (const [id, count] of Object.entries(assignedGens)) {
      if (count > 0) filteredGens[id] = count;
    }
    if (Object.keys(filteredGens).length === 0) return;
    const zoneDef = EXPEDITION_ZONES.find(z => z.id === selectedZone);
    const totalAssigned = Object.values(filteredGens).reduce((s, c) => s + c, 0);
    triggerPrestigeAnimation('expedition', {
      details: [
        zoneDef?.name ?? selectedZone,
        `${totalAssigned} generators deployed`,
        `Duration: ${formatTime(selectedDuration)}`,
      ],
    });
    startExpedition(selectedZone, filteredGens, selectedDuration);
    playBuySound();
    setView('active');
  }, [selectedZone, assignedGens, selectedDuration, startExpedition]);

  const handleCollect = useCallback(() => {
    collectExpeditionRewards();
    playBuySound();
    setView('zones');
  }, [collectExpeditionRewards]);

  const totalAssigned = Object.values(assignedGens).reduce((s, c) => s + c, 0);
  const power = calculateExpeditionPower(assignedGens, state);
  const zone = selectedZone ? EXPEDITION_ZONES.find(z => z.id === selectedZone) : null;
  const successChance = zone ? getExpeditionSuccessChance(power, zone.difficulty) : 0;
  const prodLoss = getProductionLossPercent(assignedGens, state);

  const renderHeader = () => (
    <div className="exp-header">
      <div className="exp-title-row">
        <h2 className="exp-title">⬡ VOID EXPEDITIONS</h2>
      </div>
      <div className="exp-nav">
        <button
          className={`exp-nav-btn ${effectiveView === 'zones' || effectiveView === 'setup' ? 'active' : ''}`}
          onClick={() => setView('zones')}
        >
          Zones
        </button>
        {state.expeditions.activeExpedition && (
          <button
            className={`exp-nav-btn ${effectiveView === 'active' ? 'active' : ''}`}
            onClick={() => setView('active')}
          >
            Active ⬡
          </button>
        )}
        <button
          className={`exp-nav-btn ${effectiveView === 'artifacts' ? 'active' : ''}`}
          onClick={() => setView('artifacts')}
        >
          Artifacts ({state.expeditions.artifacts.length})
        </button>
        <button
          className={`exp-nav-btn ${effectiveView === 'lore' ? 'active' : ''}`}
          onClick={() => setView('lore')}
        >
          Lore ({state.expeditions.discoveredLore.length})
        </button>
      </div>
      <div className="exp-stats-bar">
        <span>Completed: {state.expeditions.completedCount}</span>
        {state.expeditions.permanentBonus > 0 && (
          <span className="exp-perm-bonus">+{state.expeditions.permanentBonus}% prod</span>
        )}
        {state.expeditions.tempBoostEnd > now && (
          <span className="exp-temp-boost">×2 ACTIVE</span>
        )}
      </div>
    </div>
  );

  const renderZoneList = () => (
    <div className="exp-zones">
      <p className="exp-subtitle">Select a void sector to explore</p>
      <div className="exp-zone-grid">
        {EXPEDITION_ZONES.map(z => {
          const unlocked = isExpeditionZoneUnlocked(z.id, state);
          const isActive = state.expeditions.activeExpedition?.zoneId === z.id;
          return (
            <button
              key={z.id}
              className={`exp-zone-card ${unlocked ? 'unlocked' : 'locked'} ${isActive ? 'active-zone' : ''}`}
              onClick={() => { if (unlocked && !state.expeditions.activeExpedition) handleSelectZone(z.id); }}
              disabled={!unlocked || !!state.expeditions.activeExpedition}
            >
              <div className="exp-zone-name">{unlocked ? z.name : '???'}</div>
              <div className="exp-zone-desc">{unlocked ? z.description : 'Locked'}</div>
              {unlocked && (
                <div className="exp-zone-meta">
                  <span>Difficulty: {formatNumber(z.difficulty)}</span>
                  <span>{formatTime(z.minDuration)} – {formatTime(z.maxDuration)}</span>
                </div>
              )}
              {!unlocked && (
                <div className="exp-zone-unlock">
                  {z.unlockCondition.type === 'flux'
                    ? `Need ${formatNumber(z.unlockCondition.value)} total flux`
                    : `Need ${z.unlockCondition.value} prestige(s)`}
                </div>
              )}
              {unlocked && <div className="exp-zone-flavor">{z.flavorText}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderSetup = () => {
    if (!zone) return null;
    const ownedGenerators = GENERATORS.filter(g => (state.generators[g.id]?.owned ?? 0) > 0);

    return (
      <div className="exp-setup">
        <button className="exp-back" onClick={() => setView('zones')}>← Back to Zones</button>
        <h3 className="exp-zone-title">{zone.name}</h3>
        <p className="exp-zone-flavor-text">{zone.flavorText}</p>

        {/* Duration selector */}
        <div className="exp-duration-section">
          <label className="exp-section-label">Duration</label>
          <div className="exp-duration-slider">
            <input
              type="range"
              min={zone.minDuration}
              max={zone.maxDuration}
              step={Math.max(1, Math.floor((zone.maxDuration - zone.minDuration) / 20))}
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(Number(e.target.value))}
              className="exp-slider"
            />
            <span className="exp-duration-value">{formatTime(selectedDuration)}</span>
          </div>
        </div>

        {/* Generator assignment */}
        <div className="exp-assign-section">
          <label className="exp-section-label">Assign Generators</label>
          {ownedGenerators.length === 0 ? (
            <p className="exp-no-gens">No generators available</p>
          ) : (
            <div className="exp-gen-list">
              {ownedGenerators.map(gen => {
                const owned = state.generators[gen.id]?.owned ?? 0;
                const assigned = assignedGens[gen.id] ?? 0;
                return (
                  <div key={gen.id} className="exp-gen-row">
                    <div className="exp-gen-info">
                      <span className="exp-gen-name">{gen.name}</span>
                      <span className="exp-gen-count">Owned: {owned}</span>
                    </div>
                    <div className="exp-gen-controls">
                      <button
                        className="exp-gen-btn"
                        onClick={() => handleAssignGen(gen.id, -Math.ceil(owned / BULK_ASSIGN_FRACTION))}
                        disabled={assigned <= 0}
                      >--</button>
                      <button
                        className="exp-gen-btn"
                        onClick={() => handleAssignGen(gen.id, -1)}
                        disabled={assigned <= 0}
                      >-</button>
                      <span className="exp-gen-assigned">{assigned}</span>
                      <button
                        className="exp-gen-btn"
                        onClick={() => handleAssignGen(gen.id, 1)}
                        disabled={assigned >= owned}
                      >+</button>
                      <button
                        className="exp-gen-btn"
                        onClick={() => handleAssignGen(gen.id, Math.ceil(owned / BULK_ASSIGN_FRACTION))}
                        disabled={assigned >= owned}
                      >++</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Power preview */}
        <div className="exp-preview">
          <div className="exp-preview-row">
            <span>Expedition Power</span>
            <span className="exp-power-value">{formatNumber(power)}</span>
          </div>
          <div className="exp-preview-row">
            <span>Success Chance</span>
            <span className={`exp-success ${successChance >= 80 ? 'high' : successChance >= 40 ? 'mid' : 'low'}`}>
              {successChance.toFixed(0)}%
            </span>
          </div>
          <div className="exp-preview-row">
            <span>Production Impact</span>
            <span className="exp-loss">-{prodLoss.toFixed(1)}%</span>
          </div>
          <div className="exp-preview-row">
            <span>Generators Assigned</span>
            <span>{totalAssigned}</span>
          </div>
        </div>

        {/* Launch */}
        <button
          className={`exp-launch-btn ${totalAssigned > 0 ? 'ready' : 'disabled'}`}
          onClick={handleLaunch}
          disabled={totalAssigned <= 0}
        >
          {totalAssigned > 0
            ? `⬡ Launch Expedition (${formatTime(selectedDuration)})`
            : 'Assign generators to begin'}
        </button>
      </div>
    );
  };

  const renderActive = () => {
    const exp = state.expeditions.activeExpedition;
    if (!exp) return <p className="exp-no-active">No active expedition</p>;

    const elapsed = (now - exp.startedAt) / 1000;
    const progress = Math.min(1, elapsed / exp.duration);
    const remaining = Math.max(0, exp.duration - elapsed);
    const activeZone = EXPEDITION_ZONES.find(z => z.id === exp.zoneId);

    return (
      <div className="exp-active">
        <h3 className="exp-active-zone">{activeZone?.name ?? 'Unknown Zone'}</h3>

        {/* Progress */}
        <div className="exp-progress-container">
          <div className="exp-progress-bar">
            <div
              className="exp-progress-fill"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="exp-progress-info">
            <span>{(progress * 100).toFixed(1)}%</span>
            <span>{formatTime(remaining)} remaining</span>
          </div>
        </div>

        {/* Assigned generators */}
        <div className="exp-active-gens">
          <label className="exp-section-label">Deployed Generators</label>
          {Object.entries(exp.assignedGenerators).map(([genId, count]) => {
            const gen = GENERATORS.find(g => g.id === genId);
            return (
              <div key={genId} className="exp-deployed-gen">
                <span>{gen?.name ?? genId}</span>
                <span>×{count}</span>
              </div>
            );
          })}
        </div>

        {/* Event log */}
        {exp.events.length > 0 && (
          <div className="exp-event-log">
            <label className="exp-section-label">Expedition Log</label>
            {exp.events.map(evtId => {
              const allEvents = activeZone?.eventPool ?? [];
              const evt = allEvents.find(e => e.id === evtId);
              return (
                <div key={evtId} className="exp-event-entry">
                  <span className="exp-event-dot">◆</span>
                  <span>{evt?.text ?? 'Unknown event'}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats */}
        <div className="exp-active-stats">
          <div className="exp-preview-row">
            <span>Power</span>
            <span>{formatNumber(exp.power)}</span>
          </div>
          <div className="exp-preview-row">
            <span>Success Chance</span>
            <span>{getExpeditionSuccessChance(exp.power, activeZone?.difficulty ?? 1).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    const result = state.expeditions.pendingResult;
    if (!result) return null;

    return (
      <div className="exp-results">
        <h3 className={`exp-result-title ${result.success ? 'success' : 'failure'}`}>
          {result.success ? '⬡ EXPEDITION SUCCESSFUL' : '⬡ EXPEDITION FAILED'}
        </h3>
        <p className="exp-result-zone">{result.zoneName}</p>

        <div className="exp-rewards-list">
          {result.rewards.map((reward, i) => {
            const displayLabel = reward.label;
            let icon = '◆';

            if (reward.type === 'artifact') {
              icon = '★';
            } else if (reward.type === 'lore') {
              icon = '◇';
            } else if (reward.type === 'flux') {
              icon = '◈';
            } else if (reward.type === 'data') {
              icon = '▣';
            } else if (reward.type === 'echoes') {
              icon = '🔮';
            } else if (reward.type === 'permanent_bonus') {
              icon = '✦';
            } else if (reward.type === 'temp_boost') {
              icon = '⚡';
            }

            const showAmount = reward.amount > 0
              && reward.type !== 'artifact'
              && reward.type !== 'lore'
              && reward.type !== 'temp_boost';

            return (
              <div key={i} className={`exp-reward-item reward-${reward.type}`}>
                <span className="exp-reward-icon">{icon}</span>
                <span className="exp-reward-label">{displayLabel}</span>
                {showAmount && (
                  <span className="exp-reward-amount">+{formatNumber(reward.amount)}</span>
                )}
              </div>
            );
          })}
        </div>

        {result.events.length > 0 && (
          <div className="exp-result-events">
            <label className="exp-section-label">Events During Expedition</label>
            {result.events.map(evtId => {
              const z = EXPEDITION_ZONES.find(z2 => z2.id === result.zoneId);
              const evt = z?.eventPool.find(e => e.id === evtId);
              return (
                <div key={evtId} className="exp-event-entry">
                  <span className="exp-event-dot">◆</span>
                  <span>{evt?.text ?? evtId}</span>
                </div>
              );
            })}
          </div>
        )}

        <button className="exp-collect-btn" onClick={handleCollect}>
          ⬡ Collect Rewards
        </button>
        <button className="exp-dismiss-btn" onClick={() => { dismissExpeditionResult(); setView('zones'); }}>
          Dismiss
        </button>
      </div>
    );
  };

  const renderArtifacts = () => (
    <div className="exp-artifacts">
      <h3 className="exp-section-title">Discovered Artifacts</h3>
      {state.expeditions.artifacts.length === 0 ? (
        <p className="exp-empty">No artifacts discovered yet. Send expeditions to find them!</p>
      ) : (
        <div className="exp-artifact-grid">
          {EXPEDITION_ARTIFACTS.map(art => {
            const found = state.expeditions.artifacts.includes(art.id);
            return (
              <div key={art.id} className={`exp-artifact-card ${found ? 'found' : 'hidden'}`}>
                <span className="exp-artifact-icon">{found ? art.icon : '?'}</span>
                <div className="exp-artifact-info">
                  <span className="exp-artifact-name">{found ? art.name : '???'}</span>
                  <span className="exp-artifact-desc">{found ? art.description : 'Undiscovered'}</span>
                  {found && <span className="exp-artifact-zone">Found in: {EXPEDITION_ZONES.find(z => z.id === art.zoneId)?.name}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderLore = () => (
    <div className="exp-lore">
      <h3 className="exp-section-title">Void Lore</h3>
      {state.expeditions.discoveredLore.length === 0 ? (
        <p className="exp-empty">No lore fragments discovered yet.</p>
      ) : (
        <div className="exp-lore-list">
          {EXPEDITION_LORE.filter(l => state.expeditions.discoveredLore.includes(l.id)).map(lore => (
            <div key={lore.id} className="exp-lore-entry">
              <span className="exp-lore-mark">◇</span>
              <p className="exp-lore-text">{lore.text}</p>
              <span className="exp-lore-source">{EXPEDITION_ZONES.find(z => z.id === lore.zoneId)?.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="exp-panel">
      {renderHeader()}
      <div className="exp-body">
        {effectiveView === 'zones' && renderZoneList()}
        {effectiveView === 'setup' && renderSetup()}
        {effectiveView === 'active' && renderActive()}
        {effectiveView === 'results' && renderResults()}
        {effectiveView === 'artifacts' && renderArtifacts()}
        {effectiveView === 'lore' && renderLore()}
      </div>
    </div>
  );
}
