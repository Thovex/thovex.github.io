// ─────────────────────────────────────────────────────────────
//  Site Features - Visitor-facing enhancements
//  1. Quick Preview (Space key on hovered/focused card)
//  2. Keyboard Card Navigation (J/K, arrows, Enter)
//  3. Random Project Discovery ("Surprise Me" button)
//  4. Spotlight Search (Ctrl+K / Ctrl+F / /)
//  5. Konami Code Easter Egg
//  6. Hero Constellation Particles (shooting stars, mouse attract, glow)
//  7. Card Tilt & Glow on Hover (3D perspective + radial glow)
//  8. Dynamic Greeting (time-of-day + typewriter)
//  9. Scroll Progress Bar (gradient top bar)
// 10. Hover Ripple Effect (click to produce expanding color ring)
// 11. Section Parallax Depth
// 12. Floating Accent Shapes
// 13. Card Counter Badge
// 14. Smooth Section Fade Transitions
// ─────────────────────────────────────────────────────────────

(function () {
    'use strict';

    let projectsCache = null;

    async function getProjects() {
        if (projectsCache) return projectsCache;
        try {
            const r = await fetch('projects.json');
            projectsCache = await r.json();
        } catch { projectsCache = []; }
        return projectsCache;
    }

    // ═══════════════════════════════════════════════════════════
    //  Feature 1 — Quick Preview (Space to peek)
    // ═══════════════════════════════════════════════════════════

    function initQuickPreview() {
        const style = document.createElement('style');
        style.textContent = `
            .qp-overlay {
                position: fixed; inset: 0; z-index: 90000;
                background: rgba(10,10,20,0.7); backdrop-filter: blur(12px);
                display: flex; align-items: center; justify-content: center;
                opacity: 0; visibility: hidden; transition: opacity 0.25s, visibility 0.25s;
            }
            .qp-overlay.active { opacity: 1; visibility: visible; }
            .qp-card {
                width: min(660px, 92vw); max-height: 85vh; overflow-y: auto;
                background: var(--bg-secondary); border: 1px solid var(--border-subtle);
                border-radius: var(--radius-xl);
                box-shadow: 0 24px 80px rgba(0,0,0,0.5);
                transform: translateY(16px) scale(0.96); transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
            }
            .qp-overlay.active .qp-card { transform: translateY(0) scale(1); }
            .qp-card::-webkit-scrollbar { width: 5px; }
            .qp-card::-webkit-scrollbar-track { background: transparent; }
            .qp-card::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 999px; }
            .qp-banner {
                width: 100%; height: 200px; object-fit: cover;
                border-radius: var(--radius-xl) var(--radius-xl) 0 0;
            }
            .qp-body { padding: 1.4rem 1.6rem; }
            .qp-title {
                font-family: var(--font-body); font-size: 1.25rem; font-weight: 800;
                color: var(--text-primary); margin-bottom: 0.5rem;
            }
            .qp-meta {
                display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem;
            }
            .qp-meta-tag {
                font-family: var(--font-body); font-size: 0.62rem; font-weight: 600;
                padding: 0.2rem 0.55rem; border-radius: 999px; border: 1px solid;
            }
            .qp-meta-tag.engine { color: var(--color-cyan); border-color: rgba(103,212,232,0.2); background: rgba(103,212,232,0.06); }
            .qp-meta-tag.language { color: var(--color-green); border-color: rgba(110,231,183,0.2); background: rgba(110,231,183,0.06); }
            .qp-meta-tag.role { color: var(--color-yellow); border-color: rgba(255,209,102,0.2); background: rgba(255,209,102,0.06); }
            .qp-meta-tag.duration { color: var(--color-pink); border-color: rgba(244,114,182,0.2); background: rgba(244,114,182,0.06); }
            .qp-desc {
                font-family: var(--font-body); font-size: 0.85rem; color: var(--text-secondary);
                line-height: 1.7; margin-bottom: 1.2rem;
            }
            .qp-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 1.2rem; }
            .qp-tag {
                font-family: var(--font-body); font-size: 0.58rem; font-weight: 600;
                padding: 0.15rem 0.45rem; color: var(--text-secondary); border-radius: 999px;
                background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
            }
            .qp-stats {
                display: flex; gap: 1.5rem; padding-top: 1rem;
                border-top: 1px solid var(--border-subtle);
            }
            .qp-stat {
                font-family: var(--font-body); font-size: 0.62rem;
                color: var(--text-muted);
            }
            .qp-stat strong { color: var(--accent); font-size: 0.9rem; margin-right: 0.3rem; }
            .qp-footer {
                display: flex; justify-content: space-between; align-items: center;
                padding: 0.7rem 1.5rem; border-top: 1px solid var(--border-subtle);
                background: rgba(0,0,0,0.15); border-radius: 0 0 var(--radius-xl) var(--radius-xl);
            }
            .qp-hint {
                font-family: var(--font-body); font-size: 0.58rem; color: var(--text-muted);
            }
            .qp-hint kbd {
                background: rgba(126,114,255,0.08); border: 1px solid rgba(126,114,255,0.15);
                padding: 0.05rem 0.35rem; font-family: var(--font-body); border-radius: 4px;
            }
            .qp-open-btn {
                font-family: var(--font-body); font-size: 0.7rem; font-weight: 600;
                color: var(--accent); background: rgba(126,114,255,0.08);
                border: 1px solid rgba(126,114,255,0.2); padding: 0.4rem 1rem;
                border-radius: 999px; cursor: pointer; transition: all 0.2s;
            }
            .qp-open-btn:hover { background: rgba(126,114,255,0.15); border-color: var(--accent); }
        `;
        document.head.appendChild(style);

        let overlay = null;
        let currentProjectId = null;

        function createOverlay() {
            if (overlay) return;
            overlay = document.createElement('div');
            overlay.className = 'qp-overlay';
            overlay.innerHTML = '<div class="qp-card"></div>';
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closePreview(); });
            document.body.appendChild(overlay);
        }

        async function openPreview(projectId) {
            if (!projectId) return;
            createOverlay();
            const projects = await getProjects();
            const p = projects.find(pr => pr.id === projectId);
            if (!p) return;
            currentProjectId = projectId;

            const typeLabels = {
                'BSS': 'Bright Star Studios', 'Zloppy-Games': 'Zloppy Games',
                'BH': 'Baer & Hoggo', 'HKU': 'HKU', 'Hobby': 'Hobby', 'PixelPool': 'PixelPool'
            };

            const workCount = (p.work || []).length;
            const ssCount = (p.screenshots || []).length;
            const vidCount = (p.videos || []).length;
            const tagsHTML = (p.tags || []).map(t => `<span class="qp-tag">${t}</span>`).join('');

            const card = overlay.querySelector('.qp-card');
            card.innerHTML = `
                ${p.banner ? `<img class="qp-banner" src="${p.banner}" alt="${p.title}" onerror="this.style.display='none'">` : ''}
                <div class="qp-body">
                    <div class="qp-title">${p.title}</div>
                    <div class="qp-meta">
                        <span class="qp-meta-tag engine">${p.engine}</span>
                        <span class="qp-meta-tag language">${p.language}</span>
                        <span class="qp-meta-tag role">${p.role}</span>
                        <span class="qp-meta-tag duration">${p.datetime || p.duration}</span>
                    </div>
                    <p class="qp-desc">${p.longdescription || p.description}</p>
                    ${tagsHTML ? `<div class="qp-tags">${tagsHTML}</div>` : ''}
                    <div class="qp-stats">
                        ${workCount > 0 ? `<span class="qp-stat"><strong>${workCount}</strong>contribution${workCount !== 1 ? 's' : ''}</span>` : ''}
                        ${ssCount > 0 ? `<span class="qp-stat"><strong>${ssCount}</strong>screenshot${ssCount !== 1 ? 's' : ''}</span>` : ''}
                        ${vidCount > 0 ? `<span class="qp-stat"><strong>${vidCount}</strong>video${vidCount !== 1 ? 's' : ''}</span>` : ''}
                    </div>
                </div>
                <div class="qp-footer">
                    <span class="qp-hint"><kbd>Esc</kbd> close · <kbd>Enter</kbd> open full page</span>
                    <button class="qp-open-btn">Open Project →</button>
                </div>
            `;
            card.querySelector('.qp-open-btn').addEventListener('click', () => {
                window.location.href = `project.html?id=${projectId}`;
            });
            card.scrollTop = 0;
            overlay.classList.add('active');
        }

        function closePreview() {
            if (overlay) overlay.classList.remove('active');
            currentProjectId = null;
        }

        // Space key on hovered/focused card
        let hoveredCard = null;
        document.addEventListener('mouseover', (e) => {
            const card = e.target.closest('.project-card');
            if (card) hoveredCard = card;
        });
        document.addEventListener('mouseout', (e) => {
            if (e.target.closest('.project-card') === hoveredCard) hoveredCard = null;
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay?.classList.contains('active')) {
                e.preventDefault(); closePreview(); return;
            }
            if (e.key === 'Enter' && overlay?.classList.contains('active') && currentProjectId) {
                e.preventDefault();
                window.location.href = `project.html?id=${currentProjectId}`;
                return;
            }
            if (e.key !== ' ') return;
            const tag = e.target.tagName;
            if (e.target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            // Use focused card or hovered card
            const focusedCard = document.querySelector('.project-card.kb-focused') || hoveredCard;
            if (!focusedCard) return;
            const pid = focusedCard.dataset.projectId;
            if (!pid) return;

            e.preventDefault();
            if (overlay?.classList.contains('active') && currentProjectId === pid) {
                closePreview();
            } else {
                openPreview(pid);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  Feature 2 — Keyboard Card Navigation
    // ═══════════════════════════════════════════════════════════

    function initKeyboardNav() {
        const style = document.createElement('style');
        style.textContent = `
            .project-card.kb-focused {
                outline: 2px solid var(--color-cyan) !important;
                outline-offset: 4px;
                box-shadow: 0 0 20px rgba(0,240,255,0.1);
                z-index: 5;
            }
            .kb-nav-hint {
                position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
                z-index: 1000; padding: 0.5rem 1rem;
                font-family: var(--font-body); font-size: 0.6rem; font-weight: 500;
                color: var(--text-muted); background: rgba(10,12,18,0.95);
                border: 1px solid rgba(0,240,255,0.12); backdrop-filter: blur(12px);
                display: flex; gap: 1rem; opacity: 0; visibility: hidden;
                transition: opacity 0.2s, visibility 0.2s;
            }
            .kb-nav-hint.visible { opacity: 1; visibility: visible; }
            .kb-nav-hint kbd {
                background: rgba(0,240,255,0.06); border: 1px solid rgba(0,240,255,0.15);
                padding: 0.05rem 0.35rem; font-family: var(--font-body); color: var(--color-cyan);
            }
        `;
        document.head.appendChild(style);

        let focusIdx = -1;
        let hint = null;
        let hintTimeout = null;

        function getVisibleCards() {
            return [...document.querySelectorAll('.project-card')].filter(c => c.style.display !== 'none' && c.offsetParent !== null);
        }

        function setFocus(idx) {
            const cards = getVisibleCards();
            if (cards.length === 0) return;

            // Remove old focus
            document.querySelectorAll('.project-card.kb-focused').forEach(c => c.classList.remove('kb-focused'));

            focusIdx = Math.max(0, Math.min(idx, cards.length - 1));
            const card = cards[focusIdx];
            card.classList.add('kb-focused');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            showHint();
        }

        function showHint() {
            if (!hint) {
                hint = document.createElement('div');
                hint.className = 'kb-nav-hint';
                hint.innerHTML = `<span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>Space</kbd> preview</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> unfocus</span>`;
                document.body.appendChild(hint);
            }
            hint.classList.add('visible');
            clearTimeout(hintTimeout);
            hintTimeout = setTimeout(() => hint.classList.remove('visible'), 4000);
        }

        function clearFocus() {
            document.querySelectorAll('.project-card.kb-focused').forEach(c => c.classList.remove('kb-focused'));
            focusIdx = -1;
            if (hint) hint.classList.remove('visible');
        }

        document.addEventListener('keydown', (e) => {
            const tag = e.target.tagName;
            if (e.target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            const grid = document.getElementById('projectsGrid');
            if (!grid || !isInViewport(grid)) return;

            const cards = getVisibleCards();
            if (cards.length === 0) return;

            if (e.key === 'j' || e.key === 'ArrowDown') {
                e.preventDefault();
                setFocus(focusIdx + 1);
            } else if (e.key === 'k' || e.key === 'ArrowUp') {
                e.preventDefault();
                setFocus(focusIdx <= 0 ? 0 : focusIdx - 1);
            } else if (e.key === 'Enter' && focusIdx >= 0) {
                const card = cards[focusIdx];
                if (card) {
                    e.preventDefault();
                    window.location.href = `project.html?id=${card.dataset.projectId}`;
                }
            } else if (e.key === 'Escape') {
                clearFocus();
            }
        });

        // Clear focus when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.project-card')) clearFocus();
        });

        function isInViewport(el) {
            const r = el.getBoundingClientRect();
            return r.bottom > 0 && r.top < window.innerHeight;
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Feature 3 — Random Project Discovery
    // ═══════════════════════════════════════════════════════════

    function initRandomProject() {
        const style = document.createElement('style');
        style.textContent = `
            .surprise-btn {
                display: inline-flex; align-items: center; gap: 0.45rem;
                font-family: var(--font-body); font-size: 0.72rem; font-weight: 600;
                color: var(--color-pink); background: rgba(244,114,182,0.06);
                border: 1px solid rgba(244,114,182,0.2); padding: 0.4rem 0.85rem;
                border-radius: var(--radius-md);
                cursor: pointer; transition: all 0.25s; position: relative; overflow: hidden;
            }
            .surprise-btn:hover {
                background: rgba(244,114,182,0.12); border-color: rgba(244,114,182,0.4);
                color: var(--color-pink); transform: translateY(-1px);
            }
            .surprise-btn:active { transform: scale(0.97); }
            .surprise-btn svg { transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1); }
            .surprise-btn:hover svg { transform: rotate(180deg); }
            .surprise-btn .surprise-flash {
                position: absolute; inset: 0;
                background: linear-gradient(90deg, transparent, rgba(244,114,182,0.12), transparent);
                transform: translateX(-100%);
            }
            .surprise-btn:hover .surprise-flash {
                animation: surprise-sweep 0.6s ease;
            }
            @keyframes surprise-sweep {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        `;
        document.head.appendChild(style);

        // Wait for filter bar to render then insert button
        function tryInsert() {
            const filterBar = document.getElementById('filterBar');
            if (!filterBar || filterBar.querySelector('.surprise-btn')) return;

            const btn = document.createElement('button');
            btn.className = 'surprise-btn';
            btn.title = 'Navigate to a random project';
            btn.innerHTML = `
                <span class="surprise-flash"></span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="1" y="1" width="22" height="22" rx="2"/>
                    <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/>
                    <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none"/>
                    <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none"/>
                    <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none"/>
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                </svg>
                Surprise Me
            `;

            btn.addEventListener('click', async () => {
                const projects = await getProjects();
                const cardProjects = projects.filter(p => p.card);
                if (cardProjects.length === 0) return;
                const pick = cardProjects[Math.floor(Math.random() * cardProjects.length)];

                // Animate the dice spin
                const svg = btn.querySelector('svg');
                svg.style.transform = 'rotate(720deg)';
                setTimeout(() => { svg.style.transform = ''; }, 600);

                // Flash the target card briefly before navigating
                const targetCard = document.querySelector(`.project-card[data-project-id="${pick.id}"]`);
                if (targetCard) {
                    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetCard.style.outline = '2px solid var(--color-pink)';
                    targetCard.style.outlineOffset = '4px';
                    targetCard.style.boxShadow = '0 0 30px rgba(244,114,182,0.2)';
                    setTimeout(() => {
                        window.location.href = `project.html?id=${pick.id}`;
                    }, 500);
                } else {
                    window.location.href = `project.html?id=${pick.id}`;
                }
            });

            filterBar.appendChild(btn);
        }

        // Try immediately and on DOM changes
        tryInsert();
        const grid = document.getElementById('projectsGrid');
        if (grid) {
            const obs = new MutationObserver(() => {
                tryInsert();
                // Disconnect once button is successfully inserted
                if (document.getElementById('filterBar')?.querySelector('.surprise-btn')) obs.disconnect();
            });
            obs.observe(grid.parentElement, { childList: true, subtree: true });
        }
        // Also retry after a delay for dynamic rendering
        setTimeout(tryInsert, 1000);
        setTimeout(tryInsert, 3000);
    }

    // ═══════════════════════════════════════════════════════════
    //  Feature 4 — Spotlight Search (Ctrl+K / Ctrl+F / /)
    //  Available to ALL visitors — searches projects & pages.
    //  CMS overlay can register extra admin actions via
    //  window.__spotlightRegisterActions(actionsFn).
    // ═══════════════════════════════════════════════════════════

    function initSpotlightSearch() {
        const style = document.createElement('style');
        style.textContent = `
            .spotlight-overlay {
                position: fixed; inset: 0; z-index: 99990;
                background: rgba(10,10,20,0.55); backdrop-filter: blur(8px);
                display: flex; align-items: flex-start; justify-content: center;
                padding-top: min(20vh, 160px);
                opacity: 0; visibility: hidden; transition: opacity 0.2s, visibility 0.2s;
            }
            .spotlight-overlay.active { opacity: 1; visibility: visible; }
            .spotlight-box {
                width: min(560px, 92vw); background: var(--bg-secondary);
                border: 1px solid var(--border-subtle);
                border-radius: var(--radius-xl);
                box-shadow: 0 24px 60px rgba(0,0,0,0.5);
                backdrop-filter: blur(20px); overflow: hidden;
                transform: translateY(-10px) scale(0.97); transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
            }
            .spotlight-overlay.active .spotlight-box { transform: translateY(0) scale(1); }
            .spotlight-input-wrap {
                display: flex; align-items: center; gap: 0.6rem;
                padding: 0.9rem 1.1rem; border-bottom: 1px solid var(--border-subtle);
            }
            .spotlight-input-wrap svg { color: var(--accent); flex-shrink: 0; opacity: 0.6; }
            .spotlight-input {
                flex: 1; background: none; border: none; outline: none;
                font-family: var(--font-body); font-size: 0.9rem; color: var(--text-primary);
            }
            .spotlight-input::placeholder { color: var(--text-muted); }
            .spotlight-hint {
                font-family: var(--font-body); font-size: 0.58rem; color: var(--text-muted);
                background: rgba(126,114,255,0.08); border: 1px solid rgba(126,114,255,0.12);
                padding: 0.15rem 0.45rem; border-radius: 4px; white-space: nowrap;
            }
            .spotlight-results {
                max-height: min(50vh, 400px); overflow-y: auto; padding: 0.3rem 0;
            }
            .spotlight-results::-webkit-scrollbar { width: 5px; }
            .spotlight-results::-webkit-scrollbar-track { background: transparent; }
            .spotlight-results::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 999px; }
            .spotlight-result {
                display: flex; align-items: center; gap: 0.75rem;
                padding: 0.55rem 1rem; cursor: pointer; transition: background 0.15s;
                border-radius: var(--radius-sm); margin: 0 0.3rem;
            }
            .spotlight-result:hover, .spotlight-result.active { background: rgba(126,114,255,0.08); }
            .spotlight-result.active { border-left: 2px solid var(--accent); }
            .spotlight-result-icon {
                width: 34px; height: 34px; flex-shrink: 0; overflow: hidden;
                border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);
                display: flex; align-items: center; justify-content: center;
                background: rgba(126,114,255,0.04);
            }
            .spotlight-result-icon img { width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-sm); }
            .spotlight-result-icon svg { color: var(--accent); opacity: 0.5; }
            .spotlight-result-text { flex: 1; min-width: 0; }
            .spotlight-result-title {
                font-family: var(--font-body); font-size: 0.8rem; font-weight: 600;
                color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .spotlight-result-meta {
                font-family: var(--font-body); font-size: 0.6rem; color: var(--text-muted);
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 0.1rem;
            }
            .spotlight-result-badge {
                font-family: var(--font-body); font-size: 0.55rem; font-weight: 600;
                padding: 0.15rem 0.45rem; flex-shrink: 0; border-radius: 999px;
            }
            .spotlight-result-badge.project { color: var(--color-cyan); background: rgba(103,212,232,0.08); border: 1px solid rgba(103,212,232,0.15); }
            .spotlight-result-badge.action { color: var(--color-green); background: rgba(110,231,183,0.08); border: 1px solid rgba(110,231,183,0.15); }
            .spotlight-result-badge.page { color: var(--color-yellow); background: rgba(255,209,102,0.08); border: 1px solid rgba(255,209,102,0.15); }
            .spotlight-empty {
                padding: 2rem 1rem; text-align: center;
                font-family: var(--font-body); font-size: 0.8rem; color: var(--text-muted);
            }
            .spotlight-footer {
                padding: 0.4rem 1rem; border-top: 1px solid var(--border-subtle);
                font-family: var(--font-body); font-size: 0.55rem; color: var(--text-muted);
                display: flex; gap: 1rem;
            }
            .spotlight-footer kbd {
                background: rgba(126,114,255,0.08); border: 1px solid rgba(126,114,255,0.12);
                padding: 0.05rem 0.3rem; font-family: var(--font-body); border-radius: 4px;
            }
        `;
        document.head.appendChild(style);

        let spotlightEl = null;
        let spotlightOpen = false;
        let spotlightIdx = 0;
        let spotlightProjectsCache = null;
        const cmsActionProviders = [];

        const TYPE_LABELS = {
            'BSS': 'Bright Star Studios',
            'Zloppy-Games': 'Zloppy Games',
            'BH': 'Baer & Hoggo',
            'HKU': 'HKU',
            'Hobby': 'Hobby',
            'PixelPool': 'PixelPool'
        };

        async function loadSpotlightProjects() {
            if (spotlightProjectsCache) return spotlightProjectsCache;
            const jsonUrl = window.location.pathname.includes('/cms/') ? '../projects.json' : 'projects.json';
            try {
                const r = await fetch(jsonUrl);
                spotlightProjectsCache = await r.json();
            } catch { spotlightProjectsCache = []; }
            return spotlightProjectsCache;
        }

        function createSpotlight() {
            if (spotlightEl) return;
            const overlay = document.createElement('div');
            overlay.className = 'spotlight-overlay';
            overlay.innerHTML = `
                <div class="spotlight-box">
                    <div class="spotlight-input-wrap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input class="spotlight-input" type="text" placeholder="Search projects, pages..." autocomplete="off" spellcheck="false">
                        <span class="spotlight-hint">esc</span>
                    </div>
                    <div class="spotlight-results"></div>
                    <div class="spotlight-footer">
                        <span><kbd>↑↓</kbd> navigate</span>
                        <span><kbd>↵</kbd> open</span>
                        <span><kbd>esc</kbd> close</span>
                    </div>
                </div>
            `;
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSpotlight(); });
            document.body.appendChild(overlay);
            spotlightEl = overlay;

            const input = overlay.querySelector('.spotlight-input');
            input.addEventListener('input', () => renderSpotlightResults(input.value.trim()));
            input.addEventListener('keydown', handleSpotlightNav);
        }

        function openSpotlight() {
            createSpotlight();
            spotlightOpen = true;
            spotlightEl.classList.add('active');
            const input = spotlightEl.querySelector('.spotlight-input');
            input.value = '';
            spotlightIdx = 0;
            loadSpotlightProjects().then(() => renderSpotlightResults(''));
            requestAnimationFrame(() => input.focus());
        }

        function closeSpotlight() {
            if (!spotlightEl) return;
            spotlightOpen = false;
            spotlightEl.classList.remove('active');
        }

        function getSpotlightItems(query) {
            const items = [];
            const q = query.toLowerCase();
            const isCmsPage = window.location.pathname.includes('/cms/');
            const siteRoot = isCmsPage ? '../' : '';

            // Static pages
            const pages = [
                { title: 'Projects', meta: 'Home page — all projects', url: siteRoot + 'index.html', type: 'page' },
                { title: 'About / CV', meta: 'Curriculum Vitae & download', url: siteRoot + 'about.html', type: 'page' },
                { title: 'Contact', meta: 'Email & LinkedIn', url: siteRoot + 'contact.html', type: 'page' }
            ];
            pages.forEach(p => {
                if (!q || p.title.toLowerCase().includes(q) || p.meta.toLowerCase().includes(q)) items.push(p);
            });

            // CMS admin actions (registered by cms-overlay.js if authed)
            cmsActionProviders.forEach(providerFn => {
                const actions = providerFn(q);
                if (actions) items.push(...actions);
            });

            // Projects
            const projects = spotlightProjectsCache || [];
            projects.forEach(p => {
                const searchable = [p.title, p.description, p.language, p.engine, p.role, TYPE_LABELS[p.type] || p.type, ...(p.tags || [])].join(' ').toLowerCase();
                if (!q || searchable.includes(q)) {
                    const imgSrc = p.minisrc
                        ? (p.minisrc.startsWith('/') || p.minisrc.startsWith('http') ? p.minisrc : siteRoot + p.minisrc)
                        : null;
                    items.push({
                        title: p.title,
                        meta: [p.engine, p.language, p.role].filter(Boolean).join(' · '),
                        url: p.card ? siteRoot + `project.html?id=${p.id}` : null,
                        img: imgSrc,
                        type: 'project'
                    });
                }
            });

            return items;
        }

        const SPOTLIGHT_ICONS = {
            project: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
            action: '<polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>',
            page: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'
        };

        function renderSpotlightResults(query) {
            const results = spotlightEl.querySelector('.spotlight-results');
            const items = getSpotlightItems(query);

            if (items.length === 0) {
                results.innerHTML = `<div class="spotlight-empty">No results for "${query}"</div>`;
                spotlightIdx = 0;
                return;
            }

            spotlightIdx = Math.min(spotlightIdx, items.length - 1);
            results.innerHTML = items.map((item, i) => `
                <div class="spotlight-result${i === spotlightIdx ? ' active' : ''}" data-idx="${i}">
                    <div class="spotlight-result-icon">
                        ${item.img
                            ? `<img src="${item.img}" alt="" onerror="this.style.display='none'">`
                            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${SPOTLIGHT_ICONS[item.type] || SPOTLIGHT_ICONS.page}</svg>`}
                    </div>
                    <div class="spotlight-result-text">
                        <div class="spotlight-result-title">${item.title}</div>
                        <div class="spotlight-result-meta">${item.meta}</div>
                    </div>
                    <span class="spotlight-result-badge ${item.type}">${item.type}</span>
                </div>
            `).join('');

            results.querySelectorAll('.spotlight-result').forEach(el => {
                el.addEventListener('click', () => executeSpotlightItem(items[parseInt(el.dataset.idx)]));
            });
        }

        function handleSpotlightNav(e) {
            if (!spotlightOpen) return;
            const results = spotlightEl.querySelector('.spotlight-results');
            const items = results.querySelectorAll('.spotlight-result');
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSpotlight(); return; }
            if (e.key === 'ArrowDown') {
                e.preventDefault(); e.stopPropagation();
                spotlightIdx = Math.min(spotlightIdx + 1, items.length - 1);
                updateSpotlightActive(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault(); e.stopPropagation();
                spotlightIdx = Math.max(spotlightIdx - 1, 0);
                updateSpotlightActive(items);
            } else if (e.key === 'Enter') {
                e.preventDefault(); e.stopPropagation();
                if (items[spotlightIdx]) items[spotlightIdx].click();
            }
        }

        function updateSpotlightActive(items) {
            items.forEach((el, i) => el.classList.toggle('active', i === spotlightIdx));
            if (items[spotlightIdx]) items[spotlightIdx].scrollIntoView({ block: 'nearest' });
        }

        function executeSpotlightItem(item) {
            closeSpotlight();
            if (item.action) { item.action(); return; }
            if (item.url) window.location.href = item.url;
        }

        // Document-level keyboard handler — catches keys even when
        // focus is not on the spotlight input (e.g. user clicked the
        // results area or the overlay background).
        document.addEventListener('keydown', (e) => {
            // Open / close spotlight: Ctrl/Cmd+K or Ctrl/Cmd+F
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
                e.preventDefault();
                if (spotlightOpen) closeSpotlight(); else openSpotlight();
                return;
            }
            // "/" to open spotlight (only when not typing)
            if (e.key === '/' && !spotlightOpen) {
                const tag = e.target.tagName;
                if (e.target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
                e.preventDefault();
                openSpotlight();
                return;
            }
            // When spotlight is open, handle nav keys at document level
            // so they work even if the input doesn't have focus.
            if (spotlightOpen) {
                handleSpotlightNav(e);
            }
        });

        // Global hook for CMS overlay to register admin actions
        window.__spotlightRegisterActions = function (providerFn) {
            cmsActionProviders.push(providerFn);
        };

        // Expose open/close for external use (e.g. CMS toolbar button)
        window.__spotlightOpen = openSpotlight;
        window.__spotlightClose = closeSpotlight;
    }

    // ═══════════════════════════════════════════════════════════
    //  Feature 5 — Konami Code Easter Egg
    // ═══════════════════════════════════════════════════════════

    function initKonamiCode() {
        const style = document.createElement('style');
        style.textContent = `
            .konami-achievement {
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0);
                z-index: 99999; padding: 2rem 3rem; text-align: center;
                background: var(--bg-secondary); backdrop-filter: blur(20px);
                border: 1px solid rgba(126,114,255,0.2); border-radius: var(--radius-xl);
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                font-family: var(--font-body); pointer-events: none;
                animation: konami-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, konami-fade 0.6s ease 4s forwards;
            }
            .konami-achievement h2 { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; color: var(--accent); margin: 0 0 0.5rem 0; opacity: 0.7; }
            .konami-achievement p { font-size: 1.1rem; font-weight: 800; color: var(--color-green); margin: 0 0 0.3rem 0; }
            .konami-achievement .konami-sub { font-size: 0.65rem; color: var(--text-muted); margin: 0; }
            @keyframes konami-pop { from { transform: translate(-50%,-50%) scale(0); opacity: 0; } to { transform: translate(-50%,-50%) scale(1); opacity: 1; } }
            @keyframes konami-fade { from { opacity: 1; } to { opacity: 0; transform: translate(-50%,-50%) scale(0.9); } }
            .konami-particle { position: fixed; z-index: 99998; pointer-events: none; width: 8px; height: 8px; border-radius: 50%; animation: konami-fall linear forwards; }
            @keyframes konami-fall { 0% { opacity: 1; transform: translateY(0) rotate(0deg); } 100% { opacity: 0; transform: translateY(100vh) rotate(720deg); } }
        `;
        document.head.appendChild(style);

        const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
        let pos = 0;
        document.addEventListener('keydown', (e) => {
            if (e.key === KONAMI[pos]) {
                pos++;
                if (pos === KONAMI.length) {
                    pos = 0;
                    triggerKonami();
                }
            } else {
                pos = e.key === KONAMI[0] ? 1 : 0;
            }
        });

        function triggerKonami() {
            const cs = getComputedStyle(document.documentElement);
            const colors = [
                cs.getPropertyValue('--color-cyan').trim() || '#00f0ff',
                cs.getPropertyValue('--color-green').trim() || '#3aff7f',
                cs.getPropertyValue('--color-yellow').trim() || '#ffe03a',
                cs.getPropertyValue('--color-pink').trim() || '#ff3a6e'
            ];
            for (let i = 0; i < 80; i++) {
                const p = document.createElement('div');
                p.className = 'konami-particle';
                p.style.left = Math.random() * 100 + 'vw';
                p.style.top = -(Math.random() * 20 + 10) + 'px';
                p.style.background = colors[Math.floor(Math.random() * colors.length)];
                p.style.width = (4 + Math.random() * 8) + 'px';
                p.style.height = (4 + Math.random() * 8) + 'px';
                p.style.animationDuration = (2 + Math.random() * 3) + 's';
                p.style.animationDelay = (Math.random() * 1.5) + 's';
                document.body.appendChild(p);
                setTimeout(() => p.remove(), 6000);
            }

            const badge = document.createElement('div');
            badge.className = 'konami-achievement';
            badge.innerHTML = `
                <h2>&#127918; Achievement Unlocked</h2>
                <p>&#8593;&#8593;&#8595;&#8595;&#8592;&#8594;&#8592;&#8594; B A</p>
                <p class="konami-sub">You found the secret code! A true gamer.</p>
            `;
            document.body.appendChild(badge);
            setTimeout(() => badge.remove(), 5000);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Feature 6 - Hero Constellation Particles
    //  Flashy floating particles with colored connecting lines,
    //  mouse attraction, shooting stars, and pulsing glow.
    // ═══════════════════════════════════════════════════════════

    function initHeroConstellation() {
        const hero = document.querySelector('.hero');
        if (!hero) return;

        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:absolute;inset:0;z-index:1;pointer-events:none;';
        hero.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        let w, h, time = 0;
        let mouse = { x: -1000, y: -1000 };
        const PARTICLE_COUNT = 70;
        const CONNECT_DIST = 160;
        const MOUSE_DIST = 250;
        const particles = [];
        const shootingStars = [];

        const colors = [
            { r: 124, g: 106, b: 255 },  // purple
            { r: 94,  g: 196, b: 212 },  // cyan
            { r: 110, g: 231, b: 183 },  // green
            { r: 244, g: 114, b: 182 },  // pink
            { r: 235, g: 193, b: 88  },  // yellow
        ];

        function resize() {
            w = canvas.width = hero.offsetWidth;
            h = canvas.height = hero.offsetHeight;
        }

        function Particle() {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.baseR = Math.random() * 2 + 0.8;
            this.r = this.baseR;
            this.c = colors[Math.floor(Math.random() * colors.length)];
            this.phase = Math.random() * Math.PI * 2;
        }

        function ShootingStar() {
            this.x = Math.random() * w;
            this.y = Math.random() * h * 0.4;
            this.vx = (Math.random() * 3 + 2) * (Math.random() > 0.5 ? 1 : -1);
            this.vy = Math.random() * 1.5 + 0.5;
            this.life = 1;
            this.decay = 0.008 + Math.random() * 0.012;
            this.len = 20 + Math.random() * 30;
            this.c = colors[Math.floor(Math.random() * colors.length)];
        }

        function initParticles() {
            particles.length = 0;
            for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());
        }

        function draw() {
            time += 0.01;
            ctx.clearRect(0, 0, w, h);

            // Spawn shooting stars randomly
            if (Math.random() < 0.008) shootingStars.push(new ShootingStar());

            // Draw & update shooting stars
            for (let i = shootingStars.length - 1; i >= 0; i--) {
                const s = shootingStars[i];
                s.x += s.vx;
                s.y += s.vy;
                s.life -= s.decay;

                const tailX = s.x - s.vx * s.len * 0.3;
                const tailY = s.y - s.vy * s.len * 0.3;
                const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
                grad.addColorStop(0, `rgba(${s.c.r},${s.c.g},${s.c.b},0)`);
                grad.addColorStop(1, `rgba(${s.c.r},${s.c.g},${s.c.b},${s.life * 0.7})`);
                ctx.beginPath();
                ctx.moveTo(tailX, tailY);
                ctx.lineTo(s.x, s.y);
                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Head glow
                ctx.beginPath();
                ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${s.c.r},${s.c.g},${s.c.b},${s.life})`;
                ctx.shadowColor = `rgba(${s.c.r},${s.c.g},${s.c.b},${s.life})`;
                ctx.shadowBlur = 8;
                ctx.fill();
                ctx.shadowBlur = 0;

                if (s.life <= 0) shootingStars.splice(i, 1);
            }

            // Update particles
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h;
                if (p.y > h) p.y = 0;

                // Pulse size
                p.r = p.baseR + Math.sin(time * 2 + p.phase) * 0.5;

                // Mouse attraction
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MOUSE_DIST && dist > 0) {
                    const force = (1 - dist / MOUSE_DIST) * 0.6;
                    p.x += (dx / dist) * force;
                    p.y += (dy / dist) * force;
                }
            }

            // Draw lines with colored gradients
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECT_DIST) {
                        const alpha = (1 - dist / CONNECT_DIST) * 0.25;
                        const ci = particles[i].c;
                        const cj = particles[j].c;
                        const grad = ctx.createLinearGradient(
                            particles[i].x, particles[i].y,
                            particles[j].x, particles[j].y
                        );
                        grad.addColorStop(0, `rgba(${ci.r},${ci.g},${ci.b},${alpha})`);
                        grad.addColorStop(1, `rgba(${cj.r},${cj.g},${cj.b},${alpha})`);
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = grad;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }

            // Mouse connection lines
            if (mouse.x > 0) {
                for (const p of particles) {
                    const dx = p.x - mouse.x;
                    const dy = p.y - mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < MOUSE_DIST) {
                        const alpha = (1 - dist / MOUSE_DIST) * 0.35;
                        ctx.beginPath();
                        ctx.moveTo(mouse.x, mouse.y);
                        ctx.lineTo(p.x, p.y);
                        ctx.strokeStyle = `rgba(${p.c.r},${p.c.g},${p.c.b},${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }
            }

            // Draw particles with glow
            for (const p of particles) {
                // Outer glow
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.c.r},${p.c.g},${p.c.b},0.04)`;
                ctx.fill();

                // Core
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.c.r},${p.c.g},${p.c.b},0.8)`;
                ctx.shadowColor = `rgba(${p.c.r},${p.c.g},${p.c.b},0.5)`;
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            requestAnimationFrame(draw);
        }

        hero.addEventListener('mousemove', (e) => {
            const rect = hero.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        });

        hero.addEventListener('mouseleave', () => {
            mouse.x = -1000;
            mouse.y = -1000;
        });

        window.addEventListener('resize', resize);
        resize();
        initParticles();
        draw();
    }

    // ═══════════════════════════════════════════════════════════
    //  Feature 7 - Card Tilt & Glow on Hover
    //  3D perspective tilt that follows cursor + colored radial
    //  glow under the cursor on project cards.
    // ═══════════════════════════════════════════════════════════

    function initCardTiltGlow() {
        const style = document.createElement('style');
        style.textContent = `
            .project-card { transform-style: preserve-3d; }
            .project-card .card-glow {
                position: absolute; inset: 0; z-index: 0; pointer-events: none;
                border-radius: var(--radius-lg); opacity: 0;
                transition: opacity 0.3s ease;
            }
            .project-card:hover .card-glow { opacity: 1; }
            .project-card-body, .project-card-image { position: relative; z-index: 1; }
        `;
        document.head.appendChild(style);

        function attachTilt(card) {
            // Inject glow overlay
            const glow = document.createElement('div');
            glow.className = 'card-glow';
            card.prepend(glow);

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                const rotateX = ((y - cy) / cy) * -4;
                const rotateY = ((x - cx) / cx) * 4;

                card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
                glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(124,106,255,0.12) 0%, transparent 60%)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
                glow.style.background = '';
            });
        }

        // Attach to existing and future cards
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;

        const obs = new MutationObserver(() => {
            grid.querySelectorAll('.project-card:not([data-tilt])').forEach(card => {
                card.setAttribute('data-tilt', '');
                attachTilt(card);
            });
        });
        obs.observe(grid, { childList: true, subtree: true });
        // Also attach to any already rendered
        grid.querySelectorAll('.project-card:not([data-tilt])').forEach(card => {
            card.setAttribute('data-tilt', '');
            attachTilt(card);
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  Feature 8 - Dynamic Greeting
    //  Changes the hero subtitle based on time of day and adds
    //  a typewriter effect on first visit.
    // ═══════════════════════════════════════════════════════════

    function initDynamicGreeting() {
        const subtitle = document.querySelector('.hero-subtitle');
        if (!subtitle) return;

        const hour = new Date().getHours();
        let greeting;
        if (hour >= 5 && hour < 12) greeting = 'Good morning';
        else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
        else if (hour >= 17 && hour < 21) greeting = 'Good evening';
        else greeting = 'Working late, huh?';

        const base = subtitle.textContent.trim();
        const full = `${greeting}!
         ${base}`;

        // Check if already visited this session
        if (sessionStorage.getItem('greeted')) {
            subtitle.textContent = full;
            return;
        }

        sessionStorage.setItem('greeted', '1');

        // Typewriter effect
        subtitle.textContent = '';
        subtitle.style.borderRight = '2px solid var(--accent)';
        let i = 0;
        function type() {
            if (i < full.length) {
                subtitle.textContent += full[i];
                i++;
                setTimeout(type, 25 + Math.random() * 15);
            } else {
                // Blink cursor then remove
                setTimeout(() => { subtitle.style.borderRight = 'none'; }, 1200);
            }
        }
        // Start after hero animation finishes
        setTimeout(type, 800);
    }

    // ═══════════════════════════════════════════════════════════
    //  Feature 9 - Scroll Progress Bar
    //  Thin accent-colored bar at the top showing page scroll.
    // ═══════════════════════════════════════════════════════════

    function initScrollProgress() {
        const bar = document.createElement('div');
        bar.style.cssText = `
            position: fixed; top: 0; left: 0; height: 3px; z-index: 10001;
            background: linear-gradient(90deg, var(--accent), var(--color-cyan), var(--color-green), var(--color-pink));
            background-size: 300% 100%;
            animation: gradient-slide 4s ease infinite;
            width: 0; transition: width 0.1s linear;
            border-radius: 0 999px 999px 0;
            pointer-events: none;
        `;
        document.body.appendChild(bar);

        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            bar.style.width = pct + '%';
        }, { passive: true });
    }

    // ═══════════════════════════════════════════════════════════
    //  Feature 10 - Hover Ripple Effect
    //  Click anywhere to produce a colorful expanding ring.
    // ═══════════════════════════════════════════════════════════

    function initClickRipple() {
        if (window.matchMedia('(pointer: coarse)').matches) return;

        const style = document.createElement('style');
        style.textContent = `
            .click-ripple {
                position: fixed;
                pointer-events: none;
                z-index: 9998;
                border-radius: 50%;
                border: 2px solid var(--accent);
                transform: translate(-50%, -50%) scale(0);
                animation: click-ripple-expand 0.6s ease-out forwards;
            }
            @keyframes click-ripple-expand {
                0%   { transform: translate(-50%, -50%) scale(0); opacity: 0.6; width: 0; height: 0; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 0; width: 120px; height: 120px; }
            }
        `;
        document.head.appendChild(style);

        const colors = ['#7c6aff', '#5ec4d4', '#6ee7b7', '#f472b6', '#ebc158', '#fb923c'];
        let ci = 0;

        document.addEventListener('click', (e) => {
            const ripple = document.createElement('div');
            ripple.className = 'click-ripple';
            ripple.style.left = e.clientX + 'px';
            ripple.style.top = e.clientY + 'px';
            ripple.style.borderColor = colors[ci++ % colors.length];
            document.body.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  Feature 11 - Section Parallax Depth
    //  Sections shift at different scroll speeds for depth.
    // ═══════════════════════════════════════════════════════════

    function initParallaxSections() {
        const sections = document.querySelectorAll('.section-header, .project-hero-content');
        if (!sections.length) return;

        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            sections.forEach(el => {
                const rect = el.getBoundingClientRect();
                const offset = (rect.top / window.innerHeight) * 15;
                el.style.transform = `translateY(${offset}px)`;
            });
        }, { passive: true });
    }

    // ═══════════════════════════════════════════════════════════
    //  Feature 12 - Floating Accent Shapes
    //  Random soft geometric shapes float behind content.
    // ═══════════════════════════════════════════════════════════

    function initFloatingShapes() {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden;
        `;
        document.body.appendChild(container);

        const colors = [
            'rgba(124,106,255,0.03)', 'rgba(94,196,212,0.025)',
            'rgba(110,231,183,0.02)', 'rgba(244,114,182,0.02)',
        ];

        for (let i = 0; i < 6; i++) {
            const shape = document.createElement('div');
            const size = 200 + Math.random() * 400;
            const isCircle = Math.random() > 0.4;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const dur = 20 + Math.random() * 30;
            const delay = -Math.random() * 20;

            shape.style.cssText = `
                position: absolute;
                width: ${size}px; height: ${size}px;
                left: ${x}%; top: ${y}%;
                background: ${colors[i % colors.length]};
                border-radius: ${isCircle ? '50%' : (20 + Math.random() * 30) + '%'};
                filter: blur(${40 + Math.random() * 40}px);
                animation: float-shape-${i} ${dur}s ease-in-out ${delay}s infinite alternate;
            `;
            container.appendChild(shape);
        }

        const keyframes = document.createElement('style');
        let css = '';
        for (let i = 0; i < 6; i++) {
            const dx = -30 + Math.random() * 60;
            const dy = -30 + Math.random() * 60;
            css += `
                @keyframes float-shape-${i} {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    100% { transform: translate(${dx}px, ${dy}px) rotate(${Math.random() * 60 - 30}deg); }
                }
            `;
        }
        keyframes.textContent = css;
        document.head.appendChild(keyframes);
    }

    // ═══════════════════════════════════════════════════════════
    //  Feature 13 - Card Counter Badge
    //  Shows a live count of visible projects in the filter bar.
    // ═══════════════════════════════════════════════════════════

    function initCardCounter() {
        const filterBar = document.getElementById('filterBar');
        const grid = document.getElementById('projectsGrid');
        if (!filterBar || !grid) return;

        const badge = document.createElement('span');
        badge.className = 'card-counter-badge';
        badge.style.cssText = `
            display: inline-flex; align-items: center; gap: 0.3rem;
            font-family: var(--font-body); font-size: 0.68rem; font-weight: 700;
            color: var(--text-muted); background: rgba(255,255,255,0.03);
            border: 1px solid var(--border-subtle); padding: 0.4rem 0.85rem;
            border-radius: var(--radius-md); transition: all 0.3s;
        `;

        function update() {
            const visible = grid.querySelectorAll('.project-card:not([style*="display: none"])').length;
            const total = grid.querySelectorAll('.project-card').length;
            if (total === 0) return;
            badge.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                ${visible}/${total} projects
            `;

            // Highlight if filtered
            if (visible < total) {
                badge.style.color = 'var(--accent)';
                badge.style.borderColor = 'var(--border-accent)';
                badge.style.background = 'rgba(124,106,255,0.06)';
            } else {
                badge.style.color = 'var(--text-muted)';
                badge.style.borderColor = 'var(--border-subtle)';
                badge.style.background = 'rgba(255,255,255,0.03)';
            }
        }

        function tryInsert() {
            if (filterBar.querySelector('.card-counter-badge')) return;
            if (grid.children.length === 0) return;
            filterBar.appendChild(badge);
            update();

            const obs = new MutationObserver(update);
            obs.observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
        }

        tryInsert();
        const obs = new MutationObserver(tryInsert);
        obs.observe(grid, { childList: true });
        setTimeout(tryInsert, 2000);
    }

    // ═══════════════════════════════════════════════════════════
    //  Feature 14 - Smooth Section Fade Transitions
    //  Sections elegantly stagger-reveal child elements
    //  as they enter the viewport.
    // ═══════════════════════════════════════════════════════════

    function initStaggerReveal() {
        const style = document.createElement('style');
        style.textContent = `
            .stagger-child {
                opacity: 0;
                transform: translateY(18px) scale(0.98);
                transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.22, 0.68, 0, 1.1);
            }
            .stagger-child.visible {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        `;
        document.head.appendChild(style);

        // Tag children of work-grid and media-grid
        function tagChildren() {
            document.querySelectorAll('.work-grid .work-card, .media-grid .media-item').forEach((el, idx) => {
                if (!el.classList.contains('stagger-child')) {
                    el.classList.add('stagger-child');
                    el.style.transitionDelay = (idx % 6) * 0.08 + 's';
                }
            });
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        function observe() {
            tagChildren();
            document.querySelectorAll('.stagger-child:not(.visible)').forEach(el => observer.observe(el));
        }

        // Run after content loads
        setTimeout(observe, 500);
        setTimeout(observe, 2000);

        // Also observe DOM additions
        const body = document.body;
        const domObs = new MutationObserver(() => { setTimeout(observe, 100); });
        domObs.observe(body, { childList: true, subtree: true });
    }

    // ═══════════════════════════════════════════════════════════
    //  Init
    // ═══════════════════════════════════════════════════════════

    function init() {
        // Only init features relevant to the current page
        const isIndexPage = !!document.getElementById('projectsGrid');

        if (isIndexPage) {
            initKeyboardNav();
            initRandomProject();
            initHeroConstellation();
            initCardTiltGlow();
            initDynamicGreeting();
            initCardCounter();
        }

        // Quick preview works on index page
        if (isIndexPage) {
            initQuickPreview();
        }

        // Spotlight search works on ALL pages for ALL visitors
        initSpotlightSearch();

        // Konami code easter egg works on ALL pages
        initKonamiCode();

        // These work on all pages
        initScrollProgress();
        initClickRipple();
        initFloatingShapes();
        initParallaxSections();
        initStaggerReveal();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
