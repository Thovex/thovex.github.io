// ─────────────────────────────────────────────────────────────
//  Statistics Module — GA4 Analytics + Display
// ─────────────────────────────────────────────────────────────

import { initGlobe } from './globe.js';

const CACHE_KEY = 'cms_analytics_cache';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

let globeInstance = null;

// ─── Initialization ───
export function initStatistics() {
    // Delay to ensure the tab content is visible and has layout dimensions
    requestAnimationFrame(() => {
        const canvas = document.getElementById('globeCanvas');
        if (canvas && !globeInstance) {
            globeInstance = initGlobe(canvas);
        }

        const propertyId = localStorage.getItem('cms_ga4_property') || '';
        if (propertyId) {
            const input = document.getElementById('ga4PropertyInput');
            if (input) input.value = propertyId;
            fetchAnalytics(propertyId);
        } else {
            // Try auto-detect first
            autoDetectProperty();
        }
    });
}

// ─── Auto-detect GA4 Property ───
async function autoDetectProperty() {
    const accessToken = localStorage.getItem('cms_google_access_token');
    if (!accessToken) {
        showSetupState('Sign out and back in to grant analytics access, then auto-detection will work.');
        return;
    }

    const container = document.getElementById('statsContent');
    if (container) {
        container.innerHTML = `
            <div class="stats-loading">
                <div class="stats-loading-spinner"></div>
                <p>Searching for your GA4 properties...</p>
            </div>
        `;
    }

    try {
        const res = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!res.ok) {
            if (res.status === 403) {
                showSetupState('Analytics access not granted. Sign out and back in — approve the analytics permission when prompted.');
            } else {
                showSetupState();
            }
            return;
        }

        const data = await res.json();
        const summaries = data.accountSummaries || [];

        if (summaries.length === 0) {
            showSetupState('No GA4 accounts found on your Google account. Create one at <a href="https://analytics.google.com" target="_blank" style="color:var(--color-cyan)">analytics.google.com</a> first.');
            return;
        }

        // Collect all properties across all accounts
        const allProperties = [];
        for (const account of summaries) {
            for (const prop of (account.propertySummaries || [])) {
                allProperties.push({
                    id: prop.property,          // e.g. "properties/123456789"
                    name: prop.displayName,
                    account: account.displayName
                });
            }
        }

        if (allProperties.length === 0) {
            showSetupState('Found GA4 account(s) but no properties. Create a property at <a href="https://analytics.google.com" target="_blank" style="color:var(--color-cyan)">analytics.google.com</a>.');
            return;
        }

        if (allProperties.length === 1) {
            // Auto-select the only one
            const prop = allProperties[0];
            const numericId = prop.id.replace('properties/', '');
            localStorage.setItem('cms_ga4_property', numericId);
            const input = document.getElementById('ga4PropertyInput');
            if (input) input.value = numericId;
            showToast(`Auto-detected GA4 property: ${prop.name}`, 'success');
            fetchAnalytics(numericId);
        } else {
            // Multiple properties — let user pick
            showPropertyPicker(allProperties);
        }
    } catch (err) {
        console.error('Auto-detect error:', err);
        showSetupState();
    }
}

function showPropertyPicker(properties) {
    const container = document.getElementById('statsContent');
    if (!container) return;

    const cards = properties.map(p => {
        const numericId = p.id.replace('properties/', '');
        return `
            <button class="stat-card property-pick-card" onclick="window.cmsPickProperty('${numericId}', '${escapeHtml(p.name)}')">
                <div class="stat-label">${escapeHtml(p.account)}</div>
                <div class="stat-value" style="font-size:1.1rem;">${escapeHtml(p.name)}</div>
                <div class="stat-sub">${p.id}</div>
            </button>
        `;
    }).join('');

    container.innerHTML = `
        <div class="stats-empty">
            <h3>Multiple Properties Found</h3>
            <p>Select which GA4 property to use:</p>
            <div class="stats-grid" style="max-width:600px;margin:1.5rem auto;">${cards}</div>
        </div>
    `;
}

window.cmsPickProperty = (numericId, name) => {
    localStorage.setItem('cms_ga4_property', numericId);
    const input = document.getElementById('ga4PropertyInput');
    if (input) input.value = numericId;
    showToast(`Selected: ${name}`, 'success');
    fetchAnalytics(numericId);
};

