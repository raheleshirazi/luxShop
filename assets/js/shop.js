/* ============================================================
   LOOXSHOP — Shop Page Script
   Description: Handles sidebar filters, sorting, view toggle
                and pagination for shop.html only.
   Note: shared logic (cart, mobile menu, header) lives in app.js
============================================================ */

// Wrap in IIFE to prevent variable conflicts with app.js
(function () {
    'use strict';

    /* ------------------------------------------------------------
       1. STATE
    ------------------------------------------------------------ */
    const shopState = {
        categories: [],      // array of selected category values
        maxPrice: 10000000,  // slider value
        minRating: 0,        // 0 means "show all"
        onlyDiscount: false, // checkbox
        onlyAvailable: true, // checkbox
        sort: 'default',     // sorting option
        view: 'grid',        // 'grid' or 'list'
        page: 1,             // current page
        perPage: 9,          // products per page
    };

    /* ------------------------------------------------------------
       2. DOM SHORTCUTS
    ------------------------------------------------------------ */
    const shopGridEl = document.getElementById('productsGrid');
    const shopEmptyEl = document.getElementById('shopEmpty');
    const shopPagination = document.getElementById('pagination');
    const shopActiveFilters = document.getElementById('activeFilters');
    const shopShownCount = document.getElementById('shownCount');
    const shopAllCount = document.getElementById('allCount');
    const shopTotalCount = document.getElementById('totalCount');

    const shopPriceRange = document.getElementById('priceRange');
    const shopPriceValue = document.getElementById('priceValue');

    const shopSortSelect = document.getElementById('sortSelect');
    const shopFilterCats = document.querySelectorAll('.filter-cat');
    const shopFilterRatings = document.querySelectorAll('.filter-rating');
    const shopOnlyDiscount = document.getElementById('onlyDiscount');
    const shopOnlyAvailable = document.getElementById('onlyAvailable');

    const shopViewGridBtn = document.getElementById('viewGrid');
    const shopViewListBtn = document.getElementById('viewList');

    const shopSidebar = document.getElementById('shopSidebar');
    const shopFilterToggle = document.getElementById('filterToggle');
    const shopFilterClose = document.getElementById('filterClose');
    const shopClearFilters = document.getElementById('clearFilters');
    const shopResetFromEmpty = document.getElementById('resetFromEmpty');

    /* ------------------------------------------------------------
       3. HELPERS
    ------------------------------------------------------------ */

    /** Return all product cards as an array. */
    function getShopCards() {
        return Array.from(shopGridEl.querySelectorAll('.product-card'));
    }

    /** Check whether a card passes all active filters. */
    function cardMatchesFilters(card) {
        const category = card.dataset.category;
        const price = Number(card.dataset.price);
        const rating = Number(card.dataset.rating);
        const discount = card.dataset.discount === 'true';

        // Category : if none selected, show all
        if (shopState.categories.length > 0 && !shopState.categories.includes(category)) {
            return false;
        }

        // Price : must be <= slider value
        if (price > shopState.maxPrice) return false;

        // Rating : must be >= selected rating
        if (shopState.minRating > 0 && rating < shopState.minRating) return false;

        // Discount : if checkbox is on, only show discounted products
        if (shopState.onlyDiscount && !discount) return false;

        return true;
    }

    /** Sort an array of cards in place (returns a new sorted array). */
    function sortCards(cards) {
        return [...cards].sort((a, b) => {
            const priceA = Number(a.dataset.price);
            const priceB = Number(b.dataset.price);
            const ratingA = Number(a.dataset.rating);
            const ratingB = Number(b.dataset.rating);
            const dateA = Number(a.dataset.date);
            const dateB = Number(b.dataset.date);

            switch (shopState.sort) {
                case 'cheap': return priceA - priceB;
                case 'expensive': return priceB - priceA;
                case 'popular': return ratingB - ratingA;
                case 'newest': return dateB - dateA;
                default: return 0;
            }
        });
    }

    /** Toggle the sidebar as an overlay panel (mobile only). */
    function closeSidebar() {
        shopSidebar?.classList.remove('is-open');
        document.body.style.overflow = '';
        document.getElementById('overlay')?.classList.remove('is-visible');
    }

    /* ------------------------------------------------------------
       4. MAIN RENDER
    ------------------------------------------------------------ */

    function renderShop() {
        const allCards = getShopCards();

        // 1) Filter
        const filtered = allCards.filter(cardMatchesFilters);

        // 2) Sort
        const sorted = sortCards(filtered);

        // 3) Counts
        if (shopAllCount) shopAllCount.textContent = toPersianDigits(allCards.length);
        if (shopShownCount) shopShownCount.textContent = toPersianDigits(sorted.length);
        if (shopTotalCount) shopTotalCount.textContent = toPersianDigits(sorted.length);

        // 4) Hide all cards, then show only the ones on the current page
        allCards.forEach((card) => card.classList.add('is-hidden'));

        const totalPages = Math.max(1, Math.ceil(sorted.length / shopState.perPage));

        // Clamp the current page inside valid range
        if (shopState.page > totalPages) shopState.page = totalPages;

        const start = (shopState.page - 1) * shopState.perPage;
        const end = start + shopState.perPage;
        const pageCards = sorted.slice(start, end);

        pageCards.forEach((card) => card.classList.remove('is-hidden'));

        // 5) Re-append them in sorted order so DOM matches visual order
        sorted.forEach((card) => shopGridEl.appendChild(card));

        // 6) Empty state
        if (sorted.length === 0) {
            if (shopEmptyEl) shopEmptyEl.hidden = false;
        } else {
            if (shopEmptyEl) shopEmptyEl.hidden = true;
        }

        // 7) Pagination
        renderPagination(totalPages);

        // 8) Active filter chips
        renderActiveFilters();
    }

    /* ------------------------------------------------------------
       5. PAGINATION
    ------------------------------------------------------------ */
    function renderPagination(totalPages) {
        if (!shopPagination) return;
        shopPagination.innerHTML = '';

        if (totalPages <= 1) return;

        // Prev button
        const prev = document.createElement('button');
        prev.textContent = '‹ قبلی';
        prev.disabled = shopState.page === 1;
        prev.addEventListener('click', () => goToPage(shopState.page - 1));
        shopPagination.appendChild(prev);

        // Page numbers
        for (let i = 1; i <= totalPages; i += 1) {
            const btn = document.createElement('button');
            btn.textContent = toPersianDigits(i);
            if (i === shopState.page) btn.classList.add('is-active');
            btn.addEventListener('click', () => goToPage(i));
            shopPagination.appendChild(btn);
        }

        // Next button
        const next = document.createElement('button');
        next.textContent = 'بعدی ›';
        next.disabled = shopState.page === totalPages;
        next.addEventListener('click', () => goToPage(shopState.page + 1));
        shopPagination.appendChild(next);
    }

    function goToPage(page) {
        shopState.page = page;
        renderShop();

        // Smooth scroll to the top of the shop section
        document.querySelector('.shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ------------------------------------------------------------
       6. ACTIVE FILTER CHIPS
    ------------------------------------------------------------ */

    function renderActiveFilters() {
        if (!shopActiveFilters) return;
        shopActiveFilters.innerHTML = '';

        // Category chips
        shopState.categories.forEach((cat) => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.innerHTML = `${getCategoryLabel(cat)} <button aria-label="حذف فیلتر">×</button>`;
            chip.querySelector('button').addEventListener('click', () => {
                shopFilterCats.forEach((input) => {
                    if (input.value === cat) input.checked = false;
                });
                shopState.categories = shopState.categories.filter((c) => c !== cat);
                shopState.page = 1;
                renderShop();
            });
            shopActiveFilters.appendChild(chip);
        });

        // Price chip (only if user moved the slider below max)
        if (shopState.maxPrice < 10000000) {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.innerHTML = `تا ${formatPrice(shopState.maxPrice)} تومان <button aria-label="حذف فیلتر">×</button>`;
            chip.querySelector('button').addEventListener('click', () => {
                shopState.maxPrice = 10000000;
                if (shopPriceRange) shopPriceRange.value = 10000000;
                if (shopPriceValue) shopPriceValue.textContent = '۱۰,۰۰۰,۰۰۰ تومان';
                shopState.page = 1;
                renderShop();
            });
            shopActiveFilters.appendChild(chip);
        }

        // Rating chip
        if (shopState.minRating > 0) {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.innerHTML = `امتیاز ${toPersianDigits(shopState.minRating)}+ <button aria-label="حذف فیلتر">×</button>`;
            chip.querySelector('button').addEventListener('click', () => {
                shopState.minRating = 0;
                shopFilterRatings.forEach((radio) => { radio.checked = radio.value === '0'; });
                shopState.page = 1;
                renderShop();
            });
            shopActiveFilters.appendChild(chip);
        }

        // Discount chip
        if (shopState.onlyDiscount) {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.innerHTML = `تخفیف‌دار <button aria-label="حذف فیلتر">×</button>`;
            chip.querySelector('button').addEventListener('click', () => {
                shopState.onlyDiscount = false;
                if (shopOnlyDiscount) shopOnlyDiscount.checked = false;
                shopState.page = 1;
                renderShop();
            });
            shopActiveFilters.appendChild(chip);
        }
    }

    function getCategoryLabel(value) {
        const labels = {
            digital: 'کالای دیجیتال',
            clothing: 'پوشاک',
            home: 'لوازم خانه',
            beauty: 'زیبایی و سلامت',
            accessories: 'اکسسوری',
        };
        return labels[value] || value;
    }

    /* ------------------------------------------------------------
       7. EVENTS
    ------------------------------------------------------------ */

    function initShopEvents() {

        /* ---- 7.1 Category checkboxes ---- */
        shopFilterCats.forEach((input) => {
            input.addEventListener('change', () => {
                shopState.categories = Array.from(shopFilterCats)
                    .filter((box) => box.checked)
                    .map((box) => box.value);
                shopState.page = 1;
                renderShop();
            });
        });

        /* ---- 7.2 Price range slider ---- */
        shopPriceRange?.addEventListener('input', (event) => {
            shopState.maxPrice = Number(event.target.value);
            if (shopPriceValue) {
                shopPriceValue.textContent = `${formatPrice(shopState.maxPrice)} تومان`;
            }
            shopState.page = 1;
            renderShop();
        });

        /* ---- 7.3 Rating radios ---- */
        shopFilterRatings.forEach((radio) => {
            radio.addEventListener('change', () => {
                shopState.minRating = Number(radio.value);
                shopState.page = 1;
                renderShop();
            });
        });

        /* ---- 7.4 Only discounted ---- */
        shopOnlyDiscount?.addEventListener('change', (event) => {
            shopState.onlyDiscount = event.target.checked;
            shopState.page = 1;
            renderShop();
        });

        /* ---- 7.5 Only available ---- */
        shopOnlyAvailable?.addEventListener('change', (event) => {
            shopState.onlyAvailable = event.target.checked;
        });

        /* ---- 7.6 Sort dropdown ---- */
        shopSortSelect?.addEventListener('change', (event) => {
            shopState.sort = event.target.value;
            shopState.page = 1;
            renderShop();
        });

        /* ---- 7.7 View toggle ---- */
        shopViewGridBtn?.addEventListener('click', () => {
            shopState.view = 'grid';
            shopGridEl.classList.remove('is-list');
            shopViewGridBtn.classList.add('is-active');
            shopViewListBtn.classList.remove('is-active');
        });
        shopViewListBtn?.addEventListener('click', () => {
            shopState.view = 'list';
            shopGridEl.classList.add('is-list');
            shopViewListBtn.classList.add('is-active');
            shopViewGridBtn.classList.remove('is-active');
        });

        /* ---- 7.8 Mobile sidebar ---- */
        shopFilterToggle?.addEventListener('click', () => {
            shopSidebar?.classList.add('is-open');
            document.getElementById('overlay')?.classList.add('is-visible');
            document.body.style.overflow = 'hidden';
        });
        shopFilterClose?.addEventListener('click', closeSidebar);

        document.getElementById('overlay')?.addEventListener('click', closeSidebar);

        /* ---- 7.9 Clear all filters ---- */
        function resetAllFilters() {
            shopState.categories = [];
            shopState.maxPrice = 10000000;
            shopState.minRating = 0;
            shopState.onlyDiscount = false;
            shopState.sort = 'default';
            shopState.page = 1;

            shopFilterCats.forEach((input) => { input.checked = false; });
            shopFilterRatings.forEach((radio) => { radio.checked = radio.value === '0'; });
            if (shopOnlyDiscount) shopOnlyDiscount.checked = false;
            if (shopPriceRange) shopPriceRange.value = 10000000;
            if (shopPriceValue) shopPriceValue.textContent = '۱۰,۰۰۰,۰۰۰ تومان';
            if (shopSortSelect) shopSortSelect.value = 'default';

            renderShop();
        }
        shopClearFilters?.addEventListener('click', resetAllFilters);
        shopResetFromEmpty?.addEventListener('click', resetAllFilters);

        /* ---- 7.10 URL parameters ---- */
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('cat');
        if (cat) {
            const box = document.querySelector(`.filter-cat[value="${cat}"]`);
            if (box) {
                box.checked = true;
                shopState.categories = [cat];
            }
        }
        const sortParam = params.get('sort');
        if (sortParam === 'discount') {
            if (shopOnlyDiscount) {
                shopOnlyDiscount.checked = true;
                shopState.onlyDiscount = true;
            }
        }
    }

    /* ------------------------------------------------------------
       8. INIT
    ------------------------------------------------------------ */
    document.addEventListener('DOMContentLoaded', () => {
        initShopEvents();
        renderShop();
    });

})();
