// ─────────────────────────────────────────────────────────────
//  CMS Overlay — Inline editing tools for authenticated admin
//  Only loads Firebase when cms_authed flag is set in localStorage.
//  Regular visitors pay zero cost.
// ─────────────────────────────────────────────────────────────

(function () {
    'use strict';

    // Fast exit — no auth flag means no CMS session
    if (!localStorage.getItem('cms_authed')) return;

    const ALLOWED_EMAIL = 'thovexii@gmail.com';

    // Resolve CMS path relative to current page
    function getCmsUrl() {
        const loc = window.location.pathname;
        if (loc.includes('/cms/')) return './';
        return 'cms/';
    }

    // Resolve firebase-config.js path
    function getConfigPath() {
        const loc = window.location.pathname;
        if (loc.includes('/cms/')) return './firebase-config.js';
        return './cms/firebase-config.js';
    }

    const CMS_URL = getCmsUrl();

    // ─── Verify auth via Firebase (lazy-loaded) ───
    async function verifyAuth() {
        try {
            const [{ initializeApp }, { getAuth, onAuthStateChanged }] = await Promise.all([
                import('https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js'),
                import('https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js')
            ]);

            const configModule = await import(getConfigPath());
            const firebaseConfig = configModule.default;

            if (!firebaseConfig || firebaseConfig.apiKey === 'YOUR_API_KEY') {
                localStorage.removeItem('cms_authed');
                return null;
            }

            // Use a separate app name to avoid conflicts with CMS page
            let app;
            try {
                app = initializeApp(firebaseConfig, 'cms-overlay');
            } catch (e) {
                const { getApp } = await import('https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js');
                try { app = getApp('cms-overlay'); } catch { app = getApp(); }
            }

            const auth = getAuth(app);

            return new Promise((resolve) => {
                const unsub = onAuthStateChanged(auth, (user) => {
                    unsub();
                    if (user && user.email === ALLOWED_EMAIL) {
                        resolve(user);
                    } else {
                        localStorage.removeItem('cms_authed');
                        resolve(null);
                    }
                });
                setTimeout(() => resolve(null), 5000);
            });
        } catch (e) {
            console.warn('CMS overlay: auth check failed', e);
            localStorage.removeItem('cms_authed');
            return null;
        }
    }

    // ─── Inject Styles ───
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* CMS Admin Overlay */
            .cms-nav-btn {
                display: inline-flex;
                align-items: center;
                gap: 0.4rem;
                padding: 0.3rem 0.65rem;
                font-family: var(--font-mono);
                font-size: 0.6rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: var(--color-cyan);
                border: 1px solid rgba(0, 240, 255, 0.2);
                background: rgba(0, 240, 255, 0.04);
                text-decoration: none;
                transition: all 0.2s ease;
                cursor: pointer;
                opacity: 0.5;
            }
            .cms-nav-btn:hover {
                opacity: 1;
                background: rgba(0, 240, 255, 0.1);
                border-color: rgba(0, 240, 255, 0.4);
                color: var(--color-cyan);
            }
            .cms-nav-btn svg { opacity: 0.7; }
            .cms-nav-btn:hover svg { opacity: 1; }

            .cms-edit-btn {
                position: absolute;
                top: 8px;
                right: 8px;
                z-index: 10;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                background: rgba(0, 0, 0, 0.75);
                border: 1px solid rgba(0, 240, 255, 0.3);
                color: var(--color-cyan);
                cursor: pointer;
                opacity: 0;
                transition: all 0.2s ease;
                text-decoration: none;
                backdrop-filter: blur(4px);
            }
            .project-card:hover .cms-edit-btn,
            .cms-edit-btn:focus { opacity: 1; }
            .cms-edit-btn:hover {
                background: rgba(0, 240, 255, 0.15);
                border-color: var(--color-cyan);
                transform: scale(1.1);
            }

            .cms-hero-edit {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.4rem 0.9rem;
                font-family: var(--font-mono);
                font-size: 0.65rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: var(--color-cyan);
                border: 1px solid rgba(0, 240, 255, 0.25);
                background: rgba(0, 240, 255, 0.05);
                text-decoration: none;
                transition: all 0.2s ease;
                margin-top: 1rem;
            }
            .cms-hero-edit:hover {
                background: rgba(0, 240, 255, 0.12);
                border-color: rgba(0, 240, 255, 0.5);
                color: var(--color-cyan);
            }

            .cms-add-btn {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.45rem 1rem;
                font-family: var(--font-mono);
                font-size: 0.65rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: var(--color-green);
                border: 1px solid rgba(58, 255, 127, 0.25);
                background: rgba(58, 255, 127, 0.04);
                text-decoration: none;
                transition: all 0.2s ease;
                cursor: pointer;
                margin-top: 0.75rem;
            }
            .cms-add-btn:hover {
                background: rgba(58, 255, 127, 0.1);
                border-color: rgba(58, 255, 127, 0.5);
                color: var(--color-green);
            }

            @media (max-width: 768px) {
                .cms-nav-btn span.cms-label { display: none; }
                .cms-nav-btn { padding: 0.3rem 0.4rem; }
            }
        `;
        document.head.appendChild(style);
    }

    // ─── SVG Icons ───
    const ICONS = {
        terminal: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
        pencil: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
        plus: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    };

    // ─── Inject CMS Button into Nav ───
    function injectNavButton() {
        const navLinks = document.getElementById('navLinks');
        if (!navLinks || navLinks.querySelector('.cms-nav-btn')) return;

        const cmsLink = document.createElement('a');
        cmsLink.href = CMS_URL;
        cmsLink.className = 'cms-nav-btn';
        cmsLink.innerHTML = `${ICONS.terminal} <span class="cms-label">CMS</span>`;
        cmsLink.title = 'Open CMS Panel';
        navLinks.appendChild(cmsLink);
    }

    // ─── Inject Edit Buttons on Project Cards ───
    function injectCardEditButtons() {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;

        function addButtons() {
            grid.querySelectorAll('.project-card').forEach(card => {
                if (card.querySelector('.cms-edit-btn')) return;

                const projectId = card.dataset.projectId;
                if (!projectId) return;

                const editBtn = document.createElement('a');
                editBtn.href = `${CMS_URL}#edit-${projectId}`;
                editBtn.className = 'cms-edit-btn';
                editBtn.innerHTML = ICONS.pencil;
                editBtn.title = 'Edit in CMS';
                editBtn.addEventListener('click', (e) => e.stopPropagation());

                const imgArea = card.querySelector('.project-card-image');
                if (imgArea) {
                    imgArea.appendChild(editBtn);
                } else {
                    card.appendChild(editBtn);
                }
            });
        }

        const observer = new MutationObserver(() => addButtons());
        observer.observe(grid, { childList: true });
        addButtons();
    }

    // ─── Inject Edit Button on Project Detail Page ───
    function injectProjectEditButton() {
        const heroContent = document.getElementById('heroContent');
        if (!heroContent) return;

        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id');
        if (!projectId) return;

        function addButton() {
            if (heroContent.querySelector('.cms-hero-edit')) return;
            if (heroContent.children.length === 0) return;

            const editLink = document.createElement('a');
            editLink.href = `${CMS_URL}#edit-${projectId}`;
            editLink.className = 'cms-hero-edit';
            editLink.innerHTML = `${ICONS.pencil} Edit in CMS`;
            heroContent.appendChild(editLink);
        }

        const observer = new MutationObserver(() => addButton());
        observer.observe(heroContent, { childList: true });
        addButton();
    }

    // ─── Inject "Add Project" Button ───
    function injectAddButton() {
        const filterBar = document.getElementById('filterBar');
        if (!filterBar) return;

        function addButton() {
            if (document.querySelector('.cms-add-btn')) return;
            if (filterBar.children.length === 0) return;

            const addBtn = document.createElement('a');
            addBtn.href = `${CMS_URL}#new`;
            addBtn.className = 'cms-add-btn';
            addBtn.innerHTML = `${ICONS.plus} Add Project`;
            filterBar.parentNode.insertBefore(addBtn, filterBar.nextSibling);
        }

        const observer = new MutationObserver(() => addButton());
        observer.observe(filterBar, { childList: true });
        addButton();
    }

    // ─── Boot ───
    async function init() {
        const user = await verifyAuth();
        if (!user) return;

        injectStyles();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', activate);
        } else {
            activate();
        }
    }

    function activate() {
        requestAnimationFrame(() => {
            setTimeout(() => {
                injectNavButton();
                injectCardEditButtons();
                injectProjectEditButton();
                injectAddButton();
            }, 100);
        });
    }

    init();
})();

