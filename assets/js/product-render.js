/* ============================================================
   LOOXSHOP — Dynamic Product Renderer (v2)
   Description: Render products from localStorage + event delegation
============================================================ */

(function () {
    'use strict';

    const PRODUCTS_KEY = 'looxshop_products';

    const CATEGORY_LABELS = {
        digital: 'کالای دیجیتال',
        clothing: 'پوشاک',
        home: 'لوازم خانه',
        beauty: 'زیبایی و سلامت',
        accessories: 'اکسسوری'
    };

    function readList(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function formatPrice(num) {
        return Number(num).toLocaleString('fa-IR');
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, "&#39;");
    }

    function buildCardHTML(p) {
        const hasDiscount = p.oldPrice && Number(p.oldPrice) > Number(p.price);
        const discountPercent = hasDiscount
            ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)
            : 0;

        const stock = Number(p.stock || 0);
        const isOut = stock === 0;

        return `
      <article class="product-card" data-id="${escapeHtml(p.id)}" data-category="${escapeHtml(p.category)}"
        data-price="${p.price}" data-rating="${p.rating || 4.5}" data-date="${p.date || 5}"
        data-name="${escapeHtml(p.name)}">
        <div class="product-card__media">
          ${hasDiscount ? `<span class="badge badge--sale">${discountPercent}٪ تخفیف</span>` : ''}
          <a href="product.html?id=${encodeURIComponent(p.id)}" class="product-card__link">
            <img src="${escapeHtml(p.image || 'assets/img/hero.jpg')}" alt="${escapeHtml(p.name)}" loading="lazy" />
          </a>
          <div class="product-card__actions">
            <button class="icon-btn wishlist-btn" aria-label="افزودن به علاقه‌مندی">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21.2l7.7-7.8 1.1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>
            </button>
            <button class="icon-btn quick-view-btn" aria-label="مشاهده سریع">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </div>
        <div class="product-card__body">
          <span class="product-card__cat">${escapeHtml(CATEGORY_LABELS[p.category] || '—')}</span>
          <a href="product.html?id=${encodeURIComponent(p.id)}" class="product-card__link">
            <h3 class="product-card__title">${escapeHtml(p.name)}</h3>
          </a>
          <div class="product-card__rating">★ <span>${(p.rating || 4.5).toLocaleString('fa-IR')}</span> (${(p.reviewCount || 0).toLocaleString('fa-IR')} نظر)</div>
          <div class="product-card__price">
            ${hasDiscount ? `<del>${formatPrice(p.oldPrice)}</del>` : ''}
            <strong>${formatPrice(p.price)} <small>تومان</small></strong>
          </div>
          <button class="btn btn--primary btn--block add-to-cart"
            data-id="${escapeHtml(p.id)}"
            data-name="${escapeHtml(p.name)}"
            data-price="${p.price}"
            data-image="${escapeHtml(p.image || '')}"
            ${isOut ? 'disabled' : ''}>
            ${isOut ? 'ناموجود' : 'افزودن به سبد'}
          </button>
        </div>
      </article>
    `;
    }

    function render() {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        const products = readList(PRODUCTS_KEY);
        if (products.length === 0) return;

        const sorted = [...products].sort((a, b) =>
            Number(b.date || 0) - Number(a.date || 0)
        );

        grid.innerHTML = sorted.map(buildCardHTML).join('');

        // ✅ Update wishlist button states from app.js
        if (window.LooxWishlist && typeof window.LooxWishlist.refreshButtons === 'function') {
            window.LooxWishlist.refreshButtons();
        }

        // ✅ Dispatch an event for app.js so it knows new cards have arrived
        window.dispatchEvent(new CustomEvent('looxshop:products-rendered'));
    }

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(render, 50);
    });

})();
