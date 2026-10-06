/* ============================================================
   LOOXSHOP — Contact Page Script
   Description: Handles the contact form validation and demo
                submission (stores to localStorage).
============================================================ */

(function () {
    'use strict';

    const MESSAGES_KEY = 'looxshop_contact_messages';

    /* ------------------------------------------------------------
       UTILITIES
    ------------------------------------------------------------ */
    function normalizePhone(phone) {
        const persian = '۰۱۲۳۴۵۶۷۸۹';
        const arabic = '٠١٢٣٤٥٦٧٨٩';
        let result = String(phone);
        result = result.replace(/[۰-۹]/g, (d) => persian.indexOf(d));
        result = result.replace(/[٠-٩]/g, (d) => arabic.indexOf(d));
        return result.replace(/\D/g, '');
    }

    function isValidPhone(phone) {
        return /^09\d{9}$/.test(normalizePhone(phone));
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function readList(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function writeList(key, list) {
        localStorage.setItem(key, JSON.stringify(list));
    }

    /* ------------------------------------------------------------
       FORM SUBMIT
    ------------------------------------------------------------ */
    function initForm() {
        const form = document.getElementById('contactForm');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('contactName').value.trim();
            const phone = document.getElementById('contactPhone').value.trim();
            const email = document.getElementById('contactEmail').value.trim();
            const subject = document.getElementById('contactSubject').value;
            const message = document.getElementById('contactMessage').value.trim();

            /* ---- Validation ---- */
            if (name.length < 3) {
                if (typeof showToast === 'function') showToast('نام باید حداقل ۳ کاراکتر باشد.');
                document.getElementById('contactName').focus();
                return;
            }

            if (!isValidPhone(phone)) {
                if (typeof showToast === 'function') showToast('شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)');
                document.getElementById('contactPhone').focus();
                return;
            }

            if (email && !isValidEmail(email)) {
                if (typeof showToast === 'function') showToast('ایمیل وارد شده معتبر نیست.');
                document.getElementById('contactEmail').focus();
                return;
            }

            if (!subject) {
                if (typeof showToast === 'function') showToast('لطفاً موضوع پیام را انتخاب کنید.');
                document.getElementById('contactSubject').focus();
                return;
            }

            if (message.length < 10) {
                if (typeof showToast === 'function') showToast('متن پیام باید حداقل ۱۰ کاراکتر باشد.');
                document.getElementById('contactMessage').focus();
                return;
            }

            /* ---- Save (demo) ---- */
            const list = readList(MESSAGES_KEY);
            list.unshift({
                id: 'MSG' + Date.now(),
                name,
                phone,
                email,
                subject,
                message,
                date: new Date().toISOString()
            });
            writeList(MESSAGES_KEY, list);

            /* ---- Success ---- */
            if (typeof showToast === 'function') {
                showToast('پیام شما با موفقیت ارسال شد ✓ در اسرع وقت پاسخ می‌دیم.');
            }

            form.reset();
        });
    }

    /* ------------------------------------------------------------
       INIT
    ------------------------------------------------------------ */
    document.addEventListener('DOMContentLoaded', () => {
        initForm();
    });

})();
