// ─────────────────────────────────────────────────────────────
//  Statistics Module — GA4 Analytics + Live Visitor Feed
// ─────────────────────────────────────────────────────────────

const CACHE_KEY = 'cms_analytics_cache';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const TOKEN_TTL = 55 * 60 * 1000; // Google OAuth tokens expire after ~60min, check at 55min

// Country name → flag emoji
function countryFlag(countryName) {
    if (!countryName || countryName === '(not set)') return '<span class="flag-icon">🌐</span>';
    // Common country name → ISO 3166-1 alpha-2 mapping
    const MAP = {
        'United States': 'US', 'United Kingdom': 'GB', 'Germany': 'DE', 'France': 'FR',
        'Netherlands': 'NL', 'Canada': 'CA', 'Australia': 'AU', 'Japan': 'JP',
        'Brazil': 'BR', 'India': 'IN', 'China': 'CN', 'South Korea': 'KR',
        'Spain': 'ES', 'Italy': 'IT', 'Mexico': 'MX', 'Russia': 'RU',
        'Sweden': 'SE', 'Norway': 'NO', 'Denmark': 'DK', 'Finland': 'FI',
        'Poland': 'PL', 'Belgium': 'BE', 'Switzerland': 'CH', 'Austria': 'AT',
        'Portugal': 'PT', 'Ireland': 'IE', 'New Zealand': 'NZ', 'Singapore': 'SG',
        'Turkey': 'TR', 'Türkiye': 'TR', 'Indonesia': 'ID', 'Thailand': 'TH',
        'Philippines': 'PH', 'Vietnam': 'VN', 'Malaysia': 'MY', 'Argentina': 'AR',
        'Colombia': 'CO', 'Chile': 'CL', 'Peru': 'PE', 'Egypt': 'EG',
        'South Africa': 'ZA', 'Nigeria': 'NG', 'Kenya': 'KE', 'Israel': 'IL',
        'Ukraine': 'UA', 'Romania': 'RO', 'Czech Republic': 'CZ', 'Czechia': 'CZ',
        'Hungary': 'HU', 'Greece': 'GR', 'Croatia': 'HR', 'Slovakia': 'SK',
        'Bulgaria': 'BG', 'Serbia': 'RS', 'Lithuania': 'LT', 'Latvia': 'LV',
        'Estonia': 'EE', 'Slovenia': 'SI', 'Luxembourg': 'LU', 'Iceland': 'IS',
        'Malta': 'MT', 'Cyprus': 'CY', 'Taiwan': 'TW', 'Hong Kong': 'HK',
        'Pakistan': 'PK', 'Bangladesh': 'BD', 'Sri Lanka': 'LK', 'Nepal': 'NP',
        'Saudi Arabia': 'SA', 'United Arab Emirates': 'AE', 'Qatar': 'QA',
        'Kuwait': 'KW', 'Bahrain': 'BH', 'Oman': 'OM', 'Jordan': 'JO',
        'Lebanon': 'LB', 'Iraq': 'IQ', 'Iran': 'IR', 'Morocco': 'MA',
        'Tunisia': 'TN', 'Algeria': 'DZ', 'Ghana': 'GH', 'Ethiopia': 'ET',
        'Tanzania': 'TZ', 'Uganda': 'UG', 'Mozambique': 'MZ',
        'Costa Rica': 'CR', 'Panama': 'PA', 'Uruguay': 'UY', 'Paraguay': 'PY',
        'Bolivia': 'BO', 'Ecuador': 'EC', 'Venezuela': 'VE', 'Cuba': 'CU',
        'Dominican Republic': 'DO', 'Guatemala': 'GT', 'Honduras': 'HN',
        'El Salvador': 'SV', 'Nicaragua': 'NI', 'Jamaica': 'JM',
        'Trinidad and Tobago': 'TT', 'Haiti': 'HT', 'Puerto Rico': 'PR',
        'Myanmar': 'MM', 'Cambodia': 'KH', 'Laos': 'LA',
        'Mongolia': 'MN', 'Uzbekistan': 'UZ', 'Kazakhstan': 'KZ',
        'Georgia': 'GE', 'Armenia': 'AM', 'Azerbaijan': 'AZ',
        'Belarus': 'BY', 'Moldova': 'MD', 'North Macedonia': 'MK',
        'Bosnia and Herzegovina': 'BA', 'Montenegro': 'ME', 'Albania': 'AL',
        'Kosovo': 'XK', 'Senegal': 'SN', 'Cameroon': 'CM',
        'Ivory Coast': 'CI', "Côte d'Ivoire": 'CI', 'Zimbabwe': 'ZW',
        'Zambia': 'ZM', 'Rwanda': 'RW', 'Angola': 'AO',
        'Libya': 'LY', 'Sudan': 'SD', 'Somalia': 'SO',
        'Afghanistan': 'AF', 'Yemen': 'YE', 'Syria': 'SY',
        'Palestine': 'PS', 'Macau': 'MO',
    };
    let code = MAP[countryName];
    // If not in map and name is already a 2-letter code, use it directly
    if (!code && countryName.length === 2 && /^[A-Z]{2}$/.test(countryName)) {
        code = countryName;
    }
    if (!code) return '<span class="flag-icon">🌐</span>';
    
    // Use flagcdn.com for crisp SVG flags that render on all platforms
    return `<img class="flag-icon" src="https://flagcdn.com/w40/${code.toLowerCase()}.png" 
                 srcset="https://flagcdn.com/w80/${code.toLowerCase()}.png 2x" 
                 alt="${countryName}" 
                 width="20" height="15" 
                 loading="lazy"
                 onerror="this.outerHTML='<span class=\\'flag-icon\\'>🌐</span>'">`; 
}

