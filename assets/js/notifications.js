/* ============================================================
   LOOXSHOP — Header Notifications (runs on ALL pages)
   Description: Shows the unread notifications badge next to
                the user name in the header of all pages
                (index, shop, product, ...)
============================================================ */

(function () {
    'use strict';

    const USER_KEY = 'looxshop_user';
    const ORDERS_KEY = 'looxshop_orders';
    const CART_KEY = 'looxshop_cart';
    const WISHLIST_KEY = 'looxshop_wishlist';
    const TICKETS_KEY = 'looxshop_tickets';
    const SEEN_STATE_KEY = 'looxshop_seen_state';

    function getCurrentUser() {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function readList(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function toPersianDigits(v) {
        const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return String(v).replace(/\d/g, (d) => digits[d]);
    }

    function getSeenState() {
        try {
            const raw = localStorage.getItem(SEEN_STATE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function getUnreadCounts(user) {
        if (!user) return { total: 0 };

        const state = getSeenState();
        const userSeen = state[user.id] || {};
        const myEmail = String(user.email || '').toLowerCase().trim();
        const myId = String(user.id || '').trim();

        // ===== Tickets =====
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

        // ===== Orders =====
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

        // ===== Cart =====
        const cart = readList(CART_KEY);
        const lastSeenCartCount = userSeen.cartCount || 0;
        const unreadCart = Math.max(0, cart.length - lastSeenCartCount);

        // ===== Wishlist =====
        const wishlist = readList(WISHLIST_KEY);
        const lastSeenWishCount = userSeen.wishlistCount || 0;
        const unreadWishlist = Math.max(0, wishlist.length - lastSeenWishCount);

        return {
            total: unreadTickets + unreadOrders + unreadCart + unreadWishlist
        };
    }

    function updateHeaderBadge() {
        const user = getCurrentUser();

        // Find the account button (in the header)
        const accountBtn = document.querySelector('.account-btn');
        if (!accountBtn) return;

        // If the user is not logged in, remove the badge
        if (!user) {
            const existing = accountBtn.querySelector('.header-notif-badge');
            if (existing) existing.remove();
            return;
        }

        const counts = getUnreadCounts(user);
        let badge = accountBtn.querySelector('.header-notif-badge');

        if (counts.total <= 0) {
            if (badge) badge.remove();
            return;
        }

        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'header-notif-badge';
            accountBtn.appendChild(badge);
        }

        badge.textContent = toPersianDigits(counts.total);
    }

    /* ------------------------------------------------------------
       INIT
    ------------------------------------------------------------ */
    function init() {
        // Run with a small delay — so app.js/auth.js finish loading first
        setTimeout(updateHeaderBadge, 100);

        // Periodic update (every 2 seconds)
        setInterval(updateHeaderBadge, 2000);

        // If sync is available, update immediately
        window.addEventListener('looxshop:change', updateHeaderBadge);
        window.addEventListener('storage', updateHeaderBadge);

        // When the page becomes active again (tab switched)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) updateHeaderBadge();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
