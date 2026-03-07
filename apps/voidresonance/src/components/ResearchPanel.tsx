import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../game/store';
import { RESEARCH_NODES } from '../config/research';
import { canStartResearch, getResearchSpeed } from '../game/engine';
import type { ResearchEffect, ResearchNodeDef } from '../game/types';
import { formatNumber, formatTime } from '../utils/numberFormatting';
import { playBuySound, playClickSound } from '../audio/SoundManager';
import './ResearchPanel.css';

/* ─── Branch system ─── */
type Branch = 'production' | 'click' | 'data' | 'prestige' | 'void';

const BRANCH_MAP: Record<string, Branch> = {
  r_basics: 'production', r_efficiency: 'production', r_deepvoid: 'production',
  r_overclock: 'production', r_quantum: 'production', r_genoptimize: 'production',
  r_massproduction: 'production', r_effmatrix: 'production',
  r_clicking: 'click', r_clickmaster: 'click',
  r_power_analysis: 'data', r_upgrade_forecast: 'data', r_signals: 'data',
  r_datasurge: 'data', r_datastream: 'data', r_datamining: 'data',
  r_patterns: 'data', r_datacompress: 'data',
  r_prestige_theory: 'prestige', r_prestige_boost: 'prestige',
  r_echo_mastery: 'prestige', r_echo_recursion: 'prestige', r_void_collapse: 'prestige',
  r_anomaly: 'void', r_hypervoid: 'void', r_infinity: 'void',
  r_rift_attunement: 'void', r_event_horizon: 'void',
  r_resonance: 'void', r_harmonic: 'void', r_perfect_resonance: 'void',
};

const BRANCH_META: Record<Branch, { label: string }> = {
  production: { label: 'PROD' },
  click: { label: 'CLICK' },
  data: { label: 'DATA' },
  prestige: { label: 'PRESTIGE' },
  void: { label: 'VOID' },
};

const BRANCH_ORDER: Branch[] = ['production', 'click', 'data', 'prestige', 'void'];

function isMilestone(def: ResearchNodeDef): boolean {
  return def.effect.type === 'unlockSystem';
}

/** Short label for compact square nodes */
function getEffectLabel(effect: ResearchEffect): string {
  switch (effect.type) {
    case 'globalMultiplier':
      return effect.value >= 2
        ? `×${effect.value} prod`
        : `+${Math.round((effect.value - 1) * 100)}% prod`;
    case 'generatorMultiplier':
      return `${effect.targetId ?? 'Gen'} ×${effect.value}`;
    case 'clickMultiplier':
      return `Click ×${effect.value}`;
    case 'dataRate':
      return `Data +${Math.round(effect.value * 100)}%`;
    case 'prestigeBonus':
      return `Echo +${Math.round(effect.value * 100)}%`;
    case 'unlockSystem':
      return '🔓 NEW SYSTEM';
    case 'unlockAnalytics':
      return '📊 Analytics';
    default:
      return `${effect.type}`;
  }
}

/** Full label for tooltips & active bar */
function getEffectLabelLong(effect: ResearchEffect): string {
  switch (effect.type) {
    case 'globalMultiplier':
      return effect.value >= 2
        ? `All production ×${effect.value}`
        : `All production +${Math.round((effect.value - 1) * 100)}%`;
    case 'generatorMultiplier':
      return `${effect.targetId ?? 'Generator'} ×${effect.value}`;
    case 'clickMultiplier':
      return `Click power ×${effect.value}`;
    case 'dataRate':
      return `Data rate +${Math.round(effect.value * 100)}%`;
    case 'prestigeBonus':
      return `Echo gain +${Math.round(effect.value * 100)}%`;
    case 'unlockSystem':
      return '🔓 Unlocks new system';
    case 'unlockAnalytics':
      return '📊 Unlocks analytics display';
    default:
      return `Effect: ${effect.type}`;
  }
}

// Build tree layout: assign depth levels for vertical tree
function buildTreeLayout(nodes: ResearchNodeDef[]): Map<string, number> {
  const depthMap = new Map<string, number>();
  const nodeById = new Map<string, ResearchNodeDef>();
  for (const n of nodes) nodeById.set(n.id, n);

  function getDepth(id: string): number {
    if (depthMap.has(id)) return depthMap.get(id)!;
    const node = nodeById.get(id);
    if (!node || !node.requires || node.requires.length === 0) {
      depthMap.set(id, 0);
      return 0;
    }
    const parentDepths = node.requires.map(r => getDepth(r));
    const depth = Math.max(...parentDepths) + 1;
    depthMap.set(id, depth);
    return depth;
  }

  for (const node of nodes) {
    getDepth(node.id);
  }
  return depthMap;
}

