document.addEventListener('DOMContentLoaded', async () => {
    ShaderModule.init();

    await LeaderboardModule.load();

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
