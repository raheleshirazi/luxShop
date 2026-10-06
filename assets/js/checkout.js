/* ============================================================
   LOOXSHOP — Checkout Page Script (Fixed v2)
   Description: Order is saved with full user info and address
============================================================ */

(function () {
  'use strict';

  /* ------------------------------------------------------------
     0. AUTH GUARD
  ------------------------------------------------------------ */
  function getCurrentUser() {
    try {
      const raw = localStorage.getItem('looxshop_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function isLoggedIn() {
    return !!getCurrentUser();
  }

  function guardAuth() {
    if (!isLoggedIn()) {
      sessionStorage.setItem('looxshop_redirect', 'checkout.html');

      if (typeof showToast === 'function') {
        showToast('برای تکمیل خرید، لطفاً ابتدا وارد شوید.');
      }

      document.body.style.opacity = '0.6';
      document.body.style.pointerEvents = 'none';

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1400);
      return false;
    }
    return true;
  }

  /* ------------------------------------------------------------
     1. CONSTANTS
  ------------------------------------------------------------ */
  const STORAGE_KEY = 'looxshop_cart';
  const SHIPPING_FREE_THRESHOLD = 500000;

  const COUPONS = {
    'LOOX10': { percent: 10, max: 500000, label: '۱۰٪ تخفیف' },
    'LOOX20': { percent: 20, max: 1000000, label: '۲۰٪ تخفیف' },
    'WELCOME': { percent: 5, max: 200000, label: '۵٪ تخفیف خوش‌آمدگویی' }
  };

  let walletBalance = 500000;

  /* ------------------------------------------------------------
     2. STATE
  ------------------------------------------------------------ */
  let shippingCost = 25000;
  let appliedCoupon = null;
  let appliedWalletAmount = 0;

  /* ------------------------------------------------------------
     3. UTILITIES
  ------------------------------------------------------------ */
  function getCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
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

  function formatPrice(num) {
    return Number(num).toLocaleString('fa-IR');
  }

  function toPersianDigits(v) {
    const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(v).replace(/\d/g, (d) => digits[d]);
  }

  function getSubtotal() {
    return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function getShipping(subtotal) {
    if (subtotal === 0) return 0;
    if (subtotal >= SHIPPING_FREE_THRESHOLD) return 0;
    return shippingCost;
  }

  function getDiscount(subtotal) {
    if (!appliedCoupon || subtotal === 0) return 0;
    return Math.min(
      Math.round(subtotal * appliedCoupon.percent / 100),
      appliedCoupon.max
    );
  }

  /* ------------------------------------------------------------
     4. RENDER ITEMS
  ------------------------------------------------------------ */
  function renderCheckoutItems() {
    const cart = getCart();
    const wrap = document.getElementById('checkoutItems');
    if (!wrap) return;

    if (cart.length === 0) {
      wrap.innerHTML = `
        <p style="text-align:center; color:var(--text-soft); padding:30px 0; font-size:14px;">
          سبد خرید شما خالی است. <br>
          <a href="shop.html" style="color:var(--wine); font-weight:800;">رفتن به فروشگاه</a>
        </p>`;
      return;
    }

    wrap.innerHTML = cart.map((item) => `
      <div class="checkout-item">
        <img class="checkout-item__img" src="${item.image}" alt="${item.name}" />
        <div class="checkout-item__info">
          <p class="checkout-item__title">${item.name}</p>
          <span class="checkout-item__qty">تعداد: ${toPersianDigits(item.qty)}</span>
        </div>
        <span class="checkout-item__price">${formatPrice(item.price * item.qty)} تومان</span>
      </div>
    `).join('');
  }

  /* ------------------------------------------------------------
     5. RENDER TOTALS
  ------------------------------------------------------------ */
  function renderTotals() {
    const subtotal = getSubtotal();
    const shipping = getShipping(subtotal);
    const discount = getDiscount(subtotal);
    const walletUsed = appliedWalletAmount;

    const subtotalEl = document.getElementById('coSubtotal');
    const shippingEl = document.getElementById('coShipping');
    const discountRow = document.getElementById('coDiscountRow');
    const discountEl = document.getElementById('coDiscount');
    const walletRow = document.getElementById('coWalletRow');
    const walletRowAmount = document.getElementById('coWalletAmount');
    const totalEl = document.getElementById('coTotal');

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

    if (walletRow && walletRowAmount) {
      if (walletUsed > 0) {
        walletRow.hidden = false;
        walletRowAmount.textContent = `- ${formatPrice(walletUsed)} تومان`;
      } else {
        walletRow.hidden = true;
      }
    }

    const total = Math.max(0, subtotal + shipping - discount - walletUsed);
    if (totalEl) totalEl.textContent = `${formatPrice(total)} تومان`;
  }

  function refreshCheckout() {
    renderCheckoutItems();
    renderTotals();
    updateWalletUI();
  }

  /* ------------------------------------------------------------
     6. SHIPPING
  ------------------------------------------------------------ */
  function initShippingChange() {
    document.querySelectorAll('input[name="shipping"]').forEach((input) => {
      input.addEventListener('change', (e) => {
        shippingCost = Number(e.target.dataset.cost) || 25000;
        refreshCheckout();
      });
    });
  }

  /* ------------------------------------------------------------
     7. COUPON
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
      appliedCoupon = { ...COUPONS[code], code };
      hint.textContent = `✓ کد ${code} اعمال شد (${appliedCoupon.label})`;
      hint.className = 'cart-coupon__hint is-success';
      refreshCheckout();
    } else {
      appliedCoupon = null;
      hint.textContent = '✕ کد تخفیف معتبر نیست.';
      hint.className = 'cart-coupon__hint is-error';
      refreshCheckout();
    }
  }

  function initCoupon() {
    document.getElementById('applyCouponBtn')?.addEventListener('click', applyCoupon);
    document.getElementById('couponInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCoupon();
      }
    });
  }

  /* ------------------------------------------------------------
     8. PAYMENT METHOD
  ------------------------------------------------------------ */
  function initPaymentChange() {
    document.querySelectorAll('input[name="payment"]').forEach((input) => {
      input.addEventListener('change', (e) => {
        if (e.target.value === 'wallet') {
          setWalletToMax();
        } else {
          appliedWalletAmount = 0;
        }
        refreshCheckout();
      });
    });
  }

  /* ------------------------------------------------------------
     9. WALLET
  ------------------------------------------------------------ */
  function updateWalletUI() {
    const box = document.getElementById('walletPayBox');
    const range = document.getElementById('walletRange');
    const usedEl = document.getElementById('walletUsedAmount');
    const remainEl = document.getElementById('walletRemainAmount');
    const maxLabel = document.getElementById('walletMaxLabel');
    const balanceText = document.getElementById('walletBalanceText');

    if (!box) return;

    if (balanceText) {
      balanceText.textContent = `موجودی: ${formatPrice(walletBalance)} تومان`;
    }

    const isWalletSelected = document.querySelector('input[name="payment"]:checked')?.value === 'wallet';

    if (!isWalletSelected) {
      box.hidden = true;
      return;
    }

    box.hidden = false;

    const subtotal = getSubtotal();
    const shipping = getShipping(subtotal);
    const discount = getDiscount(subtotal);
    const totalBeforeWallet = Math.max(0, subtotal + shipping - discount);
    const maxUsable = Math.min(walletBalance, totalBeforeWallet);

    if (range) {
      range.max = maxUsable;
      range.step = 10000;
      if (Number(range.value) > maxUsable) range.value = maxUsable;
      if (Number(range.value) < 0) range.value = 0;
      appliedWalletAmount = Number(range.value);
    }

    if (maxLabel) maxLabel.textContent = `${formatPrice(maxUsable)} تومان`;
    if (usedEl) usedEl.textContent = `${formatPrice(appliedWalletAmount)} تومان`;

    const remain = Math.max(0, totalBeforeWallet - appliedWalletAmount);
    if (remainEl) remainEl.textContent = `${formatPrice(remain)} تومان`;
  }

  function setWalletToMax() {
    const range = document.getElementById('walletRange');
    if (!range) return;

    const subtotal = getSubtotal();
    const shipping = getShipping(subtotal);
    const discount = getDiscount(subtotal);
    const totalBeforeWallet = Math.max(0, subtotal + shipping - discount);
    const maxUsable = Math.min(walletBalance, totalBeforeWallet);

    range.max = maxUsable;
    range.value = maxUsable;
    appliedWalletAmount = maxUsable;
  }

  function initWalletSlider() {
    const range = document.getElementById('walletRange');
    if (!range) return;
    range.addEventListener('input', () => {
      appliedWalletAmount = Number(range.value);
      updateWalletUI();
      renderTotals();
    });
  }

  /* ------------------------------------------------------------
     10. VALIDATION
  ------------------------------------------------------------ */
  function validateForm() {
    const requiredFields = ['firstName', 'lastName', 'phone', 'province', 'city', 'address', 'postalCode'];

    for (const id of requiredFields) {
      const el = document.getElementById(id);
      if (el && !el.value.trim()) {
        el.focus();
        el.style.borderColor = 'var(--rose)';
        showToast('لطفاً اطلاعات ارسال را کامل کنید.');
        return false;
      }
      if (el) el.style.borderColor = '';
    }

    const agree = document.getElementById('agreeTerms');
    if (agree && !agree.checked) {
      showToast('لطفاً قوانین و مقررات را بپذیرید.');
      return false;
    }

    return true;
  }

  /* ------------------------------------------------------------
     11. ORDER SUBMIT — with full user info ✅
  ------------------------------------------------------------ */
  function initSubmit() {
    const btn = document.getElementById('submitOrderBtn');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();

      if (!isLoggedIn()) {
        sessionStorage.setItem('looxshop_redirect', 'checkout.html');
        showToast('لطفاً ابتدا وارد حساب کاربری خود شوید.');
        setTimeout(() => window.location.href = 'login.html', 1200);
        return;
      }

      const cart = getCart();
      if (cart.length === 0) {
        showToast('سبد خرید شما خالی است.');
        return;
      }

      if (!validateForm()) return;

      // ---- Get current user ----
      const currentUser = getCurrentUser();

      // ---- Compute final amounts ----
      const subtotal = getSubtotal();
      const shipping = getShipping(subtotal);
      const discount = getDiscount(subtotal);
      const totalBeforeWallet = Math.max(0, subtotal + shipping - discount);
      const walletUsed = Math.min(appliedWalletAmount, walletBalance, totalBeforeWallet);
      const onlineAmount = Math.max(0, totalBeforeWallet - walletUsed);

      // ---- Deduct from wallet (demo) ----
      if (walletUsed > 0) {
        walletBalance -= walletUsed;
        if (walletBalance < 0) walletBalance = 0;
      }

      // ---- Get form values ----
      const firstName = (document.getElementById('firstName')?.value || '').trim();
      const lastName = (document.getElementById('lastName')?.value || '').trim();
      const phone = (document.getElementById('phone')?.value || '').trim();
      const province = (document.getElementById('province')?.value || '').trim();
      const city = (document.getElementById('city')?.value || '').trim();
      const address = (document.getElementById('address')?.value || '').trim();
      const postalCode = (document.getElementById('postalCode')?.value || '').trim();

      const customerName = `${firstName} ${lastName}`.trim() || (currentUser?.name || 'کاربر');
      const fullAddress = `${province}، ${city}، ${address}`;

      // ---- Generate order number ----
      const orderNumber = 'LX-' + new Date().getFullYear() +
        String(Date.now()).slice(-4) + '-' +
        Math.floor(1000 + Math.random() * 9000);

      const orderDate = new Date().toISOString();

      // ---- Save order with FULL user info ----
      const orders = readList('looxshop_orders');
      const newOrder = {
        id: 'ORD' + Date.now(),
        orderNumber: orderNumber,
        date: orderDate,
        updatedAt: orderDate,
        status: 'processing',

        // ✅ User info (critical for dashboard)
        userId: currentUser ? currentUser.id : null,
        userEmail: currentUser ? currentUser.email : null,
        userName: currentUser ? currentUser.name : null,
        customerName: customerName,
        customerEmail: currentUser ? currentUser.email : null,
        customerPhone: phone,

        // ✅ Address
        address: fullAddress,
        province: province,
        city: city,
        postalCode: postalCode,

        // ✅ Amounts
        subtotal: subtotal,
        shipping: shipping,
        discount: discount,
        walletUsed: walletUsed,
        onlineAmount: onlineAmount,
        total: totalBeforeWallet,

        // ✅ Items
        itemsCount: cart.reduce((s, i) => s + i.qty, 0),
        items: cart.map(i => ({
          id: i.id,
          name: i.name,
          price: i.price,
          qty: i.qty,
          image: i.image
        }))
      };

      orders.unshift(newOrder);
      writeList('looxshop_orders', orders);

      // ---- Save last order for success page ----
      localStorage.setItem('looxshop_last_order', JSON.stringify({
        orderNumber: orderNumber,
        date: orderDate,
        subtotal: subtotal,
        shipping: shipping,
        discount: discount,
        walletUsed: walletUsed,
        onlineAmount: onlineAmount,
        total: totalBeforeWallet,
        itemsCount: cart.reduce((s, i) => s + i.qty, 0)
      }));

      // ---- Clear cart ----
      localStorage.removeItem(STORAGE_KEY);
      if (typeof renderCart === 'function') renderCart();

      // ✅ Notify admin panel in real-time
      if (window.LooxSync) window.LooxSync.notify('looxshop_orders');

      // ---- Processing UI ----
      btn.disabled = true;
      btn.innerHTML = 'در حال پردازش...';

      if (onlineAmount > 0) {
        showToast('در حال انتقال به درگاه پرداخت...');
      } else {
        showToast('پرداخت با کیف پول انجام شد ✓');
      }

      setTimeout(() => {
        btn.innerHTML = '✓ سفارش شما ثبت شد';
        btn.style.background = '#2e7d32';
        setTimeout(() => {
          window.location.href = 'order-success.html';
        }, 1200);
      }, 1500);
    });
  }

  /* ------------------------------------------------------------
     12. INIT
  ------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    if (!guardAuth()) return;

    refreshCheckout();
    initShippingChange();
    initCoupon();
    initPaymentChange();
    initWalletSlider();
    initSubmit();
  });

})();
