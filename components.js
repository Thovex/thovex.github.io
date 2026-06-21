const SITE = {
    email: 'jjvanvliet@protonmail.com',
    linkedin: 'https://www.linkedin.com/in/jesse-j-van-vliet/',
    nav: [
        { label: 'Recent Projects', href: 'index.html#work' },
        { label: 'CV', href: 'index.html#experience' },
        { label: 'Tech', href: 'index.html#skills' },
        { label: 'Past Projects', href: 'index.html#older-projects' },
        { label: 'Connect', href: 'index.html#contact' }
    ]
};

function getActiveHref() {
    const path = window.location.pathname;
    if (path.includes('about')) return 'about.html';
    return '';
}

function injectNav() {
    const placeholder = document.getElementById('nav-placeholder');
    if (!placeholder) return;

    const activeHref = getActiveHref();
    const links = SITE.nav.map((item) => {
        const active = item.href === activeHref ? ' aria-current="page" class="active"' : '';
        return `<a href="${item.href}"${active}>${item.label}</a>`;
    }).join('');

    placeholder.outerHTML = `
        <header class="site-header">
            <nav class="nav" aria-label="Primary">
                <div class="nav-links">${links}</div>
            </nav>
        </header>
    `;
}

function injectFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;

    placeholder.outerHTML = `
        <footer class="footer">
            <div class="page-shell footer-inner">
                <p>&copy; ${new Date().getFullYear()} Jesse van Vliet</p>
                <div>
                    <a href="${SITE.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
                    <a href="mailto:${SITE.email}">Email</a>
                    <a href="jessevanvliet-cv.pdf" target="_blank" rel="noopener">Full CV</a>
                    <a href="jessevanvliet-cv_onepage.pdf" target="_blank" rel="noopener">One-page CV</a>
                </div>
            </div>
        </footer>
    `;
}

function initHeaderState() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
}

function initScrollReveal() {
    // Kept as a no-op so older project scripts can call it safely.
}

document.addEventListener('DOMContentLoaded', () => {
    injectNav();
    injectFooter();
    initHeaderState();
});
