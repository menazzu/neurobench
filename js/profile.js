const ProfileModule = (() => {
    let userInfo = null;
    let profileData = null;
    let profileUserId = null;
    let isOwnProfile = false;
    let editingBio = false;
    let inviteInfo = null;

    function escapeHtml(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML.replace(/"/g, '&quot;');
    }

    function formatDate(dateVal) {
        if (!dateVal) return '';
        const d = new Date(dateVal);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}.${d.getFullYear()}`;
    }

    async function init() {
        Api.reinit();

        const devRaw = localStorage.getItem('nb_dev_session');
        if (devRaw) {
            try {
                const dev = JSON.parse(devRaw);
                userInfo = dev;
                profileUserId = dev.user_id;
                isOwnProfile = true;
                profileData = {
                    telegram_first_name: dev.telegram_first_name || '',
                    telegram_last_name: dev.telegram_last_name || '',
                    telegram_username: dev.telegram_username || 'devuser',
                    telegram_photo_url: dev.telegram_photo_url || '',
                    bio: dev.bio || 'Dev-аккаунт для локальной разработки',
                    is_moderator: dev.is_moderator || false,
                    created_at: '2026-02-19T10:30:00Z',
                    threads_count: 4,
                    posts_count: 30
                };
                initNavUser();
                renderProfile();
                return;
            } catch {}
        }

        try {
            const session = await Api.getSession();
            if (session) {
                userInfo = await Api.getUserDisplayName();
                if (userInfo) userInfo.user_id = session.user.id;
                initNavUser();
            }
        } catch { userInfo = null; }

        const params = new URLSearchParams(window.location.search);
        profileUserId = params.get('id');

        if (!profileUserId && userInfo) {
            profileUserId = userInfo.user_id;
            isOwnProfile = true;
        } else if (profileUserId && userInfo && profileUserId === userInfo.user_id) {
            isOwnProfile = true;
        }

        if (!profileUserId) {
            renderNoProfile();
            return;
        }

        await loadProfile();
    }

    function initNavUser() {
        const authLink = document.getElementById('nav-auth-link');
        const userMenu = document.getElementById('nav-user-menu');
        if (!userInfo) return;
        if (authLink) authLink.classList.add('hidden');
        if (userMenu) userMenu.classList.remove('hidden');

        const displayEl = document.getElementById('nav-user-display');
        if (displayEl) {
            const parts = [userInfo.telegram_first_name, userInfo.telegram_last_name].filter(Boolean);
            displayEl.textContent = parts.length > 0 ? parts.join(' ') : (userInfo.telegram_username || userInfo.display_name);
        }

        if (userInfo.telegram_photo_url) {
            const photoEl = document.getElementById('nav-user-photo');
            if (photoEl) {
                const url = userInfo.telegram_photo_url.startsWith('/')
                    ? 'https://t.me' + userInfo.telegram_photo_url
                    : userInfo.telegram_photo_url;
                photoEl.src = url;
                photoEl.classList.remove('hidden');
                photoEl.onerror = () => photoEl.classList.add('hidden');
            }
        }

        const logoutBtn = document.getElementById('nav-user-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await Api.logout();
                window.location.reload();
            });
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#nav-user-menu')) {
                const dd = document.getElementById('nav-user-dropdown');
                if (dd) dd.classList.add('hidden');
            }
        });

        const userLink = document.getElementById('nav-user-display-link');
        if (userLink) {
            userLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const dd = document.getElementById('nav-user-dropdown');
                if (dd) dd.classList.toggle('hidden');
            });
        }
    }

    async function loadProfile() {
        const main = document.getElementById('profile-main');
        if (!main) return;
        main.innerHTML = '<div class="forum-loading">Загрузка профиля...</div>';

        try {
            profileData = await Api.getPublicProfile(profileUserId);
            if (!profileData) {
                renderNoProfile();
                return;
            }
            renderProfile();
        } catch (err) {
            main.innerHTML = `<div class="forum-error">Ошибка загрузки профиля</div>`;
        }
    }

    function renderProfile() {
        const main = document.getElementById('profile-main');
        if (!main) return;

        const name = [profileData.telegram_first_name, profileData.telegram_last_name].filter(Boolean).join(' ')
            || profileData.telegram_username || 'Аноним';
        const photo = profileData.telegram_photo_url
            ? (profileData.telegram_photo_url.startsWith('/') ? 'https://t.me' + profileData.telegram_photo_url : profileData.telegram_photo_url)
            : null;
        const modBadge = profileData.is_moderator ? '<span class="forum-mod-badge">MOD</span>' : '';
        const username = profileData.telegram_username ? `@${escapeHtml(profileData.telegram_username)}` : '';
        const bioText = profileData.bio ? escapeHtml(profileData.bio) : (isOwnProfile ? 'Расскажите о себе...' : '');

        const bioDisplay = isOwnProfile && !editingBio
            ? `<div class="profile-bio-display" id="bio-display">${bioText}<button class="profile-bio-edit-btn" id="btn-edit-bio">Ред.</button></div>`
            : editingBio
                ? `<div class="profile-bio-edit"><textarea id="bio-textarea" maxlength="500" rows="3" class="forum-textarea">${escapeHtml(profileData.bio || '')}</textarea><div class="profile-bio-edit-actions"><button id="btn-save-bio" class="forum-submit-btn">Сохранить</button><button id="btn-cancel-bio" class="forum-cancel-btn">Отмена</button></div></div>`
                : `<div class="profile-bio-display">${bioText}</div>`;

        const restrictionNotice = isOwnProfile && userInfo
            ? (userInfo.is_banned
                ? '<div class="forum-restriction forum-ban-notice">Ваш аккаунт заблокирован</div>'
                : userInfo.is_muted
                    ? '<div class="forum-restriction forum-mute-notice">Ваш аккаунт заглушен</div>'
                    : '')
            : '';

        let accountSection = '';
        if (isOwnProfile && userInfo) {
            accountSection = renderAccountSection();
        }

        main.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    ${photo
                        ? `<img src="${photo}" class="profile-avatar" alt="" onerror="this.style.display='none'">`
                        : '<div class="profile-avatar-placeholder"></div>'
                    }
                    <div class="profile-info">
                        <div class="profile-name-row">
                            <h1 class="profile-name">${escapeHtml(name)}</h1>
                            ${modBadge}
                        </div>
                        ${username ? `<p class="profile-username">${username}</p>` : ''}
                        <p class="profile-joined">На сайте с ${formatDate(profileData.created_at)}</p>
                    </div>
                </div>
                ${restrictionNotice}
                <div class="profile-bio-section">
                    <h3 class="profile-section-title">О себе</h3>
                    ${bioDisplay}
                </div>
                <div class="profile-stats">
                    <div class="profile-stat">
                        <span class="profile-stat-value">${profileData.threads_count || 0}</span>
                        <span class="profile-stat-label">Тредов</span>
                    </div>
                    <div class="profile-stat">
                        <span class="profile-stat-value">${profileData.posts_count || 0}</span>
                        <span class="profile-stat-label">Постов</span>
                    </div>
                </div>
            </div>
            ${accountSection}
            <div class="profile-back">
                <a href="forum.html" class="forum-cancel-btn">&larr; На форум</a>
            </div>
        `;

        attachProfileHandlers();
        if (isOwnProfile && userInfo) {
            attachAccountHandlers();
        }
    }

    function renderAccountSection() {
        if (!userInfo) return '';

        let inviteHtml = '';
        if (userInfo.is_verified) {
            if (userInfo.has_generated_invite && userInfo.generated_code) {
                inviteHtml = `
                    <div class="profile-account-invite-has">
                        <p class="profile-account-invite-label">Ваш инвайт-код</p>
                        <p class="profile-account-invite-code" id="account-invite-code">${escapeHtml(userInfo.generated_code)}</p>
                        ${userInfo.invite_use_count !== undefined && userInfo.invite_use_count !== null
                            ? `<p class="profile-account-invite-uses">Использован ${userInfo.invite_use_count} раз</p>` : ''}
                        <div class="profile-account-invite-actions">
                            <button id="account-copy-code" class="forum-cancel-btn">Скопировать</button>
                            <button id="account-regen-invite" class="forum-cancel-btn" style="border-color:rgba(255,180,0,0.2);color:rgba(255,200,60,0.6)">Новый код</button>
                        </div>
                    </div>`;
            } else if (userInfo.has_generated_invite && !userInfo.generated_code) {
                inviteHtml = `
                    <div class="profile-account-invite-deleted">
                        <p class="profile-account-invite-label" style="color:rgba(255,100,100,0.6)">Ваш инвайт-код был удалён</p>
                        <button id="account-regen-invite" class="forum-cancel-btn" style="border-color:rgba(255,180,0,0.2);color:rgba(255,200,60,0.6)">Сгенерировать новый</button>
                    </div>`;
            } else {
                inviteHtml = `
                    <div class="profile-account-invite-none">
                        <p class="profile-account-invite-label">Вы можете пригласить одного человека</p>
                        <button id="account-gen-invite" class="forum-cancel-btn" style="border-color:rgba(100,200,100,0.2);color:rgba(100,200,100,0.6)">Сгенерировать инвайт-код</button>
                    </div>`;
            }
        }

        const verifiedHtml = userInfo.is_verified
            ? '<span class="profile-account-verified">Верифицирован</span>'
            : '<span class="profile-account-unverified">Не верифицирован</span>';

        const modHtml = userInfo.is_moderator
            ? '<span class="forum-mod-badge" style="margin-left:8px">MOD</span>'
            : '';

        return `
            <div class="profile-account-card">
                <h3 class="profile-section-title">Аккаунт</h3>
                <div class="profile-account-status">
                    ${verifiedHtml}${modHtml}
                </div>
                ${inviteHtml}
                <div class="profile-account-actions">
                    <button id="account-logout" class="forum-cancel-btn" style="border-color:rgba(255,60,60,0.15);color:rgba(255,100,100,0.5)">Выйти</button>
                    <a href="index.html" class="forum-cancel-btn">На главную</a>
                </div>
            </div>
        `;
    }

    function attachAccountHandlers() {
        const genBtn = document.getElementById('account-gen-invite');
        if (genBtn) {
            genBtn.addEventListener('click', () => doGenerateInvite('account-gen-invite'));
        }

        const regenBtn = document.getElementById('account-regen-invite');
        if (regenBtn) {
            regenBtn.addEventListener('click', () => doGenerateInvite('account-regen-invite'));
        }

        const copyBtn = document.getElementById('account-copy-code');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const codeEl = document.getElementById('account-invite-code');
                if (codeEl) navigator.clipboard.writeText(codeEl.textContent);
            });
        }

        const logoutBtn = document.getElementById('account-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await Api.logout();
                window.location.href = 'index.html';
            });
        }
    }

    async function doGenerateInvite(btnId) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = 'Генерация...';
        try {
            const code = await Api.generateInviteCode();
            if (!code) throw new Error('Не удалось сгенерировать код');
            if (userInfo) {
                userInfo.has_generated_invite = true;
                userInfo.generated_code = code;
                userInfo.invite_use_count = 0;
            }
            renderProfile();
        } catch (err) {
            alert(err.message || 'Ошибка генерации');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    function attachProfileHandlers() {
        const editBtn = document.getElementById('btn-edit-bio');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                editingBio = true;
                renderProfile();
            });
        }

        const saveBtn = document.getElementById('btn-save-bio');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const bio = document.getElementById('bio-textarea').value.trim();
                try {
                    await Api.updateProfileBio(bio);
                    profileData.bio = bio;
                    editingBio = false;
                    renderProfile();
                } catch (err) { alert('Ошибка: ' + err.message); }
            });
        }

        const cancelBtn = document.getElementById('btn-cancel-bio');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                editingBio = false;
                renderProfile();
            });
        }
    }

    function renderNoProfile() {
        const main = document.getElementById('profile-main');
        if (!main) return;
        main.innerHTML = `
            <div class="forum-empty">
                ${!userInfo ? '<a href="register.html">Войдите</a> чтобы просмотреть профиль' : 'Профиль не найден'}
            </div>
            <div class="profile-back">
                <a href="forum.html" class="forum-cancel-btn">&larr; На форум</a>
            </div>
        `;
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', ProfileModule.init);