function showToast(message, type) {
    // Reuse the main CMS toast if available
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ─── Setup State ───
function showSetupState(extraMessage) {
    const container = document.getElementById('statsContent');
    if (!container) return;

    container.innerHTML = `
        <div class="stats-empty">
            <div class="stats-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
                    <path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
            </div>
            <h3>Connect Google Analytics</h3>
            <p>${extraMessage || 'Click the button below to auto-detect your GA4 property, or enter the property ID manually in the Settings tab.'}</p>
            <div style="margin-top:1rem;display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
                <button class="btn btn-primary btn-small" onclick="window.cmsAutoDetectGA4()">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Auto-Detect Property
                </button>
            </div>
            <p class="stats-empty-hint" style="margin-top:1rem;">Or enter it manually in Settings: <code>Admin ⚙ → Property Settings → Property ID</code></p>
        </div>
    `;
}

window.cmsAutoDetectGA4 = () => autoDetectProperty();

// ─── Fetch Analytics Data ───
async function fetchAnalytics(propertyId) {
    const container = document.getElementById('statsContent');
    if (!container) return;

    // Normalize property ID
    if (!propertyId.startsWith('properties/')) {
        propertyId = `properties/${propertyId}`;
    }

    // Check cache
    try {
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
        if (cached && cached.propertyId === propertyId && (Date.now() - cached.timestamp) < CACHE_TTL) {
            renderStats(cached.data);
            return;
        }
    } catch {}

    // Show loading
    container.innerHTML = `
        <div class="stats-loading">
            <div class="stats-loading-spinner"></div>
            <p>Fetching analytics data...</p>
        </div>
    `;

    // Get OAuth access token from Firebase user
    const accessToken = localStorage.getItem('cms_google_access_token');
    if (!accessToken) {
        container.innerHTML = `
            <div class="stats-empty">
                <div class="stats-empty-icon" style="color: var(--color-yellow);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </div>
                <h3>Authentication Required</h3>
                <p>Sign in again to grant analytics access. The Google OAuth token is needed to query your GA4 data.</p>
                <p class="stats-empty-hint">Make sure your Google account has access to the GA4 property.</p>
            </div>
        `;
        return;
    }

    try {
        // Fetch realtime + overview metrics in parallel
        const [realtimeRes, overviewRes, pagesRes, referrersRes, countriesRes] = await Promise.all([
            runGARealtimeReport(accessToken, propertyId),
            runGAReport(accessToken, propertyId, {
                dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                metrics: [
                    { name: 'activeUsers' },
                    { name: 'screenPageViews' },
                    { name: 'sessions' },
                    { name: 'averageSessionDuration' },
                    { name: 'bounceRate' }
                ]
            }),
            runGAReport(accessToken, propertyId, {
                dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                dimensions: [{ name: 'pagePath' }],
                metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
                orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
                limit: 10
            }),
            runGAReport(accessToken, propertyId, {
                dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                dimensions: [{ name: 'sessionSource' }],
                metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: 10
            }),
            runGAReport(accessToken, propertyId, {
                dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                dimensions: [{ name: 'country' }],
                metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
                orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
                limit: 10
            })
        ]);

        const data = {
            realtime: parseRealtime(realtimeRes),
            overview: parseOverview(overviewRes),
            pages: parseTable(pagesRes),
            referrers: parseTable(referrersRes),
            countries: parseTable(countriesRes)
        };

        // Cache it
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            propertyId, timestamp: Date.now(), data
        }));

        renderStats(data);

        // Trigger globe pings on data load
        if (globeInstance) globeInstance.burstPings(6);

    } catch (error) {
        console.error('Analytics fetch error:', error);
        container.innerHTML = `
            <div class="stats-empty">
                <div class="stats-empty-icon" style="color: var(--color-red);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                </div>
                <h3>Failed to Load Analytics</h3>
                <p>${escapeHtml(error.message)}</p>
                <p class="stats-empty-hint">Check that your GA4 property ID is correct and your Google account has access.</p>
                <button class="btn btn-small" onclick="document.getElementById('statsContent').innerHTML=''; window.cmsRetryAnalytics();">Retry</button>
            </div>
        `;
    }
}

