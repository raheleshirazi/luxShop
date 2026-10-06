/* ============================================================
   LOOXSHOP — Main Application Script (Fixed v2)
   Description: Main script + event delegation for wishlist
============================================================ */

/* ------------------------------------------------------------
   1. HELPERS
------------------------------------------------------------ */
function formatPrice(number) {
    return Number(number).toLocaleString('fa-IR');
}

function toPersianDigits(value) {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(value).replace(/\d/g, (digit) => persianDigits[digit]);
}

let toastTimer = null;
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2500);
}

/* ------------------------------------------------------------
   2. AUTH STATE (header)
------------------------------------------------------------ */
function getCurrentUser() {
    try {
        const raw = localStorage.getItem('looxshop_user');
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn('User data is corrupted.', error);
        return null;
    }
}

function updateHeaderAuthUI() {
    const accountBtn = document.querySelector('.account-btn');
    if (!accountBtn) return;

    const user = getCurrentUser();

    if (user) {
        accountBtn.href = 'dashboard.html';
        accountBtn.classList.add('account-btn--logged-in');
        accountBtn.setAttribute('aria-label', 'رفتن به داشبورد');

        const textEl = accountBtn.querySelector('.account-btn__text');
        if (textEl) {
            const firstName = (user.name || '').trim().split(/\s+/)[0] || 'داشبورد';
            textEl.textContent = firstName;
        }

        if (!accountBtn.querySelector('.account-btn__dot')) {
            const dot = document.createElement('span');
            dot.className = 'account-btn__dot';
            dot.setAttribute('aria-hidden', 'true');
            accountBtn.appendChild(dot);
        }
    } else {
        accountBtn.href = 'login.html';
        accountBtn.classList.remove('account-btn--logged-in');
        accountBtn.setAttribute('aria-label', 'ورود یا ثبت‌نام');

        const textEl = accountBtn.querySelector('.account-btn__text');
        if (textEl) textEl.textContent = 'ورود / ثبت‌نام';

        const dot = accountBtn.querySelector('.account-btn__dot');
        if (dot) dot.remove();
    }
}

/* ------------------------------------------------------------
   3. CART MANAGEMENT
------------------------------------------------------------ */
const STORAGE_KEY = 'looxshop_cart';

function getCart() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.warn('Cart data is corrupted, resetting...', error);
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

function addToCart(product) {
    const cart = getCart();
    const existing = cart.find((item) => String(item.id) === String(product.id));

    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }

    saveCart(cart);
    renderCart();
    showToast(`«${product.name}» به سبد خرید اضافه شد ✓`);

    if (window.LooxSync) window.LooxSync.notify(STORAGE_KEY);
}

function changeQty(id, step) {
    const cart = getCart();
    const item = cart.find((product) => String(product.id) === String(id));
    if (!item) return;

    item.qty += step;
    const updatedCart = cart.filter((product) => product.qty > 0);

    saveCart(updatedCart);
    renderCart();
    if (window.LooxSync) window.LooxSync.notify(STORAGE_KEY);
}

function removeFromCart(id) {
    const cart = getCart().filter((item) => String(item.id) !== String(id));
    saveCart(cart);
    renderCart();
    showToast('محصول از سبد خرید حذف شد');
    if (window.LooxSync) window.LooxSync.notify(STORAGE_KEY);
}

function buildCartItemHTML(item) {
    return `
    <div class="cart-item">
      <img class="cart-item__img" src="${item.image}" alt="${item.name}" loading="lazy" />
      <div class="cart-item__info">
        <p class="cart-item__title">${item.name}</p>
        <span class="cart-item__price">${formatPrice(item.price)} تومان</span>
        <div class="cart-item__row">
          <div class="qty">
            <button type="button" data-action="decrease" data-id="${item.id}" aria-label="کاهش تعداد">−</button>
            <span>${toPersianDigits(item.qty)}</span>
            <button type="button" data-action="increase" data-id="${item.id}" aria-label="افزایش تعداد">+</button>
          </div>
          <button type="button" class="cart-item__remove" data-action="remove" data-id="${item.id}">حذف</button>
        </div>
      </div>
    </div>
  `;
}

