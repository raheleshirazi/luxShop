/* ============================================================
   LOOXSHOP — Auth Script (Login + Register) — Final v2
   Description: Login/Register + clear browser autofill
                + login history tracking for admin panel.
============================================================ */

(function () {
  'use strict';

  /* ------------------------------------------------------------
     1. STORAGE KEYS
  ------------------------------------------------------------ */
  const USERS_KEY = 'looxshop_users';
  const CURRENT_USER_KEY = 'looxshop_user';
  const REDIRECT_KEY = 'looxshop_redirect';
  const LOGIN_HISTORY_KEY = 'looxshop_login_history';

  /* ------------------------------------------------------------
     2. UTILITIES
  ------------------------------------------------------------ */
  function getUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function setCurrentUser(user) {
    const { password, ...safeUser } = user;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeUser));
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function normalizePhone(phone) {
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
    let result = String(phone);
    result = result.replace(/[۰-۹]/g, (d) => persianDigits.indexOf(d));
    result = result.replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d));
    return result.replace(/\D/g, '');
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidPhone(phone) {
    const p = normalizePhone(phone);
    return /^09\d{9}$/.test(p);
  }

  /* ------------------------------------------------------------
     3. LOGIN HISTORY TRACKER
  ------------------------------------------------------------ */
  function recordLoginEvent(user, type) {
    if (!user || !user.email) return;

    try {
      const history = JSON.parse(localStorage.getItem(LOGIN_HISTORY_KEY) || '[]');

      history.push({
        userId: user.id || null,
        email: String(user.email).toLowerCase(),
        name: user.name || '',
        type: type,
        date: new Date().toISOString(),
        device: (navigator.userAgent || '').substring(0, 80)
      });

      if (history.length > 500) {
        history.splice(0, history.length - 500);
      }

      localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Login history error:', e);
    }
  }

  window.LooxLoginHistory = {
    record: recordLoginEvent,
    getAll: function () {
      try {
        return JSON.parse(localStorage.getItem(LOGIN_HISTORY_KEY) || '[]');
      } catch (e) { return []; }
    }
  };

  /* ------------------------------------------------------------
     4. ALERT (in-card messages)
  ------------------------------------------------------------ */
  function showAlert(message, type = 'error') {
    const alertBox = document.getElementById('authAlert');
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `auth-alert auth-alert--${type}`;
    alertBox.hidden = false;

    clearTimeout(alertBox._timer);
    alertBox._timer = setTimeout(() => {
      alertBox.hidden = true;
    }, 5000);
  }

  function hideAlert() {
    const alertBox = document.getElementById('authAlert');
    if (alertBox) alertBox.hidden = true;
  }

  /* ------------------------------------------------------------
     5. REDIRECT AFTER LOGIN
  ------------------------------------------------------------ */
  function getRedirectUrl() {
    return sessionStorage.getItem(REDIRECT_KEY) || null;
  }

  function clearRedirect() {
    sessionStorage.removeItem(REDIRECT_KEY);
  }

  function redirectAfterAuth() {
    const redirect = getRedirectUrl();
    clearRedirect();
    if (redirect) {
      window.location.href = redirect;
    } else {
      window.location.href = 'index.html';
    }
  }

  /* ------------------------------------------------------------
     5.5 CLEAR BROWSER AUTOFILL
     ✅ پاک کردن فیلدهای پر شده توسط مرورگر
     (کروم و فایرفاکس به autocomplete="off" احترام نمی‌گذارند)
  ------------------------------------------------------------ */
  function clearBrowserAutofill(fieldIds) {
    const userTyped = {};

    // اگه کاربر تایپ کرد، دیگه پاک نکن
    fieldIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        userTyped[id] = true;
      }, { once: true });
    });

    // ۳ بار در زمان‌های مختلف تلاش کن
    [100, 400, 800].forEach((delay) => {
      setTimeout(() => {
        fieldIds.forEach((id) => {
          const el = document.getElementById(id);
          if (!el) return;
          if (userTyped[id]) return;
          if (el.value && el.value.trim() !== '') {
            el.value = '';
          }
        });
      }, delay);
    });
  }

  /* ------------------------------------------------------------
     6. PASSWORD TOGGLE
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
     7. SOCIAL LOGIN (UI only)
  ------------------------------------------------------------ */
  function initSocialButtons() {
    document.querySelectorAll('.auth-social__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const provider = btn.dataset.provider;
        if (typeof showToast === 'function') {
          showToast(`ورود با ${provider === 'google' ? 'گوگل' : 'اپل'} به‌زودی فعال می‌شود.`);
        }
      });
    });
  }

  /* ------------------------------------------------------------
     8. LOGIN FORM
  ------------------------------------------------------------ */
  function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    // ✅ پاک کردن autofill مرورگر
    clearBrowserAutofill(['loginIdentifier', 'loginPassword']);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      hideAlert();

      const identifier = document.getElementById('loginIdentifier').value.trim();
      const password = document.getElementById('loginPassword').value;

      // ---- Validation ----
      if (!identifier) {
        showAlert('لطفاً ایمیل یا شماره موبایل خود را وارد کنید.');
        return;
      }

      if (!password) {
        showAlert('لطفاً رمز عبور خود را وارد کنید.');
        return;
      }

      // ---- Find user ----
      const users = getUsers();
      const normalizedPhone = normalizePhone(identifier);
      const lowerEmail = identifier.toLowerCase();

      const user = users.find((u) => {
        const uEmail = (u.email || '').toLowerCase();
        const uPhone = normalizePhone(u.phone || '');
        return uEmail === lowerEmail || uPhone === normalizedPhone;
      });

      if (!user) {
        showAlert('کاربری با این مشخصات پیدا نشد. ابتدا ثبت‌نام کنید.');
        return;
      }

      if (user.password !== password) {
        showAlert('رمز عبور اشتباه است. لطفاً دوباره تلاش کنید.');
        return;
      }

      // ---- Success ----
      setCurrentUser(user);
      recordLoginEvent(user, 'in');

      showAlert('ورود موفق! در حال انتقال...', 'success');
      if (typeof showToast === 'function') {
        showToast(`خوش آمدید، ${user.name} عزیز`);
      }

      setTimeout(() => {
        redirectAfterAuth();
      }, 900);
    });
  }

  /* ------------------------------------------------------------
     9. REGISTER FORM
  ------------------------------------------------------------ */
  function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    // ✅ پاک کردن autofill مرورگر
    clearBrowserAutofill([
      'regName', 'regEmail', 'regPhone',
      'regPassword', 'regPassword2'
    ]);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      hideAlert();

      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim().toLowerCase();
      const phone = document.getElementById('regPhone').value.trim();
      const password = document.getElementById('regPassword').value;
      const password2 = document.getElementById('regPassword2').value;
      const terms = document.getElementById('regTerms').checked;

      // ---- Validation ----
      if (name.length < 3) {
        showAlert('نام باید حداقل ۳ کاراکتر باشد.');
        return;
      }

      if (!isValidEmail(email)) {
        showAlert('ایمیل وارد شده معتبر نیست.');
        return;
      }

      if (!isValidPhone(phone)) {
        showAlert('شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹).');
        return;
      }

      if (password.length < 6) {
        showAlert('رمز عبور باید حداقل ۶ کاراکتر باشد.');
        return;
      }

      if (password !== password2) {
        showAlert('رمز عبور و تکرار آن یکسان نیستند.');
        return;
      }

      if (!terms) {
        showAlert('لطفاً قوانین و مقررات را بپذیرید.');
        return;
      }

      // ---- Check for existing user ----
      const users = getUsers();
      const normalizedPhone = normalizePhone(phone);

      const exists = users.some((u) => {
        const uEmail = (u.email || '').toLowerCase();
        const uPhone = normalizePhone(u.phone || '');
        return uEmail === email || uPhone === normalizedPhone;
      });

      if (exists) {
        showAlert('این ایمیل یا شماره موبایل قبلاً ثبت شده است.');
        return;
      }

      // ---- Save new user ----
      const newUser = {
        id: 'U' + Date.now(),
        name,
        email,
        phone,
        password,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      saveUsers(users);
      setCurrentUser(newUser);
      recordLoginEvent(newUser, 'in');

      showAlert('ثبت‌نام موفق! در حال انتقال...', 'success');
      if (typeof showToast === 'function') {
        showToast(`خوش آمدید، ${name} عزیز`);
      }

      setTimeout(() => {
        redirectAfterAuth();
      }, 900);
    });
  }

  /* ------------------------------------------------------------
     10. LOGOUT — with history recording
  ------------------------------------------------------------ */
  function logout() {
    const currentUser = getCurrentUser();

    if (currentUser) {
      recordLoginEvent(currentUser, 'out');
    }

    localStorage.removeItem(CURRENT_USER_KEY);
  }

  /* ------------------------------------------------------------
     11. INIT
  ------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggles();
    initSocialButtons();
    initLoginForm();
    initRegisterForm();

    const isAuthPage = document.getElementById('loginForm') || document.getElementById('registerForm');
    if (isAuthPage && getCurrentUser()) {
      const redirect = getRedirectUrl();
      if (redirect) return;
    }
  });

  /* ------------------------------------------------------------
     12. EXPOSE HELPERS (for other scripts)
  ------------------------------------------------------------ */
  window.LooxAuth = {
    getCurrentUser,
    setCurrentUser,
    logout
  };
})();