// ─── GA4 API Call ───
async function runGAReport(accessToken, propertyId, body) {
    const res = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        }
    );

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
            throw new Error('Access denied. Your OAuth token may have expired — sign out and back in. Ensure your Google account has access to this GA4 property.');
        }
        throw new Error(err.error?.message || `GA4 API error (${res.status})`);
    }

    return res.json();
}

// ─── GA4 Realtime API Call ───
async function runGARealtimeReport(accessToken, propertyId) {
    try {
        const res = await fetch(
            `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runRealtimeReport`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    metrics: [{ name: 'activeUsers' }]
                })
            }
        );

        if (!res.ok) return { rows: [] };
        return res.json();
    } catch {
        return { rows: [] };
    }
}

// ─── Parse Responses ───
function parseRealtime(res) {
    if (!res.rows || res.rows.length === 0) return { activeUsers: 0 };
    return { activeUsers: parseInt(res.rows[0].metricValues[0].value) || 0 };
}

function parseOverview(res) {
    if (!res.rows || res.rows.length === 0) {
        return { users: 0, pageviews: 0, sessions: 0, avgDuration: 0, bounceRate: 0 };
    }
    const m = res.rows[0].metricValues;
    return {
        users: parseInt(m[0].value) || 0,
        pageviews: parseInt(m[1].value) || 0,
        sessions: parseInt(m[2].value) || 0,
        avgDuration: parseFloat(m[3].value) || 0,
        bounceRate: parseFloat(m[4].value) || 0
    };
}

function parseTable(res) {
    if (!res.rows) return [];
    return res.rows.map(row => ({
        dimension: row.dimensionValues[0].value,
        metrics: row.metricValues.map(v => v.value)
    }));
}