export function ResearchPanel() {
  const state = useGameStore();
  const startResearch = useGameStore((s) => s.startResearch);
  const smashResearch = useGameStore((s) => s.smashResearch);
  const [isFlashing, setIsFlashing] = useState(false);
  const treeRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const visibleNodes = RESEARCH_NODES.filter(r => state.totalFluxEarned >= r.unlockAt);
  const speed = getResearchSpeed(state);
  const depthMap = buildTreeLayout(RESEARCH_NODES);

  // Group visible nodes by tier
  const tierGroups = new Map<number, ResearchNodeDef[]>();
  for (const node of visibleNodes) {
    const depth = depthMap.get(node.id) ?? 0;
    if (!tierGroups.has(depth)) tierGroups.set(depth, []);
    tierGroups.get(depth)!.push(node);
  }
  // Sort nodes within each tier by branch then unlockAt
  for (const [, nodes] of tierGroups) {
    nodes.sort((a, b) => {
      const ba = BRANCH_ORDER.indexOf(BRANCH_MAP[a.id] ?? 'production');
      const bb = BRANCH_ORDER.indexOf(BRANCH_MAP[b.id] ?? 'production');
      if (ba !== bb) return ba - bb;
      return a.unlockAt - b.unlockAt;
    });
  }
  const tiers = [...tierGroups.entries()].sort((a, b) => a[0] - b[0]);
  const totalCompleted = visibleNodes.filter(n => state.research[n.id]?.completed).length;

  const handleSmash = useCallback(() => {
    const boost = smashResearch();
    if (boost > 0) {
      playClickSound();
      setIsFlashing(true);
    }
  }, [smashResearch]);

  useEffect(() => {
    if (!isFlashing) return;
    const timer = setTimeout(() => setIsFlashing(false), 150);
    return () => clearTimeout(timer);
  }, [isFlashing]);

  const scrollToLatest = () => {
    let latestNode: ResearchNodeDef | null = null;
    let latestDepth = -1;
    for (const node of visibleNodes) {
      if (state.research[node.id]?.completed) continue;
      const d = depthMap.get(node.id) ?? 0;
      if (d > latestDepth) { latestDepth = d; latestNode = node; }
    }
    if (latestNode) {
      nodeRefs.current.get(latestNode.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const setNodeRef = (id: string, el: HTMLDivElement | null) => {
    if (el) nodeRefs.current.set(id, el);
  };

  return (
    <div className="research-panel">
      <div className="panel-header">
        <h2>Research</h2>
        <div className="research-header-right">
          <span className="research-speed">∴ {speed.toFixed(2)}x</span>
          <button className="research-scroll-btn" onClick={scrollToLatest} title="Scroll to latest">
            ▼ LATEST
          </button>
        </div>
      </div>

      {state.activeResearchId && (() => {
        const activeDef = RESEARCH_NODES.find(r => r.id === state.activeResearchId);
        const activeState = state.research[state.activeResearchId];
        if (!activeDef || !activeState) return null;
        const progress = activeState.progress / activeDef.duration;
        const remaining = (activeDef.duration - activeState.progress) / speed;

        return (
          <div
            className={`research-active ${isFlashing ? 'smash-flash' : ''}`}
            onClick={handleSmash}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSmash(); }}
          >
            <div className="research-active-header">
              <span className="research-active-label">⟳ RESEARCHING</span>
              <span className="research-active-name">{activeDef.name}</span>
            </div>
            <div className="research-active-effect">
              {getEffectLabelLong(activeDef.effect)}
            </div>
            <div className="research-progress-bar">
              <div className="research-progress-fill" style={{ width: `${progress * 100}%` }} />
              <div className="research-progress-glow" style={{ left: `${progress * 100}%` }} />
            </div>
            <div className="research-progress-text">
              <span>{(progress * 100).toFixed(1)}%</span>
              <span>{formatTime(remaining)} remaining</span>
            </div>
            <div className="research-smash-hint">
              PRESS TO ACCELERATE
            </div>
          </div>
        );
      })()}

      <div className="research-tree" ref={treeRef}>
        {/* Branch legend */}
        <div className="branch-legend">
          {BRANCH_ORDER.map(b => (
            <span key={b} className={`branch-legend-item branch-${b}`}>
              <span className={`cat-dot cat-${b}`} /> {BRANCH_META[b].label}
            </span>
          ))}
        </div>

        {/* Skill tree tiers */}
        {tiers.map(([tierNum, tierNodes]) => {
          const gateReq = tierNum; // need N total completions to access tier N
          const tierUnlocked = totalCompleted >= gateReq;
          const tierDone = tierNodes.filter(n => state.research[n.id]?.completed).length;

          return (
            <div key={tierNum} className={`skill-tier ${tierUnlocked ? '' : 'tier-gated'}`}>
              <div className="skill-tier-header">
                <div className="skill-tier-line" />
                <span className="skill-tier-label">TIER {tierNum + 1}</span>
                {gateReq > 0 && (
                  <span className={`skill-tier-gate ${tierUnlocked ? 'gate-met' : 'gate-unmet'}`}>
                    {tierUnlocked ? <span className="icon-check" /> : <span className="icon-lock" />} {totalCompleted}/{gateReq}
                  </span>
                )}
                <span className="skill-tier-progress">{tierDone}/{tierNodes.length}</span>
                <div className="skill-tier-line" />
              </div>

              <div className="skill-tier-nodes">
                {tierNodes.map(def => {
                  const rState = state.research[def.id];
                  const isCompleted = rState?.completed === true;
                  const isActive = state.activeResearchId === def.id;
                  const hasPrereqs = !def.requires || def.requires.every(r => state.research[r]?.completed);
                  const canStart = tierUnlocked && hasPrereqs && canStartResearch(def, state) && !state.activeResearchId;
                  const branch = BRANCH_MAP[def.id] ?? 'production';
                  const milestone = isMilestone(def);
                  const resourceSymbol = def.costResource === 'data' ? '◈' : '∆';
                  const currentResource = def.costResource === 'data' ? state.data : state.flux;
                  const canAfford = currentResource >= def.cost;

                  let statusClass = '';
                  if (isCompleted) statusClass = 'completed';
                  else if (isActive) statusClass = 'active';
                  else if (!tierUnlocked || !hasPrereqs) statusClass = 'locked';
                  else if (canStart) statusClass = 'available';
                  else statusClass = 'unavailable';

                  return (
                    <div
                      key={def.id}
                      ref={el => setNodeRef(def.id, el)}
                      className={`skill-node ${statusClass} branch-${branch} ${milestone ? 'milestone' : ''}`}
                    >
                      {milestone && <div className="milestone-banner">★ MILESTONE</div>}

                      <div className="skill-node-branch-icon"><span className={`cat-dot cat-${branch}`} /></div>
                      <div className="skill-node-name">{def.name}</div>
                      <div className="skill-node-effect">{getEffectLabel(def.effect)}</div>

                      {isCompleted && (
                        <span className="icon-check" />
                      )}

                      {isActive && (
                        <div className="skill-node-active-badge">⟳</div>
                      )}

                      {!isCompleted && !isActive && (
                        <>
                          <div className={`skill-node-cost ${canAfford ? 'affordable' : 'expensive'}`}>
                            {resourceSymbol} {formatNumber(def.cost)}
                          </div>
                          <button
                            className="skill-node-btn"
                            onClick={(e) => { e.stopPropagation(); startResearch(def.id); playBuySound(); }}
                            disabled={!canStart}
                          >
                            {!tierUnlocked ? <span className="icon-lock" /> : !hasPrereqs ? <span className="icon-lock" /> : 'BUY'}
                          </button>
                        </>
                      )}

                      {/* Hover tooltip */}
                      <div className="skill-tooltip">
                        <div className="skill-tooltip-name">{def.name}</div>
                        <div className="skill-tooltip-effect">{getEffectLabelLong(def.effect)}</div>
                        <div className="skill-tooltip-desc">{def.description}</div>
                        {def.flavorText && <div className="skill-tooltip-flavor">"{def.flavorText}"</div>}
                        {!isCompleted && (
                          <>
                            <div className="skill-tooltip-cost">
                              {resourceSymbol} {formatNumber(def.cost)} {def.costResource === 'data' ? 'DATA' : 'FLUX'}
                            </div>
                            <div className="skill-tooltip-duration">∴ {formatTime(def.duration / speed)}</div>
                          </>
                        )}
                        {def.requires && def.requires.length > 0 && (
                          <div className="skill-tooltip-reqs">
                            Requires:{' '}
                            {def.requires.map((r, i) => {
                              const reqNode = RESEARCH_NODES.find(n => n.id === r);
                              const met = state.research[r]?.completed;
                              return (
                                <span key={r} className={met ? 'req-met' : 'req-unmet'}>
                                  {met ? '✓' : '✗'} {reqNode?.name ?? r}{i < def.requires!.length - 1 ? ', ' : ''}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {!tierUnlocked && (
                          <div className="skill-tooltip-gate"><span className="icon-lock" /> Need {gateReq} total researches to unlock this tier</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {visibleNodes.length === 0 && (
          <div className="empty-message">Research unlocks at 10K total flux earned...</div>
        )}
      </div>
    </div>
  );
}
