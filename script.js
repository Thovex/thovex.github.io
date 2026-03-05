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

        const rows = document.createElement('div');
        rows.className = 'filter-rows';

        rows.appendChild(createFilterRow('Language', 'language', languages));
        rows.appendChild(createFilterRow('Engine', 'engine', engines));
        rows.appendChild(createFilterRow('Role', 'role', roles));
        rows.appendChild(createFilterRow('Source', 'type', types, typeLabels));

        filterBar.appendChild(rows);

        const resetBtn = document.createElement('button');
        resetBtn.className = 'filter-reset-all';
        resetBtn.id = 'filterResetAll';
        resetBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reset Filters
        `;
        resetBtn.style.display = 'none';
        filterBar.appendChild(resetBtn);
    }

    function createFilterRow(label, filterKey, values, labelMap) {
        const row = document.createElement('div');
        row.className = 'filter-row';

        const lbl = document.createElement('span');
        lbl.className = 'filter-row-label';
        lbl.textContent = label;
        row.appendChild(lbl);

        const pills = document.createElement('div');
        pills.className = 'filter-row-pills';

        const allPill = document.createElement('button');
        allPill.className = 'filter-pill active';
        allPill.textContent = 'All';
        allPill.dataset.filterKey = filterKey;
        allPill.dataset.filterValue = 'all';
        pills.appendChild(allPill);

        values.forEach(val => {
            const pill = document.createElement('button');
            pill.className = 'filter-pill';
            pill.textContent = labelMap && labelMap[val] ? labelMap[val] : val;
            pill.dataset.filterKey = filterKey;
            pill.dataset.filterValue = val;
            pills.appendChild(pill);
        });

        row.appendChild(pills);
        return row;
    }

    function updateResetButton() {
        const resetBtn = document.getElementById('filterResetAll');
        if (!resetBtn) return;
        const hasActiveFilter = Object.values(activeFilters).some(v => v !== 'all');
        resetBtn.style.display = hasActiveFilter ? '' : 'none';
    }

    function resetAllFilters() {
        Object.keys(activeFilters).forEach(key => { activeFilters[key] = 'all'; });
        document.querySelectorAll('.filter-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.filterValue === 'all');
        });
        applyFilters();
        updateResetButton();
    }

    function initFilters() {
        document.querySelectorAll('.filter-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const key = pill.dataset.filterKey;
                const value = pill.dataset.filterValue;
                activeFilters[key] = value;

                pill.closest('.filter-row-pills').querySelectorAll('.filter-pill').forEach(p => {
                    p.classList.toggle('active', p.dataset.filterValue === value);
                });

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
            card.setAttribute('data-reveal', '');

            const tagsHTML = (project.tags || []).map(t =>
                `<span class="card-tag">${t}</span>`
            ).join('');

            const socialsHTML = (project.socials || []).map(s =>
                `<a href="${s.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
                    ${s.icon ? `<img src="${s.icon}" alt="">` : ''}
                    ${s.info}
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
});
