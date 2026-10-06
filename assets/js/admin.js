/* ============================================================
   LOOXSHOP — Admin Panel Script (Final v4)
   Description: Admin panel + smart badges + user reviews
                + ticket chatbox + real-time sync
============================================================ */

(function () {
    'use strict';

    /* ------------------------------------------------------------
       1. STORAGE KEYS
    ------------------------------------------------------------ */
    const KEYS = {
        ADMIN_SESSION: 'looxshop_admin_session',
        ADMIN_SEEN: 'looxshop_admin_seen_state',
        PRODUCTS: 'looxshop_products',
        ORDERS: 'looxshop_orders',
        USERS: 'looxshop_users',
        MESSAGES: 'looxshop_contact_messages',
        TICKETS: 'looxshop_tickets',
        ADDRESSES: 'looxshop_addresses',
        WALLET: 'looxshop_wallet_transactions',
        REVIEWS: 'looxshop_my_reviews'
    };

    /* ------------------------------------------------------------
       2. LABELS
    ------------------------------------------------------------ */
    const CATEGORY_LABELS = {
        digital: 'کالای دیجیتال',
        clothing: 'پوشاک',
        home: 'لوازم خانه',
        beauty: 'زیبایی و سلامت',
        accessories: 'اکسسوری'
    };

    const STATUS_LABELS = {
        pending: 'در انتظار پرداخت',
        processing: 'در حال پردازش',
        shipped: 'ارسال شده',
        delivered: 'تحویل داده شده',
        cancelled: 'لغو شده'
    };

    const TICKET_PRIORITY_LABELS = {
        low: 'کم', medium: 'متوسط', high: 'بالا', urgent: 'فوری'
    };

    const TICKET_STATUS_LABELS = {
        open: 'باز', answered: 'پاسخ داده شده', closed: 'بسته'
    };

    const SECTION_TITLES = {
        dashboard: 'داشبورد',
        products: 'مدیریت محصولات',
        orders: 'مدیریت سفارش‌ها',
        users: 'مدیریت کاربران',
        tickets: 'پشتیبانی',
        messages: 'پیام‌های کاربران',
        reviews: 'نظرات کاربران'
    };

    /* ------------------------------------------------------------
       3. DOM HELPERS
    ------------------------------------------------------------ */
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    /* ------------------------------------------------------------
       4. UTILITIES
    ------------------------------------------------------------ */
    function readList(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function writeList(key, list) {
        try {
            localStorage.setItem(key, JSON.stringify(list));
        } catch (e) { console.error('Write error', e); }
    }

    function formatPrice(num) {
        if (num === 0 || num === '0') return '۰';
        if (num === null || num === undefined || num === '') return '—';
        return Number(num).toLocaleString('fa-IR');
    }

    function toPersianDigits(v) {
        const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return String(v ?? '').replace(/\d/g, (d) => digits[d]);
    }

    function formatDate(iso) {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '—';
            return d.toLocaleDateString('fa-IR', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        } catch (e) { return '—'; }
    }

    function formatDateTime(iso) {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '—';
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
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showToast(msg) {
        const t = $('#toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('is-visible');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('is-visible'), 2500);
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    /* ------------------------------------------------------------
       5. ADMIN SEEN STATE
    ------------------------------------------------------------ */
    function getSeenState() {
        try {
            const raw = localStorage.getItem(KEYS.ADMIN_SEEN);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function saveSeenState(state) {
        try {
            localStorage.setItem(KEYS.ADMIN_SEEN, JSON.stringify(state));
        } catch (e) { /* ignore */ }
    }

    function markAdminSectionSeen(section) {
        const state = getSeenState();
        state[section] = new Date().toISOString();
        saveSeenState(state);
        updateAdminBadges();
    }

    /**
     * Calculate the number of unread admin notifications
     */
    function getAdminUnreadCounts() {
        const state = getSeenState();

        // ===== Tickets =====
        const tickets = readList(KEYS.TICKETS);
        const lastTickets = state.tickets ? new Date(state.tickets).getTime() : 0;
        const unreadTickets = tickets.filter((t) => {
            const updatedAt = t.updatedAt
                ? new Date(t.updatedAt).getTime()
                : new Date(t.date || 0).getTime();

            if (updatedAt <= lastTickets) return false;

            const replies = Array.isArray(t.replies) ? t.replies : [];
            const lastReply = replies[replies.length - 1];

            // If the last message is from the user → unread
            if (lastReply && lastReply.from === 'user') return true;

            // If it's a new ticket with no replies → unread
            if (replies.length === 0) return true;

            // If the admin sent the last reply → read
            return false;
        }).length;

        // ===== Orders =====
        const orders = readList(KEYS.ORDERS);
        const lastOrders = state.orders ? new Date(state.orders).getTime() : 0;
        const unreadOrders = orders.filter((o) => {
            const updatedAt = o.updatedAt
                ? new Date(o.updatedAt).getTime()
                : new Date(o.date || 0).getTime();
            return updatedAt > lastOrders;
        }).length;

        // ===== Users =====
        const users = readList(KEYS.USERS);
        const lastUsers = state.users ? new Date(state.users).getTime() : 0;
        const unreadUsers = users.filter((u) => {
            const created = new Date(u.createdAt || 0).getTime();
            return created > lastUsers;
        }).length;

        // ===== Messages =====
        const messages = readList(KEYS.MESSAGES);
        const lastMessages = state.messages ? new Date(state.messages).getTime() : 0;
        const unreadMessages = messages.filter((m) => {
            const created = new Date(m.date || 0).getTime();
            return created > lastMessages;
        }).length;

        // ===== Reviews =====
        const reviews = readList(KEYS.REVIEWS);
        const lastReviews = state.reviews ? new Date(state.reviews).getTime() : 0;
        const unreadReviews = reviews.filter((r) => {
            const created = new Date(r.date || 0).getTime();
            if (created <= lastReviews) return false;
            const replies = Array.isArray(r.replies) ? r.replies : [];
            if (replies.length > 0) return false;
            return true;
        }).length;

        return {
            tickets: unreadTickets,
            orders: unreadOrders,
            users: unreadUsers,
            messages: unreadMessages,
            reviews: unreadReviews,
            total: unreadTickets + unreadOrders + unreadUsers + unreadMessages + unreadReviews
        };
    }

    /**
     * Update all badges
     * Products: always the total number of products
     * Others: unread count
     */
    function updateAdminBadges() {
        const counts = getAdminUnreadCounts();
        const products = readList(KEYS.PRODUCTS);

        // ✅ Products: always total count (not unread)
        updateMenuBadge('products', products.length, false);

        // ✅ Others: unread
        updateMenuBadge('tickets', counts.tickets, true);
        updateMenuBadge('orders', counts.orders, true);
        updateMenuBadge('users', counts.users, true);
        updateMenuBadge('messages', counts.messages, true);
        updateMenuBadge('reviews', counts.reviews, true);
    }

    /**
     * @param {string} section - Section name
     * @param {number} count - Number
     * @param {boolean} hideWhenZero - If true, it hides when zero
     */
    function updateMenuBadge(section, count, hideWhenZero = true) {
        const item = document.querySelector(`.admin-menu__item[data-section="${section}"]`);
        if (!item) return;

        const badge = item.querySelector('.admin-menu__badge');
        if (!badge) return;

        if (count <= 0 && hideWhenZero) {
            badge.style.display = 'none';
        } else {
            badge.style.display = '';
            badge.textContent = toPersianDigits(count);
        }
    }

    /* ------------------------------------------------------------
       6. AUTH GUARD
    ------------------------------------------------------------ */
    function checkAuth() {
        try {
            const raw = localStorage.getItem(KEYS.ADMIN_SESSION);
            if (!raw) {
                window.location.href = 'admin-login.html';
                return false;
            }
            const session = JSON.parse(raw);
            if (!session.expiresAt || Date.now() > session.expiresAt) {
                localStorage.removeItem(KEYS.ADMIN_SESSION);
                window.location.href = 'admin-login.html';
                return false;
            }
            setText('adminName', session.name || 'مدیر سیستم');
            setText('adminEmail', session.email || 'admin@looxshop.ir');
            const avatar = $('#adminAvatar');
            if (avatar) avatar.textContent = (session.name || 'A').trim().charAt(0).toUpperCase();
            return true;
        } catch (e) {
            window.location.href = 'admin-login.html';
            return false;
        }
    }

    /* ------------------------------------------------------------
       7. SEED PRODUCTS
    ------------------------------------------------------------ */
    function seedProducts() {
        const existing = readList(KEYS.PRODUCTS);
        if (existing.length > 0) return;
        const demo = [
            { id: 'p1', name: 'هدفون بی‌سیم لوکس', category: 'digital', price: 4850000, oldPrice: 5900000, stock: 25, image: 'assets/img/Wireless_headphones.jpg', rating: 4.8, reviewCount: 124, date: 8 },
            { id: 'p2', name: 'ساعت هوشمند سری ۹', category: 'digital', price: 8200000, oldPrice: null, stock: 12, image: 'assets/img/Series_9_Smartwatch.jpg', rating: 4.9, reviewCount: 86, date: 10 },
            { id: 'p3', name: 'عطر مردانه رویال', category: 'beauty', price: 2450000, oldPrice: null, stock: 40, image: "assets/img/Royal_men's_perfume.jpg", rating: 4.6, reviewCount: 54, date: 5 },
            { id: 'p4', name: 'کیف چرم دست‌دوز', category: 'accessories', price: 3150000, oldPrice: 3900000, stock: 8, image: 'assets/img/Leather_bag.jpg', rating: 4.7, reviewCount: 72, date: 6 },
            { id: 'p5', name: 'کاپشن زمستانی پرمیوم', category: 'clothing', price: 4300000, oldPrice: null, stock: 15, image: 'assets/img/Winter_jacket.jpg', rating: 4.5, reviewCount: 41, date: 9 },
            { id: 'p6', name: 'چراغ رومیزی مینیمال', category: 'home', price: 1850000, oldPrice: null, stock: 22, image: 'assets/img/Minimalist_tableLamp.jpg', rating: 4.4, reviewCount: 33, date: 3 },
            { id: 'p7', name: 'اسپیکر بلوتوثی پرتابل', category: 'digital', price: 3600000, oldPrice: null, stock: 3, image: 'assets/img/Bluetooth_speaker.jpg', rating: 4.7, reviewCount: 68, date: 7 },
            { id: 'p8', name: 'ست فنجان سرامیکی', category: 'home', price: 980000, oldPrice: 1150000, stock: 30, image: 'assets/img/Set_of_six_cups.jpg', rating: 4.3, reviewCount: 29, date: 2 },
            { id: 'p9', name: 'گلدان دکوری سرامیک', category: 'home', price: 2750000, oldPrice: null, stock: 18, image: 'assets/img/Decorative_ceramic.jpg', rating: 4.6, reviewCount: 19, date: 4 },
            { id: 'p10', name: 'تی‌شرت نخی کلاسیک', category: 'clothing', price: 1250000, oldPrice: null, stock: 45, image: 'assets/img/Cotton_T-shirt.jpg', rating: 4.4, reviewCount: 24, date: 1 },
            { id: 'p11', name: 'سرم مرطوب‌کننده صورت', category: 'beauty', price: 1950000, oldPrice: 2600000, stock: 5, image: 'assets/img/Face_Serum.jpg', rating: 4.8, reviewCount: 92, date: 11 },
            { id: 'p12', name: 'عینک آفتابی کلاسیک', category: 'accessories', price: 1550000, oldPrice: null, stock: 20, image: 'assets/img/Sunglasses.jpg', rating: 4.5, reviewCount: 37, date: 5 }
        ];
        writeList(KEYS.PRODUCTS, demo);
    }

    /* ------------------------------------------------------------
       8. NAVIGATION
    ------------------------------------------------------------ */
    function goToSection(id) {
        $$('.admin-menu__item').forEach((item) => {
            item.classList.toggle('is-active', item.dataset.section === id);
        });
        $$('.admin-section').forEach((sec) => {
            sec.classList.toggle('is-active', sec.dataset.section === id);
        });
        setText('sectionTitle', SECTION_TITLES[id] || '');
        $('#adminSidebar')?.classList.remove('is-open');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        markAdminSectionSeen(id);

        if (id === 'dashboard') renderDashboard();
        if (id === 'products') renderProducts();
        if (id === 'orders') renderOrders();
        if (id === 'users') renderUsers();
        if (id === 'tickets') renderTickets();
        if (id === 'messages') renderMessages();
        if (id === 'reviews') renderReviews();
    }

    function initNav() {
        $$('.admin-menu__item').forEach((btn) => {
            btn.addEventListener('click', () => goToSection(btn.dataset.section));
        });
        $$('[data-goto]').forEach((btn) => {
            btn.addEventListener('click', () => goToSection(btn.dataset.goto));
        });
        $('#adminSidebarToggle')?.addEventListener('click', () => {
            $('#adminSidebar')?.classList.add('is-open');
        });
        $('#adminSidebarClose')?.addEventListener('click', () => {
            $('#adminSidebar')?.classList.remove('is-open');
        });
        document.addEventListener('click', (e) => {
            const sidebar = $('#adminSidebar');
            const toggle = $('#adminSidebarToggle');
            if (!sidebar || !toggle) return;
            if (!sidebar.classList.contains('is-open')) return;
            if (sidebar.contains(e.target) || toggle.contains(e.target)) return;
            sidebar.classList.remove('is-open');
        });
        $('#adminLogout')?.addEventListener('click', () => {
            if (confirm('آیا از پنل مدیریت خارج می‌شوید؟')) {
                localStorage.removeItem(KEYS.ADMIN_SESSION);
                window.location.href = 'admin-login.html';
            }
        });
    }

    /* ------------------------------------------------------------
       9. DASHBOARD
    ------------------------------------------------------------ */
    function renderDashboard() {
        const products = readList(KEYS.PRODUCTS);
        const orders = readList(KEYS.ORDERS);
        const users = readList(KEYS.USERS);
        const tickets = readList(KEYS.TICKETS);

        const totalRevenue = orders
            .filter(o => (o.status || 'processing') !== 'cancelled')
            .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        const pendingOrders = orders.filter((o) => (o.status || 'processing') === 'processing').length;
        const openTickets = tickets.filter((t) => (t.status || 'open') === 'open').length;

        setText('statRevenue', `${formatPrice(totalRevenue)} تومان`);
        setText('statOrders', toPersianDigits(orders.length));
        setText('statUsers', toPersianDigits(users.length));
        setText('statPending', toPersianDigits(pendingOrders + openTickets));

        const recentBody = $('#recentOrdersBody');
        if (recentBody) {
            const recent = orders.slice(0, 5);
            if (recent.length === 0) {
                recentBody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">هنوز سفارشی ثبت نشده است</td></tr>`;
            } else {
                recentBody.innerHTML = recent.map((o) => `
                    <tr>
                        <td><strong>${escapeHtml(o.orderNumber || o.id)}</strong></td>
                        <td>${escapeHtml(o.customerName || 'مهمان')}</td>
                        <td>${formatDate(o.date)}</td>
                        <td>${formatPrice(o.total)} تومان</td>
                        <td><span class="admin-badge admin-badge--${o.status || 'processing'}">${STATUS_LABELS[o.status || 'processing']}</span></td>
                        <td><button class="admin-action-btn" data-view-order="${escapeHtml(o.id)}">مشاهده</button></td>
                    </tr>
                `).join('');
                recentBody.querySelectorAll('[data-view-order]').forEach((btn) => {
                    btn.addEventListener('click', () => openOrderModal(btn.dataset.viewOrder));
                });
            }
        }

        const topBody = $('#topProductsBody');
        if (topBody) {
            const top = [...products].sort((a, b) => b.price - a.price).slice(0, 5);
            if (top.length === 0) {
                topBody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">محصولی وجود ندارد</td></tr>`;
            } else {
                topBody.innerHTML = top.map((p) => {
                    const stock = Number(p.stock || 0);
                    const stockClass = stock === 0 ? 'out' : stock <= 5 ? 'low' : 'ok';
                    const stockLabel = stock === 0 ? 'ناموجود' : stock <= 5 ? `کم (${toPersianDigits(stock)})` : 'موجود';
                    return `
                        <tr>
                            <td><strong>${escapeHtml(p.name)}</strong></td>
                            <td>${CATEGORY_LABELS[p.category] || '—'}</td>
                            <td>${formatPrice(p.price)} تومان</td>
                            <td>${toPersianDigits(stock)} عدد</td>
                            <td><span class="admin-badge admin-badge--${stockClass}">${stockLabel}</span></td>
                        </tr>
                    `;
                }).join('');
            }
        }
    }

    /* ------------------------------------------------------------
       10. PRODUCTS
    ------------------------------------------------------------ */
    let productSearch = '';
    let productCatFilter = 'all';

    function renderProducts() {
        const products = readList(KEYS.PRODUCTS);
        const body = $('#productsTableBody');
        const emptyEl = $('#productsEmpty');
        if (!body) return;

        const filtered = products.filter((p) => {
            const matchCat = productCatFilter === 'all' || p.category === productCatFilter;
            const matchSearch = productSearch === '' || (p.name || '').toLowerCase().includes(productSearch);
            return matchCat && matchSearch;
        });

        if (filtered.length === 0) {
            body.innerHTML = '';
            if (emptyEl) emptyEl.hidden = false;
            return;
        }
        if (emptyEl) emptyEl.hidden = true;

        body.innerHTML = filtered.map((p) => {
            const stock = Number(p.stock || 0);
            const stockClass = stock === 0 ? 'out' : stock <= 5 ? 'low' : 'ok';
            const stockLabel = stock === 0 ? 'ناموجود' : stock <= 5 ? `کم (${toPersianDigits(stock)})` : 'موجود';
            const img = p.image || 'assets/img/hero.jpg';
            return `
                <tr>
                    <td><img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" class="admin-thumb" onerror="this.src='assets/img/hero.jpg'" /></td>
                    <td>
                        <strong>${escapeHtml(p.name)}</strong>
                        ${p.oldPrice ? `<br><small style="color:#b3a29a;text-decoration:line-through">${formatPrice(p.oldPrice)} تومان</small>` : ''}
                    </td>
                    <td>${CATEGORY_LABELS[p.category] || '—'}</td>
                    <td>${formatPrice(p.price)} تومان</td>
                    <td>${toPersianDigits(stock)}</td>
                    <td><span class="admin-badge admin-badge--${stockClass}">${stockLabel}</span></td>
                    <td>
                        <div class="admin-actions">
                            <button class="admin-action-btn admin-action-btn--edit" data-edit="${escapeHtml(p.id)}" title="ویرایش">✎</button>
                            <button class="admin-action-btn admin-action-btn--delete" data-delete="${escapeHtml(p.id)}" title="حذف">🗑</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        body.querySelectorAll('[data-edit]').forEach((btn) => {
            btn.addEventListener('click', () => openProductModal(btn.dataset.edit));
        });
        body.querySelectorAll('[data-delete]').forEach((btn) => {
            btn.addEventListener('click', () => deleteProduct(btn.dataset.delete));
        });

        // Update the products badge
        updateAdminBadges();
    }

    function deleteProduct(id) {
        if (!confirm('این محصول از سایت حذف شود؟')) return;
        const list = readList(KEYS.PRODUCTS).filter((p) => p.id !== id);
        writeList(KEYS.PRODUCTS, list);
        renderProducts();
        renderDashboard();
        if (window.LooxSync) window.LooxSync.notify(KEYS.PRODUCTS);
        showToast('محصول با موفقیت حذف شد ✓');
    }

    function initProductFilters() {
        const search = $('#productSearch');
        const cat = $('#productCatFilter');
        let debounce = null;
        search?.addEventListener('input', (e) => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                productSearch = e.target.value.trim().toLowerCase();
                renderProducts();
            }, 200);
        });
        cat?.addEventListener('change', (e) => {
            productCatFilter = e.target.value;
            renderProducts();
        });
    }

    /* ------------------------------------------------------------
       11. PRODUCT MODAL (brief — sent previously)
    ------------------------------------------------------------ */
    function openProductModal(id = null) {
        const modal = $('#productModal');
        const title = $('#productModalTitle');
        const form = $('#productForm');
        if (!modal || !form) return;

        form.reset();
        $('#pfId').value = '';

        if (id) {
            const product = readList(KEYS.PRODUCTS).find((p) => p.id === id);
            if (!product) return;
            title.textContent = 'ویرایش محصول';
            $('#pfId').value = product.id;
            $('#pfName').value = product.name || '';
            $('#pfCategory').value = product.category || '';
            $('#pfPrice').value = product.price || '';
            $('#pfOldPrice').value = product.oldPrice || '';
            $('#pfStock').value = product.stock || 0;
            $('#pfImage').value = product.image || '';
            $('#pfDesc').value = product.desc || '';
        } else {
            title.textContent = 'افزودن محصول جدید';
            $('#pfStock').value = 10;
        }

        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        setTimeout(() => $('#pfName')?.focus(), 100);
    }

    function closeProductModal() {
        const modal = $('#productModal');
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function saveProduct() {
        const id = $('#pfId').value;
        const name = $('#pfName').value.trim();
        const category = $('#pfCategory').value;
        const price = Number($('#pfPrice').value);
        const oldPriceRaw = $('#pfOldPrice').value;
        const oldPrice = oldPriceRaw ? Number(oldPriceRaw) : null;
        const stock = Number($('#pfStock').value);
        const image = $('#pfImage').value.trim() || 'assets/img/hero.jpg';
        const desc = $('#pfDesc').value.trim();

        if (!name || !category || !price) {
            showToast('لطفاً فیلدهای الزامی را پر کنید');
            return;
        }

        const list = readList(KEYS.PRODUCTS);
        if (id) {
            const idx = list.findIndex((p) => p.id === id);
            if (idx !== -1) list[idx] = { ...list[idx], name, category, price, oldPrice, stock, image, desc };
            showToast('محصول ویرایش شد ✓');
        } else {
            list.push({
                id: 'p' + Date.now(),
                name, category, price, oldPrice, stock, image, desc,
                rating: 4.5, reviewCount: 0,
                date: Math.floor(Date.now() / 1000)
            });
            showToast('محصول جدید اضافه شد ✓');
        }

        writeList(KEYS.PRODUCTS, list);
        closeProductModal();
        renderProducts();
        renderDashboard();
        if (window.LooxSync) window.LooxSync.notify(KEYS.PRODUCTS);
    }

    function initProductModal() {
        $('#addProductBtn')?.addEventListener('click', () => openProductModal());
        $('#productModalClose')?.addEventListener('click', closeProductModal);
        $('#productModalCancel')?.addEventListener('click', closeProductModal);
        $('#productModalOverlay')?.addEventListener('click', closeProductModal);
        $('#productModalSave')?.addEventListener('click', saveProduct);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && $('#productModal')?.classList.contains('is-open')) {
                closeProductModal();
            }
        });
    }

    /* ------------------------------------------------------------
       12. ORDERS
    ------------------------------------------------------------ */
    let orderStatusFilter = 'all';

    function renderOrders() {
        const orders = readList(KEYS.ORDERS);
        const body = $('#ordersTableBody');
        const emptyEl = $('#ordersEmpty');
        if (!body) return;

        // Sorting: newest first
        const sorted = [...orders].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        const filtered = sorted.filter((o) => {
            if (orderStatusFilter === 'all') return true;
            return (o.status || 'processing') === orderStatusFilter;
        });

        if (filtered.length === 0) {
            body.innerHTML = `<tr><td colspan="8" class="admin-table__empty">سفارشی با این فیلتر پیدا نشد</td></tr>`;
            if (emptyEl) emptyEl.hidden = true;
            return;
        }
        
        if (emptyEl) emptyEl.hidden = true;

        body.innerHTML = filtered.map((o, index) => {
            const statusKey = o.status || 'processing';
            const items = Array.isArray(o.items) ? o.items : [];

            // Product summary
            const productNames = items.length > 0
                ? items.slice(0, 2).map((i) => i.name || 'محصول').join('، ') +
                (items.length > 2 ? ` و ${toPersianDigits(items.length - 2)} دیگر` : '')
                : '—';

            // First image
            const firstImage = items.length > 0 ? (items[0].image || 'assets/img/hero.jpg') : null;

            return `
                <tr>
                    <td>
                        <span class="admin-row-num">${toPersianDigits(index + 1)}</span>
                    </td>
                    <td>
                        <strong class="admin-order-code">${escapeHtml(o.orderNumber || o.id)}</strong>
                    </td>
                    <td>
                        <div class="admin-customer-cell">
                            <strong>${escapeHtml(o.customerName || 'مهمان')}</strong>
                            ${o.customerPhone ? `<small>${escapeHtml(o.customerPhone)}</small>` : ''}
                            ${o.customerEmail ? `<small dir="ltr">${escapeHtml(o.customerEmail)}</small>` : ''}
                        </div>
                    </td>
                    <td>
                        <div class="admin-products-cell">
                            ${firstImage
                    ? `<div class="admin-products-cell__img">
                                       <img src="${escapeHtml(firstImage)}"
                                            alt=""
                                            onerror="this.src='assets/img/hero.jpg'" />
                                       ${items.length > 1 ? `<span class="admin-products-cell__badge">+${toPersianDigits(items.length - 1)}</span>` : ''}
                                   </div>`
                    : ''}
                            <div class="admin-products-cell__info">
                                <small>${escapeHtml(productNames)}</small>
                                <span class="admin-products-cell__count">
                                    ${toPersianDigits(o.itemsCount || items.length || 0)} قلم
                                </span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="admin-date-cell">
                            <strong>${formatDate(o.date)}</strong>
                        </div>
                    </td>
                    <td>
                        <strong class="admin-amount-cell">${formatPrice(o.total)} تومان</strong>
                    </td>
                    <td>
                        <select class="admin-status-select" data-order-status="${escapeHtml(o.id)}">
                            <option value="processing" ${statusKey === 'processing' ? 'selected' : ''}>در حال پردازش</option>
                            <option value="shipped" ${statusKey === 'shipped' ? 'selected' : ''}>ارسال شده</option>
                            <option value="delivered" ${statusKey === 'delivered' ? 'selected' : ''}>تحویل داده شده</option>
                            <option value="cancelled" ${statusKey === 'cancelled' ? 'selected' : ''}>لغو شده</option>
                        </select>
                    </td>
                    <td>
                        <button class="admin-action-btn admin-action-btn--edit" data-view-order="${escapeHtml(o.id)}">
                            👁 مشاهده
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Bind view
        body.querySelectorAll('[data-view-order]').forEach((btn) => {
            btn.addEventListener('click', () => openOrderModal(btn.dataset.viewOrder));
        });

        // Bind status change
        body.querySelectorAll('[data-order-status]').forEach((sel) => {
            sel.addEventListener('change', (e) => {
                const list = readList(KEYS.ORDERS);
                const idx = list.findIndex((o) => o.id === sel.dataset.orderStatus);
                if (idx !== -1) {
                    list[idx].status = e.target.value;
                    list[idx].updatedAt = new Date().toISOString();
                    writeList(KEYS.ORDERS, list);
                    if (window.LooxSync) window.LooxSync.notify(KEYS.ORDERS);
                    showToast('وضعیت سفارش به‌روزرسانی شد ✓');
                    renderDashboard();
                }
            });
        });
    }

    function initOrderFilters() {
        $('#orderStatusFilter')?.addEventListener('change', (e) => {
            orderStatusFilter = e.target.value;
            renderOrders();
        });
    }

    function openOrderModal(id) {
        const order = readList(KEYS.ORDERS).find((o) => o.id === id);
        if (!order) return;
        const modal = $('#orderModal');
        const body = $('#orderModalBody');
        if (!modal || !body) return;

        const items = order.items || [];
        const itemsHtml = items.length > 0
            ? items.map((i) => `
                <div class="admin-order-item">
                    <img src="${escapeHtml(i.image || 'assets/img/hero.jpg')}" alt="${escapeHtml(i.name)}" onerror="this.src='assets/img/hero.jpg'" />
                    <div>
                        <strong>${escapeHtml(i.name)}</strong>
                        <small>تعداد: ${toPersianDigits(i.qty)} × ${formatPrice(i.price)} تومان</small>
                    </div>
                    <span>${formatPrice((i.price || 0) * (i.qty || 0))} تومان</span>
                </div>
            `).join('')
            : '<p style="text-align:center;color:#6b5a5a">اطلاعات اقلام در دسترس نیست</p>';

        body.innerHTML = `
            <div class="admin-order-meta">
                <div><span>شماره سفارش:</span><strong>${escapeHtml(order.orderNumber || order.id)}</strong></div>
                <div><span>تاریخ:</span><strong>${formatDate(order.date)}</strong></div>
                <div><span>وضعیت:</span><strong>${STATUS_LABELS[order.status || 'processing']}</strong></div>
                <div><span>تعداد اقلام:</span><strong>${toPersianDigits(order.itemsCount || 0)}</strong></div>
            </div>
            <h3 class="admin-order-subtitle">اقلام سفارش</h3>
            <div class="admin-order-items">${itemsHtml}</div>
            <div class="admin-order-summary">
                <div><span>جمع کالاها:</span><strong>${formatPrice(order.subtotal || order.total)} تومان</strong></div>
                ${order.shipping ? `<div><span>هزینه ارسال:</span><strong>${formatPrice(order.shipping)} تومان</strong></div>` : ''}
                ${order.discount ? `<div><span>تخفیف:</span><strong>− ${formatPrice(order.discount)} تومان</strong></div>` : ''}
                <div class="admin-order-summary__total"><span>مبلغ کل:</span><strong>${formatPrice(order.total)} تومان</strong></div>
            </div>
        `;

        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeOrderModal() {
        const modal = $('#orderModal');
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function initOrderModal() {
        $('#orderModalClose')?.addEventListener('click', closeOrderModal);
        $('#orderModalCancel')?.addEventListener('click', closeOrderModal);
        $('#orderModalOverlay')?.addEventListener('click', closeOrderModal);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && $('#orderModal')?.classList.contains('is-open')) closeOrderModal();
        });
    }

    /* ------------------------------------------------------------
       13. USERS
    ------------------------------------------------------------ */
    let userSearch = '';

    function getUniqueUsers() {
        const raw = readList(KEYS.USERS);
        const map = new Map();
        raw.forEach((u) => {
            const key = (u.email || u.id || '').toString().toLowerCase().trim();
            if (!key) return;
            if (!map.has(key)) {
                map.set(key, { ...u, loginCount: 1, allIds: [u.id], firstSeen: u.createdAt || u.loginAt || new Date().toISOString() });
            } else {
                const ex = map.get(key);
                ex.loginCount += 1;
                ex.allIds.push(u.id);
                const curDate = u.createdAt || u.loginAt;
                if (curDate && new Date(curDate) > new Date(ex.firstSeen || 0)) {
                    ex.name = u.name || ex.name;
                    ex.phone = u.phone || ex.phone;
                    ex.avatar = u.avatar || ex.avatar;
                }
                if (!ex.avatar && u.avatar) ex.avatar = u.avatar;
                if (!ex.phone && u.phone) ex.phone = u.phone;
            }
        });
        return Array.from(map.values());
    }

    function renderUsers() {
        const users = getUniqueUsers();
        const body = $('#usersTableBody');
        const emptyEl = $('#usersEmpty');
        if (!body) return;

        const filtered = users.filter((u) => {
            if (userSearch === '') return true;
            const name = (u.name || '').toLowerCase();
            const email = (u.email || '').toLowerCase();
            const phone = (u.phone || '').toLowerCase();
            return name.includes(userSearch) || email.includes(userSearch) || phone.includes(userSearch);
        });

        if (filtered.length === 0) {
            body.innerHTML = '';
            if (emptyEl) emptyEl.hidden = false;
            return;
        }
        if (emptyEl) emptyEl.hidden = true;

        body.innerHTML = filtered.map((u) => {
            const initial = (u.name || 'U').trim().charAt(0).toUpperCase();
            const hasAvatar = !!u.avatar;
            const avatarStyle = hasAvatar
                ? `background-image:url(${escapeHtml(u.avatar)});background-size:cover;background-position:center;`
                : '';
            return `
                <tr>
                    <td><div class="admin-user-avatar-sm" style="${avatarStyle}">${hasAvatar ? '' : initial}</div></td>
                    <td><strong>${escapeHtml(u.name || 'کاربر')}</strong></td>
                    <td>${escapeHtml(u.email || '—')}</td>
                    <td>${escapeHtml(u.phone || '—')}</td>
                    <td>${u.firstSeen ? formatDate(u.firstSeen) : '—'}</td>
                    <td><button class="admin-action-btn admin-action-btn--edit" data-view-user="${escapeHtml(u.email || u.id)}">مشاهده</button></td>
                </tr>
            `;
        }).join('');

        body.querySelectorAll('[data-view-user]').forEach((btn) => {
            btn.addEventListener('click', () => openUserModal(btn.dataset.viewUser));
        });
    }

    function initUserFilters() {
        const search = $('#userSearch');
        let debounce = null;
        search?.addEventListener('input', (e) => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                userSearch = e.target.value.trim().toLowerCase();
                renderUsers();
            }, 200);
        });
    }

    function openUserModal(userKey) {
        const allUsers = getUniqueUsers();
        const key = String(userKey || '').toLowerCase();
        const user = allUsers.find((u) =>
            String(u.email || '').toLowerCase() === key ||
            String(u.id) === String(userKey) ||
            (u.allIds || []).some((id) => String(id) === String(userKey))
        );
        if (!user) { showToast('کاربر پیدا نشد'); return; }

        const modal = $('#userModal');
        const body = $('#userModalBody');
        if (!modal || !body) return;

        const userEmail = (user.email || '').toLowerCase();
        const addresses = readList(KEYS.ADDRESSES).filter((a) =>
            !a.userId || (user.allIds || []).includes(a.userId) ||
            (a.userEmail && a.userEmail.toLowerCase() === userEmail)
        );
        const orders = readList(KEYS.ORDERS).filter((o) =>
            (user.allIds || []).includes(o.userId) ||
            (o.customerEmail && o.customerEmail.toLowerCase() === userEmail)
        );
        const tickets = readList(KEYS.TICKETS).filter((t) =>
            (user.allIds || []).includes(t.userId) ||
            (t.userEmail && t.userEmail.toLowerCase() === userEmail)
        );
        const allReviews = readList(KEYS.REVIEWS);
        const reviews = allReviews.filter((r) =>
            (r.userEmail && r.userEmail.toLowerCase() === userEmail) ||
            (r.userId && (user.allIds || []).includes(r.userId))
        );
        const allHistory = readList('looxshop_login_history');
        const loginHistory = allHistory
            .filter((h) =>
                (h.email && h.email.toLowerCase() === userEmail) ||
                (h.userId && (user.allIds || []).includes(h.userId))
            )
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        const walletTx = readList(KEYS.WALLET).filter((tx) =>
            !tx.userId || (user.allIds || []).includes(tx.userId)
        );
        const walletBalance = walletTx.reduce((sum, tx) =>
            tx.type === 'credit' ? sum + (tx.amount || 0) : sum - (tx.amount || 0), 0);

        const initial = (user.name || 'U').trim().charAt(0).toUpperCase();
        const hasAvatar = !!user.avatar;
        const avatarStyle = hasAvatar
            ? `background-image:url(${escapeHtml(user.avatar)});background-size:cover;background-position:center;`
            : '';

        const loginCount = loginHistory.filter((h) => h.type === 'in').length;
        const logoutCount = loginHistory.filter((h) => h.type === 'out').length;

        const historyHtml = loginHistory.length === 0
            ? '<p class="admin-empty-line">تاریخچه ورودی ثبت نشده است</p>'
            : loginHistory.slice(0, 30).map((h) => `
                <div class="admin-login-item admin-login-item--${h.type === 'in' ? 'in' : 'out'}">
                    <div class="admin-login-item__icon">${h.type === 'in' ? '→' : '←'}</div>
                    <div class="admin-login-item__info">
                        <strong>${h.type === 'in' ? 'ورود به سایت' : 'خروج از سایت'}</strong>
                        <small>${escapeHtml(h.device || '—')}</small>
                    </div>
                    <span class="admin-login-item__time">${formatDate(h.date)}</span>
                </div>
            `).join('');

        const addressesHtml = addresses.length === 0
            ? '<p class="admin-empty-line">آدرسی ثبت نشده است</p>'
            : addresses.map((a) => `
                <div class="admin-user-address">
                    <strong>${escapeHtml(a.title || 'آدرس')}</strong>
                    ${a.isDefault ? '<span class="admin-address-default">پیش‌فرض</span>' : ''}
                    <p>${escapeHtml(a.province || '')}، ${escapeHtml(a.city || '')}<br />${escapeHtml(a.address || '')}<br />کد پستی: ${escapeHtml(a.postalCode || '—')}</p>
                </div>
            `).join('');

        const ordersHtml = orders.length === 0
            ? '<p class="admin-empty-line">سفارشی ثبت نشده است</p>'
            : orders.map((o) => `
                <div class="admin-user-order">
                    <div><strong>${escapeHtml(o.orderNumber || o.id)}</strong><small>${formatDate(o.date)}</small></div>
                    <span>${formatPrice(o.total)} تومان</span>
                    <span class="admin-badge admin-badge--${o.status || 'processing'}">${STATUS_LABELS[o.status || 'processing']}</span>
                </div>
            `).join('');

        const ticketsHtml = tickets.length === 0
            ? '<p class="admin-empty-line">تیکتی ثبت نشده است</p>'
            : tickets.map((t) => `
                <div class="admin-user-ticket">
                    <div><strong>${escapeHtml(t.subject)}</strong><small>${formatDate(t.date)} — اولویت: ${TICKET_PRIORITY_LABELS[t.priority] || '—'}</small></div>
                    <span class="admin-badge admin-badge--${(t.status || 'open') === 'open' ? 'processing' : 'delivered'}">${TICKET_STATUS_LABELS[t.status || 'open']}</span>
                </div>
            `).join('');

        const reviewsHtml = reviews.length === 0
            ? '<p class="admin-empty-line">نظری ثبت نشده است</p>'
            : reviews.map((r) => `
                <div class="admin-user-review">
                    <div class="admin-user-review__head">
                        <strong>${escapeHtml(r.product || 'محصول')}</strong>
                        <span class="admin-user-review__stars">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</span>
                    </div>
                    <p>${escapeHtml(r.text || '')}</p>
                    <small>${formatDate(r.date)}</small>
                </div>
            `).join('');

        body.innerHTML = `
            <div class="admin-user-header">
                <div class="admin-user-avatar-lg" style="${avatarStyle}">${hasAvatar ? '' : initial}</div>
                <div class="admin-user-header__info">
                    <h3>${escapeHtml(user.name || 'کاربر')}</h3>
                    <p>${escapeHtml(user.email || '—')}</p>
                    <p style="direction:ltr">${escapeHtml(user.phone || '—')}</p>
                    <small>عضویت از: ${user.firstSeen ? formatDate(user.firstSeen) : '—'}</small>
                </div>
            </div>
            <div class="admin-user-stats">
                <div class="admin-user-stat admin-user-stat--wine"><strong>${formatPrice(walletBalance)}</strong><span>موجودی کیف پول (تومان)</span></div>
                <div class="admin-user-stat"><strong>${toPersianDigits(orders.length)}</strong><span>سفارش</span></div>
                <div class="admin-user-stat"><strong>${toPersianDigits(loginCount)}</strong><span>بار ورود</span></div>
                <div class="admin-user-stat"><strong>${toPersianDigits(tickets.length)}</strong><span>تیکت</span></div>
            </div>
            <h4 class="admin-user-section-title">📍 آدرس‌ها (${toPersianDigits(addresses.length)})</h4>
            <div class="admin-user-addresses">${addressesHtml}</div>
            <h4 class="admin-user-section-title">📦 سفارش‌ها (${toPersianDigits(orders.length)})</h4>
            <div class="admin-user-orders">${ordersHtml}</div>
            <h4 class="admin-user-section-title">🎫 تیکت‌ها (${toPersianDigits(tickets.length)})</h4>
            <div class="admin-user-tickets">${ticketsHtml}</div>
            <h4 class="admin-user-section-title">⭐ نظرات (${toPersianDigits(reviews.length)})</h4>
            <div class="admin-user-tickets">${reviewsHtml}</div>
            <h4 class="admin-user-section-title">🕐 تاریخچه ورود و خروج (${toPersianDigits(loginCount)} ورود / ${toPersianDigits(logoutCount)} خروج)</h4>
            <div class="admin-login-history">${historyHtml}</div>
        `;

        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeUserModal() {
        const modal = $('#userModal');
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function initUserModal() {
        $('#userModalClose')?.addEventListener('click', closeUserModal);
        $('#userModalCancel')?.addEventListener('click', closeUserModal);
        $('#userModalOverlay')?.addEventListener('click', closeUserModal);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && $('#userModal')?.classList.contains('is-open')) closeUserModal();
        });
    }

    /* ------------------------------------------------------------
       14. TICKETS
    ------------------------------------------------------------ */
    let ticketStatusFilter = 'all';

    function renderTickets() {
        const tickets = readList(KEYS.TICKETS);
        const wrap = $('#ticketsList');
        const emptyEl = $('#ticketsEmpty');
        if (!wrap) return;

        const filtered = tickets.filter((t) => {
            if (ticketStatusFilter === 'all') return true;
            return (t.status || 'open') === ticketStatusFilter;
        });

        if (filtered.length === 0) {
            wrap.innerHTML = '';
            if (emptyEl) emptyEl.hidden = false;
            return;
        }
        if (emptyEl) emptyEl.hidden = true;

        wrap.innerHTML = filtered.map((t) => {
            const priorityClass = t.priority === 'urgent' ? 'cancelled' : t.priority === 'high' ? 'pending' : 'processing';
            const statusClass = (t.status || 'open') === 'open' ? 'processing' : 'delivered';
            const replies = Array.isArray(t.replies) ? t.replies : [];
            const userName = t.userName || (t.userEmail ? t.userEmail.split('@')[0] : 'کاربر');
            const userInitial = userName.trim().charAt(0).toUpperCase();

            const firstMsg = `
                <div class="ticket-msg ticket-msg--user">
                    <div class="ticket-msg__avatar">${escapeHtml(userInitial)}</div>
                    <div class="ticket-msg__content">
                        <div class="ticket-msg__bubble"><p>${escapeHtml(t.message || '')}</p></div>
                        <div class="ticket-msg__meta"><strong>${escapeHtml(userName)}</strong><span>${formatDateTime(t.date)}</span></div>
                    </div>
                </div>
            `;

            const repliesHtml = replies.map((r) => {
                const isAdmin = r.from === 'admin';
                return `
                    <div class="ticket-msg ticket-msg--${isAdmin ? 'admin' : 'user'}">
                        <div class="ticket-msg__avatar">${isAdmin ? 'م' : escapeHtml(userInitial)}</div>
                        <div class="ticket-msg__content">
                            <div class="ticket-msg__bubble"><p>${escapeHtml(r.text || '')}</p></div>
                            <div class="ticket-msg__meta"><strong>${isAdmin ? '🛡️ پشتیبانی' : escapeHtml(userName)}</strong><span>${formatDateTime(r.date)}</span></div>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="admin-ticket-card" data-ticket-id="${escapeHtml(t.id)}">
                    <div class="admin-ticket-card__head">
                        <div class="admin-ticket-card__title">
                            <h3>${escapeHtml(t.subject || 'بدون موضوع')}</h3>
                            <div class="admin-ticket-card__sub">
                                <span>کد: <strong>${escapeHtml(t.id)}</strong></span>
                                <span>•</span>
                                <span>کاربر: <strong>${escapeHtml(userName)}</strong></span>
                                <span>•</span>
                                <span>${formatDateTime(t.date)}</span>
                            </div>
                        </div>
                        <div class="admin-ticket-card__badges">
                            <span class="admin-badge admin-badge--${priorityClass}">${TICKET_PRIORITY_LABELS[t.priority] || '—'}</span>
                            <span class="admin-badge admin-badge--${statusClass}">${TICKET_STATUS_LABELS[t.status || 'open']}</span>
                        </div>
                    </div>
                    <div class="admin-ticket-card__info">
                        <span><strong>دسته‌بندی:</strong> ${escapeHtml(t.category || '—')}</span>
                        <span><strong>ایمیل:</strong> ${escapeHtml(t.userEmail || '—')}</span>
                    </div>
                    <div class="admin-ticket-thread">${firstMsg}${repliesHtml}</div>
                    <div class="admin-ticket-reply">
                        <div class="admin-ticket-reply__head"><strong>✍️ پاسخ شما</strong></div>
                        <textarea data-reply-input="${escapeHtml(t.id)}" placeholder="پاسخ خود را بنویسید..." rows="3"></textarea>
                        <div class="admin-ticket-reply__actions">
                            <select class="admin-status-select" data-ticket-status="${escapeHtml(t.id)}">
                                <option value="open" ${(t.status || 'open') === 'open' ? 'selected' : ''}>باز</option>
                                <option value="answered" ${t.status === 'answered' ? 'selected' : ''}>پاسخ داده شده</option>
                                <option value="closed" ${t.status === 'closed' ? 'selected' : ''}>بسته</option>
                            </select>
                            <button class="admin-action-btn admin-action-btn--delete" data-delete-ticket="${escapeHtml(t.id)}">🗑 حذف تیکت</button>
                            <button class="btn btn--primary admin-ticket-reply__send" data-send-reply="${escapeHtml(t.id)}">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                                ارسال پاسخ
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        wrap.querySelectorAll('[data-delete-ticket]').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (!confirm('این تیکت و تمام پاسخ‌هایش حذف شود؟')) return;
                const list = readList(KEYS.TICKETS).filter((t) => t.id !== btn.dataset.deleteTicket);
                writeList(KEYS.TICKETS, list);
                if (window.LooxSync) window.LooxSync.notify(KEYS.TICKETS);
                renderTickets();
                renderDashboard();
                updateAdminBadges();
                showToast('تیکت حذف شد ✓');
            });
        });

        wrap.querySelectorAll('[data-ticket-status]').forEach((sel) => {
            sel.addEventListener('change', (e) => {
                const list = readList(KEYS.TICKETS);
                const idx = list.findIndex((t) => t.id === sel.dataset.ticketStatus);
                if (idx !== -1) {
                    list[idx].status = e.target.value;
                    list[idx].updatedAt = new Date().toISOString();
                    writeList(KEYS.TICKETS, list);
                    if (window.LooxSync) window.LooxSync.notify(KEYS.TICKETS);
                    showToast('وضعیت تیکت به‌روزرسانی شد ✓');
                    renderTickets();
                    renderDashboard();
                    updateAdminBadges();
                }
            });
        });

        wrap.querySelectorAll('[data-send-reply]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const ticketId = btn.dataset.sendReply;
                const textarea = wrap.querySelector(`[data-reply-input="${CSS.escape(ticketId)}"]`);
                const text = textarea?.value.trim();
                if (!text) { showToast('لطفاً متن پاسخ را بنویسید'); textarea?.focus(); return; }
                const list = readList(KEYS.TICKETS);
                const idx = list.findIndex((t) => t.id === ticketId);
                if (idx === -1) return;
                if (!Array.isArray(list[idx].replies)) list[idx].replies = [];
                list[idx].replies.push({ id: 'RP' + Date.now(), from: 'admin', text, date: new Date().toISOString() });
                list[idx].status = 'answered';
                list[idx].updatedAt = new Date().toISOString();
                writeList(KEYS.TICKETS, list);
                if (window.LooxSync) window.LooxSync.notify(KEYS.TICKETS);
                showToast('پاسخ با موفقیت ارسال شد ✓');
                renderTickets();
                renderDashboard();
                updateAdminBadges();
            });
        });
    }

    function initTicketFilters() {
        $('#ticketStatusFilter')?.addEventListener('change', (e) => {
            ticketStatusFilter = e.target.value;
            renderTickets();
        });
    }

    /* ------------------------------------------------------------
       15. MESSAGES
    ------------------------------------------------------------ */
    function renderMessages() {
        const list = readList(KEYS.MESSAGES);
        const wrap = $('#messagesList');
        const emptyEl = $('#messagesEmpty');
        if (!wrap) return;

        if (list.length === 0) {
            wrap.innerHTML = '';
            if (emptyEl) emptyEl.hidden = false;
            return;
        }
        if (emptyEl) emptyEl.hidden = true;

        wrap.innerHTML = list.map((m) => `
            <div class="admin-message">
                <div class="admin-message__head">
                    <div>
                        <strong>${escapeHtml(m.name || 'کاربر')}</strong>
                        <small>${escapeHtml(m.phone || '')}${m.email ? ' — ' + escapeHtml(m.email) : ''}</small>
                    </div>
                    <span class="admin-message__date">${formatDate(m.date)}</span>
                </div>
                <div class="admin-message__subject">موضوع: <strong>${escapeHtml(m.subject || '—')}</strong></div>
                <p class="admin-message__body">${escapeHtml(m.message || '')}</p>
                <div class="admin-message__actions">
                    <button class="admin-action-btn admin-action-btn--delete" data-delete-msg="${escapeHtml(m.id)}">حذف پیام</button>
                </div>
            </div>
        `).join('');

        wrap.querySelectorAll('[data-delete-msg]').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (!confirm('این پیام حذف شود؟')) return;
                const updated = readList(KEYS.MESSAGES).filter((m) => m.id !== btn.dataset.deleteMsg);
                writeList(KEYS.MESSAGES, updated);
                renderMessages();
                renderDashboard();
                updateAdminBadges();
                showToast('پیام حذف شد ✓');
            });
        });
    }

    /* ------------------------------------------------------------
       16. REVIEWS
    ------------------------------------------------------------ */
    let reviewRatingFilter = 'all';

    function renderReviews() {
        const reviews = readList(KEYS.REVIEWS);
        const wrap = $('#reviewsList');
        const emptyEl = $('#reviewsEmpty');
        if (!wrap) return;

        const filtered = reviews.filter((r) => {
            if (reviewRatingFilter === 'all') return true;
            return String(r.rating) === String(reviewRatingFilter);
        });

        // Sorting: newest first
        filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        if (filtered.length === 0) {
            wrap.innerHTML = '';
            if (emptyEl) emptyEl.hidden = false;
            return;
        }
        if (emptyEl) emptyEl.hidden = true;

        wrap.innerHTML = filtered.map((r) => {
            const replies = Array.isArray(r.replies) ? r.replies : [];
            const userName = r.userName || (r.userEmail ? r.userEmail.split('@')[0] : 'کاربر');
            const userInitial = userName.trim().charAt(0).toUpperCase();

            const firstMsg = `
                <div class="ticket-msg ticket-msg--user">
                    <div class="ticket-msg__avatar">${escapeHtml(userInitial)}</div>
                    <div class="ticket-msg__content">
                        <div class="ticket-msg__bubble"><p>${escapeHtml(r.text || '')}</p></div>
                        <div class="ticket-msg__meta">
                            <strong>${escapeHtml(userName)}</strong>
                            <span class="review-stars-inline">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</span>
                            <span>${formatDateTime(r.date)}</span>
                        </div>
                    </div>
                </div>
            `;

            const repliesHtml = replies.map((rep) => {
                const isAdmin = rep.from === 'admin';
                return `
                    <div class="ticket-msg ticket-msg--${isAdmin ? 'admin' : 'user'}">
                        <div class="ticket-msg__avatar">${isAdmin ? 'م' : escapeHtml(userInitial)}</div>
                        <div class="ticket-msg__content">
                            <div class="ticket-msg__bubble"><p>${escapeHtml(rep.text || '')}</p></div>
                            <div class="ticket-msg__meta">
                                <strong>${isAdmin ? '🛡️ پشتیبانی' : escapeHtml(userName)}</strong>
                                <span>${formatDateTime(rep.date)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="admin-review-card" data-review-id="${escapeHtml(r.id)}">
                    <div class="admin-review-card__head">
                        <div class="admin-review-card__title">
                            <h3>${escapeHtml(r.product || 'محصول')}</h3>
                            <div class="admin-review-card__sub">
                                <span>کاربر: <strong>${escapeHtml(userName)}</strong></span>
                                <span>•</span>
                                <span>${formatDateTime(r.date)}</span>
                            </div>
                        </div>
                        <div class="admin-review-card__rating">
                            <span class="admin-review-stars">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</span>
                            <span class="admin-badge admin-badge--processing">${toPersianDigits(r.rating || 0)} از ۵</span>
                        </div>
                    </div>

                    <div class="admin-review-thread">
                        ${firstMsg}
                        ${repliesHtml}
                    </div>

                    <div class="admin-review-reply">
                        <div class="admin-review-reply__head"><strong>✍️ پاسخ شما</strong></div>
                        <textarea data-review-reply-input="${escapeHtml(r.id)}" placeholder="پاسخ خود را بنویسید..." rows="2"></textarea>
                        <div class="admin-review-reply__actions">
                            <button class="admin-action-btn admin-action-btn--delete" data-delete-review="${escapeHtml(r.id)}">🗑 حذف نظر</button>
                            <button class="btn btn--primary admin-review-reply__send" data-send-review-reply="${escapeHtml(r.id)}">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                                ارسال پاسخ
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Delete review
        wrap.querySelectorAll('[data-delete-review]').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (!confirm('این نظر و پاسخ‌هایش حذف شود؟')) return;
                const list = readList(KEYS.REVIEWS).filter((r) => r.id !== btn.dataset.deleteReview);
                writeList(KEYS.REVIEWS, list);
                if (window.LooxSync) window.LooxSync.notify(KEYS.REVIEWS);
                renderReviews();
                renderDashboard();
                updateAdminBadges();
                showToast('نظر حذف شد ✓');
            });
        });

        // Send reply
        wrap.querySelectorAll('[data-send-review-reply]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const reviewId = btn.dataset.sendReviewReply;
                const textarea = wrap.querySelector(`[data-review-reply-input="${CSS.escape(reviewId)}"]`);
                const text = textarea?.value.trim();
                if (!text) { showToast('لطفاً متن پاسخ را بنویسید'); textarea?.focus(); return; }
                const list = readList(KEYS.REVIEWS);
                const idx = list.findIndex((r) => r.id === reviewId);
                if (idx === -1) return;
                if (!Array.isArray(list[idx].replies)) list[idx].replies = [];
                list[idx].replies.push({
                    id: 'RPR' + Date.now(),
                    from: 'admin',
                    text: text,
                    date: new Date().toISOString()
                });
                list[idx].updatedAt = new Date().toISOString();
                writeList(KEYS.REVIEWS, list);
                if (window.LooxSync) window.LooxSync.notify(KEYS.REVIEWS);
                showToast('پاسخ با موفقیت ارسال شد ✓');
                renderReviews();
                updateAdminBadges();
            });
        });
    }

    function initReviewFilters() {
        $('#reviewRatingFilter')?.addEventListener('change', (e) => {
            reviewRatingFilter = e.target.value;
            renderReviews();
        });
    }

    /* ------------------------------------------------------------
       17. DATE
    ------------------------------------------------------------ */
    function renderDate() {
        const el = $('#adminDate');
        if (!el) return;
        try {
            const now = new Date();
            el.textContent = now.toLocaleDateString('fa-IR', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch (e) { el.textContent = ''; }
    }

    /* ------------------------------------------------------------
       18. INIT
    ------------------------------------------------------------ */
    document.addEventListener('DOMContentLoaded', () => {
        if (!checkAuth()) return;

        seedProducts();
        initNav();
        initProductFilters();
        initProductModal();
        initOrderFilters();
        initOrderModal();
        initUserFilters();
        initUserModal();
        initTicketFilters();
        initReviewFilters();

        renderDate();
        renderDashboard();
        updateAdminBadges();

        // Update badges every 3 seconds
        setInterval(updateAdminBadges, 3000);

        // ============================================================
        // Real-time sync
        // ============================================================
        if (window.LooxSync) {
            window.LooxSync.on(KEYS.TICKETS, () => {
                renderDashboard();
                updateAdminBadges();
                const sec = document.querySelector('.admin-section[data-section="tickets"]');
                if (sec && sec.classList.contains('is-active')) {
                    renderTickets();
                } else {
                    showToast('📩 تیکت جدید دریافت شد');
                }
            });

            window.LooxSync.on(KEYS.ORDERS, () => {
                renderDashboard();
                updateAdminBadges();
                const sec = document.querySelector('.admin-section[data-section="orders"]');
                if (sec && sec.classList.contains('is-active')) renderOrders();
            });

            window.LooxSync.on(KEYS.USERS, () => {
                renderDashboard();
                updateAdminBadges();
                const sec = document.querySelector('.admin-section[data-section="users"]');
                if (sec && sec.classList.contains('is-active')) renderUsers();
            });

            window.LooxSync.on(KEYS.MESSAGES, () => {
                renderDashboard();
                updateAdminBadges();
                const sec = document.querySelector('.admin-section[data-section="messages"]');
                if (sec && sec.classList.contains('is-active')) renderMessages();
            });

            window.LooxSync.on(KEYS.REVIEWS, () => {
                updateAdminBadges();
                const sec = document.querySelector('.admin-section[data-section="reviews"]');
                if (sec && sec.classList.contains('is-active')) {
                    renderReviews();
                } else {
                    showToast('⭐ نظر جدید دریافت شد');
                }
            });

            window.LooxSync.on(KEYS.PRODUCTS, () => {
                updateAdminBadges();
                const sec = document.querySelector('.admin-section[data-section="products"]');
                if (sec && sec.classList.contains('is-active')) renderProducts();
            });
        }
    });

})();
