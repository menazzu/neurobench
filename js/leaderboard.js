const CRITERIA = ["Визуал", "Анимация", "Креатив", "Код", "Детали"];
const MAX_PER = 10;
const MAX_TOTAL = 90;

const LeaderboardModule = (() => {
    let promptsCache = { easy: [], medium: [], hard: [] };
    let currentDifficulty = 'easy';
    let currentPromptId = null;
    let currentTop = 'all';
    let currentSort = 'score';
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
        const prompts = promptsCache[currentDifficulty] || [];
        if (prompts.length > 0) {
            selectPrompt(prompts[0].id);
        } else {
            hidePromptDisplay();
            clearBenchmarkList();
            showEmptyState();
        }
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
            btn.textContent = p.name || ('Промпт #' + (i + 1));
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
        const sortBtn = document.createElement('button');
        sortBtn.className = 'top-filter-btn sort-btn' + (currentSort === 'date' ? ' active' : '');
        sortBtn.setAttribute('data-sort', 'date');
        sortBtn.textContent = 'По дате';
        sortBtn.addEventListener('click', () => { currentSort = currentSort === 'date' ? 'score' : 'date'; renderTopFilters(); renderBenchmarkList(); });
        container.appendChild(sortBtn);
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
        const listContainer = document.getElementById('benchmark-list');
        listContainer.style.opacity = '0';
        listContainer.style.transform = 'translateY(12px)';
        try { modelsData = await Api.getModelsByPrompt(currentPromptId); } catch { modelsData = []; }
        renderBenchmarkList();
        requestAnimationFrame(() => {
            listContainer.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            listContainer.style.opacity = '1';
            listContainer.style.transform = 'translateY(0)';
        });
        hideEmptyState();
    }

    function selectTop(count) {
        currentTop = count;
        document.querySelectorAll('#top-filters .top-filter-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-count') === count);
        });
        renderBenchmarkList();
    }

    const PROMPT_MAX_LINES = 5;

    function showPromptDisplay(text) {
        const container = document.getElementById('prompt-display');
        const el = document.getElementById('prompt-text');
        const fade = document.getElementById('prompt-text-fade');
        const btn = document.getElementById('prompt-expand-btn');
        container.classList.remove('hidden');
        container.style.opacity = '0';
        container.style.transform = 'translateY(8px)';
        requestAnimationFrame(() => {
            container.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        });
        el.textContent = text;
        el.style.maxHeight = '';
        el.style.overflow = '';
        fade.classList.add('hidden');
        btn.classList.add('hidden');
        btn.textContent = 'Открыть полностью';
        requestAnimationFrame(() => {
            const cs = getComputedStyle(el);
            const lh = parseFloat(cs.lineHeight);
            const fontSize = parseFloat(cs.fontSize);
            const effectiveLH = isNaN(lh) ? fontSize * 1.5 : lh;
            const maxH = effectiveLH * PROMPT_MAX_LINES;
            if (el.scrollHeight > maxH + 4) {
                el.style.maxHeight = maxH + 'px';
                el.style.overflow = 'hidden';
                fade.classList.remove('hidden');
                btn.classList.remove('hidden');
                let expanded = false;
                btn.onclick = () => {
                    expanded = !expanded;
                    if (expanded) {
                        el.style.maxHeight = '';
                        el.style.overflow = '';
                        fade.classList.add('hidden');
                        btn.textContent = 'Свернуть';
                    } else {
                        el.style.maxHeight = maxH + 'px';
                        el.style.overflow = 'hidden';
                        fade.classList.remove('hidden');
                        btn.textContent = 'Открыть полностью';
                    }
                };
            }
        });
    }
    function hidePromptDisplay() {
        document.getElementById('prompt-display').classList.add('hidden');
        document.getElementById('prompt-text').textContent = '';
        document.getElementById('prompt-text-fade').classList.add('hidden');
        document.getElementById('prompt-expand-btn').classList.add('hidden');
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
                    <div class="h-[18px] w-full bg-black/40 border border-border relative overflow-hidden">
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

    function renderSvgBlock(model) {
        if (!model.svg_content) return '';
        const modelSlug = model.name.replace(/[^a-zA-Z0-9]/g, '_');
        const svgId = 'svg-preview-' + model.id + '-' + Math.random().toString(36).slice(2, 8);
        return `
            <div class="mt-4 w-full">
                <div class="svg-viewer-box border border-border overflow-hidden" style="width:220px;height:220px;">
                    <iframe id="${svgId}" class="svg-iframe" srcdoc="" style="width:100%;height:100%;border:none;background:transparent;"></iframe>
                </div>
                <button class="svg-download-btn text-[9px] uppercase tracking-widest border border-white/15 px-2 py-1.5 bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer mt-2"
                    data-model-slug="${escapeHtml(modelSlug)}">
                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    SVG
                </button>
            </div>
        `;
    }

    function parseDate(dateStr) {
        if (!dateStr) return 0;
        const match = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
        if (match) {
            const d = parseInt(match[1], 10);
            const m = parseInt(match[2], 10) - 1;
            let y = parseInt(match[3], 10);
            if (y < 100) y += 2000;
            return new Date(y, m, d).getTime();
        }
        const iso = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3])).getTime();
        return 0;
    }

    function sanitizeSvg(svgStr) {
        return svgStr
            .replace(/<\?xml[^?]*\?>/gi, '')
            .replace(/<!DOCTYPE[^>]*>/gi, '')
            .replace(/\s+xmlns\s*=\s*["']/g, ' xmlns="')
            .replace(/<svg(?![^>]*xmlns)/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    function renderBenchmarkList() {
        const listContainer = document.getElementById('benchmark-list');
        listContainer.innerHTML = '';

        let displayModels = [...modelsData];

        if (currentSort === 'date') {
            displayModels.sort((a, b) => {
                const aDate = (a.variants && a.variants[0] && a.variants[0].date) || '';
                const bDate = (b.variants && b.variants[0] && b.variants[0].date) || '';
                const aParsed = parseDate(aDate);
                const bParsed = parseDate(bDate);
                return bParsed - aParsed;
            });
        }

        if (currentTop !== 'all') displayModels = displayModels.slice(0, parseInt(currentTop));

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
                variantsHtml = `<div class="flex flex-wrap gap-1.5 mb-1 variant-pills-container">${pills}</div>`;
            } else if (uniqueLabels.length === 1 && activeLabel !== "Default") {
                variantsHtml = `<div class="text-[12px] font-bold tracking-[0.15em] text-gray-300 uppercase mb-1">${activeLabel}</div>`;
            }

            const authorLine = model.author ? `<span class="text-[10px] text-gray-500 font-mono">by ${model.author}</span>` : '';

            const rank = index + 1;
            const rankDisplay = String(rank).padStart(2, '0');

            const dateSelectorHtml = `
                <div class="relative inline-block text-left mb-3 w-fit mx-auto lg:mx-0 date-dropdown-container">
                    <button type="button" class="date-dropdown-btn text-[10px] uppercase font-mono text-gray-400 tracking-widest bg-white/5 hover:bg-white/10 transition-colors border border-white/20 px-3 py-1.5 flex items-center gap-2 cursor-pointer outline-none">
                        Дата теста: <span class="text-white ml-1 date-display-span transition-opacity duration-300">${activeVariant.date}</span>
                        <svg class="w-3 h-3 text-white date-chevron transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <div class="date-dropdown-menu absolute z-50 top-full mt-2 left-0 w-max min-w-full bg-surface border border-border shadow-lg opacity-0 invisible transition-all duration-200 transform translate-y-[-10px] overflow-hidden"></div>
                </div>
            `;

            const svgBlock = renderSvgBlock(model);

            const card = document.createElement('div');
            card.className = "matte-card p-8 border border-border hover:border-white/50 transition-colors duration-300 flex flex-col bg-surface benchmark-card group";

            card.innerHTML = `
                <div class="flex flex-col lg:flex-row gap-0 items-stretch">
                    <div class="w-full lg:w-[28%] flex flex-col justify-center text-center lg:text-left border-b lg:border-b-0 lg:border-r border-border pb-6 lg:pb-0 pr-0 lg:pr-8 relative">
                        <span class="text-[10px] font-mono text-white/30 group-hover:text-white/50 transition-colors tracking-widest mb-1">#${rankDisplay}</span>
                        <h3 class="font-title text-2xl lg:text-3xl uppercase tracking-wider text-[#F2F2F2] mb-2 group-hover:text-white transition-colors">${model.name}</h3>
                        ${dateSelectorHtml}
                        <div class="mt-2">${variantsHtml} ${authorLine}</div>
                    </div>
                    <div class="w-full lg:flex-1 flex flex-col md:flex-row items-center justify-between mt-6 lg:mt-0 lg:pl-10 group/bracket">
                        <div class="flex-grow flex flex-col gap-y-5 w-full scores-container self-stretch justify-center">
                            ${scoresHtml}
                        </div>
                        <svg preserveAspectRatio="none" viewBox="0 0 36 100" class="hidden md:block w-[28px] mx-6 text-white/40 stroke-current transition-colors duration-500 group-hover/bracket:text-white/80 self-stretch" fill="none">
                            <path d="M 2 1 C 18 1 18 8 18 20 L 18 42 C 18 48 18 49 34 50 C 18 51 18 52 18 58 L 18 80 C 18 92 18 99 2 99" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <div class="flex-shrink-0 relative z-30 group/score text-center md:text-left mt-8 md:mt-0 md:w-56 pl-0 md:pl-2 pr-0 md:pr-12">
                            <span class="text-[12px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-2">Общий балл</span>
                            <span class="font-title text-[64px] lg:text-[76px] leading-none text-[#F2F2F2] font-bold overall-score transition-opacity duration-300" data-raw="${activeVariant.overall}">${Math.floor(activeVariant.overall)}</span>
                            ${svgBlock}
                            <div class="absolute left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 bottom-full mb-3 opacity-0 group-hover/score:opacity-100 transition-opacity duration-300 pointer-events-none bg-surface border border-border p-4 text-[10px] font-mono tracking-widest text-gray-400 whitespace-nowrap z-[100] shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                                Формула вычисления:<br>
                                <span class="text-white mt-1 block">(Сумма 5) × 1.8 = Max 90</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            if (model.svg_content) {
                const sanitized = sanitizeSvg(model.svg_content);
                const svgIframe = card.querySelector('.svg-iframe');
                if (svgIframe) {
                    const iframeSrc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:transparent;display:flex;align-items:center;justify-content:center;width:220px;height:220px;overflow:hidden;cursor:pointer}svg{max-width:100%;max-height:100%;width:auto;height:auto}</style></head><body onclick="parent.postMessage({type:'svg-open',id:'${svgIframe.id}'},'*')">${sanitized}</body></html>`;
                    svgIframe.srcdoc = iframeSrc;
                    const handler = (e) => {
                        if (e.data && e.data.type === 'svg-open' && e.data.id === svgIframe.id) {
                            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SVG Preview</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;display:flex;align-items:center;justify-content:center;min-height:100vh}svg{max-width:95vw;max-height:95vh;width:auto;height:auto}</style></head><body>${sanitized}</body></html>`;
                            const blob = new Blob([html], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            window.open(url, '_blank');
                            URL.revokeObjectURL(url);
                        }
                    };
                    window.addEventListener('message', handler);
                }
                const downloadBtn = card.querySelector('.svg-download-btn');
                if (downloadBtn) {
                    downloadBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const slug = downloadBtn.getAttribute('data-model-slug');
                        const blob = new Blob([model.svg_content], { type: 'image/svg+xml' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = slug + '.svg';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    });
                }
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
                setTimeout(() => { overallEl.textContent = Math.floor(variant.overall); overallEl.setAttribute('data-raw', variant.overall); overallEl.style.opacity = 1; }, 150);
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
