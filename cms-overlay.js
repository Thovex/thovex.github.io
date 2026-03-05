// ─────────────────────────────────────────────────────────────
//  CMS Overlay — Inline editing on the live site
//  Activates when cms_authed flag is set in localStorage.
//  Makes text fields contenteditable, saves to Firestore,
//  and offers a floating toolbar to publish changes.
// ─────────────────────────────────────────────────────────────

(function () {
    'use strict';

    if (!localStorage.getItem('cms_authed')) return;

    const CMS_URL = window.location.pathname.includes('/cms/') ? './' : 'cms/';

    // ─── State ───
    let firebaseApp = null;
    let db = null;
    let projectsData = []; // loaded from projects.json
    let pendingChanges = new Map(); // projectId → { field: newValue, ... }
    let firebaseReady = false;

    // ─── Inject Styles ───
    function injectStyles() {
        if (document.getElementById('cms-overlay-styles')) return;
        const style = document.createElement('style');
        style.id = 'cms-overlay-styles';
        style.textContent = `
            /* CMS Nav Button */
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

            /* Editable field highlight */
            [data-cms-editable] {
                position: relative;
                transition: outline 0.15s ease, background 0.15s ease;
                outline: 1px dashed transparent;
                outline-offset: 4px;
                cursor: text;
            }
            [data-cms-editable]:hover {
                outline-color: rgba(0, 240, 255, 0.3);
            }
            [data-cms-editable]:focus {
                outline-color: var(--color-cyan);
                background: rgba(0, 240, 255, 0.03);
                outline-style: solid;
            }
            [data-cms-editable].cms-dirty {
                outline-color: rgba(255, 224, 58, 0.5);
                outline-style: dashed;
            }
            [data-cms-editable].cms-dirty:focus {
                outline-color: var(--color-yellow);
                outline-style: solid;
            }
            [data-cms-editable].cms-saved {
                animation: cms-flash-save 0.6s ease;
            }
            @keyframes cms-flash-save {
                0%   { outline-color: var(--color-green); background: rgba(58, 255, 127, 0.06); }
                100% { outline-color: transparent; background: transparent; }
            }

            /* Floating CMS toolbar */
            .cms-toolbar {
                position: fixed;
                bottom: 1.5rem;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.6rem 1.2rem;
                background: rgba(10, 12, 18, 0.95);
                border: 1px solid rgba(0, 240, 255, 0.2);
                backdrop-filter: blur(12px);
                font-family: var(--font-mono);
                font-size: 0.65rem;
                color: var(--text-secondary);
                transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
                opacity: 0;
                pointer-events: none;
            }
            .cms-toolbar.visible {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
                pointer-events: all;
            }
            .cms-toolbar-status {
                display: flex;
                align-items: center;
                gap: 0.4rem;
                color: var(--color-yellow);
                text-transform: uppercase;
                letter-spacing: 0.08em;
                font-weight: 600;
            }
            .cms-toolbar-status .dot {
                width: 6px; height: 6px;
                background: var(--color-yellow);
                border-radius: 50%;
                animation: cms-pulse 1.5s ease infinite;
            }
            @keyframes cms-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            .cms-toolbar-btn {
                padding: 0.35rem 0.8rem;
                font-family: var(--font-mono);
                font-size: 0.6rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                border: 1px solid;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 0.35rem;
            }
            .cms-toolbar-btn.save {
                color: var(--color-green);
                border-color: rgba(58, 255, 127, 0.3);
                background: rgba(58, 255, 127, 0.05);
            }
            .cms-toolbar-btn.save:hover {
                background: rgba(58, 255, 127, 0.15);
                border-color: var(--color-green);
            }
            .cms-toolbar-btn.discard {
                color: var(--text-muted);
                border-color: var(--border-subtle);
                background: transparent;
            }
            .cms-toolbar-btn.discard:hover {
                color: var(--color-pink);
                border-color: rgba(255, 58, 58, 0.3);
            }
            .cms-toolbar-btn.publish {
                color: var(--color-cyan);
                border-color: rgba(0, 240, 255, 0.3);
                background: rgba(0, 240, 255, 0.05);
            }
            .cms-toolbar-btn.publish:hover {
                background: rgba(0, 240, 255, 0.15);
                border-color: var(--color-cyan);
            }
            .cms-toolbar-btn.cms-link {
                color: var(--text-muted);
                border-color: var(--border-subtle);
                background: transparent;
            }
            .cms-toolbar-btn.cms-link:hover {
                color: var(--color-cyan);
                border-color: rgba(0, 240, 255, 0.3);
            }
            .cms-toolbar-divider {
                width: 1px;
                height: 20px;
                background: var(--border-subtle);
            }

            @media (max-width: 768px) {
                .cms-toolbar {
                    bottom: 0.75rem;
                    padding: 0.5rem 0.8rem;
                    gap: 0.5rem;
                    font-size: 0.55rem;
                }
                .cms-nav-btn span.cms-label { display: none; }
            }
        `;
        document.head.appendChild(style);
    }

    // ─── SVG Icons ───
    const ICONS = {
        terminal: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
    };

    // ─── Create Floating Toolbar ───
    function createToolbar() {
        if (document.querySelector('.cms-toolbar')) return;

        const bar = document.createElement('div');
        bar.className = 'cms-toolbar';
        bar.innerHTML = `
            <div class="cms-toolbar-status">
                <span class="dot"></span>
                <span class="cms-change-count">0 changes</span>
            </div>
            <div class="cms-toolbar-divider"></div>
            <button class="cms-toolbar-btn save" data-action="save" title="Save to Firestore">Save</button>
            <button class="cms-toolbar-btn discard" data-action="discard" title="Discard changes">Discard</button>
            <div class="cms-toolbar-divider"></div>
            <a href="${CMS_URL}" class="cms-toolbar-btn cms-link" title="Open full CMS">${ICONS.terminal} CMS</a>
        `;
        document.body.appendChild(bar);

        bar.querySelector('[data-action="save"]').addEventListener('click', saveChanges);
        bar.querySelector('[data-action="discard"]').addEventListener('click', discardChanges);
    }

    function updateToolbar() {
        const bar = document.querySelector('.cms-toolbar');
        if (!bar) return;

        let totalFields = 0;
        pendingChanges.forEach(fields => { totalFields += Object.keys(fields).length; });

        const label = bar.querySelector('.cms-change-count');
        label.textContent = `${totalFields} change${totalFields !== 1 ? 's' : ''}`;

        if (totalFields > 0) {
            bar.classList.add('visible');
        } else {
            bar.classList.remove('visible');
        }
    }

    // ─── Firebase Init (lazy) ───
    async function initFirebase() {
        if (firebaseReady) return true;
        try {
            const [{ initializeApp, getApp }, { getFirestore }, { getAuth, onAuthStateChanged }] = await Promise.all([
                import('https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js'),
                import('https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js'),
                import('https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js')
            ]);

            const configModule = await import('./cms/firebase-config.js');
            const firebaseConfig = configModule.default;
            if (!firebaseConfig || firebaseConfig.apiKey === 'YOUR_API_KEY') return false;

            try {
                firebaseApp = initializeApp(firebaseConfig, 'cms-inline');
            } catch {
                try { firebaseApp = getApp('cms-inline'); } catch { firebaseApp = getApp(); }
            }

            db = getFirestore(firebaseApp);

            // Verify auth
            const auth = getAuth(firebaseApp);
            const user = await new Promise((resolve) => {
                const unsub = onAuthStateChanged(auth, (u) => { unsub(); resolve(u); });
                setTimeout(() => resolve(null), 5000);
            });

            if (!user || user.email !== 'thovexii@gmail.com') {
                localStorage.removeItem('cms_authed');
                return false;
            }

            // Store Firestore helpers globally for save
            window._cmsFirestore = { db };
            firebaseReady = true;
            return true;
        } catch (e) {
            console.warn('CMS overlay: Firebase init failed', e);
            return false;
        }
    }

    // ─── Make elements editable ───
    function makeEditable(el, projectId, field) {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'false');
        el.dataset.cmsEditable = '';
        el.dataset.cmsProjectId = projectId;
        el.dataset.cmsField = field;
        el.dataset.cmsOriginal = el.textContent.trim();

        el.addEventListener('focus', () => {
            // Store original on first focus
            if (!el.dataset.cmsSnapshot) {
                el.dataset.cmsSnapshot = el.textContent.trim();
            }
        });

        el.addEventListener('blur', () => {
            const newVal = el.textContent.trim();
            const original = el.dataset.cmsOriginal;

            if (newVal !== original) {
                el.classList.add('cms-dirty');
                if (!pendingChanges.has(projectId)) pendingChanges.set(projectId, {});
                pendingChanges.get(projectId)[field] = newVal;
            } else {
                el.classList.remove('cms-dirty');
                if (pendingChanges.has(projectId)) {
                    delete pendingChanges.get(projectId)[field];
                    if (Object.keys(pendingChanges.get(projectId)).length === 0) {
                        pendingChanges.delete(projectId);
                    }
                }
            }
            updateToolbar();
        });

        // Prevent Enter from inserting line breaks in single-line fields
        if (field !== 'description' && field !== 'longdescription') {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    el.blur();
                }
            });
        }
    }

    // ─── Setup Editable Fields on Index Page Cards ───
    function setupCardEditing() {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;

        function process() {
            grid.querySelectorAll('.project-card').forEach(card => {
                if (card.dataset.cmsSetup) return;
                card.dataset.cmsSetup = '1';

                const projectId = card.dataset.projectId;
                if (!projectId) return;

                // Title
                const h3 = card.querySelector('.project-card-body h3');
                if (h3) makeEditable(h3, projectId, 'title');

                // Description
                const desc = card.querySelector('.project-card-desc');
                if (desc) makeEditable(desc, projectId, 'description');

                // Prevent card click when editing
                card.addEventListener('click', (e) => {
                    if (e.target.closest('[data-cms-editable]')) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }, true);
            });
        }

        const observer = new MutationObserver(() => process());
        observer.observe(grid, { childList: true });
        process();
    }

    // ─── Setup Editable Fields on Project Detail Page ───
    function setupDetailEditing() {
        const heroContent = document.getElementById('heroContent');
        if (!heroContent) return;

        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id');
        if (!projectId) return;

        function process() {
            if (heroContent.dataset.cmsSetup) return;
            if (heroContent.children.length === 0) return;
            heroContent.dataset.cmsSetup = '1';

            // Title
            const h1 = heroContent.querySelector('h1');
            if (h1) makeEditable(h1, projectId, 'title');

            // Long description
            const longDesc = heroContent.querySelector('.project-long-desc');
            if (longDesc) makeEditable(longDesc, projectId, 'longdescription');

            // Meta values (role, engine, language, duration)
            heroContent.querySelectorAll('.meta-item').forEach(item => {
                const label = item.querySelector('.meta-label');
                const value = item.querySelector('.meta-value');
                if (!label || !value) return;

                const labelText = label.textContent.trim().toLowerCase();
                const fieldMap = {
                    'role': 'role',
                    'engine': 'engine',
                    'language': 'language',
                    'duration': 'duration',
                };
                const field = fieldMap[labelText];
                if (field) makeEditable(value, projectId, field);
            });

            // Work card titles and descriptions
            document.querySelectorAll('.work-card').forEach((card, i) => {
                const h4 = card.querySelector('h4');
                const p = card.querySelector('p');
                if (h4) makeEditable(h4, projectId, `work.${i}.title`);
                if (p) makeEditable(p, projectId, `work.${i}.description`);
            });
        }

        const observer = new MutationObserver(() => process());
        observer.observe(heroContent, { childList: true });
        process();

        // Also observe workGrid
        const workGrid = document.getElementById('workGrid');
        if (workGrid) {
            const wObserver = new MutationObserver(() => process());
            wObserver.observe(workGrid, { childList: true });
        }
    }

    // ─── Setup Archive Editing ───
    function setupArchiveEditing() {
        const archiveList = document.getElementById('archiveList');
        if (!archiveList) return;

        function process() {
            // Need to match archive items to project data
            archiveList.querySelectorAll('.archive-item').forEach(item => {
                if (item.dataset.cmsSetup) return;
                item.dataset.cmsSetup = '1';

                const titleEl = item.querySelector('h4');
                const descEl = item.querySelector('.archive-info > p');
                if (!titleEl) return;

                // Find matching project by title
                const title = titleEl.textContent.trim();
                const project = projectsData.find(p => p.title === title);
                if (!project) return;

                makeEditable(titleEl, project.id, 'title');
                if (descEl) makeEditable(descEl, project.id, 'description');
            });
        }

        const observer = new MutationObserver(() => process());
        observer.observe(archiveList, { childList: true });
        process();
    }

    // ─── Save Changes to Firestore ───
    async function saveChanges() {
        if (pendingChanges.size === 0) return;

        const ok = await initFirebase();
        if (!ok) {
            alert('Firebase auth failed. Please log into the CMS first.');
            return;
        }

        const { doc, getDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js');

        const saveBtn = document.querySelector('.cms-toolbar-btn.save');
        if (saveBtn) { saveBtn.textContent = 'Saving...'; saveBtn.disabled = true; }

        try {
            for (const [projectId, fields] of pendingChanges) {
                // Fetch current doc
                const docRef = doc(db, 'projects', projectId);
                const snap = await getDoc(docRef);
                if (!snap.exists()) {
                    console.warn(`Project ${projectId} not found in Firestore`);
                    continue;
                }

                const data = snap.data();

                // Apply changes
                for (const [field, value] of Object.entries(fields)) {
                    // Handle nested fields like work.0.title
                    if (field.includes('.')) {
                        const parts = field.split('.');
                        let obj = data;
                        for (let i = 0; i < parts.length - 1; i++) {
                            const key = isNaN(parts[i]) ? parts[i] : parseInt(parts[i]);
                            obj = obj[key];
                        }
                        const lastKey = isNaN(parts[parts.length - 1]) ? parts[parts.length - 1] : parseInt(parts[parts.length - 1]);
                        obj[lastKey] = value;
                    } else {
                        data[field] = value;
                    }
                }

                await setDoc(docRef, data);
            }

            // Flash green on all dirty elements
            document.querySelectorAll('.cms-dirty').forEach(el => {
                el.classList.remove('cms-dirty');
                el.classList.add('cms-saved');
                el.dataset.cmsOriginal = el.textContent.trim();
                setTimeout(() => el.classList.remove('cms-saved'), 600);
            });

            pendingChanges.clear();
            updateToolbar();
        } catch (e) {
            console.error('CMS save error:', e);
            alert('Save failed: ' + e.message);
        } finally {
            if (saveBtn) { saveBtn.textContent = 'Save'; saveBtn.disabled = false; }
        }
    }

    // ─── Discard Changes ───
    function discardChanges() {
        document.querySelectorAll('[data-cms-editable].cms-dirty').forEach(el => {
            el.textContent = el.dataset.cmsOriginal;
            el.classList.remove('cms-dirty');
        });
        pendingChanges.clear();
        updateToolbar();
    }

    // ─── Inject Nav Button ───
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

    // ─── Load projects.json for matching archive items ───
    async function loadProjectsData() {
        try {
            const res = await fetch('projects.json');
            projectsData = await res.json();
        } catch { /* silent */ }
    }

    // ─── Activate ───
    function activate() {
        injectStyles();
        createToolbar();
        injectNavButton();
        setupCardEditing();
        setupDetailEditing();

        // Archive needs project data to match items
        loadProjectsData().then(() => setupArchiveEditing());

        // Retry nav injection
        if (!document.querySelector('.cms-nav-btn')) {
            const retry = setInterval(() => {
                injectNavButton();
                if (document.querySelector('.cms-nav-btn')) clearInterval(retry);
            }, 200);
            setTimeout(() => clearInterval(retry), 5000);
        }
    }

    // ─── Boot ───
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', activate);
    } else {
        activate();
    }
})();
