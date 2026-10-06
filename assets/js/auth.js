/* ============================================================
   LOOXSHOP — Auth Script (Login + Register)
   Description: Handles login and register forms, user
                storage in localStorage, and redirect logic.
                + Login history tracking for admin panel.
   Note: This is a DEMO. Real apps need a backend.
============================================================ */

(function () {
  'use strict';

  /* ------------------------------------------------------------
     1. STORAGE KEYS
  ------------------------------------------------------------ */
  const USERS_KEY = 'looxshop_users';              // array of registered users
  const CURRENT_USER_KEY = 'looxshop_user';        // current logged-in user
  const REDIRECT_KEY = 'looxshop_redirect';        // where to go after login
  const LOGIN_HISTORY_KEY = 'looxshop_login_history'; // user login/logout

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
    // Never store the password in the "current user"
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
    // Convert Persian/Arabic digits to English and strip non-digits
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
     Record every user login/logout in localStorage for display in the admin panel
  ------------------------------------------------------------ */
  function recordLoginEvent(user, type) {
    // type: 'in' or 'out'
    if (!user || !user.email) return;

    try {
      const history = JSON.parse(localStorage.getItem(LOGIN_HISTORY_KEY) || '[]');

      history.push({
        userId: user.id || null,
        email: String(user.email).toLowerCase(),
        name: user.name || '',
        type: type, // 'in' or 'out'
        date: new Date().toISOString(),
        device: (navigator.userAgent || '').substring(0, 80)
      });

      // Only the last 500 records are kept
      if (history.length > 500) {
        history.splice(0, history.length - 500);
      }

      localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Login history error:', e);
    }
  }

  // Expose for other scripts
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
    // Auto-hide after 5s
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
     6. PASSWORD TOGGLE (show/hide)
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

      // ✅ Record login in history
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
        password, // ⚠️ DEMO ONLY — never store plaintext passwords in real apps!
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      saveUsers(users);
      setCurrentUser(newUser);

      // ✅ Record login in history (immediately after registration)
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

    // ✅ Record logout in history
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

    // If user is already logged in and tries to open login/register,
    // redirect them away (nicer UX)
    const isAuthPage = document.getElementById('loginForm') || document.getElementById('registerForm');
    if (isAuthPage && getCurrentUser()) {
      const redirect = getRedirectUrl();
      if (redirect) return;
      // Otherwise send home
      // (commented out to allow switching accounts — uncomment if you want)
      // window.location.href = 'index.html';
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
