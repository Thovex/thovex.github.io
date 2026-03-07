#!/usr/bin/env python3
"""
ClickerSpace Progression Simulator
===================================
Reads game config JSON files and simulates idle-game progression to estimate
time-to-milestone.  Useful for balance tuning without running the live game.

Usage:
    python sim.py                   # Run full simulation with defaults
    python sim.py --clicks-per-sec 5  # Simulate active clicking
    python sim.py --ascendancy observer  # Force a specific ascendancy path
    python sim.py --max-hours 48    # Cap simulation wall-time
    python sim.py --verbose         # Print every milestone as it's reached

All balance values are read from the config/ directory so you can tweak
numbers and immediately see their effect on progression pacing.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# ─── Config Loader ────────────────────────────────────────────────────────────

CONFIG_DIR = Path(__file__).resolve().parent / "config"


def _load(name: str) -> Any:
    with open(CONFIG_DIR / name, "r") as f:
        return json.load(f)


GENERATORS: list[dict] = _load("generators.json")
UPGRADES_CFG: dict = _load("upgrades.json")
UPGRADES: list[dict] = UPGRADES_CFG["upgrades"]
PRESTIGE_CFG: dict = _load("prestige.json")
PRESTIGE_UPGRADES: list[dict] = PRESTIGE_CFG["upgrades"]
VOID_SHARD_CFG: dict = _load("void_shards.json")
VOID_SHARD_UPGRADES: list[dict] = VOID_SHARD_CFG["upgrades"]
SINGULARITY_CFG: dict = _load("singularity.json")
SINGULARITY_UPGRADES: list[dict] = SINGULARITY_CFG["upgrades"]
MILESTONES: list[dict] = _load("milestones.json")["milestones"]
RESEARCH_CFG: dict = _load("research.json")
RESEARCH_NODES: list[dict] = RESEARCH_CFG["nodes"]
ASCENDANCY_CFG: dict = _load("ascendancy.json")
ASCENDANCY_PATHS: list[dict] = ASCENDANCY_CFG["paths"]
MASTERY_TIERS: list[dict] = ASCENDANCY_CFG["masteryTiers"]

# Pre-build lookup maps for O(1) access
_GEN_MAP: dict[str, dict] = {g["id"]: g for g in GENERATORS}
_UPGRADE_MAP: dict[str, dict] = {u["id"]: u for u in UPGRADES}
_PRESTIGE_MAP: dict[str, dict] = {p["id"]: p for p in PRESTIGE_UPGRADES}
_VS_MAP: dict[str, dict] = {v["id"]: v for v in VOID_SHARD_UPGRADES}
_SG_MAP: dict[str, dict] = {s["id"]: s for s in SINGULARITY_UPGRADES}
_RESEARCH_MAP: dict[str, dict] = {r["id"]: r for r in RESEARCH_NODES}
_PATH_MAP: dict[str, dict] = {p["id"]: p for p in ASCENDANCY_PATHS}

# ─── Simulation State ─────────────────────────────────────────────────────────


@dataclass
class SimState:
    """Mutable simulation state mirroring the game's GameState."""

    # Resources
    flux: float = 0.0
    total_flux_earned: float = 0.0
    data: float = 0.0
    total_data_earned: float = 0.0

    # Generators: id -> owned count
    generators: dict[str, int] = field(default_factory=dict)

    # Upgrades: id -> level
    upgrades: dict[str, int] = field(default_factory=dict)

    # Research: id -> completed (bool)
    research: dict[str, bool] = field(default_factory=dict)
    active_research_id: str | None = None
    research_progress: float = 0.0

    # Prestige
    echoes: float = 0.0
    total_echoes: float = 0.0
    prestige_count: int = 0
    prestige_upgrades: dict[str, int] = field(default_factory=dict)

    # Void shards (2nd prestige)
    void_shards: float = 0.0
    total_void_shards: float = 0.0
    void_collapse_count: int = 0
    void_shard_upgrades: dict[str, int] = field(default_factory=dict)

    # Ascendancy
    ascendancy_path: str | None = None
    path_mastery: dict[str, int] = field(default_factory=dict)

    # Singularity (3rd prestige)
    reality_fragments: float = 0.0
    total_reality_fragments: float = 0.0
    singularity_count: int = 0
    singularity_upgrades: dict[str, int] = field(default_factory=dict)

    # Tracking
    total_time: float = 0.0  # seconds
    total_clicks: int = 0

    # Internal — auto-buy cooldown for throttled gen purchases
    _auto_buy_cd: float = 0.0


# ─── Formulas (mirror engine.ts) ──────────────────────────────────────────────


def get_milestone_mult(owned: int) -> float:
    mult = 1.0
    for m in MILESTONES:
        if owned >= m["threshold"]:
            mult *= m["productionMultiplier"]
        else:
            break
    return mult


def get_mastery_tier(uses: int) -> dict:
    for tier in MASTERY_TIERS:
        if uses >= tier["threshold"]:
            return tier
    return {"name": "Unstarted", "threshold": 0, "bonus": 0}