// Generate a deterministic avatar color from a string
function avatarColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 45%)`;
}

// Device category icon
function deviceIcon(category) {
    switch ((category || '').toLowerCase()) {
        case 'mobile': return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`;
        case 'tablet': return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`;
        default: return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;
    }
}

// Check if the stored OAuth token is still likely valid
function isTokenValid() {
    const token = localStorage.getItem('cms_google_access_token');
    if (!token) return false;
    const tokenTime = parseInt(localStorage.getItem('cms_google_token_time') || '0');
    if (tokenTime && (Date.now() - tokenTime) > TOKEN_TTL) return false;
    return true;
}

let statsInitialized = false;

// ─── Initialization ───
export function initStatistics() {
    requestAnimationFrame(() => {
        const propertyId = localStorage.getItem('cms_ga4_property') || '';
        if (propertyId) {
            const input = document.getElementById('ga4PropertyInput');
            if (input) input.value = propertyId;
            if (!statsInitialized) {
                statsInitialized = true;
                fetchAnalytics(propertyId);
            }
        } else {
            autoDetectProperty();
        }
    });
}

// ─── Auto-detect GA4 Property ───
async function autoDetectProperty() {
    const accessToken = localStorage.getItem('cms_google_access_token');
    if (!accessToken || !isTokenValid()) {
        showSetupState(accessToken
            ? 'Your analytics session has expired. Click the button below to refresh access.'
            : 'Grant analytics access to auto-detect your GA4 property.');
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
                showSetupState('Analytics access not granted or has expired. Click the button above to grant access.');
            } else if (res.status === 401) {
                localStorage.removeItem('cms_google_access_token');
                localStorage.removeItem('cms_google_token_time');
                showSetupState('Analytics session expired. Click the button above to refresh access.');
            } else {
                showSetupState();
            }
            return;
        }

        const data = await res.json();
        const summaries = data.accountSummaries || [];

        if (summaries.length === 0) {
            showSetupState('No GA4 accounts found. Create one at <a href="https://analytics.google.com" target="_blank" style="color:var(--color-cyan)">analytics.google.com</a> first.');
            return;
        }

        const allProperties = [];
        for (const account of summaries) {
            for (const prop of (account.propertySummaries || [])) {
                allProperties.push({
                    id: prop.property,
                    name: prop.displayName,
                    account: account.displayName
                });
            }
        }

        if (allProperties.length === 0) {
            showSetupState('Found GA4 account(s) but no properties.');
            return;
        }

        if (allProperties.length === 1) {
            const prop = allProperties[0];
            const numericId = prop.id.replace('properties/', '');
            localStorage.setItem('cms_ga4_property', numericId);
            const input = document.getElementById('ga4PropertyInput');
            if (input) input.value = numericId;
            showToast(`Auto-detected GA4 property: ${prop.name}`, 'success');
            statsInitialized = true;
            fetchAnalytics(numericId);
        } else {
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
    statsInitialized = true;
    fetchAnalytics(numericId);
};

function showToast(message, type) {
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
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
            </div>
            <h3>Connect Google Analytics</h3>
            <p>${extraMessage || 'Click the button below to grant analytics access and auto-detect your GA4 property.'}</p>
            <div style="margin-top:1rem;display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
                <button class="btn btn-primary btn-small" onclick="window.cmsRefreshAnalyticsToken().then(ok => { if (ok) window.cmsAutoDetectGA4(); })">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Grant Access &amp; Auto-Detect
                </button>
            </div>
            <p class="stats-empty-hint" style="margin-top:1rem;">Or enter the property ID manually in Settings: <code>Admin ⚙ → Property Settings → Property ID</code></p>
        </div>
    `;
}

