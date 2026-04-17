const CRITERIA = ["Визуал", "Анимация", "Креатив", "Код", "Детали"];
const MAX_PER = 10;
const MAX_TOTAL = 90;

const LeaderboardModule = (() => {
    let promptsCache = { easy: [], medium: [], hard: [] };
    let currentDifficulty = 'easy';
    let currentPromptId = null;
    let currentTop = 'all';
    let modelsData = [];

    async function load() {
        try {
            promptsCache.easy = await Api.getPromptsByDifficulty('easy');
            promptsCache.medium = await Api.getPromptsByDifficulty('medium');
            promptsCache.hard = await Api.getPromptsByDifficulty('hard');
        } catch {
            promptsCache = { easy: [], medium: [], hard: [] };
        }
        renderDifficultyFilters();
        selectDifficulty('easy');
    }

    function renderDifficultyFilters() {
        const container = document.getElementById('difficulty-filters');
        container.innerHTML = '';
        const diffs = [
            { key: 'easy', label: 'Лёгкие' },
            { key: 'medium', label: 'Средние' },
            { key: 'hard', label: 'Сложные' }
        ];
        diffs.forEach(d => {
            const btn = document.createElement('button');
            btn.className = 'difficulty-tab' + (d.key === currentDifficulty ? ' active' : '');
            btn.setAttribute('data-difficulty', d.key);
            btn.textContent = d.label;
            btn.addEventListener('click', () => selectDifficulty(d.key));
            container.appendChild(btn);
        });
    }

    function selectDifficulty(diff) {
        currentDifficulty = diff;
        currentPromptId = null;
        document.querySelectorAll('#difficulty-filters .difficulty-tab').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-difficulty') === diff);
        });
        renderPromptFilters();
        renderTopFilters();
        hidePromptDisplay();
        clearBenchmarkList();
        showEmptyState();
    }

    function renderPromptFilters() {
        const container = document.getElementById('prompt-filters');
        container.innerHTML = '';
        const prompts = promptsCache[currentDifficulty] || [];
        if (prompts.length === 0) {
            container.innerHTML = '<span class="text-xs text-gray-500 uppercase tracking-widest">Нет промптов</span>';
            return;
        }
        prompts.forEach((p, i) => {
            const btn = document.createElement('button');
            btn.className = 'top-filter-btn' + (p.id === currentPromptId ? ' active' : '');
            btn.setAttribute('data-prompt-id', p.id);
            btn.textContent = 'Промпт #' + (i + 1);
            btn.addEventListener('click', () => selectPrompt(p.id));
            container.appendChild(btn);
        });
    }

    function renderTopFilters() {
        const container = document.getElementById('top-filters');
        container.innerHTML = '';
        const tops = [
            { key: 'all', label: 'Все' },
            { key: '3', label: 'Топ 3' },
            { key: '5', label: 'Топ 5' },
            { key: '10', label: 'Топ 10' }
        ];
        tops.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'top-filter-btn' + (t.key === currentTop ? ' active' : '');
            btn.setAttribute('data-count', t.key);
            btn.textContent = t.label;
            btn.addEventListener('click', () => selectTop(t.key));
            container.appendChild(btn);
        });
    }

    async function selectPrompt(promptId) {
        currentPromptId = promptId;
        document.querySelectorAll('#prompt-filters .top-filter-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.getAttribute('data-prompt-id')) === promptId);
        });
        const prompts = promptsCache[currentDifficulty] || [];
        const prompt = prompts.find(p => p.id === promptId);
        if (prompt) showPromptDisplay(prompt.text);
        await loadModels();
    }

    async function loadModels() {
        if (!currentPromptId) { clearBenchmarkList(); showEmptyState(); return; }
        try { modelsData = await Api.getModelsByPrompt(currentPromptId); } catch { modelsData = []; }
        renderBenchmarkList();
        hideEmptyState();
    }

    function selectTop(count) {
        currentTop = count;
        document.querySelectorAll('#top-filters .top-filter-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-count') === count);
        });
        renderBenchmarkList();
    }

    function showPromptDisplay(text) {
        document.getElementById('prompt-display').classList.remove('hidden');
        document.getElementById('prompt-text').textContent = text;
    }
    function hidePromptDisplay() {
        document.getElementById('prompt-display').classList.add('hidden');
        document.getElementById('prompt-text').textContent = '';
    }
    function showEmptyState() { document.getElementById('empty-state').classList.remove('hidden'); }
    function hideEmptyState() { document.getElementById('empty-state').classList.add('hidden'); }
    function clearBenchmarkList() { document.getElementById('benchmark-list').innerHTML = ''; }

    function renderBars(variant) {
        let scoresHtml = '';
        CRITERIA.forEach((c, ci) => {
            const score = variant.scores[ci];
            const pct = (score / MAX_PER) * 100;
            scoresHtml += `
                <div class="w-full">
                    <div class="flex justify-between text-xs mb-2.5 uppercase tracking-widest text-gray-400">
                        <span>${c}</span>
                        <span class="text-white font-bold transition-opacity duration-300 score-val" data-ci="${ci}">${score.toFixed(1)} / 10</span>
                    </div>
                    <div class="h-[18px] w-full bg-black/40 border border-white/20 relative overflow-hidden">
                        <div class="hatching-fill absolute top-0 left-0 h-full w-0 transition-all duration-[1.5s] cubic-bezier(0.19, 1, 0.22, 1) score-bar" data-ci="${ci}" data-target="${pct}%"></div>
                    </div>
                </div>
            `;
        });
        return scoresHtml;
    }

    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function renderSvgSection(model) {
        if (!model.svg_content) return '';
        const modelSlug = model.name.replace(/[^a-zA-Z0-9]/g, '_');
        return `
            <div class="mt-6 lg:mt-8 lg:pl-10 w-full svg-viewer-section">
                <div class="flex items-center gap-3 mb-3">
                    <button class="svg-download-btn text-[10px] uppercase tracking-widest border border-white/20 px-4 py-2 bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
                        data-model-slug="${escapeHtml(modelSlug)}">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        Скачать SVG
                    </button>
                    <span class="text-[10px] uppercase tracking-widest text-gray-500">Результат генерации</span>
                </div>
                <div class="svg-viewer-box border border-white/20 bg-[#0A0A0A] overflow-auto max-h-[500px] flex items-center justify-center p-4">
                    <div class="svg-render-area"></div>
                </div>
            </div>
        `;
    }

    function renderBenchmarkList() {
        const listContainer = document.getElementById('benchmark-list');
        listContainer.innerHTML = '';

        let displayModels = modelsData;
        if (currentTop !== 'all') displayModels = modelsData.slice(0, parseInt(currentTop));

        displayModels.forEach((model, index) => {
            const groups = {};
            (model.variants || []).forEach((v) => {
                if (!groups[v.label]) groups[v.label] = [];
                groups[v.label].push(v);
            });

            const uniqueLabels = Object.keys(groups);
            if (uniqueLabels.length === 0) return;

            let activeLabel = uniqueLabels[0];
            let activeVariant = groups[activeLabel][0];
            let scoresHtml = renderBars(activeVariant);

            let variantsHtml = '';
            if (uniqueLabels.length > 1) {
                const pills = uniqueLabels.map((lbl, i) => {
                    const activeClass = i === 0 ? 'bg-[#F2F2F2] text-black border-[#F2F2F2]' : 'bg-transparent text-gray-400 border-white/20 hover:border-white/50 hover:text-white cursor-pointer';
                    return `<button class="variant-pill px-3 py-1.5 text-[10px] uppercase tracking-wider border transition-all duration-200 ${activeClass}" data-label="${lbl}">${lbl}</button>`;
                }).join('');
                variantsHtml = `<div class="flex flex-wrap gap-1.5 mb-4 variant-pills-container">${pills}</div>`;
            } else if (uniqueLabels.length === 1 && activeLabel !== "Default") {
                variantsHtml = `<div class="text-[10px] tracking-[0.2em] text-gray-400 uppercase mb-4">${activeLabel}</div>`;
            }

            const rank = String(index + 1).padStart(2, '0');
            const authorHtml = model.author ? `<p class="text-[10px] text-gray-500 tracking-wider mt-1 mb-2">${model.author}</p>` : '';

            const dateSelectorHtml = `
                <div class="relative inline-block text-left mb-3 w-fit mx-auto lg:mx-0 date-dropdown-container">
                    <button type="button" class="date-dropdown-btn text-[10px] uppercase font-mono text-gray-400 tracking-widest bg-white/5 hover:bg-white/10 transition-colors border border-white/20 px-3 py-1.5 flex items-center gap-2 cursor-pointer outline-none">
                        Дата теста: <span class="text-white ml-1 date-display-span transition-opacity duration-300">${activeVariant.date}</span>
                        <svg class="w-3 h-3 text-white date-chevron transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <div class="date-dropdown-menu absolute z-50 top-full mt-2 left-0 w-max min-w-full bg-[#0A0A0A] border border-white/20 shadow-lg opacity-0 invisible transition-all duration-200 transform translate-y-[-10px] overflow-hidden"></div>
                </div>
            `;

            const svgSection = renderSvgSection(model);

            const card = document.createElement('div');
            card.className = "glass-panel p-8 border border-white/20 hover:border-white/50 transition-colors duration-300 flex flex-col gap-0 bg-black/60 benchmark-card group";

            card.innerHTML = `
                <div class="flex flex-col lg:flex-row gap-8 items-stretch">
                    <div class="w-full lg:w-1/4 flex flex-col justify-center text-center lg:text-left border-b lg:border-b-0 lg:border-r border-white/20 pb-8 lg:pb-0 pr-0 lg:pr-8 relative">
                        <p class="text-[10px] tracking-[0.2em] text-gray-500 uppercase mb-2">#${rank}</p>
                        <h3 class="font-title text-2xl lg:text-3xl uppercase tracking-wider text-[#F2F2F2] mb-2 group-hover:text-white transition-colors">${model.name}</h3>
                        ${dateSelectorHtml}
                        ${authorHtml}
                        <div class="mt-2">${variantsHtml}</div>
                    </div>
                    <div class="w-full lg:w-3/4 flex flex-col md:flex-row items-center justify-between mt-6 lg:mt-0 lg:pl-10 group/bracket">
                        <div class="flex-grow flex flex-col gap-y-5 w-full scores-container self-stretch justify-center">
                            ${scoresHtml}
                        </div>
                        <svg preserveAspectRatio="none" viewBox="0 0 36 100" class="hidden md:block w-[28px] mx-6 text-white/40 stroke-current transition-colors duration-500 group-hover/bracket:text-white/80 self-stretch" fill="none">
                            <path d="M 2 1 C 18 1 18 8 18 20 L 18 42 C 18 48 18 49 34 50 C 18 51 18 52 18 58 L 18 80 C 18 92 18 99 2 99" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <div class="flex-shrink-0 relative group/score text-center md:text-left mt-8 md:mt-0 md:w-56 pl-0 md:pl-2 pr-0 md:pr-12">
                            <span class="text-[10px] uppercase tracking-[0.4em] text-gray-500 block mb-1">Общий балл</span>
                            <span class="font-title text-[70px] lg:text-[80px] leading-none text-[#F2F2F2] font-bold overall-score transition-opacity duration-300">${activeVariant.overall.toFixed(1)}</span>
                            <span class="text-[10px] text-gray-400 cursor-help border-b border-dotted border-gray-600 pb-1 mt-3 block w-max tracking-widest uppercase mx-auto md:mx-0">из ${MAX_TOTAL}</span>
                            <div class="absolute right-0 md:left-0 top-full mt-4 opacity-0 group-hover/score:opacity-100 transition-opacity duration-300 pointer-events-none bg-[#0A0A0A] border border-white/20 p-4 text-[10px] font-mono tracking-widest text-gray-400 whitespace-nowrap z-50 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                                Формула вычисления:<br>
                                <span class="text-white mt-1 block">(Сумма 5) × 1.8 = Max 90</span>
                            </div>
                        </div>
                    </div>
                </div>
                ${svgSection}
            `;

            if (model.svg_content) {
                const svgArea = card.querySelector('.svg-render-area');
                svgArea.innerHTML = model.svg_content;
                const downloadBtn = card.querySelector('.svg-download-btn');
                downloadBtn.addEventListener('click', () => {
                    const blob = new Blob([model.svg_content], { type: 'image/svg+xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = modelSlug + '.svg';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                });
            }

            const dateBtn = card.querySelector('.date-dropdown-btn');
            const dateMenu = card.querySelector('.date-dropdown-menu');
            const dateDisplay = card.querySelector('.date-display-span');
            const chevron = card.querySelector('.date-chevron');
            const overallEl = card.querySelector('.overall-score');
            const scoreVals = card.querySelectorAll('.score-val');
            const scoreBars = card.querySelectorAll('.score-bar');

            function applyVariant(variant) {
                overallEl.style.opacity = 0;
                setTimeout(() => { overallEl.textContent = variant.overall.toFixed(1); overallEl.style.opacity = 1; }, 150);
                if (dateDisplay) {
                    dateDisplay.style.opacity = 0;
                    setTimeout(() => { dateDisplay.textContent = variant.date; dateDisplay.style.opacity = 1; }, 150);
                }
                CRITERIA.forEach((c, ci) => {
                    const score = variant.scores[ci];
                    const pct = (score / MAX_PER) * 100;
                    scoreVals[ci].style.opacity = 0;
                    setTimeout(() => { scoreVals[ci].textContent = score.toFixed(1) + ' / 10'; scoreVals[ci].style.opacity = 1; }, 150);
                    scoreBars[ci].style.width = pct + '%';
                    scoreBars[ci].setAttribute('data-target', pct + '%');
                });
            }

            function closeMenu() {
                dateMenu.classList.remove('opacity-100', 'visible', 'translate-y-0');
                dateMenu.classList.add('opacity-0', 'invisible', 'translate-y-[-10px]');
                chevron.classList.remove('rotate-180');
            }
            function openMenu() {
                document.querySelectorAll('.date-dropdown-menu.visible').forEach(m => {
                    m.classList.remove('opacity-100', 'visible', 'translate-y-0');
                    m.classList.add('opacity-0', 'invisible', 'translate-y-[-10px]');
                });
                document.querySelectorAll('.date-chevron.rotate-180').forEach(c => c.classList.remove('rotate-180'));
                dateMenu.classList.remove('opacity-0', 'invisible', 'translate-y-[-10px]');
                dateMenu.classList.add('opacity-100', 'visible', 'translate-y-0');
                chevron.classList.add('rotate-180');
            }

            function buildDateMenu(labelStr) {
                const datesForLabel = groups[labelStr];
                if (datesForLabel.length <= 1) {
                    chevron.style.display = 'none';
                    dateBtn.style.pointerEvents = 'none';
                    dateBtn.classList.remove('hover:bg-white/10');
                    dateMenu.innerHTML = '';
                    if (datesForLabel.length === 1) applyVariant(datesForLabel[0]);
                    return;
                }
                chevron.style.display = 'block';
                dateBtn.style.pointerEvents = 'auto';
                dateBtn.classList.add('hover:bg-white/10');
                let menuHtml = '';
                datesForLabel.forEach((v, idx) => {
                    menuHtml += `<a href="#" class="block px-4 py-2.5 text-[10px] uppercase font-mono text-gray-300 hover:text-white hover:bg-white/10 date-option transition-colors border-b border-white/5 last:border-b-0" data-idx="${idx}">${v.date}</a>`;
                });
                dateMenu.innerHTML = menuHtml;
                dateMenu.querySelectorAll('.date-option').forEach(opt => {
                    opt.addEventListener('click', (e) => {
                        e.preventDefault();
                        applyVariant(datesForLabel[parseInt(opt.getAttribute('data-idx'))]);
                        closeMenu();
                    });
                });
            }

            if (dateBtn) {
                dateBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dateMenu.classList.contains('visible') ? closeMenu() : openMenu();
                });
            }

            if (uniqueLabels.length > 1) {
                const pills = card.querySelectorAll('.variant-pill');
                pills.forEach(pill => {
                    pill.addEventListener('click', (e) => {
                        const lbl = e.target.getAttribute('data-label');
                        pills.forEach(p => { p.className = "variant-pill px-3 py-1.5 text-[10px] uppercase tracking-wider border transition-all duration-200 cursor-pointer bg-transparent text-gray-400 border-white/20 hover:border-white/50 hover:text-white"; });
                        e.target.className = "variant-pill px-3 py-1.5 text-[10px] uppercase tracking-wider border transition-all duration-200 bg-[#F2F2F2] text-black border-[#F2F2F2]";
                        buildDateMenu(lbl);
                        applyVariant(groups[lbl][0]);
                    });
                });
            }

            buildDateMenu(activeLabel);
            listContainer.appendChild(card);
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.querySelectorAll('.hatching-fill').forEach(bar => { bar.style.width = bar.getAttribute('data-target'); });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        document.querySelectorAll('.benchmark-card').forEach(card => observer.observe(card));
    }

    return { load };
})();