def get_ascendancy_modifier(stat: str, state: SimState) -> float:
    pid = state.ascendancy_path
    if not pid:
        return 0.0 if stat == "offlineEfficiency" else 1.0
    path = _PATH_MAP.get(pid)
    if not path:
        return 0.0 if stat == "offlineEfficiency" else 1.0
    return path["modifiers"].get(stat, 0.0 if stat == "offlineEfficiency" else 1.0)


def get_generator_cost(gen: dict, owned: int, state: SimState) -> float:
    cost = gen["baseCost"] * (gen["costGrowth"] ** owned)
    # Prestige cost reduction
    cr_level = state.prestige_upgrades.get("p_costreduce", 0)
    if cr_level > 0:
        cr_def = _PRESTIGE_MAP["p_costreduce"]
        cost *= (1 - cr_def["effect"]["value"]) ** cr_level
    # Ascendancy path cost modifier
    path_mod = get_ascendancy_modifier("generatorCostMult", state)
    if path_mod != 1:
        cost *= path_mod
    return math.ceil(cost)


def get_generator_mult(gen_id: str, state: SimState) -> float:
    mult = 1.0
    for u in UPGRADES:
        lv = state.upgrades.get(u["id"], 0)
        if lv == 0:
            continue
        eff = u["effect"]
        if eff["type"] == "generatorMultiplier" and eff.get("targetId") == gen_id:
            mult *= eff["value"] ** lv
    for r in RESEARCH_NODES:
        if not state.research.get(r["id"]):
            continue
        eff = r["effect"]
        if eff["type"] == "generatorMultiplier" and eff.get("targetId") == gen_id:
            mult *= eff["value"]
    return mult


def get_global_mult(state: SimState) -> float:
    mult = 1.0
    for u in UPGRADES:
        lv = state.upgrades.get(u["id"], 0)
        if lv == 0:
            continue
        if u["effect"]["type"] == "globalMultiplier":
            mult *= u["effect"]["value"] ** lv
    for r in RESEARCH_NODES:
        if not state.research.get(r["id"]):
            continue
        if r["effect"]["type"] == "globalMultiplier":
            mult *= r["effect"]["value"]
    for p in PRESTIGE_UPGRADES:
        lv = state.prestige_upgrades.get(p["id"], 0)
        if lv == 0:
            continue
        if p["effect"]["type"] == "productionMultiplier":
            if p["id"] == "p_premium_bonus":
                continue  # Skip premium
            mult *= p["effect"]["value"] ** lv
    for vs in VOID_SHARD_UPGRADES:
        lv = state.void_shard_upgrades.get(vs["id"], 0)
        if lv == 0:
            continue
        if vs["effect"]["type"] == "productionMultiplier":
            mult *= 1 + vs["effect"]["value"] * lv
    path_prod = get_ascendancy_modifier("productionMult", state)
    mult *= path_prod
    for sg in SINGULARITY_UPGRADES:
        lv = state.singularity_upgrades.get(sg["id"], 0)
        if lv == 0:
            continue
        if sg["effect"]["type"] == "productionMultiplier":
            mult *= sg["effect"]["value"] ** lv
    return mult


def get_flux_per_second(state: SimState) -> float:
    total = 0.0
    for gen in GENERATORS:
        owned = state.generators.get(gen["id"], 0)
        if owned == 0:
            continue
        gen_mult = get_generator_mult(gen["id"], state)
        mile_mult = get_milestone_mult(owned)
        total += gen["baseProduction"] * owned * gen_mult * mile_mult
    global_mult = get_global_mult(state)
    return total * global_mult


def get_data_per_second(state: SimState) -> float:
    fps = get_flux_per_second(state)
    if fps <= 0:
        return 0.0
    base_rate = math.log10(max(1, fps)) * 0.5
    rate_mult = 1.0
    for r in RESEARCH_NODES:
        if not state.research.get(r["id"]):
            continue
        if r["effect"]["type"] == "dataRate":
            rate_mult += r["effect"]["value"]
    for p in PRESTIGE_UPGRADES:
        lv = state.prestige_upgrades.get(p["id"], 0)
        if lv == 0:
            continue
        if p["effect"]["type"] == "dataRateBonus":
            rate_mult += p["effect"]["value"] * lv
    path_data = get_ascendancy_modifier("dataRateMult", state)
    rate_mult *= path_data
    return base_rate * rate_mult


def get_click_value(state: SimState) -> float:
    flat = 1.0
    mult = 1.0
    fps_pct = 0.05
    for u in UPGRADES:
        lv = state.upgrades.get(u["id"], 0)
        if lv == 0:
            continue
        eff = u["effect"]
        if eff["type"] == "clickFlat":
            flat += eff["value"] * lv
        if eff["type"] == "clickMultiplier":
            mult *= eff["value"] ** lv
        if eff["type"] == "clickPercent":
            fps_pct += eff["value"] * lv
    for r in RESEARCH_NODES:
        if not state.research.get(r["id"]):
            continue
        if r["effect"]["type"] == "clickMultiplier":
            mult *= r["effect"]["value"]
    for p in PRESTIGE_UPGRADES:
        lv = state.prestige_upgrades.get(p["id"], 0)
        if lv == 0:
            continue
        if p["effect"]["type"] == "clickPower":
            mult *= p["effect"]["value"] ** lv
    fps = get_flux_per_second(state)
    fps_bonus = fps * fps_pct
    path_click = get_ascendancy_modifier("clickMult", state)
    return (flat + fps_bonus) * mult * path_click


