// ─────────────────────────────────────────────────────────────
//  Game Stats Module — VoidResonance Session Telemetry Viewer
//  Reads anonymous session data written by the game to Firestore
// ─────────────────────────────────────────────────────────────

import {
    getFirestore,
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    where,
    Timestamp,
} from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js';

let db = null;
let initialized = false;

// ─── Public API ───

export function initGameStats(firebaseApp) {
    if (!firebaseApp) return;
    db = getFirestore(firebaseApp);
}

export async function renderGameStats() {
    const container = document.getElementById('gameStatsContent');
    if (!container || !db) return;

    container.innerHTML = '<div class="stats-loading">Loading game session data…</div>';

    try {
        const sessions = await fetchSessions();
        if (sessions.length === 0) {
            container.innerHTML = `
                <div class="stats-empty">
                    <div class="stats-empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                    </div>
                    <h3>No game sessions yet</h3>
                    <p>Session data will appear here once players visit Void Resonance.</p>
                </div>`;
            return;
        }

        const agg = aggregate(sessions);
        container.innerHTML = buildDashboard(agg, sessions);
        initialized = true;
    } catch (err) {
        console.error('Game stats fetch failed:', err);
        container.innerHTML = `<div class="stats-empty"><h3>Error loading game stats</h3><p>${err.message}</p></div>`;
    }
}

// ─── Data Fetching ───

async function fetchSessions() {
    const ref = collection(db, 'voidresonance_sessions');
    // Grab the most recent 500 sessions (ordered by lastUpdate desc)
    const q = query(ref, orderBy('lastUpdate', 'desc'), limit(500));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
}

// ─── Aggregation ───

function aggregate(sessions) {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const last24h = sessions.filter(s => {
        const t = s.lastUpdate?.toMillis?.() ?? s.lastUpdate?.seconds * 1000 ?? 0;
        return now - t < day;
    });
    const last7d = sessions.filter(s => {
        const t = s.lastUpdate?.toMillis?.() ?? s.lastUpdate?.seconds * 1000 ?? 0;
        return now - t < 7 * day;
    });

    return {
        total: sessions.length,
        last24h: last24h.length,
        last7d: last7d.length,

        totalClicks: sum(sessions, 'totalClicks'),
        totalFlux: sum(sessions, 'totalFluxEarned'),
        totalData: sum(sessions, 'totalDataEarned'),
        totalTimePlayed: sum(sessions, 'totalTimePlayed'),

        avgSessionTime: avg(sessions, 'totalTimePlayed'),
        avgClicks: avg(sessions, 'totalClicks'),

        maxPrestige: max(sessions, 'prestigeCount'),
        maxVoidCollapse: max(sessions, 'voidCollapseCount'),
        maxSingularity: max(sessions, 'singularityCount'),
        maxGenerators: max(sessions, 'generatorsOwned'),
        maxResearch: max(sessions, 'researchCompleted'),
        maxAchievements: max(sessions, 'achievementsUnlocked'),
        maxExpeditions: max(sessions, 'expeditionsCompleted'),

        mobilePercent: sessions.length ? Math.round(sessions.filter(s => s.isMobile).length / sessions.length * 100) : 0,

        ascendancyPaths: countBy(sessions.filter(s => s.ascendancyPath), 'ascendancyPath'),
        versions: countBy(sessions, 'appVersion'),
    };
}

function sum(arr, key) { return arr.reduce((s, o) => s + (o[key] ?? 0), 0); }
function avg(arr, key) { return arr.length ? sum(arr, key) / arr.length : 0; }
function max(arr, key) { return arr.reduce((m, o) => Math.max(m, o[key] ?? 0), 0); }
function countBy(arr, key) {
    const map = {};
    for (const o of arr) {
        const v = o[key] ?? '(unknown)';
        map[v] = (map[v] ?? 0) + 1;
    }
    return map;
}

// ─── Formatting ───

function fmtNum(n) {
    if (n >= 1e15) return (n / 1e15).toFixed(1) + 'Q';
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Math.round(n).toLocaleString();
}

function fmtDuration(seconds) {
    if (seconds < 60) return Math.round(seconds) + 's';
    if (seconds < 3600) return Math.round(seconds / 60) + 'm';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return h + 'h ' + m + 'm';
}

