const AuthApp = (() => {
    let inviteCode = '';
    let isProcessing = false;

    function showError(id, msg) {
        const el = document.getElementById(id);
        if (el) { el.textContent = msg; el.classList.remove('hidden'); }
    }

    function hideError(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    }

    function showView(view) {
        document.querySelectorAll('[data-view]').forEach(el => el.classList.add('hidden'));
        const target = document.querySelector(`[data-view="${view}"]`);
        if (target) target.classList.remove('hidden');
    }

    async function handleTelegramAuth(user) {
        if (isProcessing) return;
        isProcessing = true;
        hideError('auth-error');

        const code = document.getElementById('invite-code').value.trim().toUpperCase();
        inviteCode = code;

        const btn = document.getElementById('auth-loading');
        if (btn) btn.classList.remove('hidden');
        const tgBtn = document.getElementById('tg-widget-container');
        if (tgBtn) tgBtn.classList.add('opacity-30', 'pointer-events-none');

        try {
            const result = await Api.telegramAuth(user, code || null);
            await Api.setSession(result.access_token, result.refresh_token);
            await showAccountView();

            if (result.is_new) {
                const successBadge = document.getElementById('new-user-badge');
                if (successBadge) successBadge.classList.remove('hidden');
            }
        } catch (err) {
            if (err.needsInvite) {
                showError('auth-error', 'Для регистрации нужен инвайт-код. Введите код выше и попробуйте снова.');
                const inviteSection = document.getElementById('invite-section');
                if (inviteSection) inviteSection.classList.add('ring-1', 'ring-red-400/50');
            } else {
                showError('auth-error', err.message || 'Ошибка аутентификации');
            }
        } finally {
            isProcessing = false;
            if (btn) btn.classList.add('hidden');
            if (tgBtn) tgBtn.classList.remove('opacity-30', 'pointer-events-none');
        }
    }

    async function showAccountView() {
        showView('account');

        try {
            const info = await Api.getUserDisplayName();
            if (info) {
                const nameEl = document.getElementById('account-name');
                const usernameEl = document.getElementById('account-username');
                const photoEl = document.getElementById('account-photo');

                if (nameEl) {
                    const parts = [info.telegram_first_name, info.telegram_last_name].filter(Boolean);
                    nameEl.textContent = parts.length > 0 ? parts.join(' ') : info.display_name;
                }
                if (usernameEl && info.telegram_username) {
                    usernameEl.textContent = '@' + info.telegram_username;
                    usernameEl.classList.remove('hidden');
                }
                if (photoEl && info.telegram_photo_url) {
                    photoEl.src = info.telegram_photo_url;
                    photoEl.classList.remove('hidden');
                    const placeholder = document.getElementById('account-photo-placeholder');
                    if (placeholder) placeholder.classList.add('hidden');
                }

                if (info.is_verified) {
                    document.getElementById('account-verified').classList.remove('hidden');
                    if (info.has_generated_invite && info.generated_code) {
                        document.getElementById('account-no-invite').classList.add('hidden');
                        document.getElementById('account-has-invite').classList.remove('hidden');
                        document.getElementById('account-invite-code').textContent = info.generated_code;
                    }
                } else {
                    document.getElementById('account-unverified').classList.remove('hidden');
                }
            }
        } catch {}
    }

    async function checkExistingSession() {
        const session = await Api.getSession();
        if (session) {
            await showAccountView();
        }
    }

    function init() {
        window.SUPABASE_URL = window.SUPABASE_URL || '';
        window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
        Api.reinit();

        window.onTelegramAuth = handleTelegramAuth;

        const inviteInput = document.getElementById('invite-code');
        if (inviteInput) {
            inviteInput.addEventListener('input', () => {
                inviteInput.value = inviteInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                hideError('auth-error');
                const inviteSection = document.getElementById('invite-section');
                if (inviteSection) inviteSection.classList.remove('ring-1', 'ring-red-400/50');
            });
        }

        document.getElementById('account-gen-invite').addEventListener('click', async () => {
            const btn = document.getElementById('account-gen-invite');
            btn.disabled = true;
            btn.textContent = 'Генерация...';
            try {
                const code = await Api.generateInviteCode();
                if (!code) throw new Error('Не удалось сгенерировать код');
                document.getElementById('account-invite-code').textContent = code;
                document.getElementById('account-no-invite').classList.add('hidden');
                document.getElementById('account-has-invite').classList.remove('hidden');
                btn.disabled = false;
                btn.textContent = 'Сгенерировать инвайт-код';
            } catch (err) {
                alert(err.message || 'Ошибка генерации');
                btn.disabled = false;
                btn.textContent = 'Сгенерировать инвайт-код';
            }
        });

        document.getElementById('account-copy-code').addEventListener('click', () => {
            navigator.clipboard.writeText(document.getElementById('account-invite-code').textContent);
        });

        document.getElementById('account-logout').addEventListener('click', async () => {
            await Api.logout();
            showView('auth');
            document.getElementById('account-verified').classList.add('hidden');
            document.getElementById('account-unverified').classList.add('hidden');
            document.getElementById('account-username').classList.add('hidden');
            document.getElementById('account-photo').classList.add('hidden');
            document.getElementById('account-photo-placeholder').classList.remove('hidden');
            document.getElementById('new-user-badge').classList.add('hidden');
            const nameEl = document.getElementById('account-name');
            if (nameEl) nameEl.textContent = '';
            const usernameEl = document.getElementById('account-username');
            if (usernameEl) usernameEl.textContent = '';
        });

        checkExistingSession();
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', AuthApp.init);