def get_research_speed(state: SimState) -> float:
    speed = 1.0
    for u in UPGRADES:
        lv = state.upgrades.get(u["id"], 0)
        if lv == 0:
            continue
        if u["effect"]["type"] == "researchSpeed":
            speed += u["effect"]["value"] * lv
    for p in PRESTIGE_UPGRADES:
        lv = state.prestige_upgrades.get(p["id"], 0)
        if lv == 0:
            continue
        if p["effect"]["type"] == "researchSpeedBonus":
            speed += p["effect"]["value"] * lv
    for vs in VOID_SHARD_UPGRADES:
        lv = state.void_shard_upgrades.get(vs["id"], 0)
        if lv == 0:
            continue
        if vs["effect"]["type"] == "researchSpeed":
            speed += vs["effect"]["value"] * lv
    path_res = get_ascendancy_modifier("researchSpeedMult", state)
    speed *= path_res
    return speed


def get_echo_gain(state: SimState) -> int:
    threshold = PRESTIGE_CFG["echoThreshold"]
    if state.total_flux_earned < threshold:
        return 0
    base = math.floor(math.sqrt(state.total_flux_earned / threshold))
    for r in RESEARCH_NODES:
        if not state.research.get(r["id"]):
            continue
        if r["effect"]["type"] == "prestigeBonus":
            base = math.floor(base * (1 + r["effect"]["value"]))
    for p in PRESTIGE_UPGRADES:
        lv = state.prestige_upgrades.get(p["id"], 0)
        if lv == 0:
            continue
        if p["effect"]["type"] == "echoGainBonus":
            base = math.floor(base * (1 + p["effect"]["value"] * lv))
    for vs in VOID_SHARD_UPGRADES:
        lv = state.void_shard_upgrades.get(vs["id"], 0)
        if lv == 0:
            continue
        if vs["effect"]["type"] == "echoMultiplier":
            base = math.floor(base * (vs["effect"]["value"] ** lv))
    for sg in SINGULARITY_UPGRADES:
        lv = state.singularity_upgrades.get(sg["id"], 0)
        if lv == 0:
            continue
        if sg["effect"]["type"] == "echoMultiplier":
            base = math.floor(base * (sg["effect"]["value"] ** lv))
    return base


def get_void_shard_gain(state: SimState) -> int:
    if state.total_echoes < 100:
        return 0
    base = math.floor(math.sqrt(state.total_echoes / 100))
    if base < 1:
        return 0
    for vs in VOID_SHARD_UPGRADES:
        lv = state.void_shard_upgrades.get(vs["id"], 0)
        if lv == 0:
            continue
        if vs["effect"]["type"] == "shardGainBonus":
            base = math.floor(base * (1 + vs["effect"]["value"] * lv))
    for sg in SINGULARITY_UPGRADES:
        lv = state.singularity_upgrades.get(sg["id"], 0)
        if lv == 0:
            continue
        if sg["effect"]["type"] == "shardMultiplier":
            base = math.floor(base * (sg["effect"]["value"] ** lv))
    return base


def get_reality_fragment_gain(state: SimState) -> int:
    if state.total_void_shards < 10:
        return 0
    base = math.floor(math.sqrt(state.total_void_shards / 10))
    if base < 1:
        return 0
    for sg in SINGULARITY_UPGRADES:
        lv = state.singularity_upgrades.get(sg["id"], 0)
        if lv == 0:
            continue
        if sg["effect"]["type"] == "fragmentGainBonus":
            base = math.floor(base * (1 + sg["effect"]["value"] * lv))
    return base


def get_tick_speed_mult(state: SimState) -> float:
    mult = 1.0
    for sg in SINGULARITY_UPGRADES:
        lv = state.singularity_upgrades.get(sg["id"], 0)
        if lv == 0:
            continue
        if sg["effect"]["type"] == "tickSpeed":
            mult += sg["effect"]["value"] * lv
    return mult


def get_upgrade_cost(u: dict, current_level: int) -> float:
    return math.ceil(u["cost"] * (3 ** current_level))


def get_prestige_upgrade_cost(base_cost: int, current_level: int) -> int:
    return base_cost * (current_level + 1)


# ─── AI Purchase Decisions ────────────────────────────────────────────────────


def try_buy_best_generator(state: SimState) -> bool:
    """Buy the best-value generator the state can afford. Returns True if bought."""
    best_gen = None
    best_value = 0.0
    for gen in GENERATORS:
        if state.total_flux_earned < gen["unlockAt"]:
            continue
        owned = state.generators.get(gen["id"], 0)
        cost = get_generator_cost(gen, owned, state)
        if cost > state.flux:
            continue
        value = gen["baseProduction"] / cost
        if value > best_value:
            best_value = value
            best_gen = gen
    if best_gen is None:
        return False
    owned = state.generators.get(best_gen["id"], 0)
    cost = get_generator_cost(best_gen, owned, state)
    state.flux -= cost
    state.generators[best_gen["id"]] = owned + 1
    return True


