/* ============================================================
   LOOXSHOP — Order Tracking Page Script
   Description: Lets the user search for an order by its number
                and shows the status timeline, items and totals.
============================================================ */

(function () {
    'use strict';

    const ORDERS_KEY = 'looxshop_orders';

    /* ------------------------------------------------------------
       1. UTILITIES
    ------------------------------------------------------------ */
    function readList(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function formatPrice(num) {
        if (num === 0 || num === '0') return '۰';
        if (!num && num !== 0) return '—';
        return Number(num).toLocaleString('fa-IR');
    }

    function toPersianDigits(v) {
        const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return String(v).replace(/\d/g, (d) => digits[d]);
    }

    function formatPersianDate(iso) {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('fa-IR', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch (e) { return '—'; }
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /* ------------------------------------------------------------
       2. FIND ORDER
    ------------------------------------------------------------ */
    function findOrder(query) {
        if (!query) return null;
        const q = String(query).trim().toUpperCase();
        const orders = readList(ORDERS_KEY);

        return orders.find((o) => {
            const num = String(o.orderNumber || '').toUpperCase();
            const id = String(o.id || '').toUpperCase();
            return num === q || id === q;
        }) || null;
    }

    /* ------------------------------------------------------------
       3. RENDER — TIMELINE
    ------------------------------------------------------------ */
    function renderTimeline(status) {
        const steps = document.querySelectorAll('.timeline-step');
        const order = ['pending', 'processing', 'shipped', 'delivered'];
        const currentIndex = order.indexOf(status || 'processing');

        steps.forEach((step) => {
            const stepName = step.dataset.step;
            const stepIndex = order.indexOf(stepName);

            step.classList.remove('is-done', 'is-current', 'is-pending');

            if (stepIndex < currentIndex) {
                step.classList.add('is-done');
            } else if (stepIndex === currentIndex) {
                step.classList.add('is-current');
            } else {
                step.classList.add('is-pending');
            }
        });
    }

    /* ------------------------------------------------------------
       4. RENDER — FULL RESULT
    ------------------------------------------------------------ */
    function renderOrder(order) {
        const result = document.getElementById('trackingResult');
        const notFound = document.getElementById('trackingNotFound');

        if (!order) {
            result.hidden = true;
            notFound.hidden = false;
            return;
        }

        notFound.hidden = true;
        result.hidden = false;

        // ---- Header ----
        const numEl = document.getElementById('trackOrderNumber');
        if (numEl) numEl.textContent = order.orderNumber || order.id;

        const dateEl = document.getElementById('trackOrderDate');
        if (dateEl) dateEl.textContent = formatPersianDate(order.date);

        // ---- Timeline ----
        renderTimeline(order.status || 'processing');

        // ---- Tracking info (postal code + shipping method) ----
        const trackingInfo = document.getElementById('trackingInfo');
        const postalEl = document.getElementById('trackPostalCode');
        const shipEl = document.getElementById('trackShippingMethod');

        // Demo: generate a fake postal code if status is shipped or delivered
        const shippingLabels = {
            25000: 'ارسال عادی',
            55000: 'ارسال سریع',
            95000: 'ارسال فوری (پیک)'
        };

        const showTrackingInfo = ['shipped', 'delivered'].includes(order.status);

        if (trackingInfo && showTrackingInfo) {
            trackingInfo.hidden = false;

            // Fake postal code: 24-digit-ish
            const fakePostal = 'IR' + String(order.orderNumber || '').replace(/\D/g, '').slice(-10).padStart(10, '0');
            if (postalEl) postalEl.textContent = toPersianDigits(fakePostal);

            if (shipEl) {
                shipEl.textContent = shippingLabels[order.shipping] || 'ارسال استاندارد';
            }
        } else if (trackingInfo) {
            trackingInfo.hidden = true;
        }

        // ---- Items ----
        const itemsWrap = document.getElementById('trackingItems');
        if (itemsWrap) {
            const items = order.items || [];

            if (items.length === 0) {
                itemsWrap.innerHTML = `
          <p style="text-align:center; color:var(--text-soft); padding:20px 0; font-size:14px;">
            اطلاعات محصولات این سفارش در دسترس نیست.
          </p>`;
            } else {
                itemsWrap.innerHTML = items.map((item) => `
          <div class="tracking-item">
            <img class="tracking-item__img"
                 src="${item.image || 'assets/img/hero.jpg'}"
                 alt="${escapeHtml(item.name)}"
                 loading="lazy" />
            <div class="tracking-item__info">
              <h4>${escapeHtml(item.name)}</h4>
              <span class="tracking-item__qty">تعداد: ${toPersianDigits(item.qty)} عدد</span>
            </div>
            <div class="tracking-item__price">
              ${formatPrice(item.price * item.qty)} تومان
            </div>
          </div>
        `).join('');
            }
        }

        // ---- Summary ----
        // Compute subtotal from items if not provided
        const itemsSubtotal = (order.items || []).reduce((sum, i) => sum + (i.price * i.qty), 0);
        const subtotal = order.subtotal != null ? order.subtotal : itemsSubtotal;
        const shipping = order.shipping || 0;
        const discount = order.discount || 0;
        const walletUsed = order.walletUsed || 0;
        const total = order.total != null ? order.total : (subtotal + shipping - discount);

        const subEl = document.getElementById('trackSubtotal');
        if (subEl) subEl.textContent = `${formatPrice(subtotal)} تومان`;

        const shipSumEl = document.getElementById('trackShipping');
        if (shipSumEl) {
            if (shipping === 0) {
                shipSumEl.textContent = 'رایگان ✓';
                shipSumEl.style.color = '#2e7d32';
            } else {
                shipSumEl.textContent = `${formatPrice(shipping)} تومان`;
                shipSumEl.style.color = '';
            }
        }

        const discRow = document.getElementById('trackDiscountRow');
        const discEl = document.getElementById('trackDiscount');
        if (discount > 0 && discRow && discEl) {
            discRow.hidden = false;
            discEl.textContent = `- ${formatPrice(discount)} تومان`;
        } else if (discRow) {
            discRow.hidden = true;
        }

        const walletRow = document.getElementById('trackWalletRow');
        const walletEl = document.getElementById('trackWallet');
        if (walletUsed > 0 && walletRow && walletEl) {
            walletRow.hidden = false;
            walletEl.textContent = `- ${formatPrice(walletUsed)} تومان`;
        } else if (walletRow) {
            walletRow.hidden = true;
        }

        const totalEl = document.getElementById('trackTotal');
        if (totalEl) totalEl.textContent = `${formatPrice(total)} تومان`;

        // Scroll to result
        result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ------------------------------------------------------------
       5. SEARCH
    ------------------------------------------------------------ */
    function handleSearch(query) {
        const q = String(query || '').trim();

        if (!q) {
            if (typeof showToast === 'function') {
                showToast('لطفاً کد سفارش را وارد کنید');
            }
            const input = document.getElementById('trackingInput');
            input?.focus();
            return;
        }

        const order = findOrder(q);
        renderOrder(order);
    }

    function initSearch() {
        const form = document.getElementById('trackingForm');
        const input = document.getElementById('trackingInput');
        if (!form || !input) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSearch(input.value);
        });
    }

    /* ------------------------------------------------------------
       6. AUTO-LOAD FROM URL (?id=LX-...)
    ------------------------------------------------------------ */
    function autoLoadFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');

        if (id) {
            const input = document.getElementById('trackingInput');
            if (input) input.value = id;

            const order = findOrder(id);
            if (order) {
                // Delay slightly so the DOM is fully rendered
                setTimeout(() => renderOrder(order), 100);
            } else {
                const notFound = document.getElementById('trackingNotFound');
                const result = document.getElementById('trackingResult');
                if (result) result.hidden = true;
                if (notFound) notFound.hidden = false;
            }
        }
    }

    /* ------------------------------------------------------------
       7. INIT
    ------------------------------------------------------------ */
    document.addEventListener('DOMContentLoaded', () => {
        initSearch();
        autoLoadFromUrl();
    });

})();