window.cmsAutoDetectGA4 = () => autoDetectProperty();

// ─── Fetch Analytics Data ───
async function fetchAnalytics(propertyId) {
    const container = document.getElementById('statsContent');
    if (!container) return;

    if (!propertyId.startsWith('properties/')) {
        propertyId = `properties/${propertyId}`;
    }

    // Check cache for 30-day data
    let cachedData = null;
    try {
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
        if (cached && cached.propertyId === propertyId && (Date.now() - cached.timestamp) < CACHE_TTL) {
            cachedData = cached.data;
        }
    } catch {}

    if (!cachedData) {
        container.innerHTML = `
            <div class="stats-loading">
                <div class="stats-loading-spinner"></div>
                <p>Fetching analytics data...</p>
            </div>
        `;
    }

    const accessToken = localStorage.getItem('cms_google_access_token');
    if (!accessToken || !isTokenValid()) {
        container.innerHTML = `
            <div class="stats-empty">
                <div class="stats-empty-icon" style="color: var(--color-yellow);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </div>
                <h3>${accessToken ? 'Session Expired' : 'Analytics Access Required'}</h3>
                <p>${accessToken ? 'Your Google Analytics access token has expired.' : 'No analytics access token found.'} Click below to grant access — a Google popup will appear.</p>
                <button class="btn btn-small btn-primary" onclick="window.cmsRefreshAnalyticsToken().then(ok => { if (ok) window.cmsRetryAnalytics(); })">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                    Grant Analytics Access
                </button>
            </div>
        `;
        stopRealtimeRefresh();
        return;
    }

    try {
        // Fetch realtime (with dimensions) + 30-day data in parallel
        const fetches = [
            fetchRealtimeDetailed(accessToken, propertyId),
        ];

        if (!cachedData) {
            fetches.push(
                runGAReport(accessToken, propertyId, {
                    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                    metrics: [
                        { name: 'activeUsers' }, { name: 'screenPageViews' },
                        { name: 'sessions' }, { name: 'averageSessionDuration' },
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
                }),
                // Daily visitors + page views for the trend chart
                runGAReport(accessToken, propertyId, {
                    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                    dimensions: [{ name: 'date' }],
                    metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
                    orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
                    limit: 31
                })
            );
        }

        const results = await Promise.all(fetches);
        const realtimeData = results[0];

        let data;
        if (cachedData) {
            data = { ...cachedData, realtime: realtimeData };
        } else {
            data = {
                realtime: realtimeData,
                overview: parseOverview(results[1]),
                pages: parseTable(results[2]),
                referrers: parseTable(results[3]),
                countries: parseTable(results[4]),
                dailyTrend: parseDailyTrend(results[5])
            };
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                propertyId, timestamp: Date.now(), data
            }));
        }

        updateRealtimePanel(realtimeData);
        renderStats(data);
        startRealtimeRefresh();

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
                <button class="btn btn-small" onclick="window.cmsRetryAnalytics();">Retry</button>
            </div>
        `;
    }
}

// ─── Realtime Detailed Fetch ───
async function fetchRealtimeDetailed(accessToken, propertyId) {
    const [countRes, visitorRes] = await Promise.all([
        runGARealtimeReport(accessToken, propertyId, {
            metrics: [{ name: 'activeUsers' }]
        }),
        runGARealtimeReport(accessToken, propertyId, {
            dimensions: [{ name: 'country' }, { name: 'deviceCategory' }],
            metrics: [{ name: 'activeUsers' }],
            limit: 30
        })
    ]);

    const totalUsers = countRes.rows?.[0]?.metricValues?.[0]?.value || '0';

    const visitors = (visitorRes.rows || []).map(row => ({
        country: row.dimensionValues[0].value,
        device: row.dimensionValues[1].value,
        users: parseInt(row.metricValues[0].value) || 1
    }));

    return { totalUsers: parseInt(totalUsers), visitors };
}

// ─── Update Realtime Panel ───
function updateRealtimePanel(realtimeData) {
    const countEl = document.getElementById('realtimeCount');
    const metaEl = document.getElementById('realtimeMeta');
    const feedEl = document.getElementById('realtimeFeed');
    if (!countEl || !feedEl) return;

    const { totalUsers, visitors } = realtimeData;

    // Use the sum of dimension rows if available — this matches the visible breakdown.
    // Fall back to the dimensionless API total only when no rows exist.
    const rowSum = visitors.reduce((sum, v) => sum + v.users, 0);
    const displayCount = visitors.length > 0 ? Math.max(rowSum, totalUsers) : totalUsers;

    // Update counter with animation
    const oldVal = parseInt(countEl.textContent) || 0;
    if (displayCount !== oldVal) {
        countEl.textContent = displayCount;
        countEl.classList.remove('stat-animate');
        void countEl.offsetWidth;
        countEl.classList.add('stat-animate');
    }

    // Meta info — unique countries count
    const uniqueCountries = [...new Set(visitors.map(v => v.country))];
    if (metaEl) {
        metaEl.innerHTML = uniqueCountries.length > 0
            ? `from <strong>${uniqueCountries.length}</strong> ${uniqueCountries.length === 1 ? 'country' : 'countries'}`
            : '';
    }

    // Build visitor feed — if we have a count but no dimension data, show a generic entry
    let displayVisitors = visitors;
    if (visitors.length === 0 && totalUsers > 0) {
        displayVisitors = [{ country: 'Unknown', device: 'desktop', users: totalUsers }];
    }

    if (displayVisitors.length === 0) {
        feedEl.innerHTML = `<div class="stats-empty-mini">No active visitors right now</div>`;
        return;
    }

    const visitorCards = displayVisitors.map(v => {
        const flag = countryFlag(v.country);
        const color = avatarColor(v.country + v.device);
        const initials = v.country.substring(0, 2).toUpperCase();
        const deviceLabel = (v.device || 'desktop').charAt(0).toUpperCase() + (v.device || 'desktop').slice(1);
        const userLabel = v.users > 1 ? `${v.users} visitors` : '1 visitor';

        return `
            <div class="visitor-card" data-reveal>
                <div class="visitor-avatar" style="background:${color}">${initials}</div>
                <div class="visitor-info">
                    <div class="visitor-country">
                        <span class="visitor-flag">${flag}</span>
                        ${escapeHtml(v.country)}
                        <span class="visitor-users">${userLabel}</span>
                    </div>
                    <div class="visitor-detail">
                        <span class="visitor-device">${deviceIcon(v.device)}</span>
                        <span class="visitor-device-label">${escapeHtml(deviceLabel)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    feedEl.innerHTML = visitorCards;

    // Stagger reveal
    requestAnimationFrame(() => {
        feedEl.querySelectorAll('[data-reveal]').forEach((el, i) => {
            setTimeout(() => el.classList.add('revealed'), i * 60);
        });
    });
}