def try_buy_upgrades(state: SimState) -> bool:
    """Buy any affordable upgrade. Returns True if any bought."""
    bought = False
    for u in UPGRADES:
        lv = state.upgrades.get(u["id"], 0)
        if lv >= u["maxLevel"]:
            continue
        if state.total_flux_earned < u.get("unlockAt", 0):
            continue
        cost = get_upgrade_cost(u, lv)
        resource = state.data if u["costResource"] == "data" else state.flux
        if resource < cost:
            continue
        if u["costResource"] == "data":
            state.data -= cost
        else:
            state.flux -= cost
        state.upgrades[u["id"]] = lv + 1
        bought = True
    return bought


def try_start_research(state: SimState) -> bool:
    """Start the best available research node. Returns True if started."""
    if state.active_research_id is not None:
        return False
    # Prioritize by unlock threshold (cheapest first)
    candidates = []
    for r in RESEARCH_NODES:
        if state.research.get(r["id"]):
            continue
        if state.total_flux_earned < r.get("unlockAt", 0):
            continue
        # Check prerequisites
        reqs = r.get("requires", [])
        if any(not state.research.get(req_id) for req_id in reqs):
            continue
        resource = state.data if r["costResource"] == "data" else state.flux
        if resource < r["cost"]:
            continue
        candidates.append(r)
    if not candidates:
        return False
    # Pick cheapest
    candidates.sort(key=lambda r: r["cost"])
    chosen = candidates[0]
    if chosen["costResource"] == "data":
        state.data -= chosen["cost"]
    else:
        state.flux -= chosen["cost"]
    state.active_research_id = chosen["id"]
    state.research_progress = 0.0
    return True


def try_buy_prestige_upgrades(state: SimState) -> bool:
    """Spend echoes on prestige upgrades using a priority strategy."""
    bought = False
    # Prioritize production multipliers, then cost reduction, then echo gain
    priority = [
        "p_production1", "p_costreduce", "p_echogain", "p_production2",
        "p_startflux", "p_clickpower", "p_datarate", "p_researchspeed",
        "p_researchtap", "p_offline", "p_startflux2", "p_clickpower2",
        "p_production3", "p_riftfreq",
    ]
    for pid in priority:
        pdef = _PRESTIGE_MAP.get(pid)
        if not pdef:
            continue
        lv = state.prestige_upgrades.get(pid, 0)
        if lv >= pdef["maxLevel"]:
            continue
        cost = get_prestige_upgrade_cost(pdef["cost"], lv)
        if state.echoes >= cost:
            state.echoes -= cost
            state.prestige_upgrades[pid] = lv + 1
            bought = True
    return bought


def try_buy_void_shard_upgrades(state: SimState) -> bool:
    """Spend void shards on upgrades."""
    bought = False
    priority = [
        "vs_echogain", "vs_production", "vs_shardgain", "vs_research",
        "vs_memory", "vs_startgens", "vs_rift",
    ]
    for vid in priority:
        vdef = _VS_MAP.get(vid)
        if not vdef:
            continue
        lv = state.void_shard_upgrades.get(vid, 0)
        if lv >= vdef["maxLevel"]:
            continue
        if state.void_shards >= vdef["cost"]:
            state.void_shards -= vdef["cost"]
            state.void_shard_upgrades[vid] = lv + 1
            bought = True
    return bought


def try_buy_singularity_upgrades(state: SimState) -> bool:
    """Spend reality fragments on singularity upgrades."""
    bought = False
    priority = [
        "sg_tickspeed", "sg_dimensionalprod", "sg_echomult", "sg_shardmult",
        "sg_fragmentgain",
    ]
    for sid in priority:
        sdef = _SG_MAP.get(sid)
        if not sdef:
            continue
        lv = state.singularity_upgrades.get(sid, 0)
        if lv >= sdef["maxLevel"]:
            continue
        if state.reality_fragments >= sdef["cost"]:
            state.reality_fragments -= sdef["cost"]
            state.singularity_upgrades[sid] = lv + 1
            bought = True
    return bought


# ─── Prestige / Reset Logic ──────────────────────────────────────────────────


def do_prestige(state: SimState) -> int:
    """Perform a prestige reset. Returns echoes gained."""
    gain = get_echo_gain(state)
    if gain <= 0:
        return 0
    # Starting flux from prestige upgrades
    starting_flux = 0.0
    for p in PRESTIGE_UPGRADES:
        lv = state.prestige_upgrades.get(p["id"], 0)
        if lv == 0:
            continue
        if p["effect"]["type"] == "startingFlux":
            starting_flux += p["effect"]["value"] * lv
    # Void shard starting flux
    for vs in VOID_SHARD_UPGRADES:
        lv = state.void_shard_upgrades.get(vs["id"], 0)
        if lv == 0:
            continue
        if vs["effect"]["type"] == "startingFlux":
            starting_flux += vs["effect"]["value"] * lv
    state.flux = starting_flux
    state.total_flux_earned = 0
    state.data = 0
    state.total_data_earned = 0
    state.generators = {}
    state.upgrades = {}
    state.research = {}
    state.active_research_id = None
    state.research_progress = 0
    state.echoes += gain
    state.total_echoes += gain
    state.prestige_count += 1
    state.total_clicks = 0
    return gain