// ─── Render Stats ───
function renderStats(data) {
    const container = document.getElementById('statsContent');
    if (!container) return;

    const { overview, pages, referrers, countries, realtime } = data;
    const duration = formatDuration(overview.avgDuration);
    const bounce = (overview.bounceRate * 100).toFixed(1);
    const realtimeUsers = realtime?.activeUsers || 0;

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card stat-card-realtime" data-reveal>
                <div class="stat-label"><span class="realtime-dot"></span> Right Now</div>
                <div class="stat-value stat-animate">${realtimeUsers}</div>
                <div class="stat-sub">Active user${realtimeUsers !== 1 ? 's' : ''} on site</div>
            </div>
            <div class="stat-card" data-reveal>
                <div class="stat-label">Visitors</div>
                <div class="stat-value stat-animate">${formatNumber(overview.users)}</div>
                <div class="stat-sub">Last 30 days</div>
            </div>
            <div class="stat-card" data-reveal>
                <div class="stat-label">Page Views</div>
                <div class="stat-value stat-animate">${formatNumber(overview.pageviews)}</div>
                <div class="stat-sub">Last 30 days</div>
            </div>
            <div class="stat-card" data-reveal>
                <div class="stat-label">Sessions</div>
                <div class="stat-value stat-animate">${formatNumber(overview.sessions)}</div>
                <div class="stat-sub">Last 30 days</div>
            </div>
            <div class="stat-card" data-reveal>
                <div class="stat-label">Avg. Duration</div>
                <div class="stat-value stat-animate">${duration}</div>
                <div class="stat-sub">Per session</div>
            </div>
            <div class="stat-card" data-reveal>
                <div class="stat-label">Bounce Rate</div>
                <div class="stat-value stat-animate">${bounce}%</div>
                <div class="stat-sub">Single page visits</div>
            </div>
        </div>

        <div class="stats-tables">
            <div class="stats-table-section" data-reveal>
                <h3>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                    Top Pages
                </h3>
                <table class="stats-table">
                    <thead><tr><th>Page</th><th>Views</th><th>Visitors</th></tr></thead>
                    <tbody>
                        ${pages.length ? pages.map(p => `
                            <tr>
                                <td class="stats-page-path">${escapeHtml(p.dimension)}</td>
                                <td>${formatNumber(parseInt(p.metrics[0]))}</td>
                                <td>${formatNumber(parseInt(p.metrics[1]))}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" style="color:var(--text-muted)">No data</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div class="stats-table-section" data-reveal>
                <h3>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    Top Referrers
                </h3>
                <table class="stats-table">
                    <thead><tr><th>Source</th><th>Sessions</th><th>Visitors</th></tr></thead>
                    <tbody>
                        ${referrers.length ? referrers.map(r => `
                            <tr>
                                <td>${escapeHtml(r.dimension)}</td>
                                <td>${formatNumber(parseInt(r.metrics[0]))}</td>
                                <td>${formatNumber(parseInt(r.metrics[1]))}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" style="color:var(--text-muted)">No data</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div class="stats-table-section" data-reveal>
                <h3>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    Top Countries
                </h3>
                <table class="stats-table">
                    <thead><tr><th>Country</th><th>Visitors</th><th>Sessions</th></tr></thead>
                    <tbody>
                        ${countries.length ? countries.map(c => `
                            <tr>
                                <td>${escapeHtml(c.dimension)}</td>
                                <td>${formatNumber(parseInt(c.metrics[0]))}</td>
                                <td>${formatNumber(parseInt(c.metrics[1]))}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" style="color:var(--text-muted)">No data</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="stats-footer">
            <span>Data from Google Analytics 4 · Realtime updates every 30s · <button class="btn-link" id="btnRefreshStats">Refresh All</button></span>
        </div>
    `;

    // Animate stat values
    requestAnimationFrame(() => {
        container.querySelectorAll('[data-reveal]').forEach((el, i) => {
            setTimeout(() => el.classList.add('revealed'), i * 80);
        });
    });

    // Refresh button
    document.getElementById('btnRefreshStats')?.addEventListener('click', () => {
        sessionStorage.removeItem(CACHE_KEY);
        const propertyId = localStorage.getItem('cms_ga4_property');
        if (propertyId) fetchAnalytics(propertyId);
    });

    // Auto-refresh realtime counter
    startRealtimeRefresh(data);
}

// ─── Realtime Auto-Refresh ───
let realtimeInterval = null;

function startRealtimeRefresh() {
    stopRealtimeRefresh();
    realtimeInterval = setInterval(async () => {
        const propertyId = localStorage.getItem('cms_ga4_property');
        const accessToken = localStorage.getItem('cms_google_access_token');
        if (!propertyId || !accessToken) return;

        const fullId = propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;
        try {
            const res = await runGARealtimeReport(accessToken, fullId);
            const rt = parseRealtime(res);
            const valueEl = document.querySelector('.stat-card-realtime .stat-value');
            const subEl = document.querySelector('.stat-card-realtime .stat-sub');
            if (valueEl) {
                const oldVal = parseInt(valueEl.textContent) || 0;
                if (rt.activeUsers !== oldVal) {
                    valueEl.textContent = rt.activeUsers;
                    valueEl.classList.remove('stat-animate');
                    void valueEl.offsetWidth; // force reflow
                    valueEl.classList.add('stat-animate');
                    if (subEl) subEl.textContent = `Active user${rt.activeUsers !== 1 ? 's' : ''} on site`;
                    // Ping the globe on change
                    if (globeInstance && rt.activeUsers > oldVal) {
                        globeInstance.burstPings(rt.activeUsers - oldVal);
                    }
                }
            }
        } catch {}
    }, 30000); // every 30 seconds
}

function stopRealtimeRefresh() {
    if (realtimeInterval) {
        clearInterval(realtimeInterval);
        realtimeInterval = null;
    }
}

// ─── Retry handler (global) ───
window.cmsRetryAnalytics = () => {
    const propertyId = localStorage.getItem('cms_ga4_property');
    if (propertyId) fetchAnalytics(propertyId);
    else showSetupState();
};

// ─── Save GA4 Property from Settings ───
export function saveGA4Property(propertyId) {
    localStorage.setItem('cms_ga4_property', propertyId.trim());
    sessionStorage.removeItem(CACHE_KEY);
    if (propertyId.trim()) {
        fetchAnalytics(propertyId.trim());
    }
}

// ─── Utility ───
function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString();
}

function formatDuration(seconds) {
    if (seconds < 60) return Math.round(seconds) + 's';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