// ─── GA4 API Calls ───
async function runGAReport(accessToken, propertyId, body) {
    const res = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
        {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
            // Token likely expired — clear it so next refresh shows re-auth prompt
            localStorage.removeItem('cms_google_access_token');
            localStorage.removeItem('cms_google_token_time');
            throw new Error('Access token expired. Sign out and back in to refresh.');
        }
        throw new Error(err.error?.message || `GA4 API error (${res.status})`);
    }
    return res.json();
}

async function runGARealtimeReport(accessToken, propertyId, body) {
    try {
        const res = await fetch(
            `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runRealtimeReport`,
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('cms_google_access_token');
                localStorage.removeItem('cms_google_token_time');
                console.warn('Realtime: access token expired');
            }
            console.warn('Realtime API error:', res.status, err.error?.message || err);
            return { rows: [] };
        }
        return res.json();
    } catch (e) {
        console.warn('Realtime fetch failed:', e);
        return { rows: [] };
    }
}

// ─── Parse Responses ───
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

function parseDailyTrend(res) {
    if (!res || !res.rows) return [];
    return res.rows.map(row => {
        const dateStr = row.dimensionValues[0].value; // YYYYMMDD
        return {
            date: dateStr,
            visitors: parseInt(row.metricValues[0].value) || 0,
            pageviews: parseInt(row.metricValues[1].value) || 0
        };
    }).sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Build Trend Chart SVG ───
function buildTrendChart(dailyTrend) {
    if (!dailyTrend || dailyTrend.length === 0) return '';

    const W = 720, H = 200, PAD_L = 40, PAD_R = 15, PAD_T = 20, PAD_B = 40;
    const chartW = W - PAD_L - PAD_R, chartH = H - PAD_T - PAD_B;

    const maxVisitors = Math.max(...dailyTrend.map(d => d.visitors), 1);
    const maxPV = Math.max(...dailyTrend.map(d => d.pageviews), 1);
    const maxY = Math.max(maxVisitors, maxPV);
    const n = dailyTrend.length;

    function x(i) { return PAD_L + (i / Math.max(n - 1, 1)) * chartW; }
    function y(val) { return PAD_T + chartH - (val / maxY) * chartH; }

    // Build path for visitors
    const vPoints = dailyTrend.map((d, i) => `${x(i).toFixed(1)},${y(d.visitors).toFixed(1)}`);
    const vLine = `M${vPoints.join(' L')}`;
    // Area fill under visitors line
    const vArea = `${vLine} L${x(n - 1).toFixed(1)},${(PAD_T + chartH).toFixed(1)} L${x(0).toFixed(1)},${(PAD_T + chartH).toFixed(1)} Z`;

    // Build path for page views
    const pPoints = dailyTrend.map((d, i) => `${x(i).toFixed(1)},${y(d.pageviews).toFixed(1)}`);
    const pLine = `M${pPoints.join(' L')}`;

    // Y-axis labels
    const ySteps = 4;
    let yLabels = '';
    let yGrid = '';
    for (let i = 0; i <= ySteps; i++) {
        const val = Math.round((maxY / ySteps) * i);
        const yPos = y(val);
        yLabels += `<text x="${PAD_L - 8}" y="${yPos + 3}" text-anchor="end" fill="var(--text-muted)" font-size="9" font-family="var(--font-mono)">${formatNumber(val)}</text>`;
        if (i > 0) yGrid += `<line x1="${PAD_L}" y1="${yPos}" x2="${W - PAD_R}" y2="${yPos}" stroke="var(--border-subtle)" stroke-dasharray="3,3" opacity="0.4"/>`;
    }

    // X-axis labels (every ~5 days)
    let xLabels = '';
    const step = Math.max(1, Math.floor(n / 6));
    for (let i = 0; i < n; i += step) {
        const d = dailyTrend[i].date;
        const label = `${d.substring(4, 6)}/${d.substring(6, 8)}`;
        xLabels += `<text x="${x(i)}" y="${PAD_T + chartH + 20}" text-anchor="middle" fill="var(--text-muted)" font-size="9" font-family="var(--font-mono)">${label}</text>`;
    }
    // Always show last date
    if (n > 1) {
        const d = dailyTrend[n - 1].date;
        const label = `${d.substring(4, 6)}/${d.substring(6, 8)}`;
        xLabels += `<text x="${x(n - 1)}" y="${PAD_T + chartH + 20}" text-anchor="middle" fill="var(--text-muted)" font-size="9" font-family="var(--font-mono)">${label}</text>`;
    }

    // Data point dots for visitors (hover targets)
    let dots = '';
    dailyTrend.forEach((d, i) => {
        const dateStr = `${d.date.substring(4, 6)}/${d.date.substring(6, 8)}`;
        dots += `<circle cx="${x(i).toFixed(1)}" cy="${y(d.visitors).toFixed(1)}" r="3" fill="var(--color-cyan)" opacity="0" class="trend-dot">
            <title>${dateStr}: ${d.visitors} visitors, ${d.pageviews} views</title>
        </circle>`;
    });

    return `
        <div class="stats-table-section trend-chart-section" data-reveal>
            <h3>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Visitor Trend
                <span class="trend-legend">
                    <span class="trend-legend-item"><span class="trend-legend-dot" style="background:var(--color-cyan)"></span>Visitors</span>
                    <span class="trend-legend-item"><span class="trend-legend-dot" style="background:var(--color-green)"></span>Page Views</span>
                </span>
            </h3>
            <div class="trend-chart-wrap">
                <svg viewBox="0 0 ${W} ${H}" class="trend-chart-svg" preserveAspectRatio="xMidYMid meet">
                    ${yGrid}
                    <line x1="${PAD_L}" y1="${PAD_T + chartH}" x2="${W - PAD_R}" y2="${PAD_T + chartH}" stroke="var(--border-subtle)" opacity="0.6"/>
                    <path d="${vArea}" fill="rgba(0,240,255,0.06)"/>
                    <path d="${pLine}" fill="none" stroke="var(--color-green)" stroke-width="1.5" opacity="0.6" stroke-linejoin="round"/>
                    <path d="${vLine}" fill="none" stroke="var(--color-cyan)" stroke-width="2" stroke-linejoin="round"/>
                    ${dots}
                    ${yLabels}
                    ${xLabels}
                </svg>
            </div>
        </div>
    `;
}

// ─── Render Stats ───
function renderStats(data) {
    const container = document.getElementById('statsContent');
    if (!container) return;

    const { overview, pages, referrers, countries, dailyTrend } = data;
    const duration = formatDuration(overview.avgDuration);
    const bounce = (overview.bounceRate * 100).toFixed(1);

    const trendChartHTML = buildTrendChart(dailyTrend);

    container.innerHTML = `
        <div class="stats-grid">
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

        ${trendChartHTML}

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
                                <td><span style="margin-right:0.4rem">${countryFlag(c.dimension)}</span>${escapeHtml(c.dimension)}</td>
                                <td>${formatNumber(parseInt(c.metrics[0]))}</td>
                                <td>${formatNumber(parseInt(c.metrics[1]))}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" style="color:var(--text-muted)">No data</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="stats-footer">
            <span>Data from Google Analytics 4 · Realtime updates every 15s · <button class="btn-link" id="btnRefreshStats">Refresh All</button></span>
        </div>
    `;

    // Animate
    requestAnimationFrame(() => {
        container.querySelectorAll('[data-reveal]').forEach((el, i) => {
            setTimeout(() => el.classList.add('revealed'), i * 80);
        });
    });

    document.getElementById('btnRefreshStats')?.addEventListener('click', () => {
        sessionStorage.removeItem(CACHE_KEY);
        statsInitialized = false;
        const propertyId = localStorage.getItem('cms_ga4_property');
        if (propertyId) {
            statsInitialized = true;
            fetchAnalytics(propertyId);
        }
    });
}

// ─── Realtime Auto-Refresh ───
let realtimeInterval = null;

function startRealtimeRefresh() {
    stopRealtimeRefresh();
    realtimeInterval = setInterval(async () => {
        const propertyId = localStorage.getItem('cms_ga4_property');
        const accessToken = localStorage.getItem('cms_google_access_token');
        if (!propertyId || !accessToken || !isTokenValid()) {
            // Token expired — show expiry state and stop polling
            if (!accessToken || !isTokenValid()) {
                stopRealtimeRefresh();
                const countEl = document.getElementById('realtimeCount');
                const feedEl = document.getElementById('realtimeFeed');
                if (countEl) countEl.textContent = '—';
                if (feedEl) feedEl.innerHTML = `<div class="stats-empty-mini">Session expired — <a href="#" onclick="event.preventDefault(); window.cmsRefreshAnalyticsToken().then(ok => { if (ok) window.cmsRetryAnalytics(); })" style="color:var(--color-cyan);text-decoration:underline;cursor:pointer;">click to refresh</a></div>`;
            }
            return;
        }

        const fullId = propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;
        try {
            const realtimeData = await fetchRealtimeDetailed(accessToken, fullId);
            updateRealtimePanel(realtimeData);
        } catch (e) {
            console.warn('Realtime refresh failed:', e);
        }
    }, 15000);
}

function stopRealtimeRefresh() {
    if (realtimeInterval) {
        clearInterval(realtimeInterval);
        realtimeInterval = null;
    }
}

// ─── Retry handler ───
window.cmsRetryAnalytics = () => {
    statsInitialized = false;
    const propertyId = localStorage.getItem('cms_ga4_property');
    if (propertyId) { statsInitialized = true; fetchAnalytics(propertyId); }
    else showSetupState();
};

// ─── Save GA4 Property from Settings ───
export function saveGA4Property(propertyId) {
    localStorage.setItem('cms_ga4_property', propertyId.trim());
    sessionStorage.removeItem(CACHE_KEY);
    statsInitialized = false;
    if (propertyId.trim()) {
        statsInitialized = true;
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