function renderCart() {
    const cart = getCart();
    const itemsContainer = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const countEl = document.getElementById('cartCount');

    if (!itemsContainer) return;

    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    if (countEl) countEl.textContent = toPersianDigits(totalCount);
    if (totalEl) totalEl.textContent = `${formatPrice(totalPrice)} تومان`;

    if (cart.length === 0) {
        itemsContainer.innerHTML = `
      <p class="cart-empty">
        🛒 سبد خرید شما خالی است.<br />بریم یه خرید خوب بکنیم؟
      </p>`;
        return;
    }

    itemsContainer.innerHTML = cart.map(buildCartItemHTML).join('');
}

/* ------------------------------------------------------------
   4. WISHLIST MANAGEMENT
------------------------------------------------------------ */
const WISHLIST_KEY = 'looxshop_wishlist';

function getWishlist() {
    try {
        const raw = localStorage.getItem(WISHLIST_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        return [];
    }
}

function saveWishlist(list) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
}

function addToWishlist(product) {
    // ✅ Check login
    const user = getCurrentUser();
    if (!user) {
        showToast('برای افزودن به علاقه‌مندی‌ها ابتدا وارد شوید');
        sessionStorage.setItem('looxshop_redirect', window.location.href);
        setTimeout(() => window.location.href = 'login.html', 1400);
        return false;
    }

    const list = getWishlist();
    if (list.some((item) => String(item.id) === String(product.id))) {
        return true;
    }

    list.push(product);
    saveWishlist(list);

    // Notify dashboard
    if (window.LooxSync) window.LooxSync.notify(WISHLIST_KEY);

    return true;
}

function removeFromWishlist(id) {
    const list = getWishlist().filter((item) => String(item.id) !== String(id));
    saveWishlist(list);

    if (window.LooxSync) window.LooxSync.notify(WISHLIST_KEY);
}

function isInWishlist(id) {
    return getWishlist().some((item) => String(item.id) === String(id));
}

/**
 * ✅ Update the state of all heart buttons
 * Call this function after every product render
 */
function refreshWishlistButtons() {
    const user = getCurrentUser();
    if (!user) return;

    document.querySelectorAll('.wishlist-btn').forEach((btn) => {
        const card = btn.closest('.product-card');
        const id = card?.dataset.id;
        if (id && isInWishlist(id)) {
            btn.classList.add('is-active');
        } else {
            btn.classList.remove('is-active');
        }
    });
}

// ✅ For access from other files (product-render.js)
window.LooxWishlist = {
    get: getWishlist,
    add: addToWishlist,
    remove: removeFromWishlist,
    has: isInWishlist,
    refreshButtons: refreshWishlistButtons
};

/* ------------------------------------------------------------
   5. DRAWER & MOBILE MENU
------------------------------------------------------------ */
const overlay = document.getElementById('overlay');
const cartDrawer = document.getElementById('cartDrawer');
const mobileMenu = document.getElementById('mobileMenu');

function openCart() {
    cartDrawer?.classList.add('is-open');
    cartDrawer?.setAttribute('aria-hidden', 'false');
    overlay?.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    cartDrawer?.classList.remove('is-open');
    cartDrawer?.setAttribute('aria-hidden', 'true');
    overlay?.classList.remove('is-visible');
    document.body.style.overflow = '';
}

function openMobileMenu() {
    mobileMenu?.classList.add('is-open');
    mobileMenu?.setAttribute('aria-hidden', 'false');
    overlay?.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
    document.getElementById('menuToggle')?.setAttribute('aria-expanded', 'true');
}

function closeMobileMenu() {
    mobileMenu?.classList.remove('is-open');
    mobileMenu?.setAttribute('aria-hidden', 'true');
    overlay?.classList.remove('is-visible');
    document.body.style.overflow = '';
    document.getElementById('menuToggle')?.setAttribute('aria-expanded', 'false');
}

function closeAllPanels() {
    closeCart();
    closeMobileMenu();
}

