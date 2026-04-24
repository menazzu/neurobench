async function trackVisit() {
    try {
        const ua = navigator.userAgent || '';
        const screenInfo = screen.width + 'x' + screen.height;
        const raw = ua + screenInfo + navigator.language;
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const visitorHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
        const stored = sessionStorage.getItem('nb_tracked');
        if (stored) return;
        await Api.trackPageView(visitorHash, window.location.pathname, document.referrer || null);
        sessionStorage.setItem('nb_tracked', '1');
    } catch {}
}

async function initUserMenu() {
    try {
        Api.reinit();
        const session = await Api.getSession();
        const authLink = document.getElementById('nav-auth-link');
        const userMenu = document.getElementById('nav-user-menu');
        if (!session) return;
        if (authLink) authLink.classList.add('hidden');
        if (userMenu) {
            userMenu.classList.remove('hidden');
            const emailEl = document.getElementById('nav-user-email');
            if (emailEl) emailEl.textContent = session.user.email;
            try {
                const status = await Api.getUserInviteStatus();
                if (status && status.is_verified && status.has_generated_invite && status.generated_code) {
                    const inviteSec = document.getElementById('nav-user-invite');
                    const codeEl = document.getElementById('nav-user-invite-code');
                    if (inviteSec) inviteSec.classList.remove('hidden');
                    if (codeEl) codeEl.textContent = status.generated_code;
                }
            } catch {}
        }
    } catch {}
}

document.addEventListener('DOMContentLoaded', async () => {
    await LeaderboardModule.load();
    trackVisit();
    initUserMenu();

    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuIconOpen = document.getElementById('menu-icon-open');
    const menuIconClose = document.getElementById('menu-icon-close');
    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            const isOpen = mobileMenu.classList.contains('open');
            mobileMenu.classList.toggle('open');
            mobileMenu.classList.toggle('hidden');
            menuIconOpen.classList.toggle('hidden');
            menuIconClose.classList.toggle('hidden');
        });
        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('open');
                mobileMenu.classList.add('hidden');
                menuIconOpen.classList.remove('hidden');
                menuIconClose.classList.add('hidden');
            });
        });
    }

    const searchInput = document.getElementById('model-search');
    const searchClear = document.getElementById('model-search-clear');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const val = searchInput.value.trim();
            searchClear.classList.toggle('hidden', !val);
            debounceTimer = setTimeout(() => { LeaderboardModule.setSearch(val); }, 250);
        });
    }
    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.classList.add('hidden');
            LeaderboardModule.setSearch('');
        });
    }

    const retryBtn = document.getElementById('error-retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => { LeaderboardModule.retry(); });
    }

    try {
        const resp = await fetch('https://api.github.com/repos/menazzu/neurobench/commits?per_page=1');
        const data = await resp.json();
        if (data && data[0] && data[0].sha) {
            const shaEl = document.getElementById('commit-sha');
            if (shaEl) shaEl.textContent = data[0].sha.slice(0, 7);
        }
    } catch {}

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.date-dropdown-container')) {
            document.querySelectorAll('.date-dropdown-menu.visible').forEach(m => {
                m.classList.remove('opacity-100', 'visible', 'translate-y-0');
                m.classList.add('opacity-0', 'invisible', 'translate-y-[-10px]');
            });
            document.querySelectorAll('.date-chevron.rotate-180').forEach(c => c.classList.remove('rotate-180'));
        }
        if (!e.target.closest('#nav-user-menu')) {
            const dd = document.getElementById('nav-user-dropdown');
            if (dd) dd.classList.add('hidden');
        }
    });

    const userBtn = document.getElementById('nav-user-btn');
    if (userBtn) {
        userBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dd = document.getElementById('nav-user-dropdown');
            if (dd) dd.classList.toggle('hidden');
        });
    }

    const logoutBtn = document.getElementById('nav-user-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await Api.logout();
            const authLink = document.getElementById('nav-auth-link');
            const userMenu = document.getElementById('nav-user-menu');
            if (authLink) authLink.classList.remove('hidden');
            if (userMenu) userMenu.classList.add('hidden');
        });
    }
});
