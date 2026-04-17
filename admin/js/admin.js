const AdminApp = (() => {
    let currentSection = 'prompts';
    let currentDifficulty = 'easy';
    let modelsData = [];
    let allPromptsData = [];

    function showModal(html) {
        document.getElementById('modal-content').innerHTML = html;
        document.getElementById('modal-overlay').classList.remove('hidden');
    }

    function hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('modal-content').innerHTML = '';
    }

    async function checkAuth() {
        if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
            showAuth();
            return;
        }
        Api.reinit();
        const session = await Api.getSession();
        if (session) {
            const admin = await Api.isAdmin();
            if (admin) {
                showAdmin(session.user.email);
            } else {
                await Api.logout();
                showAuth('Нет прав администратора');
            }
        } else {
            showAuth();
        }
    }

    function showAuth(errMsg) {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('admin-screen').classList.add('hidden');
        if (errMsg) {
            const errEl = document.getElementById('login-error');
            errEl.textContent = errMsg;
            errEl.classList.remove('hidden');
        }
    }

    function showAdmin(email) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('admin-screen').classList.remove('hidden');
        document.getElementById('admin-email').textContent = email || '';
        loadPrompts();
        loadModels();
    }

    async function loadPrompts() {
        try {
            allPromptsData = await Api.getAllPrompts();
        } catch {
            allPromptsData = [];
        }
        renderPromptsList();
        renderModelsPromptFilter();
    }

    function getPromptsByDiff(diff) {
        return allPromptsData.filter(p => p.difficulty === diff);
    }

    function renderPromptsList() {
        const container = document.getElementById('prompts-list');
        const prompts = getPromptsByDiff(currentDifficulty);
        if (prompts.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-xs uppercase tracking-widest">Нет промптов</p>';
            return;
        }
        container.innerHTML = prompts.map((p, i) => `
            <div class="admin-prompt-card flex justify-between items-start gap-4">
                <div class="flex-1">
                    <span class="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">Промпт #${i + 1} (id: ${p.id})</span>
                    <span class="text-sm text-gray-300 leading-relaxed">${p.text}</span>
                </div>
                <div class="flex-shrink-0 flex gap-2">
                    <button class="text-gray-400 hover:text-white transition-colors text-xs" onclick="AdminApp.editPrompt(${p.id})">Ред.</button>
                    <button class="text-red-400/60 hover:text-red-400 transition-colors text-xs" onclick="AdminApp.deletePrompt(${p.id})">Удал.</button>
                </div>
            </div>
        `).join('');
    }

    async function loadModels() {
        try {
            modelsData = await Api.getAllModels();
        } catch {
            modelsData = [];
        }
        renderModelsList();
    }

    function renderModelsPromptFilter() {
        const select = document.getElementById('models-prompt-filter');
        select.innerHTML = '<option value="all">Все</option>';
        allPromptsData.forEach(p => {
            const shortText = p.text.length > 60 ? p.text.substring(0, 60) + '...' : p.text;
            const diffLabel = p.difficulty === 'easy' ? 'Лёгкий' : p.difficulty === 'medium' ? 'Средний' : 'Сложный';
            select.innerHTML += `<option value="${p.id}">#${p.id} [${diffLabel}] ${shortText}</option>`;
        });
    }

    function renderModelsList() {
        const filterVal = document.getElementById('models-prompt-filter').value;
        const filtered = filterVal === 'all' ? modelsData : modelsData.filter(m => m.prompt_id === parseInt(filterVal));

        const container = document.getElementById('models-list');
        if (filtered.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-xs uppercase tracking-widest">Нет моделей</p>';
            return;
        }
        container.innerHTML = filtered.map((m, i) => {
            const promptInfo = m.prompts ? `[${m.prompts.difficulty}] #${m.prompts.id}` : `prompt #${m.prompt_id}`;
            const variants = m.variants || [];
            const variantLabel = variants.length > 0 ? variants[0].label : '—';
            const bestScore = m.best_overall || '—';
            return `
                <div class="admin-prompt-card flex justify-between items-start gap-4">
                    <div class="flex-1">
                        <span class="text-white font-bold">${m.name}</span>
                        <span class="text-gray-400 ml-2 text-xs">${variantLabel}</span>
                        ${m.author ? `<span class="text-gray-500 ml-2 text-xs">${m.author}</span>` : ''}
                        <span class="text-xs text-gray-500 block mt-1">Промпт: ${promptInfo} | Балл: ${bestScore}${m.svg_content ? ' | SVG ✓' : ''}</span>
                    </div>
                    <div class="flex-shrink-0 flex gap-2">
                        <button class="text-gray-400 hover:text-white transition-colors text-xs" onclick="AdminApp.editModel(${m.id})">Ред.</button>
                        <button class="text-red-400/60 hover:text-red-400 transition-colors text-xs" onclick="AdminApp.deleteModel(${m.id})">Удал.</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function showAddModelForm() {
        if (allPromptsData.length === 0) {
            alert('Сначала добавьте хотя бы один промпт');
            return;
        }
        const promptsOptions = allPromptsData.map(p => {
            const diffLabel = p.difficulty === 'easy' ? 'Лёгкий' : p.difficulty === 'medium' ? 'Средний' : 'Сложный';
            const shortText = p.text.length > 50 ? p.text.substring(0, 50) + '...' : p.text;
            return `<option value="${p.id}">[${diffLabel}] #${p.id} ${shortText}</option>`;
        }).join('');

        showModal(`
            <h3 class="font-title text-lg uppercase tracking-widest mb-6">Добавить модель</h3>
            <form id="model-form" class="flex flex-col gap-4">
                <label class="flex flex-col gap-1">
                    <span class="text-xs uppercase tracking-widest text-gray-400">Промпт *</span>
                    <select name="prompt_id" required class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white outline-none focus:border-white/50">
                        <option value="">Выберите промпт</option>
                        ${promptsOptions}
                    </select>
                </label>
                <label class="flex flex-col gap-1">
                    <span class="text-xs uppercase tracking-widest text-gray-400">Название модели *</span>
                    <input name="name" placeholder="Gemini 3.1 Pro" required
                        class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50">
                </label>
                <input name="author" placeholder="Автор (опционально)"
                    class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50">
                <div class="border border-white/20 p-4">
                    <p class="text-xs uppercase tracking-widest text-gray-400 mb-3">Пространство (подмодель)</p>
                    <input name="space" placeholder="AI Studio, Claude.ai, ChatGPT..." required
                        class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50 mb-2">
                    <input name="test_date" type="text" placeholder="Дата теста (напр. 07.06.2026)" required
                        class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50 mb-2">
                    <div class="grid grid-cols-5 gap-2 mt-2">
                        <input name="s0" type="number" step="0.1" min="0" max="10" placeholder="Визуал" required
                            class="w-full bg-white/5 border border-white/20 px-2 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-white/50">
                        <input name="s1" type="number" step="0.1" min="0" max="10" placeholder="Анимация" required
                            class="w-full bg-white/5 border border-white/20 px-2 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-white/50">
                        <input name="s2" type="number" step="0.1" min="0" max="10" placeholder="Креатив" required
                            class="w-full bg-white/5 border border-white/20 px-2 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-white/50">
                        <input name="s3" type="number" step="0.1" min="0" max="10" placeholder="Код" required
                            class="w-full bg-white/5 border border-white/20 px-2 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-white/50">
                        <input name="s4" type="number" step="0.1" min="0" max="10" placeholder="Детали" required
                            class="w-full bg-white/5 border border-white/20 px-2 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-white/50">
                    </div>
                </div>
                <label class="flex flex-col gap-1">
                    <span class="text-xs uppercase tracking-widest text-gray-400">SVG результат</span>
                    <div class="flex gap-2">
                        <input type="file" id="svg-file-input" accept=".svg" class="text-xs text-gray-400 file:mr-2 file:py-2 file:px-3 file:border file:border-white/20 file:bg-white/5 file:text-white file:text-xs file:uppercase file:tracking-widest file:cursor-pointer">
                        <button type="button" id="svg-paste-btn" class="text-[10px] uppercase tracking-widest border border-white/20 px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors">Вставить код</button>
                    </div>
                    <textarea name="svg_content" id="svg-content-area" rows="4" placeholder="SVG-код или загрузите файл..." style="display:none"
                        class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50 resize-y font-mono text-xs"></textarea>
                </label>
                <div class="flex gap-3 mt-2">
                    <button type="submit" class="flex-1 bg-white text-black py-3 text-xs uppercase tracking-widest font-bold hover:bg-gray-200 transition-colors">Сохранить</button>
                    <button type="button" onclick="AdminApp.closeModal()" class="flex-1 border border-white/20 py-3 text-xs uppercase tracking-widest hover:bg-white/10 transition-colors">Отмена</button>
                </div>
            </form>
        `);

        const svgFileInput = document.getElementById('svg-file-input');
        const svgContentArea = document.getElementById('svg-content-area');
        const svgPasteBtn = document.getElementById('svg-paste-btn');

        svgPasteBtn.addEventListener('click', () => {
            svgContentArea.style.display = svgContentArea.style.display === 'none' ? '' : 'none';
        });

        svgFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                svgContentArea.value = ev.target.result;
                svgContentArea.style.display = '';
            };
            reader.readAsText(file);
        });

        document.getElementById('model-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const scores = [
                parseFloat(fd.get('s0')), parseFloat(fd.get('s1')),
                parseFloat(fd.get('s2')), parseFloat(fd.get('s3')),
                parseFloat(fd.get('s4'))
            ];
            const overall = (scores.reduce((a, b) => a + b, 0)) * 1.8;
            const model = {
                prompt_id: parseInt(fd.get('prompt_id')),
                name: fd.get('name'),
                author: fd.get('author') || null,
                variants: [{
                    label: fd.get('space'),
                    date: fd.get('test_date'),
                    scores,
                    overall: parseFloat(overall.toFixed(1))
                }],
                best_overall: parseFloat(overall.toFixed(1)),
                svg_content: document.getElementById('svg-content-area').value || null
            };
            try {
                await Api.addModel(model);
                await loadModels();
                hideModal();
            } catch (err) {
                alert('Ошибка сохранения: ' + err.message);
            }
        });
    }

    function showAddPromptForm() {
        showModal(`
            <h3 class="font-title text-lg uppercase tracking-widest mb-6">Добавить промпт</h3>
            <form id="prompt-form" class="flex flex-col gap-4">
                <select name="difficulty" required class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white outline-none focus:border-white/50">
                    <option value="easy" ${currentDifficulty === 'easy' ? 'selected' : ''}>Лёгкий</option>
                    <option value="medium" ${currentDifficulty === 'medium' ? 'selected' : ''}>Средний</option>
                    <option value="hard" ${currentDifficulty === 'hard' ? 'selected' : ''}>Сложный</option>
                </select>
                <textarea name="text" rows="8" placeholder="Текст промпта..." required
                    class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50 resize-y"></textarea>
                <div class="flex gap-3 mt-2">
                    <button type="submit" class="flex-1 bg-white text-black py-3 text-xs uppercase tracking-widest font-bold hover:bg-gray-200 transition-colors">Сохранить</button>
                    <button type="button" onclick="AdminApp.closeModal()" class="flex-1 border border-white/20 py-3 text-xs uppercase tracking-widest hover:bg-white/10 transition-colors">Отмена</button>
                </div>
            </form>
        `);

        document.getElementById('prompt-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                await Api.addPrompt({ difficulty: fd.get('difficulty'), text: fd.get('text') });
                await loadPrompts();
                hideModal();
            } catch (err) {
                alert('Ошибка сохранения: ' + err.message);
            }
        });
    }

    async function deleteModel(id) {
        if (!confirm('Удалить модель?')) return;
        try {
            await Api.deleteModel(id);
            await loadModels();
        } catch (err) {
            alert('Ошибка удаления: ' + err.message);
        }
    }

    async function deletePrompt(id) {
        if (!confirm('Удалить промпт? Связанные модели тоже удалятся.')) return;
        try {
            await Api.deletePrompt(id);
            await loadPrompts();
            await loadModels();
        } catch (err) {
            alert('Ошибка удаления: ' + err.message);
        }
    }

    function editModel(id) {
        const model = modelsData.find(m => m.id === id);
        if (!model) return;

        const promptsOptions = allPromptsData.map(p => {
            const diffLabel = p.difficulty === 'easy' ? 'Лёгкий' : p.difficulty === 'medium' ? 'Средний' : 'Сложный';
            const shortText = p.text.length > 50 ? p.text.substring(0, 50) + '...' : p.text;
            const selected = p.id === model.prompt_id ? 'selected' : '';
            return `<option value="${p.id}" ${selected}>[${diffLabel}] #${p.id} ${shortText}</option>`;
        }).join('');

        const firstVariant = (model.variants && model.variants[0]) || {};

        showModal(`
            <h3 class="font-title text-lg uppercase tracking-widest mb-6">Редактировать модель</h3>
            <form id="model-edit-form" class="flex flex-col gap-4">
                <label class="flex flex-col gap-1">
                    <span class="text-xs uppercase tracking-widest text-gray-400">Промпт *</span>
                    <select name="prompt_id" required class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white outline-none focus:border-white/50">
                        ${promptsOptions}
                    </select>
                </label>
                <input name="name" value="${model.name || ''}" placeholder="Название модели" required
                    class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50">
                <input name="author" value="${model.author || ''}" placeholder="Автор (опционально)"
                    class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50">
                <div class="border border-white/20 p-4">
                    <p class="text-xs uppercase tracking-widest text-gray-400 mb-3">Пространство (подмодель)</p>
                    <input name="space" value="${firstVariant.label || ''}" placeholder="AI Studio, Claude.ai..." required
                        class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50 mb-2">
                    <input name="test_date" type="text" value="${firstVariant.date || ''}" placeholder="Дата теста" required
                        class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50 mb-2">
                    <div class="grid grid-cols-5 gap-2 mt-2">
                        ${[0,1,2,3,4].map(ci => `<input name="s${ci}" type="number" step="0.1" min="0" max="10" value="${firstVariant.scores ? firstVariant.scores[ci] : ''}" placeholder="${['Визуал','Анимация','Креатив','Код','Детали'][ci]}" required
                            class="w-full bg-white/5 border border-white/20 px-2 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-white/50">`).join('')}
                    </div>
                </div>
                <label class="flex flex-col gap-1">
                    <span class="text-xs uppercase tracking-widest text-gray-400">SVG результат</span>
                    <div class="flex gap-2">
                        <input type="file" id="svg-file-input-edit" accept=".svg" class="text-xs text-gray-400 file:mr-2 file:py-2 file:px-3 file:border file:border-white/20 file:bg-white/5 file:text-white file:text-xs file:uppercase file:tracking-widest file:cursor-pointer">
                        <button type="button" id="svg-paste-btn-edit" class="text-[10px] uppercase tracking-widest border border-white/20 px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors">Вставить код</button>
                    </div>
                    <textarea name="svg_content" id="svg-content-area-edit" rows="4" placeholder="SVG-код или загрузите файл..." style="${model.svg_content ? '' : 'display:none'}"
                        class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50 resize-y font-mono text-xs">${model.svg_content || ''}</textarea>
                </label>
                <div class="flex gap-3 mt-2">
                    <button type="submit" class="flex-1 bg-white text-black py-3 text-xs uppercase tracking-widest font-bold hover:bg-gray-200 transition-colors">Обновить</button>
                    <button type="button" onclick="AdminApp.closeModal()" class="flex-1 border border-white/20 py-3 text-xs uppercase tracking-widest hover:bg-white/10 transition-colors">Отмена</button>
                </div>
            </form>
        `);

        const svgFileInputEdit = document.getElementById('svg-file-input-edit');
        const svgContentAreaEdit = document.getElementById('svg-content-area-edit');
        const svgPasteBtnEdit = document.getElementById('svg-paste-btn-edit');

        svgPasteBtnEdit.addEventListener('click', () => {
            svgContentAreaEdit.style.display = svgContentAreaEdit.style.display === 'none' ? '' : 'none';
        });

        svgFileInputEdit.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                svgContentAreaEdit.value = ev.target.result;
                svgContentAreaEdit.style.display = '';
            };
            reader.readAsText(file);
        });

        document.getElementById('model-edit-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const scores = [0,1,2,3,4].map(ci => parseFloat(fd.get('s' + ci)));
            const overall = (scores.reduce((a, b) => a + b, 0)) * 1.8;
            try {
                await Api.updateModel(id, {
                    prompt_id: parseInt(fd.get('prompt_id')),
                    name: fd.get('name'),
                    author: fd.get('author') || null,
                    variants: [{
                        label: fd.get('space'),
                        date: fd.get('test_date'),
                        scores,
                        overall: parseFloat(overall.toFixed(1))
                    }],
                    best_overall: parseFloat(overall.toFixed(1)),
                    svg_content: document.getElementById('svg-content-area-edit').value || null
                });
                await loadModels();
                hideModal();
            } catch (err) {
                alert('Ошибка обновления: ' + err.message);
            }
        });
    }

    function editPrompt(id) {
        const prompt = allPromptsData.find(p => p.id === id);
        if (!prompt) return;
        showModal(`
            <h3 class="font-title text-lg uppercase tracking-widest mb-6">Редактировать промпт</h3>
            <form id="prompt-edit-form" class="flex flex-col gap-4">
                <select name="difficulty" required class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white outline-none focus:border-white/50">
                    <option value="easy" ${prompt.difficulty === 'easy' ? 'selected' : ''}>Лёгкий</option>
                    <option value="medium" ${prompt.difficulty === 'medium' ? 'selected' : ''}>Средний</option>
                    <option value="hard" ${prompt.difficulty === 'hard' ? 'selected' : ''}>Сложный</option>
                </select>
                <textarea name="text" rows="8" required
                    class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50 resize-y">${prompt.text}</textarea>
                <div class="flex gap-3 mt-2">
                    <button type="submit" class="flex-1 bg-white text-black py-3 text-xs uppercase tracking-widest font-bold hover:bg-gray-200 transition-colors">Обновить</button>
                    <button type="button" onclick="AdminApp.closeModal()" class="flex-1 border border-white/20 py-3 text-xs uppercase tracking-widest hover:bg-white/10 transition-colors">Отмена</button>
                </div>
            </form>
        `);

        document.getElementById('prompt-edit-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                await Api.updatePrompt(id, { text: fd.get('text'), difficulty: fd.get('difficulty') });
                await loadPrompts();
                await loadModels();
                hideModal();
            } catch (err) {
                alert('Ошибка обновления: ' + err.message);
            }
        });
    }

    function init() {
        window.SUPABASE_URL = window.SUPABASE_URL || '';
        window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errEl = document.getElementById('login-error');
            try {
                const result = await Api.login(email, password);
                errEl.classList.add('hidden');
                const admin = await Api.isAdmin();
                if (admin) {
                    showAdmin(result.user.email);
                } else {
                    await Api.logout();
                    errEl.textContent = 'Нет прав администратора';
                    errEl.classList.remove('hidden');
                }
            } catch (err) {
                errEl.textContent = 'Ошибка входа: ' + err.message;
                errEl.classList.remove('hidden');
            }
        });

        document.getElementById('logout-btn').addEventListener('click', async () => {
            await Api.logout();
            showAuth();
        });

        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentSection = btn.getAttribute('data-section');
                document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
                document.getElementById('section-' + currentSection).classList.remove('hidden');
            });
        });

        document.querySelectorAll('.admin-difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.admin-difficulty-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentDifficulty = btn.getAttribute('data-diff');
                renderPromptsList();
            });
        });

        document.getElementById('add-model-btn').addEventListener('click', showAddModelForm);
        document.getElementById('add-prompt-btn').addEventListener('click', showAddPromptForm);

        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') hideModal();
        });

        document.getElementById('models-prompt-filter').addEventListener('change', () => {
            renderModelsList();
        });

        checkAuth();
    }

    return { init, editModel, deleteModel, editPrompt, deletePrompt, closeModal: hideModal };
})();

document.addEventListener('DOMContentLoaded', AdminApp.init);
