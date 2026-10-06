/* ============================================================
   LOOXSHOP — Admin Login
   Description: Admin authentication with localStorage
   ============================================================ */

(function () {
    'use strict';

    /* ------------------------------------------------------------
       CONFIG
    ------------------------------------------------------------ */
    const ADMIN_SESSION_KEY = 'looxshop_admin_session';
    const ADMIN_EMAIL = 'admin@looxshop.ir';
    const ADMIN_PASSWORD = 'admin1234';
    const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

    /* ------------------------------------------------------------
       DOM HELPERS
    ------------------------------------------------------------ */
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    /* ------------------------------------------------------------
       ALERT
    ------------------------------------------------------------ */
    function showAlert(msg, type = 'error') {
        const box = $('#adminAlert');
        if (!box) return;
        box.textContent = msg;
        box.className = `auth-alert auth-alert--${type}`;
        box.hidden = false;

        // Auto hide success after 3s
        if (type === 'success') {
            clearTimeout(box._timer);
            box._timer = setTimeout(() => { box.hidden = true; }, 3000);
        }
    }

    function hideAlert() {
        const box = $('#adminAlert');
        if (box) box.hidden = true;
    }

    /* ------------------------------------------------------------
       TOAST
    ------------------------------------------------------------ */
    function showToast(msg) {
        const t = $('#toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('is-visible');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('is-visible'), 2500);
    }

    /* ------------------------------------------------------------
       SESSION
    ------------------------------------------------------------ */
    function getSession() {
        try {
            const raw = localStorage.getItem(ADMIN_SESSION_KEY);
            if (!raw) return null;
            const session = JSON.parse(raw);
            if (!session.expiresAt || Date.now() > session.expiresAt) {
                localStorage.removeItem(ADMIN_SESSION_KEY);
                return null;
            }
            return session;
        } catch (e) {
            return null;
        }
    }

    function saveSession(remember) {
        const duration = remember ? 30 * 24 * 60 * 60 * 1000 : SESSION_DURATION_MS;
        const session = {
            email: ADMIN_EMAIL,
            name: 'مدیر سیستم',
            role: 'admin',
            loginAt: new Date().toISOString(),
            expiresAt: Date.now() + duration
        };
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
        return session;
    }

    /* ------------------------------------------------------------
       PASSWORD TOGGLE
    ------------------------------------------------------------ */
    function initPasswordToggle() {
        $$('.auth-toggle-pass').forEach((btn) => {
            btn.addEventListener('click', () => {
                const input = document.getElementById(btn.dataset.target);
                if (!input) return;
                const isPass = input.type === 'password';
                input.type = isPass ? 'text' : 'password';
                btn.classList.toggle('is-active', isPass);
            });
        });
    }

    /* ------------------------------------------------------------
       LOGIN FORM
    ------------------------------------------------------------ */
    function initForm() {
        const form = $('#adminLoginForm');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            hideAlert();

            const email = $('#adminEmail').value.trim().toLowerCase();
            const password = $('#adminPassword').value;
            const remember = $('#adminRemember')?.checked || false;
            const submitBtn = $('#adminSubmitBtn');

            // ---- Validation
            if (!email || !password) {
                showAlert('لطفاً ایمیل و رمز عبور را وارد کنید.');
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showAlert('فرمت ایمیل صحیح نیست.');
                return;
            }

            // ---- Loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.dataset.originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span>در حال بررسی...</span>';
            }

            // ---- Fake server delay
            setTimeout(() => {
                if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
                    showAlert('ایمیل یا رمز عبور اشتباه است.');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = submitBtn.dataset.originalText || 'ورود به پنل';
                    }
                    return;
                }

                // ---- Success
                saveSession(remember);
                showAlert('ورود موفق! در حال انتقال به پنل...', 'success');
                showToast('خوش آمدید مدیر عزیز 👋');

                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 800);

            }, 500);
        });

        // Enter key on inputs
        form.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                form.requestSubmit();
            }
        });
    }

    /* ------------------------------------------------------------
       INIT
    ------------------------------------------------------------ */
    document.addEventListener('DOMContentLoaded', () => {
        // If already logged in → go to admin
        if (getSession()) {
            window.location.href = 'admin.html';
            return;
        }

        initPasswordToggle();
        initForm();

        // Auto-fill demo credentials helper
        const emailInput = $('#adminEmail');
        if (emailInput && !emailInput.value) {
            emailInput.placeholder = 'admin@looxshop.ir';
        }
    });

})();
