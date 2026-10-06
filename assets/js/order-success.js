/* ============================================================
   LOOXSHOP — Order Success Page Script
   Description: Reads the last order info from localStorage
                and displays order details on the success page.
============================================================ */

(function () {
    'use strict';

    const ORDER_KEY = 'looxshop_last_order';

    /* ------------------------------------------------------------
       1. UTILITIES
    ------------------------------------------------------------ */
    function formatPrice(num) {
        if (num === 0 || num === '0') return 'رایگان';
        if (!num) return '—';
        return Number(num).toLocaleString('fa-IR');
    }

    function formatPricePlain(num) {
        if (!num) return '—';
        return Number(num).toLocaleString('fa-IR');
    }

    function toPersianDigits(v) {
        const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return String(v).replace(/\d/g, (d) => digits[d]);
    }

    function formatPersianDate(isoString) {
        try {
            const d = new Date(isoString);
            const date = d.toLocaleDateString('fa-IR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const time = d.toLocaleTimeString('fa-IR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            return `${date} — ${time}`;
        } catch (e) {
            return '—';
        }
    }

    /* ------------------------------------------------------------
       2. GENERATE ORDER NUMBER (fallback if none saved)
    ------------------------------------------------------------ */
    function generateOrderNumber() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);
        return `LX-${y}${m}${d}-${random}`;
    }

    /* ------------------------------------------------------------
       3. RENDER ORDER INFO
    ------------------------------------------------------------ */
    function renderOrder() {
        let order = null;

        try {
            const raw = localStorage.getItem(ORDER_KEY);
            order = raw ? JSON.parse(raw) : null;
        } catch (e) {
            order = null;
        }

        // Fallback if no order data exists
        if (!order) {
            order = {
                date: new Date().toISOString(),
                subtotal: 0,
                shipping: 0,
                discount: 0,
                walletUsed: 0,
                onlineAmount: 0,
                total: 0,
                itemsCount: 0
            };
        }

        // Generate / use order number
        const orderNumber = order.orderNumber || generateOrderNumber();

        // Save it back so it doesn't change on refresh
        if (!order.orderNumber) {
            order.orderNumber = orderNumber;
            try {
                localStorage.setItem(ORDER_KEY, JSON.stringify(order));
            } catch (e) { /* ignore */ }
        }

        // ---- Header info ----
        const numEl = document.getElementById('orderNumber');
        if (numEl) numEl.textContent = orderNumber;

        const dateEl = document.getElementById('orderDate');
        if (dateEl) dateEl.textContent = formatPersianDate(order.date);

        const totalEl = document.getElementById('orderTotal');
        if (totalEl) totalEl.textContent = `${formatPricePlain(order.total)} تومان`;

        // ---- Summary rows ----
        const sumSubtotal = document.getElementById('sumSubtotal');
        if (sumSubtotal) sumSubtotal.textContent = `${formatPricePlain(order.subtotal)} تومان`;

        const sumShipping = document.getElementById('sumShipping');
        if (sumShipping) {
            if (order.shipping === 0) {
                sumShipping.textContent = 'رایگان ✓';
                sumShipping.style.color = '#2e7d32';
            } else {
                sumShipping.textContent = `${formatPricePlain(order.shipping)} تومان`;
            }
        }

        // Discount row
        const sumDiscountRow = document.getElementById('sumDiscountRow');
        const sumDiscount = document.getElementById('sumDiscount');
        if (order.discount > 0) {
            if (sumDiscountRow) sumDiscountRow.hidden = false;
            if (sumDiscount) sumDiscount.textContent = `- ${formatPricePlain(order.discount)} تومان`;
        }

        // Wallet row
        const sumWalletRow = document.getElementById('sumWalletRow');
        const sumWallet = document.getElementById('sumWallet');
        if (order.walletUsed > 0) {
            if (sumWalletRow) sumWalletRow.hidden = false;
            if (sumWallet) sumWallet.textContent = `- ${formatPricePlain(order.walletUsed)} تومان`;
        }

        // Total
        const sumTotal = document.getElementById('sumTotal');
        if (sumTotal) sumTotal.textContent = `${formatPricePlain(order.total)} تومان`;
    }

    /* ------------------------------------------------------------
       4. INIT
    ------------------------------------------------------------ */
    document.addEventListener('DOMContentLoaded', () => {
        renderOrder();

        // Fire a small confetti effect (optional)
        setTimeout(() => {
            if (typeof showToast === 'function') {
                showToast('سفارش شما با موفقیت ثبت شد ✓');
            }
        }, 400);
    });

})();