def do_void_collapse(state: SimState) -> int:
    """Perform a void collapse. Returns shards gained."""
    gain = get_void_shard_gain(state)
    if gain <= 0:
        return 0
    # Track path mastery
    if state.ascendancy_path:
        state.path_mastery[state.ascendancy_path] = state.path_mastery.get(state.ascendancy_path, 0) + 1
    state.flux = 0
    state.total_flux_earned = 0
    state.data = 0
    state.total_data_earned = 0
    state.generators = {}
    state.upgrades = {}
    state.research = {}
    state.active_research_id = None
    state.research_progress = 0
    state.echoes = 0
    state.total_echoes = 0
    state.prestige_count = 0
    state.prestige_upgrades = {}
    state.void_shards += gain
    state.total_void_shards += gain
    state.void_collapse_count += 1
    state.ascendancy_path = None
    state.total_clicks = 0
    return gain


def do_singularity(state: SimState) -> int:
    """Perform a singularity. Returns fragments gained."""
    gain = get_reality_fragment_gain(state)
    if gain <= 0:
        return 0
    state.flux = 0
    state.total_flux_earned = 0
    state.data = 0
    state.total_data_earned = 0
    state.generators = {}
    state.upgrades = {}
    state.research = {}
    state.active_research_id = None
    state.research_progress = 0
    state.echoes = 0
    state.total_echoes = 0
    state.prestige_count = 0
    state.prestige_upgrades = {}
    state.void_shards = 0
    state.total_void_shards = 0
    state.void_collapse_count = 0
    state.void_shard_upgrades = {}
    state.reality_fragments += gain
    state.total_reality_fragments += gain
    state.singularity_count += 1
    state.ascendancy_path = None
    state.path_mastery = {}
    state.total_clicks = 0
    return gain


# ─── Milestone Tracker ────────────────────────────────────────────────────────


@dataclass
class MilestoneEvent:
    name: str
    time_seconds: float
    details: str = ""


class MilestoneTracker:
    def __init__(self):
        self.events: list[MilestoneEvent] = []
        self._flux_marks = [
            1e2, 1e3, 1e4, 1e5, 5e5, 1e6, 5e6, 1e7, 5e7, 1e8,
            5e8, 1e9, 5e9, 1e10, 5e10, 1e11, 1e12,
        ]
        self._gen_unlocks: set[str] = set()
        self._prestige_marks = [1, 2, 5, 10, 25, 50, 100]
        self._collapse_marks = [1, 2, 5, 10, 25]
        self._singularity_marks = [1, 2, 5]
        self._echo_marks = [1, 10, 50, 100, 500, 1000, 5000, 10000]
        self._shard_marks = [1, 5, 10, 50, 100]
        self._fragment_marks = [1, 5, 10]
        self._last_prestige = 0
        self._last_collapse = 0
        self._last_singularity = 0

    def check(self, state: SimState, verbose: bool = False):
        t = state.total_time
        # Flux milestones
        while self._flux_marks and state.total_flux_earned >= self._flux_marks[0]:
            mark = self._flux_marks.pop(0)
            fps = get_flux_per_second(state)
            evt = MilestoneEvent(f"Total flux ≥ {_fmt(mark)}", t,
                                 f"flux/s={_fmt(fps)}")
            self.events.append(evt)
            if verbose:
                _print_milestone(evt)
        # Generator unlocks
        for gen in GENERATORS:
            if gen["id"] not in self._gen_unlocks and state.generators.get(gen["id"], 0) > 0:
                self._gen_unlocks.add(gen["id"])
                evt = MilestoneEvent(f"First {gen['name']}", t)
                self.events.append(evt)
                if verbose:
                    _print_milestone(evt)
        # Prestige count
        while self._prestige_marks and state.prestige_count >= self._prestige_marks[0]:
            mark = self._prestige_marks.pop(0)
            evt = MilestoneEvent(f"Prestige #{mark}", t,
                                 f"echoes={_fmt(state.total_echoes)}")
            self.events.append(evt)
            if verbose:
                _print_milestone(evt)
        # Echo milestones
        while self._echo_marks and state.total_echoes >= self._echo_marks[0]:
            mark = self._echo_marks.pop(0)
            evt = MilestoneEvent(f"Total echoes ≥ {_fmt(mark)}", t)
            self.events.append(evt)
            if verbose:
                _print_milestone(evt)
        # Collapse count
        while self._collapse_marks and state.void_collapse_count >= self._collapse_marks[0]:
            mark = self._collapse_marks.pop(0)
            evt = MilestoneEvent(f"Void collapse #{mark}", t,
                                 f"shards={_fmt(state.total_void_shards)}")
            self.events.append(evt)
            if verbose:
                _print_milestone(evt)
        # Shard milestones
        while self._shard_marks and state.total_void_shards >= self._shard_marks[0]:
            mark = self._shard_marks.pop(0)
            evt = MilestoneEvent(f"Total shards ≥ {_fmt(mark)}", t)
            self.events.append(evt)
            if verbose:
                _print_milestone(evt)
        # Singularity count
        while self._singularity_marks and state.singularity_count >= self._singularity_marks[0]:
            mark = self._singularity_marks.pop(0)
            evt = MilestoneEvent(f"Singularity #{mark}", t,
                                 f"fragments={_fmt(state.total_reality_fragments)}")
            self.events.append(evt)
            if verbose:
                _print_milestone(evt)
        # Fragment milestones
        while self._fragment_marks and state.total_reality_fragments >= self._fragment_marks[0]:
            mark = self._fragment_marks.pop(0)
            evt = MilestoneEvent(f"Total fragments ≥ {_fmt(mark)}", t)
            self.events.append(evt)
            if verbose:
                _print_milestone(evt)