/* ------------------------------------------------------------
   6. PRODUCT FILTERING / SORTING
------------------------------------------------------------ */
const productsGrid = document.getElementById('productsGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const filterBar = document.getElementById('filterBar');

let activeFilter = 'all';
let activeSearch = '';
let activeSort = 'default';

function getProductCards() {
    if (!productsGrid) return [];
    return Array.from(productsGrid.querySelectorAll('.product-card'));
}

function applyFilters() {
    const cards = getProductCards();
    let visibleCount = 0;

    cards.forEach((card) => {
        const category = card.dataset.category;
        const name = (card.dataset.name || '').toLowerCase();

        const matchCategory = activeFilter === 'all' || category === activeFilter;
        const matchSearch = activeSearch === '' || name.includes(activeSearch);

        if (matchCategory && matchSearch) {
            card.classList.remove('is-hidden');
            visibleCount += 1;
        } else {
            card.classList.add('is-hidden');
        }
    });

    if (emptyState) emptyState.hidden = visibleCount > 0;
}

function applySort() {
    const cards = getProductCards();
    if (!cards.length) return;

    const sortedCards = [...cards].sort((a, b) => {
        const priceA = Number(a.dataset.price);
        const priceB = Number(b.dataset.price);
        const ratingA = Number(a.dataset.rating);
        const ratingB = Number(b.dataset.rating);
        const dateA = Number(a.dataset.date);
        const dateB = Number(b.dataset.date);

        switch (activeSort) {
            case 'cheap': return priceA - priceB;
            case 'expensive': return priceB - priceA;
            case 'popular': return ratingB - ratingA;
            case 'newest': return dateB - dateA;
            default: return 0;
        }
    });

    sortedCards.forEach((card) => productsGrid.appendChild(card));
}

/* ------------------------------------------------------------
   7. COUNTDOWN
------------------------------------------------------------ */
const OFFER_DEADLINE = new Date();
OFFER_DEADLINE.setDate(OFFER_DEADLINE.getDate() + 3);

let countdownInterval = null;

function startCountdown() {
    const daysEl = document.getElementById('cdDays');
    const hoursEl = document.getElementById('cdHours');
    const minutesEl = document.getElementById('cdMinutes');
    const secondsEl = document.getElementById('cdSeconds');

    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    function update() {
        const now = new Date().getTime();
        const distance = OFFER_DEADLINE.getTime() - now;

        if (distance <= 0) {
            clearInterval(countdownInterval);
            daysEl.textContent = hoursEl.textContent = '۰۰';
            minutesEl.textContent = minutesEl.textContent = '۰۰';
            return;
        }

        const day = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hour = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minute = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const second = Math.floor((distance % (1000 * 60)) / 1000);

        daysEl.textContent = toPersianDigits(String(day).padStart(2, '0'));
        hoursEl.textContent = toPersianDigits(String(hour).padStart(2, '0'));
        minutesEl.textContent = toPersianDigits(String(minute).padStart(2, '0'));
        secondsEl.textContent = toPersianDigits(String(second).padStart(2, '0'));
    }

    update();
    countdownInterval = setInterval(update, 1000);
}

/* ------------------------------------------------------------
   8. SCROLL EFFECTS
------------------------------------------------------------ */
function handleScroll() {
    const header = document.getElementById('siteHeader');
    const backToTop = document.getElementById('backToTop');
    const scrollY = window.scrollY;

    if (scrollY > 20) header?.classList.add('is-scrolled');
    else header?.classList.remove('is-scrolled');

    if (scrollY > 500) backToTop?.classList.add('is-visible');
    else backToTop?.classList.remove('is-visible');
}

/* ------------------------------------------------------------
   9. EVENT LISTENERS
------------------------------------------------------------ */
function initEvents() {

    /* ---- Add to cart (event delegation) ---- */
    document.addEventListener('click', (event) => {
        const btn = event.target.closest('.add-to-cart');
        if (!btn) return;
        event.preventDefault();

        addToCart({
            id: btn.dataset.id,
            name: btn.dataset.name,
            price: Number(btn.dataset.price),
            image: btn.dataset.image,
        });
    });

    /* ---- Wishlist toggle (event delegation — works for dynamic cards too) ---- */
    document.addEventListener('click', (event) => {
        const btn = event.target.closest('.wishlist-btn');
        if (!btn) return;

        event.preventDefault();
        event.stopPropagation();

        // ✅ Check login
        const currentUser = getCurrentUser();
        if (!currentUser) {
            showToast('برای افزودن به علاقه‌مندی‌ها ابتدا وارد شوید');
            sessionStorage.setItem('looxshop_redirect', window.location.href);
            setTimeout(() => window.location.href = 'login.html', 1400);
            return;
        }

        const cardEl = btn.closest('.product-card');
        if (!cardEl) return;

        const id = cardEl.dataset.id;
        if (!id) return;

        const isActive = btn.classList.toggle('is-active');

        if (isActive) {
            const img = cardEl.querySelector('.product-card__link img, .product-card__media img');
            const titleEl = cardEl.querySelector('.product-card__title');

            addToWishlist({
                id: id,
                name: cardEl.dataset.name || titleEl?.textContent?.trim() || 'محصول',
                price: Number(cardEl.dataset.price) || 0,
                image: img?.src || ''
            });

            showToast('به علاقه‌مندی‌ها اضافه شد ♥');
        } else {
            removeFromWishlist(id);
            showToast('از علاقه‌مندی‌ها حذف شد');
        }
    });

    /* ---- Quick view ---- */
    document.addEventListener('click', (event) => {
        const btn = event.target.closest('.quick-view-btn');
        if (!btn) return;
        event.preventDefault();
        event.stopPropagation();
        showToast('صفحه جزئیات محصول به‌زودی اضافه می‌شود');
    });

    /* ---- Cart drawer ---- */
    document.getElementById('cartBtn')?.addEventListener('click', openCart);
    document.getElementById('cartClose')?.addEventListener('click', closeCart);
    document.getElementById('menuToggle')?.addEventListener('click', openMobileMenu);
    document.getElementById('mobileMenuClose')?.addEventListener('click', closeMobileMenu);
    overlay?.addEventListener('click', closeAllPanels);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeAllPanels();
    });

    /* ---- Cart items ---- */
    document.getElementById('cartItems')?.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const { action, id } = target.dataset;

        if (action === 'increase') changeQty(id, 1);
        if (action === 'decrease') changeQty(id, -1);
        if (action === 'remove') removeFromCart(id);
    });

    /* ---- Filter bar ---- */
    filterBar?.addEventListener('click', (event) => {
        const chip = event.target.closest('.chip');
        if (!chip) return;

        filterBar.querySelectorAll('.chip').forEach((item) => item.classList.remove('is-active'));
        chip.classList.add('is-active');

        activeFilter = chip.dataset.filter;
        applyFilters();
    });

    sortSelect?.addEventListener('change', (event) => {
        activeSort = event.target.value;
        applySort();
    });

    let searchDebounce = null;
    searchInput?.addEventListener('input', (event) => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            activeSearch = event.target.value.trim().toLowerCase();
            applyFilters();
        }, 200);
    });

    document.getElementById('searchForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        activeSearch = searchInput.value.trim().toLowerCase();
        applyFilters();
        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('newsletterForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const emailInput = document.getElementById('newsletterEmail');

        if (emailInput && emailInput.value.trim() !== '') {
            showToast('عضویت شما با موفقیت ثبت شد ✓');
            emailInput.value = '';
        }
    });

    document.getElementById('backToTop')?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', handleScroll, { passive: true });
}

/* ------------------------------------------------------------
   10. INIT
------------------------------------------------------------ */
function init() {
    updateHeaderAuthUI();
    renderCart();
    applyFilters();
    startCountdown();
    handleScroll();
    initEvents();

    // ✅ After load, update the wishlist buttons
    refreshWishlistButtons();
}

document.addEventListener('DOMContentLoaded', init);

// ✅ If product cards are rendered later, update the buttons
window.addEventListener('looxshop:products-rendered', refreshWishlistButtons);
