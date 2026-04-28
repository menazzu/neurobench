const ForumModule = (() => {
    const THREADS_PER_PAGE = 20;
    const POSTS_PER_PAGE = 25;

    let currentView = 'list';
    let currentThreadId = null;
    let currentCategory = null;
    let currentPage = 0;
    let postPage = 0;
    let categories = [];
    let userInfo = null;
    let threadData = null;
    let postsData = [];
    let postsTotal = 0;
    let threadsTotal = 0;
    let pendingTimeouts = [];
    let abortControllers = [];

    function escapeHtml(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML.replace(/"/g, '&quot;');
    }

    function renderMarkdown(text) {
        if (!text) return '';
        let html = escapeHtml(text);
        html = html.replace(/&gt;\s(.+)/g, '<span class="forum-quote">$1</span>');
        html = html.replace(/```([\s\S]*?)```/g, '<pre class="forum-code-block"><code>$1</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code class="forum-inline-code">$1</code>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="forum-link">$1</a>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    function formatRelativeTime(dateVal) {
        if (!dateVal) return '';
        const d = new Date(dateVal);
        const now = new Date();
        const diff = Math.floor((now - d) / 1000);
        if (diff < 60) return 'только что';
        if (diff < 3600) return Math.floor(diff / 60) + ' мин. назад';
        if (diff < 86400) return Math.floor(diff / 3600) + ' ч. назад';
        if (diff < 2592000) return Math.floor(diff / 86400) + ' дн. назад';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}.${d.getFullYear()}`;
    }

    function formatDate(dateVal) {
        if (!dateVal) return '';
        const d = new Date(dateVal);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return `${day}.${month}.${d.getFullYear()} ${h}:${m}`;
    }

    function getUserDisplay(info) {
        const parts = [info.author_first_name, info.author_last_name].filter(Boolean);
        const name = parts.length > 0 ? parts.join(' ') : (info.author_username || 'Аноним');
        const photo = info.author_photo_url
            ? (info.author_photo_url.startsWith('/') ? 'https://t.me' + info.author_photo_url : info.author_photo_url)
            : null;
        const modBadge = info.is_author_moderator ? '<span class="forum-mod-badge">MOD</span>' : '';
        const profileLink = info.author_id
            ? `<a href="profile.html?id=${info.author_id}" class="forum-username">${escapeHtml(name)}</a>`
            : `<span class="forum-username">${escapeHtml(name)}</span>`;
        return { name, photo, modBadge, profileLink };
    }

    function canPost() {
        return userInfo && userInfo.is_verified && !userInfo.is_banned && !userInfo.is_muted;
    }

    function isModerator() {
        return userInfo && userInfo.is_moderator;
    }

    function cleanup() {
        pendingTimeouts.forEach(t => clearTimeout(t));
        pendingTimeouts = [];
        abortControllers.forEach(c => { try { c.abort(); } catch {} });
        abortControllers = [];
    }

    function setTimeoutSafe(fn, ms) {
        const id = setTimeout(fn, ms);
        pendingTimeouts.push(id);
        return id;
    }

    // ========== ROUTING ==========

    function route() {
        cleanup();
        const hash = window.location.hash.slice(1) || '/';
        const parts = hash.split('/');

        if (hash === '/' || hash === '') {
            currentView = 'list';
            currentThreadId = null;
            currentCategory = null;
            currentPage = 0;
            renderThreadList();
        } else if (hash === 'new') {
            currentView = 'new';
            renderNewThreadForm();
        } else if (parts[0] === 'thread' && parts[1]) {
            currentView = 'thread';
            currentThreadId = parseInt(parts[1]);
            postPage = 0;
            renderThreadDetail();
        } else if (parts[0] === 'category' && parts[1]) {
            currentView = 'list';
            const slug = parts[1];
            const cat = categories.find(c => c.slug === slug);
            currentCategory = cat ? cat.id : null;
            currentPage = 0;
            renderThreadList();
        } else {
            currentView = 'list';
            currentCategory = null;
            currentPage = 0;
            renderThreadList();
        }
    }

    // ========== THREAD LIST ==========

    async function renderThreadList() {
        const main = document.getElementById('forum-main');
        if (!main) return;
        main.innerHTML = '<div class="forum-loading">Загрузка...</div>';

        try {
            const [threads, total] = await Promise.all([
                Api.getForumThreads(currentCategory, THREADS_PER_PAGE, currentPage * THREADS_PER_PAGE),
                Api.getForumThreadsCount(currentCategory)
            ]);
            threadsTotal = total;

            const catSlug = currentCategory ? (categories.find(c => c.id === currentCategory)?.slug || '') : '';
            const catName = currentCategory ? (categories.find(c => c.id === currentCategory)?.name || '') : 'Все категории';

            let paginationHtml = '';
            const totalPages = Math.ceil(total / THREADS_PER_PAGE);
            if (totalPages > 1) {
                paginationHtml = '<div class="forum-pagination">';
                if (currentPage > 0) {
                    paginationHtml += `<button class="forum-page-btn" data-page="${currentPage - 1}">&larr; Назад</button>`;
                }
                paginationHtml += `<span class="forum-page-info">Стр. ${currentPage + 1} / ${totalPages}</span>`;
                if (currentPage < totalPages - 1) {
                    paginationHtml += `<button class="forum-page-btn" data-page="${currentPage + 1}">Далее &rarr;</button>`;
                }
                paginationHtml += '</div>';
            }

            const newThreadBtn = canPost()
                ? `<a href="#new" class="forum-new-thread-btn">+ Новый тред</a>`
                : '';

            main.innerHTML = `
                <div class="forum-header">
                    <div class="forum-header-top">
                        <h2 class="font-title text-2xl md:text-3xl uppercase tracking-widest text-shiny">Форум</h2>
                        ${newThreadBtn}
                    </div>
                    <div class="forum-categories">
                        <button class="forum-cat-btn ${!currentCategory ? 'active' : ''}" data-cat="">Все</button>
                        ${categories.map(c => `<button class="forum-cat-btn ${currentCategory === c.id ? 'active' : ''}" data-cat="${c.id}">${escapeHtml(c.name)}</button>`).join('')}
                    </div>
                    ${userInfo && userInfo.is_banned ? '<div class="forum-restriction forum-ban-notice">Вы заблокированы. Создание тредов и постов недоступно.</div>' : ''}
                    ${userInfo && userInfo.is_muted && !userInfo.is_banned ? '<div class="forum-restriction forum-mute-notice">Вы заглушены. Создание тредов и постов недоступно.</div>' : ''}
                </div>
                <div class="forum-threads-list">
                    ${threads.length === 0 ? '<div class="forum-empty">Нет тредов</div>' : threads.map(t => {
                        const author = getUserDisplay(t);
                        const lastPostInfo = t.last_post_at
                            ? `<span class="forum-last-post">Последний: ${formatRelativeTime(t.last_post_at)}</span>`
                            : '';
                        const pinIcon = t.is_pinned ? '<span class="forum-pin-icon" title="Закреплён">&#x1F4CC;</span>' : '';
                        const lockIcon = t.is_locked ? '<span class="forum-lock-icon" title="Закрыт">&#x1F512;</span>' : '';
                        const contentPreview = t.content.length > 150 ? escapeHtml(t.content.slice(0, 150)) + '...' : escapeHtml(t.content);
                        return `
                            <a href="#thread/${t.id}" class="forum-thread-card ${t.is_pinned ? 'forum-thread-pinned' : ''}">
                                <div class="forum-thread-meta">
                                    ${pinIcon}${lockIcon}
                                    <span class="forum-thread-category">${escapeHtml(t.category_name || 'Без категории')}</span>
                                    <span class="forum-thread-time">${formatRelativeTime(t.created_at)}</span>
                                </div>
                                <h3 class="forum-thread-title">${escapeHtml(t.title)}</h3>
                                <p class="forum-thread-preview">${contentPreview}</p>
                                <div class="forum-thread-footer">
                                    <div class="forum-thread-author">
                                        ${author.photo ? `<img src="${author.photo}" class="forum-avatar-sm" alt="" onerror="this.style.display='none'">` : ''}
                                        ${author.profileLink} ${author.modBadge}
                                    </div>
                                    <div class="forum-thread-stats">
                                        <span class="forum-post-count">${t.posts_count} ответов</span>
                                        ${lastPostInfo}
                                    </div>
                                </div>
                            </a>
                        `;
                    }).join('')}
                </div>
                ${paginationHtml}
            `;

            attachThreadListHandlers();
        } catch (err) {
            main.innerHTML = `<div class="forum-error">Ошибка загрузки: ${escapeHtml(err.message)}</div>`;
        }
    }

    function attachThreadListHandlers() {
        document.querySelectorAll('.forum-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const catId = btn.dataset.cat;
                currentCategory = catId ? parseInt(catId) : null;
                currentPage = 0;
                const slug = currentCategory ? (categories.find(c => c.id === currentCategory)?.slug || '') : '';
                window.location.hash = slug ? `category/${slug}` : '/';
            });
        });
        document.querySelectorAll('.forum-page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentPage = parseInt(btn.dataset.page);
                renderThreadList();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    // ========== THREAD DETAIL ==========

    async function renderThreadDetail() {
        const main = document.getElementById('forum-main');
        if (!main) return;
        main.innerHTML = '<div class="forum-loading">Загрузка...</div>';

        try {
            const thread = await Api.getForumThread(currentThreadId);
            if (!thread) {
                main.innerHTML = '<div class="forum-empty">Тред не найден</div>';
                return;
            }

            const [posts, pTotal] = await Promise.all([
                Api.getForumThreadPosts(currentThreadId, POSTS_PER_PAGE, postPage * POSTS_PER_PAGE),
                Api.getForumThreadPostsCount(currentThreadId)
            ]);

            threadData = thread;
            postsData = posts;
            postsTotal = pTotal;

            const isAuthor = userInfo && userInfo.user_id === thread.author_id;
            const isMod = isModerator();

            let authorInfo = null;
            if (thread.author_id) {
                try { authorInfo = await Api.getPublicProfile(thread.author_id); } catch { authorInfo = null; }
            }
            const authorDisplay = {
                name: authorInfo
                    ? [authorInfo.telegram_first_name, authorInfo.telegram_last_name].filter(Boolean).join(' ') || authorInfo.telegram_username || 'Аноним'
                    : 'Удалённый пользователь',
                photo: authorInfo && authorInfo.telegram_photo_url
                    ? (authorInfo.telegram_photo_url.startsWith('/') ? 'https://t.me' + authorInfo.telegram_photo_url : authorInfo.telegram_photo_url)
                    : null,
                modBadge: authorInfo && authorInfo.is_moderator ? '<span class="forum-mod-badge">MOD</span>' : '',
                profileLink: thread.author_id
                    ? `<a href="profile.html?id=${thread.author_id}" class="forum-username">${escapeHtml(authorInfo ? [authorInfo.telegram_first_name, authorInfo.telegram_last_name].filter(Boolean).join(' ') || authorInfo.telegram_username || 'Аноним' : 'Удалённый пользователь')}</a>`
                    : '<span class="forum-username">Удалённый пользователь</span>'
            };

            const pinBtn = isMod
                ? `<button class="forum-mod-action" id="btn-pin">${thread.is_pinned ? 'Открепить' : 'Закрепить'}</button>`
                : '';
            const lockBtn = isMod
                ? `<button class="forum-mod-action" id="btn-lock">${thread.is_locked ? 'Разблокировать' : 'Заблокировать'}</button>`
                : '';
            const deleteThreadBtn = isMod
                ? `<button class="forum-mod-action forum-mod-delete" id="btn-delete-thread">Удалить тред</button>`
                : '';
            const editThreadBtn = isAuthor
                ? `<button class="forum-mod-action" id="btn-edit-thread">Ред.</button>`
                : '';

            const modBar = isMod ? `
                <div class="forum-mod-bar">
                    <span class="forum-mod-label">Модерация:</span>
                    ${pinBtn} ${lockBtn} ${deleteThreadBtn}
                </div>
            ` : '';

            const lockedNotice = thread.is_locked
                ? '<div class="forum-locked-notice">Тред заблокирован. Новые ответы невозможны.</div>'
                : '';

            const replyForm = canPost() && !thread.is_locked
                ? `
                    <div class="forum-reply-form">
                        <textarea id="reply-content" placeholder="Ваш ответ..." rows="4" maxlength="10000" class="forum-textarea"></textarea>
                        <div class="forum-reply-actions">
                            <span class="forum-char-count"><span id="reply-char-count">0</span>/10000</span>
                            <button id="btn-reply" class="forum-submit-btn">Ответить</button>
                        </div>
                    </div>
                `
                : (!userInfo
                    ? '<div class="forum-login-prompt"><a href="register.html">Войдите</a> чтобы отвечать в тредах</div>'
                    : (userInfo.is_banned || userInfo.is_muted)
                        ? `<div class="forum-restriction">${userInfo.is_banned ? 'Вы заблокированы' : 'Вы заглушены'}. Отправка сообщений недоступна.</div>`
                        : ''
                );

            let paginationHtml = '';
            const totalPages = Math.ceil(pTotal / POSTS_PER_PAGE);
            if (totalPages > 1) {
                paginationHtml = '<div class="forum-pagination">';
                if (postPage > 0) {
                    paginationHtml += `<button class="forum-page-btn" data-post-page="${postPage - 1}">&larr; Назад</button>`;
                }
                paginationHtml += `<span class="forum-page-info">Стр. ${postPage + 1} / ${totalPages}</span>`;
                if (postPage < totalPages - 1) {
                    paginationHtml += `<button class="forum-page-btn" data-post-page="${postPage + 1}">Далее &rarr;</button>`;
                }
                paginationHtml += '</div>';
            }

            main.innerHTML = `
                <div class="forum-breadcrumb">
                    <a href="#/">Форум</a>
                    ${thread.category_id ? ` &rsaquo; <a href="#/category/${categories.find(c => c.id === thread.category_id)?.slug || ''}">${escapeHtml(categories.find(c => c.id === thread.category_id)?.name || '')}</a>` : ''}
                    &rsaquo; <span>${escapeHtml(thread.title)}</span>
                </div>
                <div class="forum-thread-detail">
                    <div class="forum-thread-op">
                        <div class="forum-post-header">
                            <div class="forum-post-author">
                                ${authorDisplay.photo ? `<img src="${authorDisplay.photo}" class="forum-avatar" alt="" onerror="this.style.display='none'">` : '<div class="forum-avatar-placeholder"></div>'}
                                <div>
                                    ${authorDisplay.profileLink} ${authorDisplay.modBadge}
                                    <span class="forum-post-time">${formatDate(thread.created_at)}</span>
                                </div>
                            </div>
                            <div class="forum-post-actions">
                                ${thread.is_pinned ? '<span class="forum-pin-icon" title="Закреплён">&#x1F4CC;</span>' : ''}
                                ${thread.is_locked ? '<span class="forum-lock-icon" title="Закрыт">&#x1F512;</span>' : ''}
                                ${editThreadBtn}
                            </div>
                        </div>
                        <h1 class="forum-thread-detail-title">${escapeHtml(thread.title)}</h1>
                        <div class="forum-post-content">${renderMarkdown(thread.content)}</div>
                    </div>
                    ${modBar}
                    ${lockedNotice}
                </div>
                <div class="forum-posts-list">
                    ${posts.map(p => renderPostHtml(p)).join('')}
                </div>
                ${paginationHtml}
                ${replyForm}
            `;

            attachThreadDetailHandlers(thread);
        } catch (err) {
            main.innerHTML = `<div class="forum-error">Ошибка загрузки: ${escapeHtml(err.message)}</div>`;
        }
    }

    function renderPostHtml(p) {
        const author = getUserDisplay(p);
        const isAuthor = userInfo && userInfo.user_id === p.author_id;
        const isMod = isModerator();
        const editedLabel = p.edited_at ? `<span class="forum-edited-label">(ред. ${formatRelativeTime(p.edited_at)})</span>` : '';
        const editBtn = isAuthor ? `<button class="forum-post-action-btn" data-action="edit" data-post-id="${p.id}">Ред.</button>` : '';
        const deleteBtn = isMod ? `<button class="forum-post-action-btn forum-mod-delete-sm" data-action="delete-post" data-post-id="${p.id}">Удал.</button>` : '';
        const modUserBtn = isMod && p.author_id && p.author_id !== userInfo?.user_id
            ? `<button class="forum-post-action-btn" data-action="mod-user" data-user-id="${p.author_id}">Мод.</button>`
            : '';

        return `
            <div class="forum-post" data-post-id="${p.id}">
                <div class="forum-post-header">
                    <div class="forum-post-author">
                        ${author.photo ? `<img src="${author.photo}" class="forum-avatar" alt="" onerror="this.style.display='none'">` : '<div class="forum-avatar-placeholder"></div>'}
                        <div>
                            ${author.profileLink} ${author.modBadge}
                            <span class="forum-post-time">${formatDate(p.created_at)} ${editedLabel}</span>
                        </div>
                    </div>
                    <div class="forum-post-actions">
                        ${editBtn} ${deleteBtn} ${modUserBtn}
                    </div>
                </div>
                <div class="forum-post-content" id="post-content-${p.id}">${renderMarkdown(p.content)}</div>
            </div>
        `;
    }

    function attachThreadDetailHandlers(thread) {
        const replyTextarea = document.getElementById('reply-content');
        const charCount = document.getElementById('reply-char-count');
        if (replyTextarea && charCount) {
            replyTextarea.addEventListener('input', () => {
                charCount.textContent = replyTextarea.value.length;
            });
        }

        const replyBtn = document.getElementById('btn-reply');
        if (replyBtn) {
            replyBtn.addEventListener('click', async () => {
                const content = replyTextarea.value.trim();
                if (!content) return;
                replyBtn.disabled = true;
                replyBtn.textContent = 'Отправка...';
                try {
                    await Api.createForumPost(currentThreadId, content);
                    replyTextarea.value = '';
                    if (charCount) charCount.textContent = '0';
                    await renderThreadDetail();
                } catch (err) {
                    alert('Ошибка: ' + (err.message || 'Не удалось отправить'));
                } finally {
                    replyBtn.disabled = false;
                    replyBtn.textContent = 'Ответить';
                }
            });
        }

        const pinBtn = document.getElementById('btn-pin');
        if (pinBtn) {
            pinBtn.addEventListener('click', async () => {
                try {
                    await Api.modPinThread(currentThreadId, !thread.is_pinned);
                    await renderThreadDetail();
                } catch (err) { alert('Ошибка: ' + err.message); }
            });
        }

        const lockBtn = document.getElementById('btn-lock');
        if (lockBtn) {
            lockBtn.addEventListener('click', async () => {
                try {
                    await Api.modLockThread(currentThreadId, !thread.is_locked);
                    await renderThreadDetail();
                } catch (err) { alert('Ошибка: ' + err.message); }
            });
        }

        const deleteThreadBtn = document.getElementById('btn-delete-thread');
        if (deleteThreadBtn) {
            deleteThreadBtn.addEventListener('click', async () => {
                if (!confirm('Удалить тред?')) return;
                try {
                    await Api.modDeleteThread(currentThreadId);
                    window.location.hash = '/';
                } catch (err) { alert('Ошибка: ' + err.message); }
            });
        }

        const editThreadBtn = document.getElementById('btn-edit-thread');
        if (editThreadBtn) {
            editThreadBtn.addEventListener('click', () => showEditThreadModal(thread));
        }

        document.querySelectorAll('.forum-page-btn[data-post-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                postPage = parseInt(btn.dataset.postPage);
                renderThreadDetail();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });

        document.querySelectorAll('.forum-post-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const postId = btn.dataset.postId ? parseInt(btn.dataset.postId) : null;
                const userId = btn.dataset.userId;

                if (action === 'edit' && postId) showEditPostModal(postId);
                else if (action === 'delete-post' && postId) handleDeletePost(postId);
                else if (action === 'mod-user' && userId) showModUserModal(userId);
            });
        });
    }

    // ========== EDIT POST MODAL ==========

    function showEditPostModal(postId) {
        const post = postsData.find(p => p.id === postId);
        if (!post) return;
        const overlay = document.getElementById('forum-modal-overlay');
        const modal = document.getElementById('forum-modal');
        if (!overlay || !modal) return;

        modal.innerHTML = `
            <h3 class="font-title text-lg uppercase tracking-widest mb-4">Редактировать пост</h3>
            <textarea id="edit-post-content" rows="6" maxlength="10000" class="forum-textarea">${escapeHtml(post.content)}</textarea>
            <div class="forum-modal-actions">
                <button id="btn-save-edit-post" class="forum-submit-btn">Сохранить</button>
                <button id="btn-cancel-modal" class="forum-cancel-btn">Отмена</button>
            </div>
        `;
        overlay.classList.remove('hidden');

        document.getElementById('btn-save-edit-post').addEventListener('click', async () => {
            const content = document.getElementById('edit-post-content').value.trim();
            if (!content) return;
            try {
                await Api.updateForumPost(postId, content);
                overlay.classList.add('hidden');
                await renderThreadDetail();
            } catch (err) { alert('Ошибка: ' + err.message); }
        });
        document.getElementById('btn-cancel-modal').addEventListener('click', () => overlay.classList.add('hidden'));
    }

    // ========== EDIT THREAD MODAL ==========

    function showEditThreadModal(thread) {
        const overlay = document.getElementById('forum-modal-overlay');
        const modal = document.getElementById('forum-modal');
        if (!overlay || !modal) return;

        modal.innerHTML = `
            <h3 class="font-title text-lg uppercase tracking-widest mb-4">Редактировать тред</h3>
            <input id="edit-thread-title" value="${escapeHtml(thread.title)}" maxlength="200" placeholder="Заголовок" class="forum-input">
            <textarea id="edit-thread-content" rows="6" maxlength="10000" class="forum-textarea">${escapeHtml(thread.content)}</textarea>
            <div class="forum-modal-actions">
                <button id="btn-save-edit-thread" class="forum-submit-btn">Сохранить</button>
                <button id="btn-cancel-modal" class="forum-cancel-btn">Отмена</button>
            </div>
        `;
        overlay.classList.remove('hidden');

        document.getElementById('btn-save-edit-thread').addEventListener('click', async () => {
            const title = document.getElementById('edit-thread-title').value.trim();
            const content = document.getElementById('edit-thread-content').value.trim();
            if (!title || !content) return;
            try {
                await Api.updateForumThread(currentThreadId, title, content);
                overlay.classList.add('hidden');
                await renderThreadDetail();
            } catch (err) { alert('Ошибка: ' + err.message); }
        });
        document.getElementById('btn-cancel-modal').addEventListener('click', () => overlay.classList.add('hidden'));
    }

    // ========== DELETE POST ==========

    async function handleDeletePost(postId) {
        if (!confirm('Удалить пост?')) return;
        try {
            await Api.modDeletePost(postId);
            await renderThreadDetail();
        } catch (err) { alert('Ошибка: ' + err.message); }
    }

    // ========== MOD USER MODAL ==========

    function showModUserModal(userId) {
        const overlay = document.getElementById('forum-modal-overlay');
        const modal = document.getElementById('forum-modal');
        if (!overlay || !modal) return;

        modal.innerHTML = `
            <h3 class="font-title text-lg uppercase tracking-widest mb-4">Модерация пользователя</h3>
            <div class="forum-mod-user-section">
                <p class="forum-mod-user-label">Заглушить (запретить отправку сообщений)</p>
                <input id="mod-mute-reason" placeholder="Причина (опц.)" class="forum-input">
                <div class="forum-duration-row">
                    <select id="mod-mute-duration" class="forum-select">
                        <option value="1h">1 час</option>
                        <option value="6h">6 часов</option>
                        <option value="1d" selected>1 день</option>
                        <option value="7d">7 дней</option>
                        <option value="30d">30 дней</option>
                        <option value="perm">Навсегда</option>
                    </select>
                    <button id="btn-mute-user" class="forum-mod-btn forum-mod-mute">Заглушить</button>
                </div>
            </div>
            <div class="forum-mod-user-section">
                <p class="forum-mod-user-label">Заблокировать (полный бан)</p>
                <input id="mod-ban-reason" placeholder="Причина (опц.)" class="forum-input">
                <div class="forum-duration-row">
                    <select id="mod-ban-duration" class="forum-select">
                        <option value="1d">1 день</option>
                        <option value="7d" selected>7 дней</option>
                        <option value="30d">30 дней</option>
                        <option value="perm">Навсегда</option>
                    </select>
                    <button id="btn-ban-user" class="forum-mod-btn forum-mod-ban">Заблокировать</button>
                </div>
            </div>
            <div class="forum-mod-user-section">
                <p class="forum-mod-user-label">Снять ограничения</p>
                <div class="forum-duration-row">
                    <button id="btn-unmute-user" class="forum-mod-btn forum-mod-unmute">Снять мут</button>
                    <button id="btn-unban-user" class="forum-mod-btn forum-mod-unban">Снять бан</button>
                </div>
            </div>
            <div class="forum-modal-actions">
                <button id="btn-cancel-modal" class="forum-cancel-btn">Закрыть</button>
            </div>
        `;
        overlay.classList.remove('hidden');

        function calcExpiry(val) {
            if (val === 'perm') return null;
            const now = new Date();
            const map = { '1h': 3600000, '6h': 21600000, '1d': 86400000, '7d': 604800000, '30d': 2592000000 };
            return new Date(now.getTime() + (map[val] || 86400000)).toISOString();
        }

        document.getElementById('btn-mute-user').addEventListener('click', async () => {
            const reason = document.getElementById('mod-mute-reason').value.trim();
            const duration = document.getElementById('mod-mute-duration').value;
            try {
                const r = await Api.modMuteUser(userId, reason, calcExpiry(duration));
                if (!r) { alert('Не удалось заглушить'); return; }
                alert('Пользователь заглушен');
                overlay.classList.add('hidden');
            } catch (err) { alert('Ошибка: ' + err.message); }
        });

        document.getElementById('btn-ban-user').addEventListener('click', async () => {
            const reason = document.getElementById('mod-ban-reason').value.trim();
            const duration = document.getElementById('mod-ban-duration').value;
            if (!confirm('Заблокировать пользователя?')) return;
            try {
                const r = await Api.modBanUser(userId, reason, calcExpiry(duration));
                if (!r) { alert('Не удалось заблокировать'); return; }
                alert('Пользователь заблокирован');
                overlay.classList.add('hidden');
            } catch (err) { alert('Ошибка: ' + err.message); }
        });

        document.getElementById('btn-unmute-user').addEventListener('click', async () => {
            try {
                await Api.modUnmuteUser(userId);
                alert('Мут снят');
                overlay.classList.add('hidden');
            } catch (err) { alert('Ошибка: ' + err.message); }
        });

        document.getElementById('btn-unban-user').addEventListener('click', async () => {
            try {
                await Api.modUnbanUser(userId);
                alert('Бан снят');
                overlay.classList.add('hidden');
            } catch (err) { alert('Ошибка: ' + err.message); }
        });

        document.getElementById('btn-cancel-modal').addEventListener('click', () => overlay.classList.add('hidden'));
    }

    // ========== NEW THREAD FORM ==========

    function renderNewThreadForm() {
        const main = document.getElementById('forum-main');
        if (!main) return;

        if (!canPost()) {
            main.innerHTML = `
                <div class="forum-breadcrumb"><a href="#/">Форум</a> &rsaquo; Новый тред</div>
                <div class="forum-empty">${!userInfo ? '<a href="register.html">Войдите</a> чтобы создавать треды' : 'У вас нет прав для создания тредов'}</div>
            `;
            return;
        }

        main.innerHTML = `
            <div class="forum-breadcrumb"><a href="#/">Форум</a> &rsaquo; Новый тред</div>
            <div class="forum-new-thread-form">
                <h2 class="font-title text-xl uppercase tracking-widest text-shiny mb-6">Новый тред</h2>
                <label class="forum-form-label">
                    Категория
                    <select id="new-thread-category" class="forum-select">
                        ${categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                    </select>
                </label>
                <label class="forum-form-label">
                    Заголовок <span class="forum-char-hint"><span id="title-char-count">0</span>/200</span>
                    <input id="new-thread-title" maxlength="200" placeholder="Тема обсуждения" class="forum-input">
                </label>
                <label class="forum-form-label">
                    Содержание <span class="forum-char-hint"><span id="content-char-count">0</span>/10000</span>
                    <textarea id="new-thread-content" rows="8" maxlength="10000" placeholder="Опишите тему..." class="forum-textarea"></textarea>
                </label>
                <div class="forum-form-actions">
                    <button id="btn-create-thread" class="forum-submit-btn">Создать тред</button>
                    <a href="#/" class="forum-cancel-btn">Отмена</a>
                </div>
            </div>
        `;

        const titleInput = document.getElementById('new-thread-title');
        const contentInput = document.getElementById('new-thread-content');
        const titleCount = document.getElementById('title-char-count');
        const contentCount = document.getElementById('content-char-count');

        if (titleInput && titleCount) {
            titleInput.addEventListener('input', () => { titleCount.textContent = titleInput.value.length; });
        }
        if (contentInput && contentCount) {
            contentInput.addEventListener('input', () => { contentCount.textContent = contentInput.value.length; });
        }

        document.getElementById('btn-create-thread').addEventListener('click', async () => {
            const categoryId = parseInt(document.getElementById('new-thread-category').value);
            const title = titleInput.value.trim();
            const content = contentInput.value.trim();
            if (!title || title.length < 3) { alert('Заголовок минимум 3 символа'); return; }
            if (!content) { alert('Введите содержание'); return; }

            const btn = document.getElementById('btn-create-thread');
            btn.disabled = true;
            btn.textContent = 'Создание...';
            try {
                const threadId = await Api.createForumThread(categoryId, title, content);
                window.location.hash = `thread/${threadId}`;
            } catch (err) {
                alert('Ошибка: ' + (err.message || 'Не удалось создать тред'));
                btn.disabled = false;
                btn.textContent = 'Создать тред';
            }
        });
    }

    // ========== INIT ==========

    async function init() {
        Api.reinit();

        try {
            categories = await Api.getForumCategories();
        } catch { categories = []; }

        try {
            const session = await Api.getSession();
            if (session) {
                userInfo = await Api.getUserDisplayName();
                if (userInfo) {
                    userInfo.user_id = session.user.id;
                }
            }
        } catch { userInfo = null; }

        window.addEventListener('hashchange', route);
        route();

        const overlay = document.getElementById('forum-modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target.id === 'forum-modal-overlay') overlay.classList.add('hidden');
            });
        }
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', ForumModule.init);
