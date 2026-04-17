const CRITERIA = ["Визуал", "Анимация", "Креатив", "Код", "Детали"];
const MAX_PER = 10;
const MAX_TOTAL = 90;

const LeaderboardModule = (() => {
    let models = [];

    async function loadModels() {
        try {
            const data = await Api.getModels();
            models = data;
        } catch {
            models = getDefaultModels();
        }
        models.forEach(m => {
            m.bestOverall = Math.max(...m.variants.map(v => v.overall));
        });
        models.sort((a, b) => b.bestOverall - a.bestOverall);
        return models;
    }

    function getDefaultModels() {
        return [
            { 
                name: "Gemini 3.1 Pro", 
                variants: [
                    { label: "Preview ArenaAI", date: "07.04.2026", scores: [9.5, 9.0, 9.2, 8.8, 9.3], overall: 82.4 },
                    { label: "Preview AI.dev High", date: "07.04.2026", scores: [9.7, 8.9, 9.1, 9.0, 9.5], overall: 83.1 },
                    { label: "AI.dev High", date: "07.04.2026", scores: [9.6, 9.2, 9.0, 8.7, 9.4], overall: 82.8 },
                    { label: "Google.Gemini", date: "07.06.2026", scores: [9.4, 9.1, 9.3, 8.5, 9.2], overall: 82.0 },
                    { label: "Opus Distill", date: "04.05.2026", scores: [9.2, 8.8, 9.0, 9.1, 9.0], overall: 81.3 },
                    { label: "Canvas Google.Gemini", date: "09.04.2026", scores: [9.8, 9.5, 9.4, 8.9, 9.6], overall: 85.2 },
                    { label: "Canvas AI.dev", date: "13.04.2026", scores: [9.7, 9.3, 9.5, 8.8, 9.5], overall: 84.6 },
                    { label: "Canvas", date: "08.04.2026", scores: [9.5, 9.2, 9.2, 8.9, 9.3], overall: 83.0 }
                ] 
            },
            { 
                name: "Opus", 
                author: "@Vrabet", 
                variants: [
                    { label: "Claude.AI", date: "07.06.2026", scores: [9.3, 8.7, 9.5, 9.0, 8.9], overall: 81.7 },
                    { label: "AG", date: "04.05.2026", scores: [9.1, 8.5, 9.2, 9.3, 8.8], overall: 80.8 },
                    { label: "4.6 AG", date: "08.04.2026", scores: [9.5, 8.9, 9.6, 9.1, 9.2], overall: 83.3 },
                    { label: "4.6 LMArena", date: "04.03.2026", scores: [9.4, 8.8, 9.4, 9.2, 9.0], overall: 82.5 }
                ] 
            },
            { 
                name: "GPT 5.4 Thinking", 
                variants: [
                    { label: "Ext", date: "07.06.2026", scores: [9.0, 8.5, 8.8, 9.2, 8.6], overall: 79.4 },
                    { label: "Default", date: "04.03.2026", scores: [8.9, 8.4, 8.7, 9.0, 8.5], overall: 78.3 }
                ] 
            },
            { 
                name: "GPT 5.4 Pro", 
                variants: [
                    { label: "Ext", date: "15.04.2026", scores: [8.8, 8.3, 8.5, 9.0, 8.4], overall: 77.0 },
                    { label: "Ext", date: "10.04.2026", scores: [8.7, 8.2, 8.4, 8.9, 8.3], overall: 76.2 }
                ] 
            },
            { 
                name: "GPT 5.4", 
                variants: [
                    { label: "Ext", date: "08.04.2026", scores: [8.6, 8.1, 8.3, 8.8, 8.2], overall: 75.0 }
                ] 
            },
            { 
                name: "Gemini Pro Latest", 
                variants: [
                    { label: "AI.dev", date: "07.04.2026", scores: [8.8, 8.9, 8.5, 8.7, 8.8], overall: 78.1 },
                    { label: "AI.dev High", date: "14.04.2026", scores: [9.0, 9.1, 8.8, 8.9, 9.0], overall: 80.6 }
                ] 
            },
            { 
                name: "Gemini DeepThink", 
                variants: [
                    { label: "Default", date: "04.03.2026", scores: [9.1, 8.2, 9.0, 8.4, 8.6], overall: 77.5 }
                ] 
            },
            { 
                name: "Grok 4.20", 
                variants: [
                    { label: "Expert", date: "09.04.2026", scores: [8.6, 8.3, 8.9, 8.5, 8.4], overall: 76.2 }
                ] 
            },
            { 
                name: "DeepSeek", 
                variants: [
                    { label: "Expert + DeepThink + Search", date: "07.06.2026", scores: [8.4, 7.8, 8.6, 8.9, 8.1], overall: 74.8 },
                    { label: "Old + DeepThink", date: "07.06.2026", scores: [8.1, 7.5, 8.3, 8.5, 7.8], overall: 72.4 }
                ] 
            },
            { 
                name: "Qwen 3.6 Plus", 
                variants: [
                    { label: "Chat.Qwen.AI", date: "07.06.2026", scores: [8.2, 8.0, 8.3, 8.1, 8.5], overall: 73.0 },
                    { label: "Arena.AI", date: "08.04.2026", scores: [8.0, 7.8, 8.1, 7.9, 8.2], overall: 71.0 }
                ] 
            },
            { 
                name: "Kimi K2.5", 
                variants: [
                    { label: "Thinking", date: "07.06.2026", scores: [8.0, 7.5, 8.4, 8.2, 7.8], overall: 71.6 }
                ] 
            },
            { 
                name: "GPT 5.2 Pro", 
                variants: [
                    { label: "Ext", date: "07.06.2026", scores: [7.9, 7.8, 7.6, 8.5, 7.7], overall: 70.9 }
                ] 
            },
            { 
                name: "GLM 5.1", 
                variants: [
                    { label: "Arena.AI", date: "07.06.2026", scores: [7.8, 7.4, 7.9, 7.6, 8.0], overall: 69.3 }
                ] 
            },
            { 
                name: "GLM 5", 
                variants: [
                    { label: "Turbo", date: "07.06.2026", scores: [7.5, 7.2, 7.8, 7.3, 7.6], overall: 67.2 },
                    { label: "Agent", date: "04.03.2026", scores: [7.3, 7.0, 7.5, 7.1, 7.4], overall: 65.4 }
                ] 
            },
            { 
                name: "MiniMax 2.7", 
                variants: [
                    { label: "Default", date: "07.06.2026", scores: [7.3, 6.9, 7.5, 7.0, 7.4], overall: 65.0 }
                ] 
            },
            { 
                name: "GLM 5v-Turbo", 
                variants: [
                    { label: "Default", date: "07.06.2026", scores: [7.0, 6.8, 7.2, 6.9, 7.1], overall: 63.0 }
                ] 
            },
            { 
                name: "Musy Meta", 
                author: "@aldikosh23", 
                variants: [
                    { label: "Default", date: "09.04.2026", scores: [6.8, 6.5, 7.0, 6.2, 6.6], overall: 59.4 }
                ] 
            }
        ];
    }

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

    function render() {
        const listContainer = document.getElementById('benchmark-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        models.forEach((model, index) => {
            const groups = {};
            model.variants.forEach((v) => {
                if(!groups[v.label]) groups[v.label] = [];
                groups[v.label].push(v);
            });

            const uniqueLabels = Object.keys(groups);
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
                        <div class="date-dropdown-menu absolute z-50 top-full mt-2 left-0 w-max min-w-full bg-[#0A0A0A] border border-white/20 shadow-lg opacity-0 invisible transition-all duration-200 transform translate-y-[-10px] overflow-hidden">
                        </div>
                    </div>
            `;

            const card = document.createElement('div');
            card.className = "glass-panel p-8 border border-white/20 hover:border-white/50 transition-colors duration-300 flex flex-col lg:flex-row gap-8 items-stretch bg-black/60 benchmark-card group";
            
            card.innerHTML = `
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
            `;

            const dateBtn = card.querySelector('.date-dropdown-btn');
            const dateMenu = card.querySelector('.date-dropdown-menu');
            const dateDisplay = card.querySelector('.date-display-span');
            const chevron = card.querySelector('.date-chevron');
            
            const overallEl = card.querySelector('.overall-score');
            const scoreVals = card.querySelectorAll('.score-val');
            const scoreBars = card.querySelectorAll('.score-bar');

            function applyVariant(variant) {
                overallEl.style.opacity = 0;
                setTimeout(() => {
                    overallEl.textContent = variant.overall.toFixed(1);
                    overallEl.style.opacity = 1;
                }, 150);

                if (dateDisplay) {
                    dateDisplay.style.opacity = 0;
                    setTimeout(() => {
                        dateDisplay.textContent = variant.date;
                        dateDisplay.style.opacity = 1;
                    }, 150);
                }

                CRITERIA.forEach((c, ci) => {
                    const score = variant.scores[ci];
                    const pct = (score / MAX_PER) * 100;
                    
                    scoreVals[ci].style.opacity = 0;
                    setTimeout(() => {
                        scoreVals[ci].textContent = score.toFixed(1) + ' / 10';
                        scoreVals[ci].style.opacity = 1;
                    }, 150);

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
                        const targetIdx = parseInt(opt.getAttribute('data-idx'));
                        applyVariant(datesForLabel[targetIdx]);
                        closeMenu();
                    });
                });
            }

            if (dateBtn) {
                dateBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (dateMenu.classList.contains('visible')) {
                        closeMenu();
                    } else {
                        openMenu();
                    }
                });
            }

            if (uniqueLabels.length > 1) {
                const pills = card.querySelectorAll('.variant-pill');
                pills.forEach(pill => {
                    pill.addEventListener('click', (e) => {
                        const lbl = e.target.getAttribute('data-label');
                        
                        pills.forEach(p => {
                            p.className = "variant-pill px-3 py-1.5 text-[10px] uppercase tracking-wider border transition-all duration-200 cursor-pointer bg-transparent text-gray-400 border-white/20 hover:border-white/50 hover:text-white";
                        });
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
                    const bars = entry.target.querySelectorAll('.hatching-fill');
                    bars.forEach(bar => {
                        bar.style.width = bar.getAttribute('data-target');
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        document.querySelectorAll('.benchmark-card').forEach(card => {
            observer.observe(card);
        });
    }

    function setupFilters() {
        const filterBtns = document.querySelectorAll('.top-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const count = btn.getAttribute('data-count');
                const allCards = document.querySelectorAll('.benchmark-card');

                allCards.forEach((card, idx) => {
                    if (count === 'all' || idx < parseInt(count)) {
                        card.style.display = '';
                        setTimeout(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, 30);
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(20px)';
                        setTimeout(() => { card.style.display = 'none'; }, 300);
                    }
                });
            });
        });
    }

    return { loadModels, render, setupFilters };
})();
