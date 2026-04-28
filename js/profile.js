const ProfileModule = (() => {
    let userInfo = null;
    let profileData = null;
    let profileUserId = null;
    let isOwnProfile = false;
    let editingBio = false;

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

        try {
            const session = await Api.getSession();
            if (session) {
                userInfo = await Api.getUserDisplayName();
                if (userInfo) userInfo.user_id = session.user.id;
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
            <div class="profile-back">
                <a href="forum.html" class="forum-cancel-btn">&larr; На форум</a>
            </div>
        `;

        attachProfileHandlers();
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
