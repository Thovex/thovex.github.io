// ─────────────────────────────────────────────────────────────
//  Site Features — Visitor-facing enhancements
//  1. Quick Preview (Space key on hovered/focused card)
//  2. Keyboard Card Navigation (J/K, arrows, Enter)
//  3. Random Project Discovery ("Surprise Me" button)
//  4. Spotlight Search (Ctrl+K / Ctrl+F / /)
//  5. Konami Code Easter Egg
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
                background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
                display: flex; align-items: center; justify-content: center;
                opacity: 0; visibility: hidden; transition: opacity 0.2s, visibility 0.2s;
            }
            .qp-overlay.active { opacity: 1; visibility: visible; }
            .qp-card {
                width: min(700px, 92vw); max-height: 85vh; overflow-y: auto;
                background: rgba(10,12,18,0.98); border: 1px solid rgba(0,240,255,0.2);
                box-shadow: 0 20px 80px rgba(0,0,0,0.6), 0 0 40px rgba(0,240,255,0.04);
                transform: translateY(20px) scale(0.95); transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
            }
            .qp-overlay.active .qp-card { transform: translateY(0) scale(1); }
            .qp-card::-webkit-scrollbar { width: 4px; }
            .qp-card::-webkit-scrollbar-track { background: transparent; }
            .qp-card::-webkit-scrollbar-thumb { background: rgba(0,240,255,0.15); }
            .qp-banner {
                width: 100%; height: 200px; object-fit: cover;
                border-bottom: 1px solid rgba(0,240,255,0.1);
                filter: grayscale(20%) contrast(1.05);
            }
            .qp-body { padding: 1.5rem; }
            .qp-title {
                font-family: var(--font-mono); font-size: 1.3rem; font-weight: 700;
                text-transform: uppercase; color: var(--text-primary); margin-bottom: 0.5rem;
            }
            .qp-meta {
                display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;
            }
            .qp-meta-tag {
                font-family: var(--font-mono); font-size: 0.6rem; font-weight: 600;
                text-transform: uppercase; letter-spacing: 0.06em;
                padding: 0.2rem 0.5rem; border: 1px solid;
            }
            .qp-meta-tag.engine { color: var(--color-cyan); border-color: rgba(0,240,255,0.25); background: rgba(0,240,255,0.05); }
            .qp-meta-tag.language { color: var(--color-green); border-color: rgba(58,255,127,0.25); background: rgba(58,255,127,0.05); }
            .qp-meta-tag.role { color: var(--color-yellow); border-color: rgba(255,224,58,0.25); background: rgba(255,224,58,0.05); }
            .qp-meta-tag.duration { color: var(--color-pink); border-color: rgba(255,58,240,0.25); background: rgba(255,58,240,0.05); }
            .qp-desc {
                font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-secondary);
                line-height: 1.7; margin-bottom: 1.2rem;
            }
            .qp-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 1.2rem; }
            .qp-tag {
                font-family: var(--font-mono); font-size: 0.55rem; font-weight: 700;
                text-transform: uppercase; letter-spacing: 0.05em;
                padding: 0.15rem 0.4rem; color: var(--text-primary);
                background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
            }
            .qp-stats {
                display: flex; gap: 1.5rem; padding-top: 1rem;
                border-top: 1px solid rgba(255,255,255,0.06);
            }
            .qp-stat {
                font-family: var(--font-mono); font-size: 0.6rem;
                color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em;
            }
            .qp-stat strong { color: var(--color-cyan); font-size: 0.9rem; margin-right: 0.3rem; }
            .qp-footer {
                display: flex; justify-content: space-between; align-items: center;
                padding: 0.8rem 1.5rem; border-top: 1px solid rgba(0,240,255,0.08);
                background: rgba(0,0,0,0.3);
            }
            .qp-hint {
                font-family: var(--font-mono); font-size: 0.55rem; color: var(--text-muted);
            }
            .qp-hint kbd {
                background: rgba(0,240,255,0.06); border: 1px solid rgba(0,240,255,0.12);
                padding: 0.05rem 0.3rem; font-family: var(--font-mono);
            }
            .qp-open-btn {
                font-family: var(--font-mono); font-size: 0.65rem; font-weight: 600;
                text-transform: uppercase; letter-spacing: 0.06em;
                color: var(--color-cyan); background: rgba(0,240,255,0.06);
                border: 1px solid rgba(0,240,255,0.25); padding: 0.4rem 1rem;
                cursor: pointer; transition: all 0.15s;
            }
            .qp-open-btn:hover { background: rgba(0,240,255,0.12); border-color: var(--color-cyan); }
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
                font-family: var(--font-mono); font-size: 0.6rem; font-weight: 500;
                color: var(--text-muted); background: rgba(10,12,18,0.95);
                border: 1px solid rgba(0,240,255,0.12); backdrop-filter: blur(12px);
                display: flex; gap: 1rem; opacity: 0; visibility: hidden;
                transition: opacity 0.2s, visibility 0.2s;
            }
            .kb-nav-hint.visible { opacity: 1; visibility: visible; }
            .kb-nav-hint kbd {
                background: rgba(0,240,255,0.06); border: 1px solid rgba(0,240,255,0.15);
                padding: 0.05rem 0.35rem; font-family: var(--font-mono); color: var(--color-cyan);
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
                display: inline-flex; align-items: center; gap: 0.4rem;
                font-family: var(--font-mono); font-size: 0.65rem; font-weight: 600;
                text-transform: uppercase; letter-spacing: 0.1em;
                color: var(--color-pink); background: rgba(255,58,240,0.04);
                border: 1px solid rgba(255,58,240,0.2); padding: 0.45rem 0.9rem;
                cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
            }
            .surprise-btn:hover {
                background: rgba(255,58,240,0.1); border-color: rgba(255,58,240,0.5);
                color: #ff6af5;
            }
            .surprise-btn:active { transform: scale(0.96); }
            .surprise-btn svg { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1); }
            .surprise-btn:hover svg { transform: rotate(180deg); }
            .surprise-btn .surprise-flash {
                position: absolute; inset: 0;
                background: linear-gradient(90deg, transparent, rgba(255,58,240,0.15), transparent);
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
                    targetCard.style.boxShadow = '0 0 30px rgba(255,58,240,0.2)';
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
                background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
                display: flex; align-items: flex-start; justify-content: center;
                padding-top: min(20vh, 160px);
                opacity: 0; visibility: hidden; transition: opacity 0.15s, visibility 0.15s;
            }
            .spotlight-overlay.active { opacity: 1; visibility: visible; }
            .spotlight-box {
                width: min(580px, 92vw); background: rgba(10,12,18,0.98);
                border: 1px solid rgba(0,240,255,0.25); box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,240,255,0.06);
                backdrop-filter: blur(20px); overflow: hidden;
                transform: translateY(-12px) scale(0.97); transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
            }
            .spotlight-overlay.active .spotlight-box { transform: translateY(0) scale(1); }
            .spotlight-input-wrap {
                display: flex; align-items: center; gap: 0.6rem;
                padding: 0.9rem 1rem; border-bottom: 1px solid rgba(0,240,255,0.12);
            }
            .spotlight-input-wrap svg { color: var(--color-cyan); flex-shrink: 0; opacity: 0.6; }
            .spotlight-input {
                flex: 1; background: none; border: none; outline: none;
                font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-primary);
            }
            .spotlight-input::placeholder { color: var(--text-muted); }
            .spotlight-hint {
                font-family: var(--font-mono); font-size: 0.55rem; color: var(--text-muted);
                background: rgba(0,240,255,0.06); border: 1px solid rgba(0,240,255,0.15);
                padding: 0.15rem 0.4rem; white-space: nowrap;
            }
            .spotlight-results {
                max-height: min(50vh, 400px); overflow-y: auto; padding: 0.25rem 0;
            }
            .spotlight-results::-webkit-scrollbar { width: 4px; }
            .spotlight-results::-webkit-scrollbar-track { background: transparent; }
            .spotlight-results::-webkit-scrollbar-thumb { background: rgba(0,240,255,0.15); border-radius: 2px; }
            .spotlight-result {
                display: flex; align-items: center; gap: 0.75rem;
                padding: 0.6rem 1rem; cursor: pointer; transition: background 0.1s;
            }
            .spotlight-result:hover, .spotlight-result.active { background: rgba(0,240,255,0.06); }
            .spotlight-result.active { border-left: 2px solid var(--color-cyan); }
            .spotlight-result-icon {
                width: 36px; height: 36px; flex-shrink: 0; overflow: hidden;
                border: 1px solid rgba(0,240,255,0.12); display: flex; align-items: center; justify-content: center;
                background: rgba(0,240,255,0.03);
            }
            .spotlight-result-icon img { width: 100%; height: 100%; object-fit: cover; }
            .spotlight-result-icon svg { color: var(--color-cyan); opacity: 0.5; }
            .spotlight-result-text { flex: 1; min-width: 0; }
            .spotlight-result-title {
                font-family: var(--font-mono); font-size: 0.75rem; font-weight: 600;
                color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .spotlight-result-meta {
                font-family: var(--font-mono); font-size: 0.55rem; color: var(--text-muted);
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 0.1rem;
            }
            .spotlight-result-badge {
                font-family: var(--font-mono); font-size: 0.5rem; font-weight: 600;
                text-transform: uppercase; letter-spacing: 0.06em;
                padding: 0.15rem 0.4rem; flex-shrink: 0;
            }
            .spotlight-result-badge.project { color: var(--color-cyan); background: rgba(0,240,255,0.06); border: 1px solid rgba(0,240,255,0.15); }
            .spotlight-result-badge.action { color: var(--color-green); background: rgba(58,255,127,0.06); border: 1px solid rgba(58,255,127,0.15); }
            .spotlight-result-badge.page { color: var(--color-yellow); background: rgba(255,224,58,0.06); border: 1px solid rgba(255,224,58,0.15); }
            .spotlight-empty {
                padding: 2rem 1rem; text-align: center;
                font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);
            }
            .spotlight-footer {
                padding: 0.4rem 1rem; border-top: 1px solid rgba(0,240,255,0.08);
                font-family: var(--font-mono); font-size: 0.5rem; color: var(--text-muted);
                display: flex; gap: 1rem;
            }
            .spotlight-footer kbd {
                background: rgba(0,240,255,0.06); border: 1px solid rgba(0,240,255,0.12);
                padding: 0.05rem 0.3rem; font-family: var(--font-mono);
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
                background: rgba(10,12,18,0.97); backdrop-filter: blur(20px);
                border: 2px solid var(--color-cyan); box-shadow: 0 0 60px rgba(0,240,255,0.15);
                font-family: var(--font-mono); pointer-events: none;
                animation: konami-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, konami-fade 0.6s ease 4s forwards;
            }
            .konami-achievement h2 { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--color-cyan); margin: 0 0 0.5rem 0; opacity: 0.6; }
            .konami-achievement p { font-size: 1.1rem; font-weight: 700; color: var(--color-green); margin: 0 0 0.3rem 0; }
            .konami-achievement .konami-sub { font-size: 0.6rem; color: var(--text-muted); margin: 0; }
            @keyframes konami-pop { from { transform: translate(-50%,-50%) scale(0); opacity: 0; } to { transform: translate(-50%,-50%) scale(1); opacity: 1; } }
            @keyframes konami-fade { from { opacity: 1; } to { opacity: 0; transform: translate(-50%,-50%) scale(0.9); } }
            .konami-particle { position: fixed; z-index: 99998; pointer-events: none; width: 8px; height: 8px; border-radius: 1px; animation: konami-fall linear forwards; }
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
    //  Init
    // ═══════════════════════════════════════════════════════════

    function init() {
        // Only init features relevant to the current page
        const isIndexPage = !!document.getElementById('projectsGrid');

        if (isIndexPage) {
            initKeyboardNav();
            initRandomProject();
        }

        // Quick preview works on index page
        if (isIndexPage) {
            initQuickPreview();
        }

        // Spotlight search works on ALL pages for ALL visitors
        initSpotlightSearch();

        // Konami code easter egg works on ALL pages
        initKonamiCode();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
