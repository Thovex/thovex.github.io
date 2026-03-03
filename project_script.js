document.addEventListener('DOMContentLoaded', () => {

    // ─── Lightbox ───
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxClose = document.getElementById('lightboxClose');

    function openLightbox(src) {
        lightboxImg.src = src;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightbox) lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
    });

    // ─── Load Project ───
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        document.getElementById('heroContent').innerHTML = '<p>No project specified.</p>';
        return;
    }

    fetch('projects.json')
        .then(res => res.json())
        .then(data => {
            const project = data.find(p => p.id === projectId);
            if (!project) {
                document.getElementById('heroContent').innerHTML = '<p>Project not found.</p>';
                return;
            }
            document.title = `${project.title} | Jesse van Vliet`;
            renderProjectHero(project);
            renderWork(project);
            renderMedia(project);

            initScrollReveal();
        })
        .catch(err => console.error('Error loading project:', err));

    // ─── Render Hero ───
    function renderProjectHero(project) {
        const heroBg = document.getElementById('heroBg');
        heroBg.innerHTML = `<img src="${project.banner}" alt="${project.title}">`;

        const heroContent = document.getElementById('heroContent');

        const typeLabels = {
            'BSS': 'Bright Star Studios',
            'Zloppy-Games': 'Zloppy Games',
            'BH': 'Baer & Hoggo',
            'HKU': 'University of the Arts Utrecht',
            'Hobby': 'Personal Project',
            'PixelPool': 'PixelPool'
        };

        const typeLabel = typeLabels[project.type] || project.type;

        const socialsHTML = (project.socials || []).length > 0
            ? `<div class="project-socials">
                ${project.socials.map(s => `
                    <a href="${s.url}" target="_blank" rel="noopener">
                        ${s.icon ? `<img src="${s.icon}" alt="">` : ''}
                        ${s.info}
                    </a>
                `).join('')}
               </div>`
            : '';

        heroContent.innerHTML = `
            <a href="index.html" class="back-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                Back to projects
            </a>
            <h1>${project.title}</h1>
            <p class="project-long-desc">${project.longdescription || project.description}</p>
            <div class="project-meta-bar">
                <div class="meta-item">
                    <span class="meta-label">Role</span>
                    <span class="meta-value">${project.role}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Engine</span>
                    <span class="meta-value">${project.engine}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Language</span>
                    <span class="meta-value">${project.language}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Duration</span>
                    <span class="meta-value">${project.duration}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Period</span>
                    <span class="meta-value">${project.datetime}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Source</span>
                    <span class="meta-value">${typeLabel}</span>
                </div>
            </div>
            ${socialsHTML}
        `;
    }

    // ─── Render Work ───
    function renderWork(project) {
        if (!project.work || project.work.length === 0) return;

        const workSection = document.getElementById('workSection');
        const workGrid = document.getElementById('workGrid');
        workSection.style.display = '';

        project.work.forEach(item => {
            const card = document.createElement('div');
            card.className = 'work-card';
            card.setAttribute('data-reveal', '');
            if (typeof item === 'string') {
                card.innerHTML = `<h4>${item}</h4>`;
            } else {
                card.innerHTML = `
                    <h4>${item.title}</h4>
                    ${item.description ? `<p>${item.description}</p>` : ''}
                `;
            }
            workGrid.appendChild(card);
        });
    }

    // ─── Render Media ───
    function renderMedia(project) {
        const hasScreenshots = project.screenshots && project.screenshots.length > 0;
        const hasVideos = project.videos && project.videos.length > 0;

        if (!hasScreenshots && !hasVideos) return;

        const mediaSection = document.getElementById('mediaSection');
        const mediaGrid = document.getElementById('mediaGrid');
        mediaSection.style.display = '';

        if (hasVideos) {
            project.videos.forEach(video => {
                const item = document.createElement('div');
                item.className = 'media-item';
                item.setAttribute('data-reveal', '');

                if (video.src.includes('youtube.com') || video.src.includes('youtu.be')) {
                    let videoId = '';
                    try {
                        const url = new URL(video.src);
                        if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
                            videoId = url.searchParams.get('v');
                        } else if (url.hostname === 'youtu.be') {
                            videoId = url.pathname.slice(1);
                        }
                    } catch (e) {
                        videoId = '';
                    }

                    if (videoId) {
                        item.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen loading="lazy"></iframe>`;
                        item.style.cursor = 'default';
                    }
                } else {
                    item.innerHTML = `
                        <video src="${video.src}" controls playsinline autoplay muted loop preload="none">
                            Your browser does not support the video tag.
                        </video>
                    `;
                    item.style.cursor = 'default';
                }

                mediaGrid.appendChild(item);
            });
        }

        if (hasScreenshots) {
            project.screenshots.forEach(screenshot => {
                const item = document.createElement('div');
                item.className = 'media-item';
                item.setAttribute('data-reveal', '');
                item.innerHTML = `<img src="${screenshot.src}" alt="${screenshot.alt}" loading="lazy">`;
                item.addEventListener('click', () => openLightbox(screenshot.src));
                mediaGrid.appendChild(item);
            });
        }
    }
});
