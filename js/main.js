document.addEventListener('DOMContentLoaded', async () => {
    ShaderModule.init();

    await LeaderboardModule.loadModels();
    LeaderboardModule.render();
    LeaderboardModule.setupFilters();

    await PromptsModule.loadPrompts();
    PromptsModule.setupTabs();
    PromptsModule.renderPrompts('easy');

    const mainTabs = document.querySelectorAll('.main-tab');
    const leaderboardFilters = document.getElementById('leaderboard-filters');
    const promptsFiltersEl = document.getElementById('prompts-filters');
    const promptsPanel = document.getElementById('prompts-panel');
    const benchmarkList = document.getElementById('benchmark-list');

    function switchMainTab(tabName) {
        mainTabs.forEach(t => {
            if (t.getAttribute('data-tab') === tabName) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        if (tabName === 'leaderboard') {
            leaderboardFilters.style.display = '';
            promptsFiltersEl.style.display = 'none';
            benchmarkList.classList.remove('hidden');
            promptsPanel.classList.add('hidden');
        } else {
            leaderboardFilters.style.display = 'none';
            promptsFiltersEl.style.display = '';
            benchmarkList.classList.add('hidden');
            promptsPanel.classList.remove('hidden');
        }
    }

    mainTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchMainTab(tab.getAttribute('data-tab'));
        });
    });

    document.addEventListener('click', (e) => {
        if(!e.target.closest('.date-dropdown-container')) {
            document.querySelectorAll('.date-dropdown-menu.visible').forEach(m => {
                m.classList.remove('opacity-100', 'visible', 'translate-y-0');
                m.classList.add('opacity-0', 'invisible', 'translate-y-[-10px]');
            });
            document.querySelectorAll('.date-chevron.rotate-180').forEach(c => c.classList.remove('rotate-180'));
        }
    });
});