# ─── Formatting Helpers ───────────────────────────────────────────────────────

_SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc"]


def _fmt(n: float) -> str:
    if n < 1000:
        return f"{n:.1f}" if n != int(n) else str(int(n))
    idx = 0
    while n >= 1000 and idx < len(_SUFFIXES) - 1:
        n /= 1000
        idx += 1
    return f"{n:.2f}{_SUFFIXES[idx]}"


def _fmt_time(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.0f}s"
    if seconds < 3600:
        return f"{seconds / 60:.1f}m"
    if seconds < 86400:
        return f"{seconds / 3600:.1f}h"
    return f"{seconds / 86400:.1f}d"


def _print_milestone(evt: MilestoneEvent):
    detail = f"  ({evt.details})" if evt.details else ""
    print(f"  ⏱  {_fmt_time(evt.time_seconds):>8s}  │  {evt.name}{detail}")


# ─── Main Simulation Loop ────────────────────────────────────────────────────


def simulate(
    max_hours: float = 168,          # 1 week default
    clicks_per_sec: float = 0,       # 0 = pure idle
    forced_ascendancy: str | None = None,
    verbose: bool = False,
    dt: float = 1.0,                 # seconds per tick
    adaptive_dt: bool = True,        # speed up when nothing is happening
) -> tuple[SimState, MilestoneTracker]:
    """Run the progression simulation and return (final_state, milestones)."""

    state = SimState()
    tracker = MilestoneTracker()
    max_seconds = max_hours * 3600

    # Bootstrap: in the real game, players click the reactor core to earn
    # initial flux.  Even in "pure idle" mode we simulate a modest click rate
    # during the bootstrap phase (until the first generator is producing) so
    # the simulation doesn't stall at zero forever.
    BOOTSTRAP_CPS = 2.0  # simulated clicks/sec during bootstrap

    # Tick counters for throttled operations
    buy_timer = 0.0
    upgrade_timer = 0.0
    prestige_check_timer = 0.0
    research_timer = 0.0

    prev_fps = 0.0
    stall_time = 0.0

    while state.total_time < max_seconds:
        tick_mult = get_tick_speed_mult(state)
        effective_dt = dt * tick_mult

        # ── Production ──
        fps = get_flux_per_second(state)
        dps = get_data_per_second(state)
        flux_gain = fps * effective_dt
        data_gain = dps * effective_dt

        # ── Clicking ──
        # During the bootstrap phase (no generators producing), simulate
        # baseline clicking even in idle mode so the game can get started.
        effective_cps = clicks_per_sec
        if fps <= 0:
            effective_cps = max(effective_cps, BOOTSTRAP_CPS)
        if effective_cps > 0:
            click_val = get_click_value(state)
            click_gain = click_val * effective_cps * dt
            flux_gain += click_gain
            state.total_clicks += int(effective_cps * dt)

        state.flux += flux_gain
        state.total_flux_earned += flux_gain
        state.data += data_gain
        state.total_data_earned += data_gain

        # ── Research progress ──
        if state.active_research_id:
            rdef = _RESEARCH_MAP.get(state.active_research_id)
            if rdef:
                speed = get_research_speed(state)
                state.research_progress += effective_dt * speed
                if state.research_progress >= rdef["duration"]:
                    state.research[state.active_research_id] = True
                    state.active_research_id = None
                    state.research_progress = 0

        # ── Throttled decisions (every few seconds) ──
        buy_timer += dt
        if buy_timer >= 0.5:
            buy_timer = 0
            # Buy generators (buy several per cycle)
            for _ in range(20):
                if not try_buy_best_generator(state):
                    break

        upgrade_timer += dt
        if upgrade_timer >= 2.0:
            upgrade_timer = 0
            try_buy_upgrades(state)

        research_timer += dt
        if research_timer >= 5.0:
            research_timer = 0
            try_start_research(state)

        prestige_check_timer += dt
        if prestige_check_timer >= 10.0:
            prestige_check_timer = 0

            # ── Ascendancy path selection ──
            if state.void_collapse_count >= 1 and state.ascendancy_path is None:
                if forced_ascendancy:
                    state.ascendancy_path = forced_ascendancy
                else:
                    # Default: pick architect for idle sim
                    state.ascendancy_path = "architect"

            # ── Singularity check ──
            if state.singularity_count > 0 or (
                state.void_collapse_count >= SINGULARITY_CFG["collapseThreshold"]
                and any(v >= SINGULARITY_CFG["masteryThreshold"] for v in state.path_mastery.values())
            ):
                frag_gain = get_reality_fragment_gain(state)
                if frag_gain > 0:
                    do_singularity(state)
                    try_buy_singularity_upgrades(state)
                    if verbose:
                        print(f"  ★  {_fmt_time(state.total_time):>8s}  │  SINGULARITY! +{frag_gain} fragments")
                    continue

            # ── Void collapse check ──
            if state.void_collapse_count > 0 or (
                state.total_echoes >= VOID_SHARD_CFG["collapseEchoThreshold"]
                and any(state.research.get(r["id"]) for r in RESEARCH_NODES
                        if r["effect"]["type"] == "unlockSystem" and r["effect"]["value"] == 2)
            ):
                shard_gain = get_void_shard_gain(state)
                if shard_gain > 0 and state.total_echoes >= 100:
                    # Only collapse if we'd gain meaningful shards
                    do_void_collapse(state)
                    try_buy_void_shard_upgrades(state)
                    if verbose:
                        print(f"  ◈  {_fmt_time(state.total_time):>8s}  │  VOID COLLAPSE! +{shard_gain} shards")
                    continue

            # ── Prestige check ──
            echo_gain = get_echo_gain(state)
            # Smart prestige: first prestige ASAP, then wait for meaningful gains
            if state.prestige_count == 0:
                min_gain = 1  # First prestige as soon as we can
            else:
                min_gain = max(1, state.total_echoes * 0.05)  # At least 5% of current total

            # Don't prestige if we have active research or important
            # system-unlocking research remaining (would lose progress)
            has_active_research = state.active_research_id is not None
            has_critical_pending = False
            if not has_active_research:
                for r in RESEARCH_NODES:
                    if state.research.get(r["id"]):
                        continue
                    # Only block prestige for system-unlock research
                    # (prestige theory, void collapse theory) and their prereqs
                    if r["effect"]["type"] not in ("unlockSystem", "prestigeBonus"):
                        continue
                    if state.total_flux_earned < r.get("unlockAt", 0):
                        continue
                    reqs = r.get("requires", [])
                    if any(not state.research.get(rid) for rid in reqs):
                        continue
                    # There's a critical research we could start
                    has_critical_pending = True
                    break

            # Also block prestige if actively researching an unlock-system node
            if has_active_research and state.active_research_id:
                active_r = _RESEARCH_MAP.get(state.active_research_id)
                if active_r and active_r["effect"]["type"] in ("unlockSystem", "prestigeBonus"):
                    has_critical_pending = True

            should_prestige = (
                echo_gain >= min_gain
                and state.total_flux_earned >= PRESTIGE_CFG["echoThreshold"]
                and not has_critical_pending
            )
            if should_prestige:
                do_prestige(state)
                try_buy_prestige_upgrades(state)
                if verbose:
                    print(f"  ∞  {_fmt_time(state.total_time):>8s}  │  PRESTIGE! +{echo_gain} echoes (total: {_fmt(state.total_echoes)})")

        # ── Track milestones ──
        tracker.check(state, verbose)

        # ── Advance time ──
        state.total_time += dt

        # ── Adaptive dt: speed up during idle phases ──
        if adaptive_dt:
            if fps > 0 and abs(fps - prev_fps) / max(1, fps) < 0.001:
                stall_time += dt
                if stall_time > 30:
                    dt = min(dt * 1.5, 60.0)  # Speed up, cap at 60s per tick
            else:
                stall_time = 0
                dt = max(1.0, dt * 0.8)  # Slow down when things change
            prev_fps = fps

    # Final milestone check
    tracker.check(state, verbose)
    return state, tracker


