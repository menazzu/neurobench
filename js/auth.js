const AuthApp = (() => {
    let currentStep = 1;
    let inviteCode = '';
    let captchaToken = null;
    let turnstileWidgetId = null;
    let regEmail = '';

    function showStep(step) {
        currentStep = step;
        document.querySelectorAll('[data-step]').forEach(el => el.classList.remove('visible'));
        const target = document.querySelector(`[data-step="${step}"]`);
        if (target) target.classList.add('visible');
        document.querySelectorAll('.step-dot').forEach(dot => {
            const s = parseInt(dot.dataset.stepDot);
            dot.classList.toggle('active', s === step);
            dot.classList.toggle('done', s < step);
        });
    }

    function showTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
            t.classList.toggle('opacity-30', t.dataset.tab !== tab);
        });
        document.getElementById('panel-register').classList.toggle('hidden', tab !== 'register');
        document.getElementById('panel-login').classList.toggle('hidden', tab !== 'login');
    }

    function showError(id, msg) {
        const el = document.getElementById(id);
        if (el) { el.textContent = msg; el.classList.remove('hidden'); }
    }

    function hideError(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    }

    function initTurnstile() {
        if (!window.TURNSTILE_SITE_KEY) {
            captchaToken = null;
            return;
        }
        if (!window.turnstile) {
            if (typeof initTurnstile._attempts === 'undefined') initTurnstile._attempts = 0;
            initTurnstile._attempts++;
            if (initTurnstile._attempts > 10) return;
            setTimeout(initTurnstile, 500);
            return;
        }
        const container = document.getElementById('captcha-container');
        if (!container || turnstileWidgetId !== null) return;
        const btn = document.getElementById('reg-step1-btn');
        if (btn) btn.disabled = true;
        turnstileWidgetId = turnstile.render(container, {
            sitekey: window.TURNSTILE_SITE_KEY,
            callback: (token) => {
                captchaToken = token;
                if (btn) btn.disabled = false;
            },
            'error-callback': () => {
                captchaToken = null;
                if (btn) btn.disabled = false;
            },
            'expired-callback': () => {
                captchaToken = null;
                if (btn) btn.disabled = false;
            }
        });
    }

    async function validateInviteCode(code) {
        hideError('invite-code-error');
        if (!code || code.length < 4) {
            showError('invite-code-error', 'Введите инвайт-код');
            return false;
        }
        try {
            const client = Api.getClient();
            if (!client) { showError('invite-code-error', 'Ошибка подключения'); return false; }
            const { data, error } = await client
                .from('invite_codes')
                .select('id')
                .eq('code', code.toUpperCase())
                .is('used_by', null)
                .maybeSingle();
            if (error || !data) {
                showError('invite-code-error', 'Код недействителен или уже использован');
                return false;
            }
            return true;
        } catch {
            showError('invite-code-error', 'Ошибка проверки кода');
            return false;
        }
    }

    async function handleStep1() {
        const code = document.getElementById('reg-invite-code').value.trim().toUpperCase();
        if (window.TURNSTILE_SITE_KEY && !captchaToken) {
            showError('invite-code-error', 'Пройдите капчу');
            return;
        }
        const valid = await validateInviteCode(code);
        if (!valid) return;
        inviteCode = code;
        showStep(2);
    }

    async function handleStep2(e) {
        e.preventDefault();
        hideError('reg-step2-error');

        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-password-confirm').value;

        if (password !== confirm) {
            showError('reg-step2-error', 'Пароли не совпадают');
            return;
        }
        if (password.length < 6) {
            showError('reg-step2-error', 'Пароль должен быть не менее 6 символов');
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Регистрация...';

        try {
            const client = Api.getClient();
            if (!client) throw new Error('Supabase не настроен');

            const signUpOpts = {};
            if (inviteCode) signUpOpts.data = { invite_code: inviteCode };
            if (captchaToken) signUpOpts.captchaToken = captchaToken;

            const { data, error } = await client.auth.signUp({
                email,
                password,
                options: signUpOpts
            });

            if (error) throw error;

            regEmail = email;
            document.getElementById('otp-email-display').textContent = email;
            showStep(3);
        } catch (err) {
            showError('reg-step2-error', err.message || 'Ошибка регистрации');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Зарегистрироваться';
        }
    }

    async function handleVerify() {
        hideError('otp-error');
        const token = document.getElementById('reg-otp').value.trim();
        if (!token || token.length < 4) {
            showError('otp-error', 'Введите код из email');
            return;
        }

        const btn = document.getElementById('reg-verify-btn');
        btn.disabled = true;
        btn.textContent = 'Проверка...';

        try {
            const client = Api.getClient();
            const { data, error } = await client.auth.verifyOtp({
                email: regEmail,
                token,
                type: 'signup'
            });
            if (error) throw error;

            const claimed = await Api.claimInviteCode(inviteCode);
            if (!claimed) {
                const claimed2 = await Api.claimInviteCode(null);
                if (!claimed2) {
                    showError('otp-error', 'Не удалось активировать инвайт-код. Обратитесь к администратору.');
                    btn.disabled = false;
                    btn.textContent = 'Подтвердить';
                    return;
                }
            }

            showStep(4);
        } catch (err) {
            showError('otp-error', err.message || 'Неверный код');
            btn.disabled = false;
            btn.textContent = 'Подтвердить';
        }
    }

    async function handleResend() {
        const btn = document.getElementById('reg-resend-btn');
        btn.disabled = true;
        btn.textContent = 'Отправка...';
        try {
            const client = Api.getClient();
            await client.auth.resend({ type: 'signup', email: regEmail });
        } catch {}
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = 'Отправить код повторно';
        }, 30000);
    }

    async function handleGenerateInvite(btnId, codeId, boxId) {
        const btn = document.getElementById(btnId);
        btn.disabled = true;
        btn.textContent = 'Генерация...';
        try {
            const code = await Api.generateInviteCode();
            if (!code) throw new Error('Не удалось сгенерировать код');
            document.getElementById(codeId).textContent = code;
            if (boxId) document.getElementById(boxId).classList.remove('hidden');
            btn.classList.add('hidden');
        } catch (err) {
            alert(err.message || 'Ошибка генерации');
            btn.disabled = false;
            btn.textContent = 'Сгенерировать инвайт-код';
        }
    }

    function copyCode(codeElId) {
        const code = document.getElementById(codeElId).textContent;
        navigator.clipboard.writeText(code).catch(() => {});
    }

    async function handleLogin(e) {
        e.preventDefault();
        hideError('login-error');
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            const result = await Api.login(email, password);
            showAccountView(result.user.email);
        } catch (err) {
            showError('login-error', err.message || 'Ошибка входа');
        }
    }

    async function showAccountView(email) {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('account-view').classList.remove('hidden');
        document.getElementById('account-email').textContent = email;

        try {
            const status = await Api.getUserInviteStatus();
            if (status) {
                if (status.is_verified) {
                    document.getElementById('account-verified').classList.remove('hidden');
                    if (status.has_generated_invite && status.generated_code) {
                        document.getElementById('account-no-invite').classList.add('hidden');
                        document.getElementById('account-has-invite').classList.remove('hidden');
                        document.getElementById('account-invite-code').textContent = status.generated_code;
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
            showTab('login');
            showAccountView(session.user.email);
        }
    }

    function init() {
        window.SUPABASE_URL = window.SUPABASE_URL || '';
        window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
        Api.reinit();

        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => showTab(tab.dataset.tab));
        });

        document.getElementById('reg-step1-btn').addEventListener('click', handleStep1);

        document.getElementById('reg-step2-form').addEventListener('submit', handleStep2);
        document.getElementById('reg-back-btn').addEventListener('click', () => showStep(1));

        const otpInput = document.getElementById('reg-otp');
        otpInput.addEventListener('input', () => {
            document.getElementById('reg-verify-btn').disabled = otpInput.value.trim().length < 4;
        });
        document.getElementById('reg-verify-btn').addEventListener('click', handleVerify);
        document.getElementById('reg-resend-btn').addEventListener('click', handleResend);

        document.getElementById('gen-invite-btn').addEventListener('click', () =>
            handleGenerateInvite('gen-invite-btn', 'generated-code-value', 'generated-code-box'));
        document.getElementById('copy-code-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(document.getElementById('generated-code-value').textContent);
        });

        document.getElementById('login-form').addEventListener('submit', handleLogin);

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
            document.getElementById('login-form').classList.remove('hidden');
            document.getElementById('account-view').classList.add('hidden');
            document.getElementById('account-verified').classList.add('hidden');
            document.getElementById('account-unverified').classList.add('hidden');
        });

        const inviteInput = document.getElementById('reg-invite-code');
        inviteInput.addEventListener('input', () => {
            inviteInput.value = inviteInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });

        setTimeout(initTurnstile, 1000);
        checkExistingSession();
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', AuthApp.init);
