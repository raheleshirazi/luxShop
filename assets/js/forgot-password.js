/* ============================================================
   LOOXSHOP — Forgot Password Page Script
   Description: 3-step password reset flow (identify → OTP → new).
                DEMO ONLY — uses localStorage for the reset.
============================================================ */

(function () {
    'use strict';

    /* ------------------------------------------------------------
       STORAGE KEYS
    ------------------------------------------------------------ */
    const USERS_KEY = 'looxshop_users';
    const RESET_KEY = 'looxshop_reset_session';

    /* ------------------------------------------------------------
       STATE
    ------------------------------------------------------------ */
    let currentUser = null;   // user being reset
    let currentStep = 1;
    let otpTimerInterval = null;

    // Demo OTP — in real apps this comes from the backend via SMS/email
    // Every new code is stored in localStorage so user can see it in
    // the console for testing.
    let expectedOtp = '';

    /* ------------------------------------------------------------
       UTILITIES
    ------------------------------------------------------------ */
    function readList(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function writeList(key, list) {
        localStorage.setItem(key, JSON.stringify(list));
    }

    function normalizePhone(phone) {
        const persian = '۰۱۲۳۴۵۶۷۸۹';
        const arabic = '٠١٢٣٤٥٦٧٨٩';
        let result = String(phone);
        result = result.replace(/[۰-۹]/g, (d) => persian.indexOf(d));
        result = result.replace(/[٠-٩]/g, (d) => arabic.indexOf(d));
        return result.replace(/\D/g, '');
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPhone(phone) {
        return /^09\d{9}$/.test(normalizePhone(phone));
    }

    function toPersianDigits(v) {
        const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return String(v).replace(/\d/g, (d) => digits[d]);
    }

    /* ------------------------------------------------------------
       ALERT
    ------------------------------------------------------------ */
    function showAlert(message, type = 'error') {
        const box = document.getElementById('authAlert');
        if (!box) return;
        box.textContent = message;
        box.className = `auth-alert auth-alert--${type}`;
        box.hidden = false;
        clearTimeout(box._timer);
        box._timer = setTimeout(() => { box.hidden = true; }, 5000);
    }

    function hideAlert() {
        const box = document.getElementById('authAlert');
        if (box) box.hidden = true;
    }

    /* ------------------------------------------------------------
       STEP NAVIGATION
    ------------------------------------------------------------ */
    function goToStep(step) {
        currentStep = step;

        // Toggle panels
        document.querySelectorAll('.reset-panel').forEach((panel) => {
            panel.classList.toggle('is-active', Number(panel.dataset.panel) === step);
        });

        // Toggle step indicator (only 1-3 matter)
        document.querySelectorAll('.reset-step').forEach((el) => {
            const num = Number(el.dataset.step);
            el.classList.toggle('is-active', num === step);
            el.classList.toggle('is-done', num < step);
        });

        // Scroll top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Manage OTP timer
        if (step === 2) {
            startOtpTimer(120);
        } else {
            stopOtpTimer();
        }
    }

    /* ------------------------------------------------------------
       OTP TIMER
    ------------------------------------------------------------ */
    function startOtpTimer(seconds) {
        stopOtpTimer();

        const display = document.getElementById('otpTimer');
        const resend = document.getElementById('resendBtn');
        if (!display) return;

        let remaining = seconds;
        if (resend) resend.disabled = true;

        const tick = () => {
            const m = String(Math.floor(remaining / 60)).padStart(2, '0');
            const s = String(remaining % 60).padStart(2, '0');
            display.textContent = toPersianDigits(`${m}:${s}`);
            remaining -= 1;

            if (remaining < 0) {
                stopOtpTimer();
                if (resend) resend.disabled = false;
                display.textContent = 'منقضی شد';
            }
        };

        tick();
        otpTimerInterval = setInterval(tick, 1000);
    }

    function stopOtpTimer() {
        if (otpTimerInterval) {
            clearInterval(otpTimerInterval);
            otpTimerInterval = null;
        }
    }

    /* ------------------------------------------------------------
       OTP GENERATOR (demo)
    ------------------------------------------------------------ */
    function generateOtp() {
        expectedOtp = String(Math.floor(100000 + Math.random() * 900000));
        console.log('%c[LooxShop Demo] Verification code: ' + expectedOtp, 'color: #800020; font-weight: bold; font-size: 14px;');
        return expectedOtp;
    }

    /* ------------------------------------------------------------
       OTP INPUT BEHAVIOUR
    ------------------------------------------------------------ */
    function initOtpInputs() {
        const inputs = document.querySelectorAll('.otp-input');
        if (!inputs.length) return;

        inputs.forEach((input, idx) => {
            input.addEventListener('input', (e) => {
                const val = e.target.value.replace(/\D/g, '');
                e.target.value = val.slice(0, 1);

                if (val && idx < inputs.length - 1) {
                    inputs[idx + 1].focus();
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                    inputs[idx - 1].focus();
                }
                if (e.key === 'ArrowLeft' && idx > 0) inputs[idx - 1].focus();
                if (e.key === 'ArrowRight' && idx < inputs.length - 1) inputs[idx + 1].focus();
            });

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
                pasted.split('').forEach((ch, i) => {
                    if (idx + i < inputs.length) {
                        inputs[idx + i].value = ch;
                    }
                });
                const nextEmpty = Math.min(idx + pasted.length, inputs.length - 1);
                inputs[nextEmpty].focus();
            });
        });
    }

    function getOtpValue() {
        return Array.from(document.querySelectorAll('.otp-input'))
            .map((i) => i.value)
            .join('');
    }

    function clearOtpInputs() {
        document.querySelectorAll('.otp-input').forEach((i) => { i.value = ''; });
        document.querySelector('.otp-input')?.focus();
    }

    /* ------------------------------------------------------------
       PASSWORD STRENGTH
    ------------------------------------------------------------ */
    function scorePassword(pw) {
        let score = 0;
        if (pw.length >= 6) score++;
        if (pw.length >= 10) score++;
        if (/[A-Z]/.test(pw) || /[a-z]/.test(pw) && /[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        return Math.min(score, 4);
    }

    function initPasswordStrength() {
        const input = document.getElementById('newPassword');
        const meter = document.getElementById('pwStrength');
        const label = document.getElementById('pwStrengthLabel');
        if (!input || !meter) return;

        const bars = meter.querySelectorAll('.pw-strength__bar span');
        const labels = ['خیلی ضعیف', 'ضعیف', 'متوسط', 'قوی', 'خیلی قوی'];

        input.addEventListener('input', () => {
            const score = scorePassword(input.value);

            bars.forEach((bar, i) => {
                bar.classList.toggle('is-active', i < score);
            });

            meter.dataset.level = score;
            label.textContent = input.value ? labels[score] : 'قدرت رمز';
        });
    }

    /* ------------------------------------------------------------
       PASSWORD VISIBILITY TOGGLE
    ------------------------------------------------------------ */
    function initPasswordToggles() {
        document.querySelectorAll('.auth-toggle-pass').forEach((btn) => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                if (!input) return;
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                btn.classList.toggle('is-active', isPassword);
            });
        });
    }

    /* ------------------------------------------------------------
       STEP 1 : Identify user
    ------------------------------------------------------------ */
    function initStep1() {
        const form = document.getElementById('step1Form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            hideAlert();

            const identifier = document.getElementById('resetIdentifier').value.trim();

            if (!identifier) {
                showAlert('لطفاً ایمیل یا شماره موبایل خود را وارد کنید.');
                return;
            }

            const isEmail = isValidEmail(identifier);
            const isPhone = isValidPhone(identifier);

            if (!isEmail && !isPhone) {
                showAlert('ایمیل یا شماره موبایل وارد شده معتبر نیست.');
                return;
            }

            // Find user
            const users = readList(USERS_KEY);
            const lowerEmail = identifier.toLowerCase();
            const normPhone = normalizePhone(identifier);

            const user = users.find((u) => {
                const uEmail = (u.email || '').toLowerCase();
                const uPhone = normalizePhone(u.phone || '');
                return uEmail === lowerEmail || uPhone === normPhone;
            });

            if (!user) {
                showAlert('کاربری با این مشخصات پیدا نشد. ابتدا ثبت‌نام کنید.');
                return;
            }

            currentUser = user;
            localStorage.setItem(RESET_KEY, JSON.stringify({
                userId: user.id,
                identifier: identifier
            }));

            // Show target in step 2
            const targetEl = document.getElementById('resetTarget');
            if (targetEl) {
                targetEl.textContent = isEmail ? maskEmail(identifier) : maskPhone(identifier);
            }

            // Generate OTP + show demo
            const otp = generateOtp();
            showAlert(`کد تأیید (دمو): ${otp}`, 'success');

            goToStep(2);
            clearOtpInputs();
        });
    }

    function maskEmail(email) {
        const [name, domain] = email.split('@');
        const visible = name.slice(0, 2);
        return `${visible}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
    }

    function maskPhone(phone) {
        const norm = normalizePhone(phone);
        return `${norm.slice(0, 4)}****${norm.slice(-3)}`;
    }

    /* ------------------------------------------------------------
       STEP 2 : Verify OTP
    ------------------------------------------------------------ */
    function initStep2() {
        const form = document.getElementById('step2Form');
        const backBtn = document.getElementById('backStep1');
        const resendBtn = document.getElementById('resendBtn');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            hideAlert();

            const entered = getOtpValue();

            if (entered.length !== 6) {
                showAlert('لطفاً کد ۶ رقمی را به‌طور کامل وارد کنید.');
                return;
            }

            if (entered !== expectedOtp) {
                showAlert('کد وارد شده اشتباه است. دوباره تلاش کنید.');
                clearOtpInputs();
                return;
            }

            showAlert('کد تأیید شد ✓', 'success');
            goToStep(3);
        });

        backBtn?.addEventListener('click', () => {
            hideAlert();
            goToStep(1);
        });

        resendBtn?.addEventListener('click', () => {
            const otp = generateOtp();
            showAlert(`کد تأیید جدید (دمو): ${otp}`, 'success');
            clearOtpInputs();
            startOtpTimer(120);
        });
    }

    /* ------------------------------------------------------------
       STEP 3 : Save new password
    ------------------------------------------------------------ */
    function initStep3() {
        const form = document.getElementById('step3Form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            hideAlert();

            const pw = document.getElementById('newPassword').value;
            const confirm = document.getElementById('confirmPassword').value;

            if (!currentUser) {
                showAlert('جلسه منقضی شده. لطفاً دوباره شروع کنید.');
                goToStep(1);
                return;
            }

            if (pw.length < 6) {
                showAlert('رمز باید حداقل ۶ کاراکتر باشد.');
                return;
            }

            if (pw !== confirm) {
                showAlert('رمز جدید و تکرار آن یکسان نیستند.');
                return;
            }

            // Update user password
            try {
                const users = readList(USERS_KEY);
                const idx = users.findIndex((u) => u.id === currentUser.id);
                if (idx !== -1) {
                    users[idx].password = pw;
                    writeList(USERS_KEY, users);
                }
            } catch (err) { /* ignore */ }

            // Clear reset session
            localStorage.removeItem(RESET_KEY);

            goToStep(4);
        });
    }

    /* ------------------------------------------------------------
       INIT
    ------------------------------------------------------------ */
    document.addEventListener('DOMContentLoaded', () => {
        initStep1();
        initStep2();
        initStep3();
        initOtpInputs();
        initPasswordToggles();
        initPasswordStrength();

        // Focus first OTP input when step 2 opens
        const firstOtp = document.querySelector('.otp-input');
        if (firstOtp) firstOtp.focus({ preventScroll: true });
    });

})();