# ─── Report Generation ────────────────────────────────────────────────────────


def print_report(state: SimState, tracker: MilestoneTracker):
    print()
    print("=" * 72)
    print("  CLICKERSPACE PROGRESSION SIMULATION REPORT")
    print("=" * 72)

    print()
    print("─── Final State ───")
    print(f"  Total time simulated : {_fmt_time(state.total_time)}")
    print(f"  Flux                 : {_fmt(state.flux)}")
    print(f"  Total flux earned    : {_fmt(state.total_flux_earned)}")
    print(f"  Flux/sec             : {_fmt(get_flux_per_second(state))}")
    print(f"  Data                 : {_fmt(state.data)}")
    print(f"  Data/sec             : {_fmt(get_data_per_second(state))}")
    print(f"  Echoes               : {_fmt(state.echoes)} (total: {_fmt(state.total_echoes)})")
    print(f"  Prestige count       : {state.prestige_count}")
    print(f"  Void shards          : {_fmt(state.void_shards)} (total: {_fmt(state.total_void_shards)})")
    print(f"  Void collapse count  : {state.void_collapse_count}")
    print(f"  Reality fragments    : {_fmt(state.reality_fragments)} (total: {_fmt(state.total_reality_fragments)})")
    print(f"  Singularity count    : {state.singularity_count}")

    # Generators
    print()
    print("─── Generators Owned ───")
    for gen in GENERATORS:
        owned = state.generators.get(gen["id"], 0)
        if owned > 0:
            print(f"  {gen['name']:25s}: {owned}")

    # Upgrades
    active_upgrades = [(u, state.upgrades.get(u["id"], 0)) for u in UPGRADES if state.upgrades.get(u["id"], 0) > 0]
    if active_upgrades:
        print()
        print("─── Upgrades Purchased ───")
        for u, lv in active_upgrades:
            print(f"  {u['id']:25s}: level {lv}/{u['maxLevel']}")

    # Prestige upgrades
    active_p = [(p, state.prestige_upgrades.get(p["id"], 0)) for p in PRESTIGE_UPGRADES if state.prestige_upgrades.get(p["id"], 0) > 0]
    if active_p:
        print()
        print("─── Prestige Upgrades ───")
        for p, lv in active_p:
            print(f"  {p['name']:25s}: level {lv}/{p['maxLevel']}")

    # Void shard upgrades
    active_vs = [(v, state.void_shard_upgrades.get(v["id"], 0)) for v in VOID_SHARD_UPGRADES if state.void_shard_upgrades.get(v["id"], 0) > 0]
    if active_vs:
        print()
        print("─── Void Shard Upgrades ───")
        for v, lv in active_vs:
            print(f"  {v['name']:25s}: level {lv}/{v['maxLevel']}")

    # Singularity upgrades
    active_sg = [(s, state.singularity_upgrades.get(s["id"], 0)) for s in SINGULARITY_UPGRADES if state.singularity_upgrades.get(s["id"], 0) > 0]
    if active_sg:
        print()
        print("─── Singularity Upgrades ───")
        for s, lv in active_sg:
            print(f"  {s['name']:25s}: level {lv}/{s['maxLevel']}")

    # Milestones timeline
    print()
    print("─── Milestone Timeline ───")
    print(f"  {'Time':>8s}  │  Event")
    print(f"  {'────':>8s}──┼──{'─' * 50}")
    for evt in tracker.events:
        _print_milestone(evt)

    if not tracker.events:
        print("  (no milestones reached)")

    # Phase timing summary
    print()
    print("─── Phase Timing Summary ───")
    phase_events = {
        "First Void Antenna": None,
        "Total flux ≥ 1.00K": None,
        "Total flux ≥ 10.00K": None,
        "Total flux ≥ 100.00K": None,
        "Total flux ≥ 1.00M": None,
        "Prestige #1": None,
        "Prestige #5": None,
        "Prestige #10": None,
        "Total echoes ≥ 100": None,
        "Total echoes ≥ 1.00K": None,
        "Void collapse #1": None,
        "Void collapse #5": None,
        "Total shards ≥ 10": None,
        "Singularity #1": None,
    }
    for evt in tracker.events:
        if evt.name in phase_events:
            phase_events[evt.name] = evt.time_seconds

    for name, t in phase_events.items():
        if t is not None:
            print(f"  {name:30s}: {_fmt_time(t)}")
        else:
            print(f"  {name:30s}: not reached")

    print()
    print("=" * 72)


