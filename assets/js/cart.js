/* ============================================================
   LOOXSHOP — Cart Page Script
   Description: Renders the full cart page, handles quantity,
                removal, coupon code and order totals.
============================================================ */

(function () {
    'use strict';

    /* ------------------------------------------------------------
       1. CONSTANTS
    ------------------------------------------------------------ */
    const STORAGE_KEY = 'looxshop_cart';
    const COUPONS = {
        'LOOX10': { percent: 10, max: 500000, label: '۱۰٪ تخفیف' },
        'LOOX20': { percent: 20, max: 1000000, label: '۲۰٪ تخفیف' },
        'WELCOME': { percent: 5, max: 200000, label: '۵٪ تخفیف خوش‌آمدگویی' }
    };
    const SHIPPING_FREE_THRESHOLD = 500000;
    const SHIPPING_COST = 35000;

    let appliedCoupon = null;

    /* ------------------------------------------------------------
       2. UTILITIES
    ------------------------------------------------------------ */
    function getCart() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function saveCart(cart) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        // Also refresh the header cart count (from app.js renderCart)
        if (typeof renderCart === 'function') renderCart();
    }

    function formatPrice(num) {
        return Number(num).toLocaleString('fa-IR');
    }

    function toPersianDigits(v) {
        const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return String(v).replace(/\d/g, (d) => digits[d]);
    }

    /* ------------------------------------------------------------
       3. RENDER ITEMS
    ------------------------------------------------------------ */
    function renderCartPage() {
        const cart = getCart();
        const wrap = document.getElementById('cartPageItems');
        const empty = document.getElementById('cartEmpty');
        const summary = document.getElementById('cartSummary');

        if (!wrap) return;

        if (cart.length === 0) {
            wrap.innerHTML = '';
            if (empty) empty.hidden = false;
            if (summary) summary.style.display = 'none';
            renderTotals(cart);
            return;
        }

        if (empty) empty.hidden = true;
        if (summary) summary.style.display = '';

        wrap.innerHTML = cart.map((item) => `
      <div class="cart-page-item" data-id="${item.id}">
        <div class="cart-page-item__product">
          <img class="cart-page-item__img" src="${item.image}" alt="${item.name}" loading="lazy" />
          <div class="cart-page-item__info">
            <h3 class="cart-page-item__title">${item.name}</h3>
            <span class="cart-page-item__cat">لوکس‌شاپ</span>
          </div>
        </div>

        <div class="cart-page-item__price">${formatPrice(item.price)} تومان</div>

        <div class="qty">
          <button type="button" data-action="decrease" aria-label="کاهش">−</button>
          <span>${toPersianDigits(item.qty)}</span>
          <button type="button" data-action="increase" aria-label="افزایش">+</button>
        </div>

        <div class="cart-page-item__total">${formatPrice(item.price * item.qty)} تومان</div>

        <button class="cart-page-item__remove" data-action="remove" aria-label="حذف">✕</button>
      </div>
    `).join('');

        renderTotals(cart);
    }

    /* ------------------------------------------------------------
       4. RENDER TOTALS
    ------------------------------------------------------------ */
    function renderTotals(cart) {
        const subtotalEl = document.getElementById('summarySubtotal');
        const shippingEl = document.getElementById('summaryShipping');
        const discountRow = document.getElementById('discountRow');
        const discountEl = document.getElementById('summaryDiscount');
        const totalEl = document.getElementById('summaryTotal');

        const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

        // Free shipping threshold
        let shipping = 0;
        if (subtotal > 0 && subtotal < SHIPPING_FREE_THRESHOLD) {
            shipping = SHIPPING_COST;
        }

        // Discount
        let discount = 0;
        if (appliedCoupon && subtotal > 0) {
            discount = Math.min(Math.round(subtotal * appliedCoupon.percent / 100), appliedCoupon.max);
        }

        const total = Math.max(0, subtotal + shipping - discount);

        if (subtotalEl) subtotalEl.textContent = `${formatPrice(subtotal)} تومان`;
        if (shippingEl) {
            if (subtotal === 0) shippingEl.textContent = '—';
            else if (shipping === 0) shippingEl.textContent = 'رایگان ✓';
            else shippingEl.textContent = `${formatPrice(shipping)} تومان`;
        }
        if (discountRow && discountEl) {
            if (discount > 0) {
                discountRow.hidden = false;
                discountEl.textContent = `- ${formatPrice(discount)} تومان`;
            } else {
                discountRow.hidden = true;
            }
        }
        if (totalEl) totalEl.textContent = `${formatPrice(total)} تومان`;
    }

    /* ------------------------------------------------------------
       5. UPDATE QUANTITY / REMOVE
    ------------------------------------------------------------ */
    function updateItem(id, delta) {
        const cart = getCart();
        const item = cart.find((p) => p.id === id);
        if (!item) return;
        item.qty += delta;
        const filtered = cart.filter((p) => p.qty > 0);
        saveCart(filtered);
        renderCartPage();
    }

    function removeItem(id) {
        const cart = getCart().filter((p) => p.id !== id);
        saveCart(cart);
        renderCartPage();
        showToast('محصول از سبد خرید حذف شد');
    }

    function clearCart() {
        if (confirm('آیا مطمئن هستید که می‌خواهید تمام سبد خرید را خالی کنید؟')) {
            saveCart([]);
            renderCartPage();
            showToast('سبد خرید خالی شد');
        }
    }

    /* ------------------------------------------------------------
       6. COUPON
    ------------------------------------------------------------ */
    function applyCoupon() {
        const input = document.getElementById('couponInput');
        const hint = document.getElementById('couponHint');
        if (!input || !hint) return;

        const code = input.value.trim().toUpperCase();

        if (!code) {
            hint.textContent = 'کد تخفیف را وارد کنید.';
            hint.className = 'cart-coupon__hint is-error';
            return;
        }

        if (COUPONS[code]) {
            appliedCoupon = COUPONS[code];
            appliedCoupon.code = code;
            hint.textContent = `✓ کد ${code} اعمال شد (${appliedCoupon.label})`;
            hint.className = 'cart-coupon__hint is-success';
            renderCartPage();
        } else {
            appliedCoupon = null;
            hint.textContent = '✕ کد تخفیف معتبر نیست.';
            hint.className = 'cart-coupon__hint is-error';
            renderCartPage();
        }
    }

    /* ------------------------------------------------------------
       7. EVENT LISTENERS
    ------------------------------------------------------------ */
    function initEvents() {
        // Event delegation for qty & remove
        document.getElementById('cartPageItems')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const row = btn.closest('.cart-page-item');
            if (!row) return;
            const id = row.dataset.id;

            if (btn.dataset.action === 'increase') updateItem(id, 1);
            if (btn.dataset.action === 'decrease') updateItem(id, -1);
            if (btn.dataset.action === 'remove') removeItem(id);
        });

        document.getElementById('clearCartBtn')?.addEventListener('click', clearCart);
        document.getElementById('applyCouponBtn')?.addEventListener('click', applyCoupon);

        // Enter key on coupon input
        document.getElementById('couponInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyCoupon();
            }
        });
    }

    /* ------------------------------------------------------------
       8. INIT
    ------------------------------------------------------------ */
    document.addEventListener('DOMContentLoaded', () => {
        renderCartPage();
        initEvents();
    });
})();
