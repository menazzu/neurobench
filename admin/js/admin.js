const AdminApp = (() => {
    let currentSection = 'models';
    let currentDifficulty = 'easy';
    let modelsData = [];
    let promptsData = [];

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
        loadModels();
        loadPrompts();
    }

    async function loadModels() {
        try {
            modelsData = await Api.getModels();
        } catch {
            modelsData = [];
        }
        renderModelsTable();
    }

    function renderModelsTable() {
        const tbody = document.getElementById('models-tbody');
        tbody.innerHTML = modelsData.map((m, i) => `
            <tr class="border-b border-white/10 hover:bg-white/5 transition-colors">
                <td class="py-3 px-2 text-gray-500">${i + 1}</td>
                <td class="py-3 px-2 text-white">${m.name || ''}</td>
                <td class="py-3 px-2 text-gray-400">${m.author || '—'}</td>
                <td class="py-3 px-2 text-white font-bold">${m.best_overall || m.bestOverall || '—'}</td>
                <td class="py-3 px-2 text-right">
                    <button class="text-gray-400 hover:text-white transition-colors mr-3" onclick="AdminApp.editModel(${m.id || i})">Ред.</button>
                    <button class="text-red-400/60 hover:text-red-400 transition-colors" onclick="AdminApp.deleteModel(${m.id || i})">Удал.</button>
                </td>
            </tr>
        `).join('');
    }

    async function loadPrompts() {
        try {
            promptsData = await Api.getPrompts();
        } catch {
            promptsData = { easy: [], medium: [], hard: [] };
        }
        renderPromptsList();
    }

    function renderPromptsList() {
        const container = document.getElementById('prompts-list');
        const prompts = promptsData[currentDifficulty] || [];
        if (prompts.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-xs uppercase tracking-widest">Нет промптов</p>';
            return;
        }
        container.innerHTML = prompts.map((p, i) => `
            <div class="admin-prompt-card flex justify-between items-start gap-4">
                <span class="flex-1">${typeof p === 'string' ? p : p.text}</span>
                <div class="flex-shrink-0 flex gap-2">
                    <button class="text-gray-400 hover:text-white transition-colors text-xs" onclick="AdminApp.editPrompt(${i})">Ред.</button>
                    <button class="text-red-400/60 hover:text-red-400 transition-colors text-xs" onclick="AdminApp.deletePrompt(${i})">Удал.</button>
                </div>
            </div>
        `).join('');
    }

    function showAddModelForm() {
        showModal(`
            <h3 class="font-title text-lg uppercase tracking-widest mb-6">Добавить модель</h3>
            <form id="model-form" class="flex flex-col gap-4">
                <input name="name" placeholder="Название модели" required
                    class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50">
                <input name="author" placeholder="Автор (опционально)"
                    class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50">
                <div class="border border-white/20 p-4">
                    <p class="text-xs uppercase tracking-widest text-gray-400 mb-3">Вариант</p>
                    <input name="variant_label" placeholder="Лейбл (напр. Default)" required
                        class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50 mb-2">
                    <input name="variant_date" type="text" placeholder="Дата (напр. 07.06.2026)" required
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
                <div class="flex gap-3 mt-2">
                    <button type="submit" class="flex-1 bg-white text-black py-3 text-xs uppercase tracking-widest font-bold hover:bg-gray-200 transition-colors">Сохранить</button>
                    <button type="button" onclick="AdminApp.closeModal()" class="flex-1 border border-white/20 py-3 text-xs uppercase tracking-widest hover:bg-white/10 transition-colors">Отмена</button>
                </div>
            </form>
        `);

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
                name: fd.get('name'),
                author: fd.get('author') || null,
                variants: [{
                    label: fd.get('variant_label'),
                    date: fd.get('variant_date'),
                    scores,
                    overall: parseFloat(overall.toFixed(1))
                }],
                best_overall: parseFloat(overall.toFixed(1))
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

    async function deletePrompt(idx) {
        if (!confirm('Удалить промпт?')) return;
        const prompts = promptsData[currentDifficulty] || [];
        const p = prompts[idx];
        if (!p) return;
        try {
            const id = typeof p === 'object' ? p.id : null;
            if (id) await Api.deletePrompt(id);
            await loadPrompts();
        } catch (err) {
            alert('Ошибка удаления: ' + err.message);
        }
    }

    function editModel(id) {
        const model = modelsData.find(m => m.id === id);
        if (!model) return;
        showModal(`
            <h3 class="font-title text-lg uppercase tracking-widest mb-6">Редактировать модель</h3>
            <form id="model-edit-form" class="flex flex-col gap-4">
                <input name="name" value="${model.name || ''}" placeholder="Название модели" required
                    class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50">
                <input name="author" value="${model.author || ''}" placeholder="Автор (опционально)"
                    class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50">
                <p class="text-xs uppercase tracking-widest text-gray-400">Варианты и баллы редактируются через Supabase Dashboard</p>
                <div class="flex gap-3 mt-2">
                    <button type="submit" class="flex-1 bg-white text-black py-3 text-xs uppercase tracking-widest font-bold hover:bg-gray-200 transition-colors">Обновить</button>
                    <button type="button" onclick="AdminApp.closeModal()" class="flex-1 border border-white/20 py-3 text-xs uppercase tracking-widest hover:bg-white/10 transition-colors">Отмена</button>
                </div>
            </form>
        `);

        document.getElementById('model-edit-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                await Api.updateModel(id, { name: fd.get('name'), author: fd.get('author') || null });
                await loadModels();
                hideModal();
            } catch (err) {
                alert('Ошибка обновления: ' + err.message);
            }
        });
    }

    function editPrompt(idx) {
        const prompts = promptsData[currentDifficulty] || [];
        const p = prompts[idx];
        if (!p) return;
        const text = typeof p === 'string' ? p : p.text;
        const id = typeof p === 'object' ? p.id : null;
        showModal(`
            <h3 class="font-title text-lg uppercase tracking-widest mb-6">Редактировать промпт</h3>
            <form id="prompt-edit-form" class="flex flex-col gap-4">
                <textarea name="text" rows="8" required
                    class="w-full bg-white/5 border border-white/20 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/50 resize-y">${text}</textarea>
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
                if (id) await Api.updatePrompt(id, { text: fd.get('text'), difficulty: currentDifficulty });
                await loadPrompts();
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

        checkAuth();
    }

    return { init, editModel, deleteModel, editPrompt, deletePrompt, closeModal: hideModal };
})();

document.addEventListener('DOMContentLoaded', AdminApp.init);
