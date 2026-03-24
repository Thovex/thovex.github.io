document.addEventListener('DOMContentLoaded', () => {

    // ─── Fetch and Render Projects ───
    fetch('projects.json')
        .then(res => res.json())
        .then(projects => {
            renderFilters(projects);
            renderProjects(projects);
            renderArchive(projects);
            initFilters(projects);

            // Re-observe newly created cards
            initScrollReveal();

            // Scroll to hash anchor after content renders (e.g. #projects from back-link)
            if (window.location.hash) {
                const hash = window.location.hash;
                const doScroll = () => {
                    const el = document.querySelector(hash);
                    if (!el) return;
                    // Disable smooth scroll temporarily so it jumps instantly
                    document.documentElement.style.scrollBehavior = 'auto';
                    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
                    // Re-enable smooth scroll after jump
                    requestAnimationFrame(() => {
                        document.documentElement.style.scrollBehavior = '';
                    });
                };
                // Fire immediately, and again after load event for safety
                doScroll();
                setTimeout(doScroll, 300);
                window.addEventListener('load', () => setTimeout(doScroll, 100));
            }

            // Init row-hover grunge lines
            initRowHoverEffect();

            // Re-init grunge lines for archive (items just rendered)
            if (typeof initGrungeHoverLines === 'function') initGrungeHoverLines();
        })
        .catch(err => console.error('Error loading projects:', err));

    // ─── Filter State ───
    const activeFilters = {
        language: 'all',
        engine: 'all',
        role: 'all',
        type: 'all'
    };

    function renderFilters(projects) {
        const filterBar = document.getElementById('filterBar');
        if (!filterBar) return;

        const cardProjects = projects.filter(p => p.card);

        // Exclude gimmick entries from filter generation
        const exclude = new Set(['meow-speak', 'Real Life', 'Assistant']);
        const languages = [...new Set(cardProjects.map(p => p.language))].filter(v => !exclude.has(v));
        const engines = [...new Set(cardProjects.map(p => p.engine))].filter(v => !exclude.has(v));
        const roles = [...new Set(cardProjects.map(p => p.role))].filter(v => !exclude.has(v));
        const types = [...new Set(cardProjects.map(p => p.type))].filter(v => !exclude.has(v));

        const typeLabels = {
            'BSS': 'Bright Star Studios',
            'Zloppy-Games': 'Zloppy Games',
            'BH': 'Baer & Hoggo',
            'HKU': 'HKU',
            'Hobby': 'Hobby',
            'PixelPool': 'PixelPool'
        };

        filterBar.innerHTML = '';

        filterBar.appendChild(createFilterGroup('Language', 'language', languages, null, cardProjects));
        filterBar.appendChild(createFilterGroup('Engine', 'engine', engines, null, cardProjects));
        filterBar.appendChild(createFilterGroup('Role', 'role', roles, null, cardProjects));
        filterBar.appendChild(createFilterGroup('Source', 'type', types, typeLabels, cardProjects));

        const divider = document.createElement('div');
        divider.className = 'filter-bar-divider';
        filterBar.appendChild(divider);

        const resetBtn = document.createElement('button');
        resetBtn.className = 'filter-reset-all';
        resetBtn.id = 'filterResetAll';
        resetBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reset
        `;
        resetBtn.style.display = 'none';
        filterBar.appendChild(resetBtn);

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.filter-group')) {
                filterBar.querySelectorAll('.filter-group.open').forEach(g => g.classList.remove('open'));
            }
        });
    }

    function createFilterGroup(label, filterKey, values, labelMap, cardProjects) {
        const group = document.createElement('div');
        group.className = 'filter-group';
        group.dataset.key = filterKey;

        const total = cardProjects ? cardProjects.length : 0;

        const btn = document.createElement('button');
        btn.className = 'filter-group-btn';
        btn.innerHTML = `
            <span class="filter-label">${label}</span>
            <span class="filter-value">All</span>
            <svg class="filter-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        `;

        const dropdown = document.createElement('div');
        dropdown.className = 'filter-dropdown';

        // "All" option
        const allOpt = document.createElement('button');
        allOpt.className = 'filter-option active';
        allOpt.innerHTML = `All <span class="filter-count">${total}</span>`;
        allOpt.dataset.filterKey = filterKey;
        allOpt.dataset.filterValue = 'all';
        dropdown.appendChild(allOpt);

        values.forEach(val => {
            const opt = document.createElement('button');
            opt.className = 'filter-option';
            const displayName = labelMap && labelMap[val] ? labelMap[val] : val;
            const count = cardProjects ? cardProjects.filter(p => p[filterKey] === val).length : 0;
            opt.innerHTML = `${displayName} <span class="filter-count">${count}</span>`;
            opt.dataset.filterKey = filterKey;
            opt.dataset.filterValue = val;
            dropdown.appendChild(opt);
        });

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other open groups
            document.querySelectorAll('.filter-group.open').forEach(g => {
                if (g !== group) g.classList.remove('open');
            });
            group.classList.toggle('open');
        });

        group.appendChild(btn);
        group.appendChild(dropdown);
        return group;
    }

    function updateResetButton() {
        const resetBtn = document.getElementById('filterResetAll');
        if (!resetBtn) return;
        const hasActiveFilter = Object.values(activeFilters).some(v => v !== 'all');
        resetBtn.style.display = hasActiveFilter ? '' : 'none';
    }

    function resetAllFilters() {
        Object.keys(activeFilters).forEach(key => { activeFilters[key] = 'all'; });
        document.querySelectorAll('.filter-option').forEach(o => {
            o.classList.toggle('active', o.dataset.filterValue === 'all');
        });
        document.querySelectorAll('.filter-group').forEach(g => {
            g.classList.remove('filtered');
            g.querySelector('.filter-value').textContent = 'All';
        });
        applyFilters();
        updateResetButton();
    }

    function initFilters() {
        document.querySelectorAll('.filter-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                const key = opt.dataset.filterKey;
                const value = opt.dataset.filterValue;
                activeFilters[key] = value;

                // Update active state in dropdown
                const dropdown = opt.closest('.filter-dropdown');
                dropdown.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');

                // Update button label
                const group = opt.closest('.filter-group');
                group.querySelector('.filter-value').textContent = opt.textContent;
                group.classList.remove('open');

                // Highlight group if filtered
                group.classList.toggle('filtered', value !== 'all');

                applyFilters();
                updateResetButton();
            });
        });

        const resetBtn = document.getElementById('filterResetAll');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetAllFilters);
        }
    }

    function applyFilters() {
        const cards = document.querySelectorAll('.project-card');
        cards.forEach(card => {
            const match =
                (activeFilters.language === 'all' || card.dataset.language === activeFilters.language) &&
                (activeFilters.engine === 'all' || card.dataset.engine === activeFilters.engine) &&
                (activeFilters.role === 'all' || card.dataset.role === activeFilters.role) &&
                (activeFilters.type === 'all' || card.dataset.type === activeFilters.type);

            card.style.display = match ? '' : 'none';
        });
    }

    // ─── Render Project Cards ───
    function renderProjects(projects) {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;

        projects.forEach(project => {
            if (!project.card) return;

            const typeLabels = {
                'BSS': 'Bright Star Studios',
                'Zloppy-Games': 'Zloppy Games',
                'BH': 'Baer & Hoggo',
                'HKU': 'HKU',
                'Hobby': 'Hobby',
                'PixelPool': 'PixelPool'
            };

            const card = document.createElement('div');
            card.className = 'project-card';
            card.dataset.language = project.language;
            card.dataset.engine = project.engine;
            card.dataset.role = project.role;
            card.dataset.type = project.type;
            card.dataset.projectId = project.id;
            card.setAttribute('data-reveal', '');

            const tagsHTML = (project.tags || []).map(t =>
                `<span class="card-tag">${t}</span>`
            ).join('');

            const socialsHTML = (project.socials || []).map(s =>
                `<a href="${s.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="${s.info}">
                    ${s.icon ? `<img src="${s.icon}" alt="${s.info}">` : ''}
                </a>`
            ).join('');

            card.innerHTML = `
                <div class="project-card-image">
                    <img src="${project.minisrc}" alt="${project.title}" loading="lazy"
                         onerror="this.style.display='none'; this.parentElement.classList.add('no-image');">
                    <div class="card-image-fallback"><span>${project.title}</span></div>
                    <div class="card-tags">${tagsHTML}</div>
                </div>
                <div class="project-card-body">
                    <h3>${project.title}</h3>
                    <span class="project-card-date">${project.datetime}</span>
                    <div class="project-card-meta">
                        <span class="meta-language">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                            ${project.language}
                        </span>
                        <span class="meta-engine">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                            ${project.engine}
                        </span>
                        <span class="meta-role">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            ${project.role}
                        </span>
                        <span class="meta-source">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/></svg>
                            ${typeLabels[project.type] || project.type}
                        </span>
                    </div>
                    <p class="project-card-desc">${project.description}</p>
                    <div class="project-card-footer">
                        <div class="socials">${socialsHTML}</div>
                        <span class="view-more">
                            Details
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                        </span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                window.location.href = `project.html?id=${project.id}`;
            });

            grid.appendChild(card);
        });
    }

    // ─── Render Archive ───
    function renderArchive(projects) {
        const list = document.getElementById('archiveList');
        if (!list) return;

        projects.forEach(project => {
            if (project.card) return;

            const item = document.createElement('div');
            item.className = 'archive-item';
            item.innerHTML = `
                <div class="archive-year">${project.datetime}</div>
                <div class="archive-info">
                    <h4>${project.title}</h4>
                    <div class="archive-tech">${project.engine} · ${project.language}</div>
                    <p>${project.description}</p>
                    ${project.archive ? `<a href="${project.archive}" target="_blank" rel="noopener">View archived page →</a>` : ''}
                </div>
            `;
            list.appendChild(item);
        });
    }

    // ─── Row-Hover Grunge Lines ───
    function initRowHoverEffect() {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;

        const wrapper = grid.closest('.grid-row-hover-wrapper');
        if (!wrapper) return;
        const lineL = wrapper.querySelector('.row-hover-line--left');
        const lineR = wrapper.querySelector('.row-hover-line--right');
        if (!lineL || !lineR) return;

        function getRows() {
            const cards = Array.from(grid.querySelectorAll('.project-card'))
                .filter(c => c.style.display !== 'none');
            if (cards.length === 0) return [];

            // Group by offsetTop into rows
            const rowMap = new Map();
            cards.forEach(c => {
                const key = Math.round(c.offsetTop / 5) * 5;
                if (!rowMap.has(key)) rowMap.set(key, []);
                rowMap.get(key).push(c);
            });

            return Array.from(rowMap.values()).map(rowCards => {
                const top = rowCards[0].offsetTop;
                const bottom = Math.max(...rowCards.map(c => c.offsetTop + c.offsetHeight));
                return { top, height: bottom - top };
            });
        }

        function getRowAtY(mouseY) {
            const gridRect = grid.getBoundingClientRect();
            const relY = mouseY - gridRect.top + grid.scrollTop;
            const rows = getRows();
            for (const row of rows) {
                if (relY >= row.top && relY <= row.top + row.height) {
                    return row;
                }
            }
            return null;
        }

        grid.addEventListener('mousemove', (e) => {
            const row = getRowAtY(e.clientY);
            if (!row) {
                lineL.classList.remove('active');
                lineR.classList.remove('active');
                return;
            }

            lineL.style.top = row.top + 'px';
            lineL.style.height = row.height + 'px';
            lineL.classList.add('active');

            lineR.style.top = row.top + 'px';
            lineR.style.height = row.height + 'px';
            lineR.classList.add('active');
        });

        grid.addEventListener('mouseleave', () => {
            lineL.classList.remove('active');
            lineR.classList.remove('active');
        });
    }
});