function fmtTimestamp(ts) {
    const ms = ts?.toMillis?.() ?? ts?.seconds * 1000 ?? 0;
    if (!ms) return '—';
    return new Date(ms).toLocaleString();
}

// ─── Dashboard Markup ───

function buildDashboard(agg, sessions) {
    return `
    <div class="game-stats-grid">
        ${statCard('Total Sessions', agg.total, 'sessions')}
        ${statCard('Last 24h', agg.last24h, 'sessions')}
        ${statCard('Last 7d', agg.last7d, 'sessions')}
        ${statCard('Mobile', agg.mobilePercent + '%', '')}
    </div>

    <div class="game-stats-grid">
        ${statCard('Total Clicks', fmtNum(agg.totalClicks), 'across all sessions')}
        ${statCard('Total Flux', fmtNum(agg.totalFlux), 'earned')}
        ${statCard('Total Data', fmtNum(agg.totalData), 'earned')}
        ${statCard('Total Playtime', fmtDuration(agg.totalTimePlayed), 'combined')}
    </div>

    <div class="game-stats-grid">
        ${statCard('Avg Session', fmtDuration(agg.avgSessionTime), 'playtime')}
        ${statCard('Avg Clicks', fmtNum(agg.avgClicks), 'per session')}
        ${statCard('Max Prestige', agg.maxPrestige, 'echoes resets')}
        ${statCard('Max Void Collapse', agg.maxVoidCollapse, 'void resets')}
    </div>

    <div class="game-stats-grid">
        ${statCard('Max Singularity', agg.maxSingularity, 'reality resets')}
        ${statCard('Max Generators', fmtNum(agg.maxGenerators), 'owned')}
        ${statCard('Max Research', agg.maxResearch, 'nodes completed')}
        ${statCard('Max Achievements', agg.maxAchievements, 'unlocked')}
    </div>

    ${buildBreakdownSection('Ascendancy Paths', agg.ascendancyPaths)}
    ${buildBreakdownSection('App Versions', agg.versions)}

    <h4 class="game-stats-heading">Recent Sessions</h4>
    <div class="game-stats-table-wrap">
        <table class="game-stats-table">
            <thead>
                <tr>
                    <th>Last Seen</th>
                    <th>Version</th>
                    <th>Playtime</th>
                    <th>Clicks</th>
                    <th>Flux</th>
                    <th>Prestige</th>
                    <th>Generators</th>
                    <th>Device</th>
                </tr>
            </thead>
            <tbody>
                ${sessions.slice(0, 25).map(s => `
                <tr>
                    <td>${fmtTimestamp(s.lastUpdate)}</td>
                    <td><code>${s.appVersion ?? '?'}</code></td>
                    <td>${fmtDuration(s.totalTimePlayed ?? 0)}</td>
                    <td>${fmtNum(s.totalClicks ?? 0)}</td>
                    <td>${fmtNum(s.totalFluxEarned ?? 0)}</td>
                    <td>${s.prestigeCount ?? 0}</td>
                    <td>${s.generatorsOwned ?? 0} <span class="text-muted">(${s.generatorTypes ?? 0} types)</span></td>
                    <td>${s.isMobile ? '📱' : '🖥️'}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>`;
}

function statCard(label, value, subtitle) {
    return `
    <div class="game-stat-card">
        <div class="game-stat-value">${value}</div>
        <div class="game-stat-label">${label}</div>
        ${subtitle ? `<div class="game-stat-sub">${subtitle}</div>` : ''}
    </div>`;
}

function buildBreakdownSection(title, map) {
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return '';
    const total = entries.reduce((s, [, v]) => s + v, 0);
    return `
    <h4 class="game-stats-heading">${title}</h4>
    <div class="game-stats-breakdown">
        ${entries.map(([label, count]) => {
            const pct = Math.round(count / total * 100);
            return `
            <div class="game-stats-bar-row">
                <span class="game-stats-bar-label">${label}</span>
                <div class="game-stats-bar-track">
                    <div class="game-stats-bar-fill" style="width:${pct}%"></div>
                </div>
                <span class="game-stats-bar-value">${count} (${pct}%)</span>
            </div>`;
        }).join('')}
    </div>`;
}