# ─── CLI ──────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="ClickerSpace Progression Simulator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--max-hours", type=float, default=168,
                        help="Maximum simulation hours (default: 168 = 1 week)")
    parser.add_argument("--clicks-per-sec", type=float, default=0,
                        help="Simulated clicks per second (0 = pure idle)")
    parser.add_argument("--ascendancy", type=str, default=None,
                        choices=["architect", "channeler", "observer"],
                        help="Force a specific ascendancy path")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Print milestones as they occur")
    parser.add_argument("--dt", type=float, default=1.0,
                        help="Base simulation tick in seconds (default: 1.0)")
    parser.add_argument("--no-adaptive", action="store_true",
                        help="Disable adaptive time stepping")
    args = parser.parse_args()

    print(f"Simulating up to {args.max_hours}h of gameplay...")
    if args.clicks_per_sec > 0:
        print(f"  Active clicking: {args.clicks_per_sec} clicks/sec")
    else:
        print("  Pure idle (no clicking)")
    if args.ascendancy:
        print(f"  Forced ascendancy: {args.ascendancy}")
    print()

    state, tracker = simulate(
        max_hours=args.max_hours,
        clicks_per_sec=args.clicks_per_sec,
        forced_ascendancy=args.ascendancy,
        verbose=args.verbose,
        dt=args.dt,
        adaptive_dt=not args.no_adaptive,
    )

    print_report(state, tracker)


if __name__ == "__main__":
    main()
