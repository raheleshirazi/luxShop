/* ============================================================
   LOOXSHOP — Dashboard Script (Final v5)
   Description: User dashboard + fixed cart
                + full order items display + notifications + sync
============================================================ */

(function () {
    'use strict';

    /* ------------------------------------------------------------
       1. STORAGE KEYS
    ------------------------------------------------------------ */
    const USER_KEY = 'looxshop_user';
    const USERS_KEY = 'looxshop_users';
    const ORDERS_KEY = 'looxshop_orders';
    const CART_KEY = 'looxshop_cart';
    const ADDRESSES_KEY = 'looxshop_addresses';
    const WALLET_KEY = 'looxshop_wallet_transactions';
    const WISHLIST_KEY = 'looxshop_wishlist';
    const TICKETS_KEY = 'looxshop_tickets';
    const REVIEWS_KEY = 'looxshop_my_reviews';
    const SETTINGS_KEY = 'looxshop_settings';
    const LOGIN_HISTORY_KEY = 'looxshop_login_history';
    const SEEN_STATE_KEY = 'looxshop_seen_state';

    /* ------------------------------------------------------------
       2. LABELS
    ------------------------------------------------------------ */
    const PRIORITY_LABELS = { low: 'کم', medium: 'متوسط', high: 'بالا', urgent: 'فوری' };
    const STATUS_LABELS = { open: 'باز', answered: 'پاسخ داده شده', closed: 'بسته' };

    /* ------------------------------------------------------------
       3. UTILITIES
    ------------------------------------------------------------ */
    function getCurrentUser() {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function guardAuth() {
        const user = getCurrentUser();
        if (!user) {
            if (typeof showToast === 'function') showToast('برای دیدن داشبورد، ابتدا وارد شوید.');
            document.body.style.opacity = '0.6';
            document.body.style.pointerEvents = 'none';
            setTimeout(() => window.location.href = 'login.html', 1200);
            return false;
        }
        return true;
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

    function formatDateTime(iso) {
        try {
            const d = new Date(iso);
            const date = d.toLocaleDateString('fa-IR', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            const time = d.toLocaleTimeString('fa-IR', {
                hour: '2-digit', minute: '2-digit'
            });
            return `${date} - ${time}`;
        } catch (e) { return '—'; }
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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

    function recordLoginEvent(user, type) {
        if (!user || !user.email) return;
        try {
            const history = readList(LOGIN_HISTORY_KEY);
            history.push({
                userId: user.id || null,
                email: String(user.email).toLowerCase(),
                name: user.name || '',
                type: type,
                date: new Date().toISOString(),
                device: (navigator.userAgent || '').substring(0, 80)
            });
            if (history.length > 500) history.splice(0, history.length - 500);
            writeList(LOGIN_HISTORY_KEY, history);
        } catch (e) {
            console.warn('Login history error:', e);
        }
    }

    /* ------------------------------------------------------------
       4. NOTIFICATION BADGES
    ------------------------------------------------------------ */
    function getSeenState() {
        try {
            const raw = localStorage.getItem(SEEN_STATE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function saveSeenState(state) {
        try {
            localStorage.setItem(SEEN_STATE_KEY, JSON.stringify(state));
        } catch (e) { /* ignore */ }
    }

    function markSectionAsSeen(section, user) {
        if (!user) return;
        const state = getSeenState();
        if (!state[user.id]) state[user.id] = {};

        const now = new Date().toISOString();

        if (section === 'tickets') state[user.id].tickets = now;
        else if (section === 'orders') state[user.id].orders = now;
        else if (section === 'cart') state[user.id].cartCount = readList(CART_KEY).length;
        else if (section === 'wishlist') state[user.id].wishlistCount = readList(WISHLIST_KEY).length;
        else if (section === 'reviews') state[user.id].reviews = now;

        saveSeenState(state);
        updateAllBadges(user);
    }

    function getUnreadCounts(user) {
        if (!user) return { tickets: 0, orders: 0, cart: 0, wishlist: 0, reviews: 0, total: 0 };

        const state = getSeenState();
        const userSeen = state[user.id] || {};
        const myEmail = String(user.email || '').toLowerCase().trim();
        const myId = String(user.id || '').trim();

        // Tickets
        const allTickets = readList(TICKETS_KEY);
        const myTickets = allTickets.filter((t) => {
            if (t.userId && String(t.userId).trim() === myId) return true;
            const tEmail = String(t.userEmail || '').toLowerCase().trim();
            if (tEmail && tEmail === myEmail) return true;
            return false;
        });

        const lastSeenTickets = userSeen.tickets ? new Date(userSeen.tickets).getTime() : 0;
        let unreadTickets = 0;
        myTickets.forEach((t) => {
            const replies = Array.isArray(t.replies) ? t.replies : [];
            const hasNewAdminReply = replies.some((r) =>
                r.from === 'admin' && new Date(r.date).getTime() > lastSeenTickets
            );
            if (hasNewAdminReply) unreadTickets++;
        });

        // Orders
        const allOrders = readList(ORDERS_KEY);
        const myOrders = allOrders.filter((o) => {
            if (!o) return false;
            if (o.userId && String(o.userId) === String(user.id)) return true;
            if (o.userEmail && String(o.userEmail).toLowerCase() === myEmail) return true;
            if (o.customerEmail && String(o.customerEmail).toLowerCase() === myEmail) return true;
            return false;
        });

        const lastSeenOrders = userSeen.orders ? new Date(userSeen.orders).getTime() : 0;
        let unreadOrders = 0;
        myOrders.forEach((o) => {
            const updatedAt = o.updatedAt ? new Date(o.updatedAt).getTime() : new Date(o.date || 0).getTime();
            if (updatedAt > lastSeenOrders && o.status && o.status !== 'processing') {
                unreadOrders++;
            }
        });

        // Cart
        const cart = readList(CART_KEY);
        const lastSeenCartCount = userSeen.cartCount || 0;
        const unreadCart = Math.max(0, cart.length - lastSeenCartCount);

        // Wishlist
        const wishlist = readList(WISHLIST_KEY);
        const lastSeenWishCount = userSeen.wishlistCount || 0;
        const unreadWishlist = Math.max(0, wishlist.length - lastSeenWishCount);

        // Reviews
        const allReviews = readList(REVIEWS_KEY);
        const myReviews = allReviews.filter((r) => {
            if (r.userEmail && String(r.userEmail).toLowerCase() === myEmail) return true;
            if (r.userId && String(r.userId) === myId) return true;
            return false;
        });
        const lastSeenReviews = userSeen.reviews ? new Date(userSeen.reviews).getTime() : 0;
        let unreadReviews = 0;
        myReviews.forEach((r) => {
            const replies = Array.isArray(r.replies) ? r.replies : [];
            const hasNewAdminReply = replies.some((rep) =>
                rep.from === 'admin' && new Date(rep.date).getTime() > lastSeenReviews
            );
            if (hasNewAdminReply) unreadReviews++;
        });

        return {
            tickets: unreadTickets,
            orders: unreadOrders,
            cart: unreadCart,
            wishlist: unreadWishlist,
            reviews: unreadReviews,
            total: unreadTickets + unreadOrders + unreadCart + unreadWishlist + unreadReviews
        };
    }

    function updateAllBadges(user) {
        if (!user) return;
        const counts = getUnreadCounts(user);

        updateHeaderBadge(counts.total);
        updateSidebarBadge('tickets', counts.tickets);
        updateSidebarBadge('orders', counts.orders);
        updateSidebarBadge('cart', counts.cart);
        updateSidebarBadge('wishlist', counts.wishlist);
        updateSidebarBadge('reviews', counts.reviews);
    }

    function updateHeaderBadge(count) {
        const accountBtn = document.querySelector('.account-btn');
        if (!accountBtn) return;

        let badge = accountBtn.querySelector('.header-notif-badge');

        if (count <= 0) {
            if (badge) badge.remove();
            return;
        }

        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'header-notif-badge';
            accountBtn.appendChild(badge);
        }

        badge.textContent = toPersianDigits(count);
    }

    function updateSidebarBadge(section, count) {
        const item = document.querySelector(`.db-menu__item[data-section="${section}"]`);
        if (!item) return;

        let badge = item.querySelector('.db-menu__badge');

        if (count <= 0) {
            if (badge) badge.style.display = 'none';
            return;
        }

        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'db-menu__badge';
            item.appendChild(badge);
        }

        badge.style.display = '';
        badge.textContent = toPersianDigits(count);
    }

    /* ------------------------------------------------------------
       5. USER INFO / AVATAR
    ------------------------------------------------------------ */
    function renderUserInfo(user) {
        const nameEl = document.getElementById('dbUserName');
        const emailEl = document.getElementById('dbUserEmail');
        const avatarEl = document.getElementById('dbUserAvatar');
        const avatarPreview = document.getElementById('avatarPreview');

        if (nameEl) nameEl.textContent = user.name || 'کاربر';
        if (emailEl) emailEl.textContent = user.email || '—';

        const initial = (user.name || 'U').trim().charAt(0).toUpperCase();

        [avatarEl, avatarPreview].forEach((el) => {
            if (!el) return;
            el.innerHTML = '';
            if (user.avatar) {
                el.style.background = 'transparent';
                el.style.backgroundImage = `url(${user.avatar})`;
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
                el.textContent = '';
            } else {
                el.style.backgroundImage = '';
                el.style.background = '';
                el.textContent = initial;
            }
        });
    }

    function initAvatarUpload(user) {
        const input = document.getElementById('avatarInput');
        const editBtn = document.getElementById('avatarEditBtn');
        const uploadBtn = document.getElementById('avatarUploadBtn');
        const removeBtn = document.getElementById('avatarRemoveBtn');

        function openPicker() { input?.click(); }
        editBtn?.addEventListener('click', openPicker);
        uploadBtn?.addEventListener('click', openPicker);

        input?.addEventListener('change', () => {
            const file = input.files && input.files[0];
            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {
                if (typeof showToast === 'function') showToast('حجم عکس باید کمتر از ۲ مگابایت باشد.');
                input.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                const updated = { ...user, avatar: dataUrl };
                localStorage.setItem(USER_KEY, JSON.stringify(updated));

                try {
                    const users = readList(USERS_KEY);
                    const idx = users.findIndex((u) => u.id === user.id);
                    if (idx !== -1) {
                        users[idx] = { ...users[idx], avatar: dataUrl };
                        writeList(USERS_KEY, users);
                    }
                } catch (e) { /* ignore */ }

                user.avatar = dataUrl;
                renderUserInfo(user);
                if (typeof updateHeaderAuthUI === 'function') updateHeaderAuthUI();
                if (typeof showToast === 'function') showToast('عکس پروفایل به‌روزرسانی شد ✓');
            };
            reader.readAsDataURL(file);
            input.value = '';
        });

        removeBtn?.addEventListener('click', () => {
            if (!user.avatar) {
                if (typeof showToast === 'function') showToast('عکسی برای حذف وجود ندارد');
                return;
            }
            if (!confirm('عکس پروفایل حذف شود؟')) return;
            const updated = { ...user, avatar: '' };
            localStorage.setItem(USER_KEY, JSON.stringify(updated));

            try {
                const users = readList(USERS_KEY);
                const idx = users.findIndex((u) => u.id === user.id);
                if (idx !== -1) {
                    users[idx].avatar = '';
                    writeList(USERS_KEY, users);
                }
            } catch (e) { /* ignore */ }

            user.avatar = '';
            renderUserInfo(user);
            if (typeof updateHeaderAuthUI === 'function') updateHeaderAuthUI();
            if (typeof showToast === 'function') showToast('عکس پروفایل حذف شد');
        });
    }

    /* ------------------------------------------------------------
       6. SECTION NAVIGATION
    ------------------------------------------------------------ */
    function initSectionNav() {
        const menuItems = document.querySelectorAll('.db-menu__item');
        const sections = document.querySelectorAll('.db-section');

        function showSection(id) {
            menuItems.forEach((item) => {
                item.classList.toggle('is-active', item.dataset.section === id);
            });
            sections.forEach((sec) => {
                sec.classList.toggle('is-active', sec.dataset.section === id);
            });
            history.replaceState(null, '', `#${id}`);

            const user = getCurrentUser();
            if (user) markSectionAsSeen(id, user);
        }

        menuItems.forEach((item) => {
            item.addEventListener('click', () => showSection(item.dataset.section));
        });

        const hash = window.location.hash.replace('#', '');
        if (hash) showSection(hash);
    }

    /* ------------------------------------------------------------
       7. PROFILE FORM + PASSWORD
    ------------------------------------------------------------ */
    function initProfileForm(user) {
        const form = document.getElementById('profileForm');
        if (!form) return;

        const nameEl = document.getElementById('pfName');
        const emailEl = document.getElementById('pfEmail');
        const phoneEl = document.getElementById('pfPhone');
        const birthEl = document.getElementById('pfBirth');
        const genderEl = document.getElementById('pfGender');
        const bioEl = document.getElementById('pfBio');

        if (nameEl) nameEl.value = user.name || '';
        if (emailEl) emailEl.value = user.email || '';
        if (phoneEl) phoneEl.value = user.phone || '';
        if (birthEl) birthEl.value = user.birth || '';
        if (genderEl) genderEl.value = user.gender || '';
        if (bioEl) bioEl.value = user.bio || '';

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const updated = {
                ...user,
                name: nameEl.value.trim() || user.name,
                email: emailEl.value.trim().toLowerCase() || user.email,
                phone: phoneEl.value.trim() || user.phone,
                birth: birthEl.value.trim(),
                gender: genderEl.value,
                bio: bioEl.value.trim()
            };

            localStorage.setItem(USER_KEY, JSON.stringify(updated));

            try {
                const users = readList(USERS_KEY);
                const idx = users.findIndex((u) => u.id === user.id);
                if (idx !== -1) {
                    users[idx] = { ...users[idx], ...updated };
                    writeList(USERS_KEY, users);
                }
            } catch (e) { /* ignore */ }

            Object.assign(user, updated);
            renderUserInfo(user);
            if (typeof updateHeaderAuthUI === 'function') updateHeaderAuthUI();
            if (typeof showToast === 'function') showToast('تغییرات با موفقیت ذخیره شد ✓');
        });
    }

    function initPasswordForm(user) {
        const form = document.getElementById('passwordForm');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const current = document.getElementById('stCurrentPass').value;
            const next = document.getElementById('stNewPass').value;
            const confirm = document.getElementById('stConfirmPass').value;

            if (current !== user.password) {
                if (typeof showToast === 'function') showToast('رمز عبور فعلی اشتباه است');
                return;
            }
            if (next.length < 6) {
                if (typeof showToast === 'function') showToast('رمز جدید باید حداقل ۶ کاراکتر باشد');
                return;
            }
            if (next !== confirm) {
                if (typeof showToast === 'function') showToast('رمز جدید و تکرار آن یکسان نیستند');
                return;
            }

            user.password = next;
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            try {
                const users = readList(USERS_KEY);
                const idx = users.findIndex((u) => u.id === user.id);
                if (idx !== -1) {
                    users[idx].password = next;
                    writeList(USERS_KEY, users);
                }
            } catch (e) { /* ignore */ }

            form.reset();
            if (typeof showToast === 'function') showToast('رمز عبور تغییر کرد ✓');
        });
    }

    /* ------------------------------------------------------------
       8. ORDERS — with full items display
    ------------------------------------------------------------ */
    function renderOrders(user) {
        const wrap = document.getElementById('dbOrdersList');
        const badge = document.getElementById('ordersBadge');
        if (!wrap) return;

        const allOrders = readList(ORDERS_KEY);
        const myEmail = (user.email || '').toLowerCase();

        const orders = allOrders.filter((o) => {
            if (!o) return false;
            if (o.userId && String(o.userId) === String(user.id)) return true;
            if (o.userEmail && String(o.userEmail).toLowerCase() === myEmail) return true;
            if (o.customerEmail && String(o.customerEmail).toLowerCase() === myEmail) return true;
            if (o.customerPhone && user.phone && String(o.customerPhone) === String(user.phone)) return true;
            return false;
        });

        // Sort newest first
        orders.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        if (badge) {
            const counts = getUnreadCounts(user);
            if (counts.orders > 0) {
                badge.style.display = '';
                badge.textContent = toPersianDigits(counts.orders);
            } else {
                badge.style.display = 'none';
            }
        }

        if (orders.length === 0) {
            wrap.innerHTML = `
                <div class="db-empty">
                    <div class="db-empty__icon">📦</div>
                    <h3>هنوز سفارشی ثبت نکرده‌اید</h3>
                    <p>اولین سفارش خود را ثبت کنید و از تخفیف‌های ویژه بهره‌مند شوید.</p>
                    <a href="shop.html" class="btn btn--primary">رفتن به فروشگاه</a>
                </div>`;
            return;
        }

        wrap.innerHTML = orders.map((order) => {
            const statusKey = order.status || 'processing';

            const statusClass = {
                pending: 'is-pending', processing: 'is-processing',
                shipped: 'is-shipped', delivered: 'is-delivered', cancelled: 'is-cancelled'
            }[statusKey] || 'is-processing';

            const statusLabel = {
                pending: 'در انتظار پرداخت', processing: 'در حال پردازش',
                shipped: 'ارسال شده', delivered: 'تحویل داده شده', cancelled: 'لغو شده'
            }[statusKey];

            const items = Array.isArray(order.items) ? order.items : [];

            const itemsHtml = items.length > 0
                ? `<div class="db-order__items">
                       ${items.map((item) => {
                    const qty = Number(item.qty || 1);
                    const price = Number(item.price || 0);
                    const img = item.image || 'assets/img/hero.jpg';
                    return `
                               <div class="db-order__item">
                                   <img src="${escapeHtml(img)}"
                                        alt="${escapeHtml(item.name || 'محصول')}"
                                        onerror="this.src='assets/img/hero.jpg'" />
                                   <div class="db-order__item-info">
                                       <strong>${escapeHtml(item.name || 'محصول')}</strong>
                                       <small>${toPersianDigits(qty)} عدد × ${formatPrice(price)} تومان</small>
                                   </div>
                                   <span class="db-order__item-total">${formatPrice(qty * price)} تومان</span>
                               </div>
                           `;
                }).join('')}
                   </div>`
                : '';

            return `
                <div class="db-order">
                    <div class="db-order__head">
                        <div>
                            <strong>سفارش #${escapeHtml(order.orderNumber || order.id)}</strong>
                            <small>${formatPersianDate(order.date)}${order.itemsCount ? ' — ' + toPersianDigits(order.itemsCount) + ' قلم کالا' : ''}</small>
                        </div>
                        <span class="db-order__status ${statusClass}">${statusLabel}</span>
                    </div>

                    ${itemsHtml}

                    <div class="db-order__summary">
                        ${order.subtotal ? `<div class="db-order__row"><span>جمع کالاها:</span><strong>${formatPrice(order.subtotal)} تومان</strong></div>` : ''}
                        ${order.shipping ? `<div class="db-order__row"><span>هزینه ارسال:</span><strong>${formatPrice(order.shipping)} تومان</strong></div>` : ''}
                        ${order.discount ? `<div class="db-order__row db-order__row--discount"><span>تخفیف:</span><strong>− ${formatPrice(order.discount)} تومان</strong></div>` : ''}
                        <div class="db-order__row db-order__row--total">
                            <span>مبلغ کل:</span>
                            <strong>${formatPrice(order.total)} تومان</strong>
                        </div>
                    </div>

                    ${order.address ? `
                        <div class="db-order__address">
                            <span>📍 آدرس تحویل:</span>
                            <p>${escapeHtml(order.address)}</p>
                        </div>
                    ` : ''}

                    <div class="db-order__actions">
                        <a href="order-tracking.html?id=${encodeURIComponent(order.orderNumber || order.id)}" class="btn btn--outline">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            پیگیری سفارش
                        </a>
                    </div>
                </div>`;
        }).join('');
    }

    /* ------------------------------------------------------------
       9. CART — fixed
    ------------------------------------------------------------ */
    function renderCart(user) {
        const wrap = document.getElementById('dbCartList');
        const summary = document.getElementById('dbCartSummary');
        const totalEl = document.getElementById('dbCartTotal');
        const badge = document.getElementById('cartBadge');
        if (!wrap) return;

        const cart = readList(CART_KEY);

        // Badge
        if (badge && user) {
            const counts = getUnreadCounts(user);
            if (counts.cart > 0) {
                badge.style.display = '';
                badge.textContent = toPersianDigits(counts.cart);
            } else {
                badge.style.display = 'none';
            }
        }

        // ✅ Empty state: clear total and hide summary
        if (cart.length === 0) {
            wrap.innerHTML = `
                <div class="db-empty">
                    <div class="db-empty__icon">🛒</div>
                    <h3>سبد خرید شما خالی است</h3>
                    <p>هنوز محصولی به سبد خرید اضافه نکرده‌اید.</p>
                    <a href="shop.html" class="btn btn--primary">رفتن به فروشگاه</a>
                </div>`;

            // ✅ Reset the total to zero
            if (totalEl) totalEl.textContent = '۰ تومان';

            // ✅ Hide using both methods (because CSS might override)
            if (summary) {
                summary.hidden = true;
                summary.style.display = 'none';
            }
            return;
        }

        // ✅ Show the summary again
        if (summary) {
            summary.hidden = false;
            summary.style.display = '';
        }

        wrap.innerHTML = cart.map((item) => `
            <div class="db-cart-item" data-id="${item.id}">
                <img class="db-cart-item__img" src="${item.image}" alt="${escapeHtml(item.name)}"
                     onerror="this.src='assets/img/hero.jpg'" />
                <div class="db-cart-item__info">
                    <h4>${escapeHtml(item.name)}</h4>
                    <span class="db-cart-item__price">${formatPrice(item.price)} تومان</span>
                </div>
                <div class="db-cart-item__qty">
                    <button type="button" data-action="decrease" data-id="${item.id}">−</button>
                    <span>${toPersianDigits(item.qty)}</span>
                    <button type="button" data-action="increase" data-id="${item.id}">+</button>
                </div>
                <div class="db-cart-item__total">${formatPrice(item.price * item.qty)} تومان</div>
                <button type="button" class="db-cart-item__remove" data-action="remove" data-id="${item.id}" aria-label="حذف">✕</button>
            </div>
        `).join('');

        const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
        if (totalEl) totalEl.textContent = `${formatPrice(total)} تومان`;
    }

    function initCartActions() {
        document.getElementById('dbCartList')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const { action, id } = btn.dataset;
            const cart = readList(CART_KEY);
            const user = getCurrentUser();

            if (action === 'increase') {
                const item = cart.find((i) => i.id === id);
                if (item) item.qty += 1;
                writeList(CART_KEY, cart);
                renderCart(user);
            }
            if (action === 'decrease') {
                const item = cart.find((i) => i.id === id);
                if (item) item.qty -= 1;
                const updated = cart.filter((i) => i.qty > 0);
                writeList(CART_KEY, updated);
                renderCart(user);
            }
            if (action === 'remove') {
                const updated = cart.filter((i) => i.id !== id);
                writeList(CART_KEY, updated);
                renderCart(user);
                if (typeof showToast === 'function') showToast('محصول از سبد حذف شد');
            }

            if (window.LooxSync) window.LooxSync.notify(CART_KEY);
        });
    }

    /* ------------------------------------------------------------
       10. ADDRESSES
    ------------------------------------------------------------ */
    function renderAddresses(user) {
        const wrap = document.getElementById('dbAddressesList');
        if (!wrap) return;

        const all = readList(ADDRESSES_KEY);
        const myEmail = (user.email || '').toLowerCase();

        const list = all.filter((a) => {
            if (!a) return false;
            if (a.userId && String(a.userId) === String(user.id)) return true;
            if (a.userEmail && String(a.userEmail).toLowerCase() === myEmail) return true;
            if (!a.userId && !a.userEmail) return true;
            return false;
        });

        if (list.length === 0) {
            wrap.innerHTML = `
                <div class="db-empty">
                    <div class="db-empty__icon">📍</div>
                    <h3>هنوز آدرسی ثبت نکرده‌اید</h3>
                    <p>برای ارسال سریع‌تر سفارش‌ها، اولین آدرس خود را ثبت کنید.</p>
                </div>`;
            return;
        }

        wrap.innerHTML = list.map((addr, i) => `
            <div class="db-address">
                <div class="db-address__head">
                    <strong>${escapeHtml(addr.title || `آدرس ${i + 1}`)}</strong>
                    ${addr.isDefault ? '<span class="db-address__default">پیش‌فرض</span>' : ''}
                </div>
                <p class="db-address__text">
                    ${escapeHtml(addr.province)}، ${escapeHtml(addr.city)}<br />
                    ${escapeHtml(addr.address)}<br />
                    کد پستی: ${escapeHtml(addr.postalCode || '—')}
                </p>
                <div class="db-address__actions">
                    <button type="button" class="db-address__btn" data-action="default" data-id="${addr.id}">
                        ${addr.isDefault ? '✓ پیش‌فرض' : 'انتخاب به‌عنوان پیش‌فرض'}
                    </button>
                    <button type="button" class="db-address__btn db-address__btn--danger" data-action="delete" data-id="${addr.id}">حذف</button>
                </div>
            </div>
        `).join('');
    }

    function openAddressModal(user) {
        const title = prompt('عنوان آدرس (مثلاً: خانه):', 'خانه');
        if (!title) return;
        const province = prompt('استان:', 'تهران');
        if (!province) return;
        const city = prompt('شهر:', 'تهران');
        if (!city) return;
        const address = prompt('آدرس کامل:');
        if (!address) return;
        const postalCode = prompt('کد پستی:', '');
        if (postalCode === null) return;

        const list = readList(ADDRESSES_KEY);
        list.push({
            id: 'ADDR' + Date.now(),
            userId: user.id,
            userEmail: user.email,
            userName: user.name,
            title: title.trim(),
            province: province.trim(),
            city: city.trim(),
            address: address.trim(),
            postalCode: (postalCode || '').trim(),
            isDefault: list.length === 0
        });
        writeList(ADDRESSES_KEY, list);
        renderAddresses(user);
        if (typeof showToast === 'function') showToast('آدرس جدید اضافه شد ✓');
    }

    function initAddressActions(user) {
        document.getElementById('dbAddressesList')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const { action, id } = btn.dataset;
            const list = readList(ADDRESSES_KEY);

            if (action === 'delete') {
                if (confirm('این آدرس حذف شود؟')) {
                    const updated = list.filter((a) => a.id !== id);
                    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
                        updated[0].isDefault = true;
                    }
                    writeList(ADDRESSES_KEY, updated);
                    renderAddresses(user);
                    if (typeof showToast === 'function') showToast('آدرس حذف شد');
                }
            }
            if (action === 'default') {
                const updated = list.map((a) => ({ ...a, isDefault: a.id === id }));
                writeList(ADDRESSES_KEY, updated);
                renderAddresses(user);
                if (typeof showToast === 'function') showToast('آدرس پیش‌فرض تغییر کرد ✓');
            }
        });

        document.getElementById('addAddressBtn')?.addEventListener('click', () => openAddressModal(user));
    }

    /* ------------------------------------------------------------
       11. WISHLIST
    ------------------------------------------------------------ */
    function renderWishlist(user) {
        const wrap = document.getElementById('dbWishlistGrid');
        if (!wrap) return;

        const list = readList(WISHLIST_KEY);

        // ✅ Update badge
        if (user) {
            updateSidebarBadge('wishlist', getUnreadCounts(user).wishlist);
        }

        // ✅ Empty state
        if (list.length === 0) {
            wrap.innerHTML = `
                <div class="db-empty">
                    <div class="db-empty__icon">♥</div>
                    <h3>لیست علاقه‌مندی‌های شما خالی است</h3>
                    <p>محصولات موردعلاقه خود را با کلیک روی قلب ذخیره کنید.</p>
                    <a href="shop.html" class="btn btn--primary">مشاهده فروشگاه</a>
                </div>`;
            return;
        }

        // ✅ Render items
        wrap.innerHTML = list.map((item) => `
            <div class="db-wishlist-item" data-id="${escapeHtml(item.id)}">
                <button type="button" class="db-wishlist-item__remove" data-action="remove" aria-label="حذف">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                        stroke-width="3" stroke-linecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <a href="product.html?id=${encodeURIComponent(item.id)}">
                    <img src="${item.image || 'assets/img/hero.jpg'}"
                         alt="${escapeHtml(item.name)}"
                         loading="lazy"
                         onerror="this.src='assets/img/hero.jpg'" />
                </a>
                <div class="db-wishlist-item__info">
                    <h4>${escapeHtml(item.name)}</h4>
                    <strong>${formatPrice(item.price)} تومان</strong>
                </div>
            </div>
        `).join('');
    }

    function initWishlistActions() {
        document.getElementById('dbWishlistGrid')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="remove"]');
            if (!btn) return;
            const card = btn.closest('.db-wishlist-item');
            const id = card?.dataset.id;
            if (!id) return;

            if (!confirm('این محصول از علاقه‌مندی‌ها حذف شود؟')) return;

            const list = readList(WISHLIST_KEY).filter((item) => item.id !== id);
            writeList(WISHLIST_KEY, list);
            renderWishlist(getCurrentUser());
            if (typeof showToast === 'function') showToast('از علاقه‌مندی‌ها حذف شد');

            if (window.LooxSync) window.LooxSync.notify(WISHLIST_KEY);
        });
    }

    /* ------------------------------------------------------------
       12. WALLET
    ------------------------------------------------------------ */
    function calculateWalletBalance(user) {
        const list = readList(WALLET_KEY).filter((tx) => {
            if (!tx) return false;
            if (tx.userId && String(tx.userId) === String(user.id)) return true;
            if (!tx.userId) return true;
            return false;
        });
        return list.reduce((sum, tx) => {
            return tx.type === 'credit' ? sum + tx.amount : sum - tx.amount;
        }, 0);
    }

    function renderWallet(user) {
        const balanceEl = document.getElementById('dbWalletBalance');
        const wrap = document.getElementById('dbWalletTransactions');
        if (!wrap) return;

        const balance = calculateWalletBalance(user);
        if (balanceEl) balanceEl.textContent = `${formatPrice(balance)} تومان`;

        const list = readList(WALLET_KEY).filter((tx) => {
            if (!tx) return false;
            if (tx.userId && String(tx.userId) === String(user.id)) return true;
            if (!tx.userId) return true;
            return false;
        });

        if (list.length === 0) {
            wrap.innerHTML = `
                <div class="db-empty db-empty--compact">
                    <div class="db-empty__icon">💳</div>
                    <h3>تاریخچه تراکنش‌ها خالی است</h3>
                    <p>کیف پول خود را شارژ کنید تا اولین تراکنش ثبت شود.</p>
                </div>`;
            return;
        }

        wrap.innerHTML = list.map((tx) => `
            <div class="db-transaction ${tx.type === 'credit' ? 'is-credit' : 'is-debit'}">
                <div>
                    <strong>${escapeHtml(tx.title || 'تراکنش')}</strong>
                    <small>${formatPersianDate(tx.date)}</small>
                </div>
                <span>${tx.type === 'credit' ? '+' : '-'} ${formatPrice(tx.amount)} تومان</span>
            </div>
        `).join('');
    }

    function initWalletCharge(user) {
        document.getElementById('chargeWalletBtn')?.addEventListener('click', () => {
            const amount = prompt('مبلغ شارژ (تومان):', '100000');
            if (!amount) return;
            const num = Number(amount);
            if (!num || num <= 0) {
                if (typeof showToast === 'function') showToast('مبلغ معتبر وارد کنید');
                return;
            }
            const list = readList(WALLET_KEY);
            list.unshift({
                id: 'TX' + Date.now(),
                userId: user.id,
                userEmail: user.email,
                title: 'شارژ کیف پول',
                amount: num,
                type: 'credit',
                date: new Date().toISOString()
            });
            writeList(WALLET_KEY, list);
            renderWallet(user);
            if (typeof showToast === 'function') showToast('کیف پول شارژ شد ✓');
        });
    }

    /* ------------------------------------------------------------
       13. TICKETS
    ------------------------------------------------------------ */
    function renderTickets(user) {
        const wrap = document.getElementById('dbTicketsList');
        const badge = document.getElementById('ticketsBadge');
        if (!wrap) return;

        const all = readList(TICKETS_KEY);
        const myEmail = String(user.email || '').toLowerCase().trim();
        const myId = String(user.id || '').trim();

        const list = all.filter((t) => {
            if (!t) return false;
            if (t.userId && String(t.userId).trim() === myId) return true;
            const tEmail = String(t.userEmail || '').toLowerCase().trim();
            if (tEmail && tEmail === myEmail) return true;
            return false;
        });

        list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        if (badge) {
            const counts = getUnreadCounts(user);
            if (counts.tickets > 0) {
                badge.style.display = '';
                badge.textContent = toPersianDigits(counts.tickets);
            } else {
                badge.style.display = 'none';
            }
        }

        if (list.length === 0) {
            wrap.innerHTML = `
                <div class="db-empty">
                    <div class="db-empty__icon">🎫</div>
                    <h3>هنوز تیکتی ثبت نکرده‌اید</h3>
                    <p>اگر سوال یا مشکلی دارید، برای پشتیبانی تیکت بزنید.</p>
                </div>`;
            return;
        }

        wrap.innerHTML = list.map((t) => {
            const replies = Array.isArray(t.replies) ? t.replies : [];
            const statusKey = t.status || 'open';
            const isClosed = statusKey === 'closed';

            const repliesHtml = replies.length > 0
                ? `<div class="db-ticket__replies">
                       ${replies.map((r) => `
                           <div class="db-ticket__reply db-ticket__reply--${r.from === 'admin' ? 'admin' : 'user'}">
                               <div class="db-ticket__reply-head">
                                   <strong>${r.from === 'admin' ? '🛡️ پشتیبانی' : '👤 شما'}</strong>
                                   <small>${formatDateTime(r.date)}</small>
                               </div>
                               <p>${escapeHtml(r.text || '')}</p>
                           </div>
                       `).join('')}
                   </div>`
                : '';

            const replyFormHtml = isClosed
                ? `<div class="db-ticket__closed-note">🔒 این تیکت بسته شده است.</div>`
                : `<div class="db-ticket__reply-form">
                       <textarea data-user-reply-input="${escapeHtml(t.id)}"
                           placeholder="پاسخ خود را بنویسید..." rows="2"></textarea>
                       <div class="db-ticket__reply-actions">
                           <button type="button" class="btn btn--primary"
                               data-user-send-reply="${escapeHtml(t.id)}">
                               <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                                   stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                   stroke-linejoin="round">
                                   <line x1="22" y1="2" x2="11" y2="13"></line>
                                   <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                               </svg>
                               ارسال پاسخ
                           </button>
                           <button type="button" class="db-address__btn db-address__btn--danger"
                               data-action="delete-ticket" data-id="${escapeHtml(t.id)}">حذف تیکت</button>
                       </div>
                   </div>`;

            return `
                <div class="db-ticket" data-ticket-id="${escapeHtml(t.id)}">
                    <div class="db-ticket__head">
                        <div>
                            <strong>${escapeHtml(t.subject)}</strong>
                            <small>کد تیکت: ${escapeHtml(t.id)} — ${formatPersianDate(t.date)}</small>
                        </div>
                        <div class="db-ticket__badges">
                            <span class="db-ticket__priority is-${t.priority}">${PRIORITY_LABELS[t.priority] || '—'}</span>
                            <span class="db-ticket__status is-${statusKey}">${STATUS_LABELS[statusKey] || 'باز'}</span>
                        </div>
                    </div>
                    <div class="db-ticket__body">
                        <div class="db-ticket__row"><span>دسته‌بندی:</span><strong>${escapeHtml(t.category || '—')}</strong></div>
                        <p class="db-ticket__message">${escapeHtml(t.message || '')}</p>
                        ${repliesHtml}
                    </div>
                    ${replyFormHtml}
                </div>
            `;
        }).join('');
    }

    function initTickets(user) {
        const wrap = document.getElementById('ticketFormWrap');
        const newBtn = document.getElementById('newTicketBtn');
        const cancelBtn = document.getElementById('cancelTicketBtn');
        const form = document.getElementById('ticketForm');

        newBtn?.addEventListener('click', () => {
            wrap.hidden = false;
            document.getElementById('ticketSubject').focus();
            newBtn.hidden = true;
        });

        cancelBtn?.addEventListener('click', () => {
            form.reset();
            wrap.hidden = true;
            newBtn.hidden = false;
        });

        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            const subject = document.getElementById('ticketSubject').value.trim();
            const category = document.getElementById('ticketCategory').value;
            const priority = document.getElementById('ticketPriority').value;
            const message = document.getElementById('ticketMessage').value.trim();

            if (!subject || !category || !message) {
                if (typeof showToast === 'function') showToast('لطفاً همه فیلدهای الزامی را پر کنید');
                return;
            }

            const list = readList(TICKETS_KEY);
            const now = new Date().toISOString();
            list.unshift({
                id: 'TK' + Date.now().toString().slice(-6),
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                subject,
                category,
                priority,
                message,
                status: 'open',
                replies: [],
                date: now,
                updatedAt: now
            });
            writeList(TICKETS_KEY, list);

            form.reset();
            wrap.hidden = true;
            newBtn.hidden = false;
            renderTickets(user);

            if (window.LooxSync) window.LooxSync.notify(TICKETS_KEY);
            if (typeof showToast === 'function') showToast('تیکت شما با موفقیت ثبت شد ✓');
        });

        document.getElementById('dbTicketsList')?.addEventListener('click', (e) => {
            const delBtn = e.target.closest('[data-action="delete-ticket"]');
            if (delBtn) {
                if (!confirm('این تیکت حذف شود؟')) return;
                const list = readList(TICKETS_KEY).filter((t) => t.id !== delBtn.dataset.id);
                writeList(TICKETS_KEY, list);
                renderTickets(user);
                if (window.LooxSync) window.LooxSync.notify(TICKETS_KEY);
                if (typeof showToast === 'function') showToast('تیکت حذف شد');
                return;
            }

            const sendBtn = e.target.closest('[data-user-send-reply]');
            if (sendBtn) {
                const ticketId = sendBtn.dataset.userSendReply;
                const textarea = document.querySelector(`[data-user-reply-input="${CSS.escape(ticketId)}"]`);
                const text = textarea?.value.trim();

                if (!text) {
                    if (typeof showToast === 'function') showToast('لطفاً متن پاسخ را بنویسید');
                    textarea?.focus();
                    return;
                }

                const list = readList(TICKETS_KEY);
                const idx = list.findIndex((t) => t.id === ticketId);
                if (idx === -1) return;

                if (!Array.isArray(list[idx].replies)) list[idx].replies = [];
                list[idx].replies.push({
                    id: 'RP' + Date.now(),
                    from: 'user',
                    text: text,
                    date: new Date().toISOString()
                });

                list[idx].status = 'open';
                list[idx].updatedAt = new Date().toISOString();

                writeList(TICKETS_KEY, list);
                renderTickets(user);

                if (window.LooxSync) window.LooxSync.notify(TICKETS_KEY);
                if (typeof showToast === 'function') showToast('پاسخ شما ارسال شد ✓');
            }
        });
    }

    /* ------------------------------------------------------------
       14. REVIEWS
    ------------------------------------------------------------ */
    function renderReviews(user) {
        const wrap = document.getElementById('dbReviewsList');
        const badge = document.getElementById('reviewsBadge');
        if (!wrap) return;

        const all = readList(REVIEWS_KEY);
        const myEmail = (user.email || '').toLowerCase();
        const myId = String(user.id || '');

        const list = all.filter((r) => {
            if (!r) return false;
            if (r.userEmail && String(r.userEmail).toLowerCase() === myEmail) return true;
            if (r.userId && String(r.userId) === myId) return true;
            if (!r.userEmail && !r.userId) return true;
            return false;
        });

        list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        if (badge) {
            const counts = getUnreadCounts(user);
            if (counts.reviews > 0) {
                badge.style.display = '';
                badge.textContent = toPersianDigits(counts.reviews);
            } else {
                badge.style.display = 'none';
            }
        }

        if (list.length === 0) {
            wrap.innerHTML = `
                <div class="db-empty">
                    <div class="db-empty__icon">⭐</div>
                    <h3>هنوز نظری ثبت نکرده‌اید</h3>
                    <p>پس از خرید، می‌توانید نظر و امتیاز خود را ثبت کنید.</p>
                    <a href="shop.html" class="btn btn--primary">مشاهده فروشگاه</a>
                </div>`;
            return;
        }

        wrap.innerHTML = list.map((r) => {
            const replies = Array.isArray(r.replies) ? r.replies : [];

            const repliesHtml = replies.length > 0
                ? `<div class="db-review__replies">
                       ${replies.map((rep) => {
                    const isAdmin = rep.from === 'admin';
                    return `
                               <div class="db-review__reply db-review__reply--${isAdmin ? 'admin' : 'user'}">
                                   <div class="db-review__reply-head">
                                       <strong>${isAdmin ? '🛡️ پشتیبانی' : '👤 شما'}</strong>
                                       <small>${formatDateTime(rep.date)}</small>
                                   </div>
                                   <p>${escapeHtml(rep.text || '')}</p>
                               </div>
                           `;
                }).join('')}
                   </div>`
                : '';

            return `
                <div class="db-review">
                    <div class="db-review__head">
                        <strong>${escapeHtml(r.product)}</strong>
                        <span class="db-review__stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    <p>${escapeHtml(r.text)}</p>
                    <small>${formatPersianDate(r.date)}</small>
                    ${repliesHtml}
                </div>
            `;
        }).join('');
    }

    /* ------------------------------------------------------------
       15. SETTINGS
    ------------------------------------------------------------ */
    function getSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function saveSetting(key, value) {
        const settings = getSettings();
        settings[key] = value;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    function initSettings() {
        const settings = getSettings();

        document.querySelectorAll('[data-setting]').forEach((input) => {
            const key = input.dataset.setting;
            if (typeof settings[key] === 'boolean') input.checked = settings[key];
            input.addEventListener('change', () => {
                saveSetting(key, input.checked);
                if (typeof showToast === 'function') showToast('تنظیمات ذخیره شد ✓');
            });
        });

        document.getElementById('twoFactorToggle')?.addEventListener('change', (e) => {
            saveSetting('twoFactor', e.target.checked);
            if (typeof showToast === 'function') {
                showToast(e.target.checked ? 'ورود دو مرحله‌ای فعال شد' : 'ورود دو مرحله‌ای غیرفعال شد');
            }
        });

        document.getElementById('loginAlertToggle')?.addEventListener('change', (e) => {
            saveSetting('loginAlert', e.target.checked);
        });

        document.getElementById('devicesBtn')?.addEventListener('click', () => {
            if (typeof showToast === 'function') showToast('لیست دستگاه‌های فعال به‌زودی...');
        });

        document.getElementById('languageSelect')?.addEventListener('change', (e) => {
            saveSetting('language', e.target.value);
            if (typeof showToast === 'function') showToast('زبان ذخیره شد');
        });

        document.getElementById('currencySelect')?.addEventListener('change', (e) => {
            saveSetting('currency', e.target.value);
            if (typeof showToast === 'function') showToast('واحد پول ذخیره شد');
        });

        document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
            const confirmed = confirm(
                'آیا مطمئن هستید که می‌خواهید حساب کاربری خود را حذف کنید؟\n' +
                'تمام اطلاعات شما برای همیشه پاک خواهد شد.'
            );
            if (!confirmed) return;
            const doubleConfirm = prompt('برای تایید نهایی، عبارت «حذف» را بنویسید:');
            if (doubleConfirm !== 'حذف') {
                if (typeof showToast === 'function') showToast('عملیات لغو شد');
                return;
            }

            const currentUser = getCurrentUser();

            localStorage.removeItem(USER_KEY);
            localStorage.removeItem(ORDERS_KEY);
            localStorage.removeItem(ADDRESSES_KEY);
            localStorage.removeItem(WALLET_KEY);
            localStorage.removeItem(WISHLIST_KEY);
            localStorage.removeItem(TICKETS_KEY);
            localStorage.removeItem(REVIEWS_KEY);
            localStorage.removeItem(SETTINGS_KEY);
            localStorage.removeItem(CART_KEY);

            if (currentUser) {
                try {
                    const users = readList(USERS_KEY).filter((u) => u.id !== currentUser.id);
                    writeList(USERS_KEY, users);
                } catch (e) { /* ignore */ }
            }

            if (typeof showToast === 'function') showToast('حساب کاربری حذف شد');
            setTimeout(() => window.location.href = 'index.html', 1200);
        });
    }

    /* ------------------------------------------------------------
       16. LOGOUT
    ------------------------------------------------------------ */
    function initLogout(user) {
        document.getElementById('dbLogoutBtn')?.addEventListener('click', () => {
            if (!confirm('از حساب کاربری خارج می‌شوید؟')) return;

            recordLoginEvent(user, 'out');

            localStorage.removeItem(USER_KEY);
            if (typeof showToast === 'function') showToast('از حساب کاربری خارج شدید');
            setTimeout(() => window.location.href = 'index.html', 800);
        });
    }

    /* ------------------------------------------------------------
       17. HELPER — update tickets badge
    ------------------------------------------------------------ */
    function updateTicketsBadge(user) {
        const badge = document.getElementById('ticketsBadge');
        if (!badge) return;

        const counts = getUnreadCounts(user);
        if (counts.tickets > 0) {
            badge.style.display = '';
            badge.textContent = toPersianDigits(counts.tickets);
        } else {
            badge.style.display = 'none';
        }
    }

    /* ------------------------------------------------------------
       18. INIT
    ------------------------------------------------------------ */
    document.addEventListener('DOMContentLoaded', () => {
        if (!guardAuth()) return;

        const user = getCurrentUser();

        renderUserInfo(user);
        initSectionNav();
        initAvatarUpload(user);
        initProfileForm(user);
        initPasswordForm(user);
        renderOrders(user);
        renderCart(user);
        initCartActions();
        renderAddresses(user);
        initAddressActions(user);
        renderWishlist(user);
        initWishlistActions();
        renderWallet(user);
        initWalletCharge(user);
        renderTickets(user);
        initTickets(user);
        renderReviews(user);
        initSettings();
        initLogout(user);

        updateAllBadges(user);

        setInterval(() => {
            const freshUser = getCurrentUser();
            if (freshUser) updateAllBadges(freshUser);
        }, 3000);

        // Real-time sync
        if (window.LooxSync) {
            window.LooxSync.on(TICKETS_KEY, () => {
                const freshUser = getCurrentUser();
                if (freshUser) {
                    renderTickets(freshUser);
                    updateTicketsBadge(freshUser);
                    const activeSection = document.querySelector('.db-section.is-active');
                    const activeName = activeSection ? activeSection.dataset.section : '';
                    if (activeName !== 'tickets') updateAllBadges(freshUser);
                    else markSectionAsSeen('tickets', freshUser);
                }
            });

            window.LooxSync.on(ORDERS_KEY, () => {
                const freshUser = getCurrentUser();
                if (freshUser) {
                    renderOrders(freshUser);
                    const activeSection = document.querySelector('.db-section.is-active');
                    const activeName = activeSection ? activeSection.dataset.section : '';
                    if (activeName !== 'orders') updateAllBadges(freshUser);
                    else markSectionAsSeen('orders', freshUser);
                }
            });

            window.LooxSync.on(ADDRESSES_KEY, () => {
                const freshUser = getCurrentUser();
                if (freshUser) renderAddresses(freshUser);
            });

            window.LooxSync.on(WALLET_KEY, () => {
                const freshUser = getCurrentUser();
                if (freshUser) renderWallet(freshUser);
            });

            window.LooxSync.on(CART_KEY, () => {
                const freshUser = getCurrentUser();
                if (freshUser) {
                    renderCart(freshUser);
                    const activeSection = document.querySelector('.db-section.is-active');
                    const activeName = activeSection ? activeSection.dataset.section : '';
                    if (activeName !== 'cart') updateAllBadges(freshUser);
                    else markSectionAsSeen('cart', freshUser);
                }
            });

            window.LooxSync.on(WISHLIST_KEY, () => {
                const freshUser = getCurrentUser();
                if (freshUser) {
                    renderWishlist(freshUser);
                    const activeSection = document.querySelector('.db-section.is-active');
                    const activeName = activeSection ? activeSection.dataset.section : '';
                    if (activeName !== 'wishlist') updateAllBadges(freshUser);
                    else markSectionAsSeen('wishlist', freshUser);
                }
            });

            window.LooxSync.on(REVIEWS_KEY, () => {
                const freshUser = getCurrentUser();
                if (freshUser) {
                    renderReviews(freshUser);
                    const activeSection = document.querySelector('.db-section.is-active');
                    const activeName = activeSection ? activeSection.dataset.section : '';
                    if (activeName !== 'reviews') updateAllBadges(freshUser);
                    else markSectionAsSeen('reviews', freshUser);
                }
            });
        }
    });

})();
