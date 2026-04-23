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

document.addEventListener('DOMContentLoaded', async () => {
    await LeaderboardModule.load();
    trackVisit();

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.date-dropdown-container')) {
            document.querySelectorAll('.date-dropdown-menu.visible').forEach(m => {
                m.classList.remove('opacity-100', 'visible', 'translate-y-0');
                m.classList.add('opacity-0', 'invisible', 'translate-y-[-10px]');
            });
            document.querySelectorAll('.date-chevron.rotate-180').forEach(c => c.classList.remove('rotate-180'));
        }
    });
});
