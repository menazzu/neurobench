const CRITERIA = ["Визуал", "Анимация", "Креатив", "Код", "Детали"];
const MAX_PER = 10;
const MAX_TOTAL = 90;

const LeaderboardModule = (() => {
    let promptsCache = { easy: [], medium: [], hard: [] };
    let currentDifficulty = 'easy';
    let currentPromptId = null;
    let currentTop = 'all';
    let currentSort = 'score';
    let resultsData = [];
    let activeMessageHandlers = [];
    let searchQuery = '';
    let barObserver = null;
    let pendingTimeouts = [];

    async function load() {
        showLoading();
        hideError();
        try {
            promptsCache.easy = await Api.getPromptsByDifficulty('easy');
            promptsCache.medium = await Api.getPromptsByDifficulty('medium');
            promptsCache.hard = await Api.getPromptsByDifficulty('hard');
        } catch (e) {
            promptsCache = { easy: [], medium: [], hard: [] };
            hideLoading();
            showError('Не удалось загрузить промпты. Проверьте подключение.');
            renderDifficultyFilters();
            return;
        }
        hideLoading();
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

    async function selectDifficulty(diff) {
        currentDifficulty = diff;
        currentPromptId = null;
        document.querySelectorAll('#difficulty-filters .difficulty-tab').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-difficulty') === diff);
        });
        renderPromptFilters();
        renderTopFilters();
        const prompts = promptsCache[currentDifficulty] || [];
        if (prompts.length > 0) {
            await selectPrompt(prompts[0].id);
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
        if (currentTop === 'all') {
            const sortBtn = document.createElement('button');
            sortBtn.className = 'top-filter-btn sort-btn' + (currentSort === 'date' ? ' active' : '');
            sortBtn.setAttribute('data-sort', 'date');
            sortBtn.textContent = 'По дате';
            sortBtn.addEventListener('click', () => { currentSort = currentSort === 'date' ? 'score' : 'date'; renderTopFilters(); renderBenchmarkList(); });
            container.appendChild(sortBtn);
        } else {
            currentSort = 'score';
        }
    }

    async function selectPrompt(promptId) {
        currentPromptId = promptId;
        document.querySelectorAll('#prompt-filters .top-filter-btn').forEach(b => {
            const bid = isNaN(b.getAttribute('data-prompt-id')) ? b.getAttribute('data-prompt-id') : parseInt(b.getAttribute('data-prompt-id'));
            b.classList.toggle('active', bid === promptId);
        });
        const prompts = promptsCache[currentDifficulty] || [];
        const prompt = prompts.find(p => p.id === promptId);
        if (prompt) showPromptDisplay(prompt.text);
        await loadResults();
    }

    async function loadResults() {
        if (!currentPromptId) { clearBenchmarkList(); showEmptyState(); return; }
        showLoading();
        hideError();
        try {
            resultsData = await Api.getResultsByPrompt(currentPromptId);
        } catch (e) {
            resultsData = [];
            hideLoading();
            showError('Не удалось загрузить результаты. Попробуйте позже.');
            return;
        }
        hideLoading();
        renderBenchmarkList();
        hideEmptyState();
    }

    function selectTop(count) {
        currentTop = count;
        currentSort = 'score';
        renderTopFilters();
        renderBenchmarkList();
    }

    const PROMPT_MAX_LINES = 5;

    function showPromptDisplay(text) {
        const el = document.getElementById('prompt-text');
        const fade = document.getElementById('prompt-text-fade');
        const btn = document.getElementById('prompt-expand-btn');
        document.getElementById('prompt-display').classList.remove('hidden');
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
                    if (expanded) { el.style.maxHeight = ''; el.style.overflow = ''; fade.classList.add('hidden'); btn.textContent = 'Свернуть'; }
                    else { el.style.maxHeight = maxH + 'px'; el.style.overflow = 'hidden'; fade.classList.remove('hidden'); btn.textContent = 'Открыть полностью'; }
                };
            }
        });
    }

    function hidePromptDisplay() { document.getElementById('prompt-display').classList.add('hidden'); document.getElementById('prompt-text').textContent = ''; document.getElementById('prompt-text-fade').classList.add('hidden'); document.getElementById('prompt-expand-btn').classList.add('hidden'); }
    function showEmptyState() { document.getElementById('empty-state').classList.remove('hidden'); }
    function hideEmptyState() { document.getElementById('empty-state').classList.add('hidden'); }
    function clearBenchmarkList() { document.getElementById('benchmark-list').innerHTML = ''; }
    function showLoading() { document.getElementById('loading-state').classList.remove('hidden'); }
    function hideLoading() { document.getElementById('loading-state').classList.add('hidden'); }
    function showError(msg) { const el = document.getElementById('error-state'); el.classList.remove('hidden'); if (msg) document.getElementById('error-state-text').textContent = msg; }
    function hideError() { document.getElementById('error-state').classList.add('hidden'); }
    function showNoResults() { document.getElementById('no-results-state').classList.remove('hidden'); }
    function hideNoResults() { document.getElementById('no-results-state').classList.add('hidden'); }

    function renderBars(result) {
        let scoresHtml = '';
        const keys = ['s_visual', 's_animation', 's_creative', 's_code', 's_detail'];
        CRITERIA.forEach((c, ci) => {
            const score = parseFloat(result[keys[ci]]) || 0;
            const pct = (score / MAX_PER) * 100;
            scoresHtml += `
                <div class="w-full">
                    <div class="flex justify-between text-xs mb-2.5 uppercase tracking-widest text-gray-400">
                        <span>${c}</span>
                        <span class="text-white font-bold">${score.toFixed(1)} / 10</span>
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
        return d.innerHTML.replace(/"/g, '&quot;');
    }

    function renderSvgBlock(result) {
        if (!result.svg_content) return '';
        const modelSlug = (result.models ? result.models.name : 'model').replace(/[^a-zA-Z0-9]/g, '_');
        const svgId = 'svg-preview-' + result.id + '-' + Math.random().toString(36).slice(2, 8);
        return `
            <div class="mt-4 w-full">
                <div class="svg-viewer-box border border-border overflow-hidden" style="max-width:220px;width:100%;aspect-ratio:1/1;">
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

    function parseDate(dateVal) {
        if (!dateVal) return 0;
        if (typeof dateVal === 'string') {
            const iso = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3])).getTime();
        }
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    }

    function formatDateDisplay(dateVal) {
        if (!dateVal) return '—';
        if (typeof dateVal === 'string') {
            const parts = dateVal.split('-');
            if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
        }
        const d = new Date(dateVal);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}.${d.getFullYear()}`;
    }

    function sanitizeSvg(svgStr) {
        return svgStr
            .replace(/<\?xml[^?]*\?>/gi, '')
            .replace(/<!DOCTYPE[^>]*>/gi, '')
            .replace(/\s+xmlns\s*=\s*["']/g, ' xmlns="')
            .replace(/<svg(?![^>]*xmlns)/, '<svg xmlns="http://www.w3.org/2000/svg"')
            .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
            .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
    }

    function getParamLabel(result) {
        const rpvs = result.result_param_values || [];
        if (rpvs.length === 0) return '';
        return rpvs.map(rpv => {
            const mpv = rpv.model_param_values;
            if (!mpv) return '';
            const mp = mpv.model_params;
            return mp ? `${mp.name}: ${mpv.value}` : mpv.value;
        }).filter(Boolean).join(' + ');
    }

    function renderBenchmarkList() {
        const listContainer = document.getElementById('benchmark-list');
        activeMessageHandlers.forEach(h => window.removeEventListener('message', h));
        activeMessageHandlers = [];
        pendingTimeouts.forEach(t => clearTimeout(t));
        pendingTimeouts = [];
        listContainer.innerHTML = '';

        let displayResults = [...resultsData];

        if (currentSort === 'date') {
            displayResults.sort((a, b) => parseDate(b.test_date) - parseDate(a.test_date));
        }

        if (currentTop !== 'all') displayResults = displayResults.slice(0, parseInt(currentTop));

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            displayResults = displayResults.filter(r => {
                const modelName = r.models ? r.models.name : '';
                return modelName.toLowerCase().includes(q) ||
                    (r.author && r.author.toLowerCase().includes(q));
            });
        }

        hideNoResults();
        if (displayResults.length === 0 && resultsData.length > 0) { showNoResults(); return; }

        displayResults.forEach((result, idx) => {
            const modelName = result.models ? result.models.name : '—';
            const spaceName = result.model_spaces ? result.model_spaces.name : '';
            const paramLabel = getParamLabel(result);
            const authorLine = result.author ? `<span class="text-[10px] text-gray-500 font-mono">by ${escapeHtml(result.author)}</span>` : '';
            const rank = idx + 1;
            const rankDisplay = String(rank).padStart(2, '0');

            let labelsHtml = '';
            if (spaceName) {
                labelsHtml += `<span class="text-[12px] font-bold tracking-[0.15em] text-gray-300 uppercase">${escapeHtml(spaceName)}</span>`;
            }
            if (paramLabel) {
                labelsHtml += ` <span class="text-[10px] text-purple-400/60 font-mono">${escapeHtml(paramLabel)}</span>`;
            }

            const scoresHtml = renderBars(result);
            const svgBlock = renderSvgBlock(result);
            const dateStr = formatDateDisplay(result.test_date);

            const card = document.createElement('div');
            card.className = "matte-card p-4 sm:p-8 border border-border hover:border-white/50 transition-colors duration-300 flex flex-col bg-surface benchmark-card group";

            card.innerHTML = `
                <div class="flex flex-col lg:flex-row gap-0 items-stretch">
                    <div class="w-full lg:w-[28%] flex flex-col justify-center text-center lg:text-left border-b lg:border-b-0 lg:border-r border-border pb-4 sm:pb-6 lg:pb-0 pr-0 lg:pr-8 relative">
                        <span class="text-[10px] font-mono text-white/30 group-hover:text-white/50 transition-colors tracking-widest mb-1">#${rankDisplay}</span>
                        <h3 class="font-title text-xl sm:text-2xl lg:text-3xl uppercase tracking-wider text-[#F2F2F2] mb-2 group-hover:text-white transition-colors">${escapeHtml(modelName)}</h3>
                        <span class="text-[10px] uppercase font-mono text-gray-400 tracking-widest">${dateStr}</span>
                        <div class="mt-2">${labelsHtml} ${authorLine}</div>
                    </div>
                    <div class="w-full lg:flex-1 flex flex-col md:flex-row items-center justify-between mt-4 sm:mt-6 lg:mt-0 lg:pl-10 group/bracket">
                        <div class="flex-grow flex flex-col gap-y-4 sm:gap-y-5 w-full scores-container self-stretch justify-center">
                            ${scoresHtml}
                        </div>
                        <svg preserveAspectRatio="none" viewBox="0 0 36 100" class="hidden md:block w-[28px] mx-6 text-white/40 stroke-current transition-colors duration-500 group-hover/bracket:text-white/80 self-stretch" fill="none">
                            <path d="M 2 1 C 18 1 18 8 18 20 L 18 42 C 18 48 18 49 34 50 C 18 51 18 52 18 58 L 18 80 C 18 92 18 99 2 99" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <div class="flex-shrink-0 relative z-30 group/score text-center md:text-left mt-6 sm:mt-8 md:mt-0 md:w-56 pl-0 md:pl-2 pr-0 md:pr-12">
                            <span class="text-[10px] sm:text-[12px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-2">Общий балл</span>
                            <span class="font-title text-[48px] sm:text-[64px] lg:text-[76px] leading-none text-[#F2F2F2] font-bold overall-score" data-raw="${result.overall}">${Math.floor(parseFloat(result.overall) || 0)}</span>
                            ${svgBlock}
                            <div class="absolute left-1/2 lg:left-0 -translate-x-1/2 lg:translate-x-0 bottom-full mb-3 opacity-0 group-hover/score:opacity-100 transition-opacity duration-300 pointer-events-none bg-surface border border-border p-4 text-[10px] font-mono tracking-widest text-gray-400 whitespace-nowrap z-[100] shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                                Формула вычисления:<br>
                                <span class="text-white mt-1 block">(Сумма 5) × 1.8 = Max 90</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            if (result.svg_content) {
                const sanitized = sanitizeSvg(result.svg_content);
                const svgIframe = card.querySelector('.svg-iframe');
                if (svgIframe) {
                    const iframeSrc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:transparent;display:flex;align-items:center;justify-content:center;width:100%;height:100%;overflow:hidden;cursor:pointer}svg{max-width:100%;max-height:100%;width:auto;height:auto}</style></head><body onclick="parent.postMessage({type:'svg-open',id:'${svgIframe.id}'},'*')">${sanitized}</body></html>`;
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
                    activeMessageHandlers.push(handler);
                }
                const downloadBtn = card.querySelector('.svg-download-btn');
                if (downloadBtn) {
                    downloadBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const slug = downloadBtn.getAttribute('data-model-slug');
                        const blob = new Blob([result.svg_content], { type: 'image/svg+xml' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = slug + '.svg';
                        document.body.appendChild(a); a.click(); document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    });
                }
            }

            listContainer.appendChild(card);
        });

        if (barObserver) barObserver.disconnect();
        barObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.querySelectorAll('.hatching-fill').forEach(bar => { bar.style.width = bar.getAttribute('data-target'); });
                    barObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        document.querySelectorAll('.benchmark-card').forEach(card => barObserver.observe(card));
    }

    return { load, setSearch(q) { searchQuery = q; renderBenchmarkList(); }, retry() { load(); } };
})();
