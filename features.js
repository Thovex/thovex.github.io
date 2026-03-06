// ─────────────────────────────────────────────────────────────
//  Site Features — Visitor-facing enhancements
//  1. Quick Preview (Space key on hovered/focused card)
//  2. Keyboard Card Navigation (J/K, arrows, Enter)
//  3. Random Project Discovery ("Surprise Me" button)
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
            hoveredCard = card;
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
            new MutationObserver(() => tryInsert()).observe(grid.parentElement, { childList: true, subtree: true });
        }
        // Also retry after a delay for dynamic rendering
        setTimeout(tryInsert, 1000);
        setTimeout(tryInsert, 3000);
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
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
