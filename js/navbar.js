(function() {
    const page = location.pathname.split('/').pop() || 'index.html';
    const isIndex = page === 'index.html' || page === '' || page === '/';
    const aboutHref = isIndex ? '#about' : 'index.html#about';
    const forumHref = 'forum.html';
    const logoHref = isIndex ? '#' : 'index.html';

    const lbItems = [
        { href: 'svg.html',    label: '&lt;/&gt; SVG' },
        { href: 'voxel.html',  label: '[▦] Voxel' },
        { href: 'shader.html', label: '{◈} Shader' },
    ];

    function lbLinkClass(href) {
        const active = page === href;
        return `block text-[10px] uppercase tracking-[0.15em] font-bold px-3 py-2 ${active ? 'opacity-100' : 'opacity-50 hover:opacity-100'} hover:bg-white/5 transition-all`;
    }

    function mobileLbClass(href) {
        const active = page === href;
        return `mobile-nav-link text-[10px] uppercase tracking-[0.15em] font-bold ${active ? 'opacity-100' : 'opacity-40 hover:opacity-100 transition-opacity'} block py-1`;
    }

    const html = `
    <nav class="fixed top-8 w-full z-[100] px-4 md:px-6" id="main-navbar">
        <div class="max-w-4xl mx-auto nav-pill flex justify-between items-center p-2">
            <a href="${logoHref}" class="flex items-center gap-3 pl-4" style="text-decoration:none;color:inherit;">
                <img src="logo.png" alt="NeuroBench" class="w-8 h-8 rounded-lg object-contain">
                <span class="font-bold tracking-tighter text-lg uppercase">NeuroBench</span>
            </a>
            <div class="hidden md:flex items-center gap-8 -ml-4">
                <a href="${aboutHref}" class="nav-link text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 hover:opacity-100 transition-opacity">О проекте</a>
                <div class="relative" id="leaderboard-nav-wrap">
                    <button id="leaderboard-nav-btn" class="nav-link text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 hover:opacity-100 transition-opacity flex items-center gap-1">Лидерборд <span class="text-[8px]">▾</span></button>
                    <div id="leaderboard-nav-dropdown" class="hidden absolute left-0 top-full mt-2 nav-dropdown p-2 z-[200] min-w-[160px] flex-col gap-0.5">
                        ${lbItems.map(i => `<a href="${i.href}" class="${lbLinkClass(i.href)}">${i.label}</a>`).join('\n                        ')}
                    </div>
                </div>
                <a href="${forumHref}" class="nav-link text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 hover:opacity-100 transition-opacity">Форум</a>
                <a href="register.html" id="nav-auth-link" class="nav-link text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 hover:opacity-100 transition-opacity flex items-center gap-1.5">
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                    Войти
                </a>
            </div>
            <div class="flex items-center gap-2">
                <div id="nav-user-menu" class="hidden relative">
                    <button id="nav-user-btn" class="flex items-center justify-center w-10 h-10 opacity-40 hover:opacity-100 transition-opacity" aria-label="Аккаунт">
                        <img id="nav-user-photo" src="" alt="" class="hidden w-6 h-6 rounded object-cover">
                        <svg id="nav-user-icon" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </button>
                    <div id="nav-user-dropdown" class="hidden absolute right-0 top-12 w-64 matte-card p-4 z-[200]">
                        <p id="nav-user-display" class="text-xs opacity-30 mb-3 truncate"></p>
                        <div id="nav-user-invite" class="hidden mb-3">
                            <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Ваш инвайт-код</p>
                            <p id="nav-user-invite-code" class="font-mono tracking-widest text-white"></p>
                        </div>
                        <a href="profile.html" class="block text-[10px] uppercase tracking-widest text-center border border-border py-2 hover:bg-white/10 transition-colors rounded-xl mb-2">Профиль и аккаунт</a>
                        <a href="${forumHref}" class="block text-[10px] uppercase tracking-widest text-center border border-border py-2 hover:bg-white/10 transition-colors rounded-xl mb-2">Форум</a>
                        <button id="nav-user-logout" class="w-full text-[10px] uppercase tracking-widest border border-border py-2 hover:bg-white/10 transition-colors rounded-xl">Выйти</button>
                    </div>
                </div>
                <button id="mobile-menu-btn" class="md:hidden flex items-center justify-center w-10 h-10 opacity-40 hover:opacity-100 transition-opacity" aria-label="Меню">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path id="menu-icon-open" d="M4 6h16M4 12h16M4 18h16"/><path id="menu-icon-close" d="M6 6l12 12M6 18L18 6" class="hidden"/></svg>
                </button>
            </div>
        </div>
        <div id="mobile-menu" class="md:hidden max-w-4xl mx-auto mt-2 nav-pill p-4 hidden flex-col gap-4">
            <a href="${aboutHref}" class="mobile-nav-link text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 hover:opacity-100 transition-opacity block py-2">О проекте</a>
            <div class="py-2">
                <p class="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 mb-2">Лидерборд</p>
                <div class="flex flex-col gap-1 pl-3">
                    ${lbItems.map(i => `<a href="${i.href}" class="${mobileLbClass(i.href)}">${i.label}</a>`).join('\n                    ')}
                </div>
            </div>
            <a href="${forumHref}" class="mobile-nav-link text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 hover:opacity-100 transition-opacity block py-2">Форум</a>
            <a href="register.html" class="mobile-nav-link text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 hover:opacity-100 transition-opacity block py-2 flex items-center gap-1.5">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                Войти
            </a>
        </div>
    </nav>`;

    const placeholder = document.getElementById('navbar-placeholder');
    if (placeholder) {
        placeholder.outerHTML = html;
    } else {
        document.body.insertAdjacentHTML('afterbegin', html);
    }

    // --- Leaderboard dropdown toggle ---
    const lbBtn = document.getElementById('leaderboard-nav-btn');
    const lbDrop = document.getElementById('leaderboard-nav-dropdown');
    const lbWrap = document.getElementById('leaderboard-nav-wrap');
    if (lbBtn && lbDrop && lbWrap) {
        lbBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var isHidden = lbDrop.classList.toggle('hidden');
            if (!isHidden) lbDrop.classList.add('flex');
            else lbDrop.classList.remove('flex');
        });
        document.addEventListener('click', function(e) {
            if (!lbWrap.contains(e.target)) {
                lbDrop.classList.add('hidden');
                lbDrop.classList.remove('flex');
            }
        });
    }

    // --- Mobile menu toggle ---
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const iconOpen = document.getElementById('menu-icon-open');
    const iconClose = document.getElementById('menu-icon-close');
    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', function() {
            var open = mobileMenu.classList.toggle('hidden');
            if (!open) mobileMenu.classList.add('flex');
            else mobileMenu.classList.remove('flex');
            if (iconOpen) iconOpen.classList.toggle('hidden');
            if (iconClose) iconClose.classList.toggle('hidden');
        });
    }
})();
