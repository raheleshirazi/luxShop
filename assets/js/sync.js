/* ============================================================
   LOOXSHOP — Sync Utility
   Description: Real-time synchronization between tabs and different pages
============================================================ */

(function () {
    'use strict';

    const CHANNEL_NAME = 'looxshop_sync';
    const POLL_INTERVAL = 1500; // every 1.5 seconds

    let channel = null;
    const listeners = {};
    const snapshots = {};

    try {
        if (typeof BroadcastChannel !== 'undefined') {
            channel = new BroadcastChannel(CHANNEL_NAME);
        }
    } catch (e) {
        channel = null;
    }

    function notify(key) {
        if (channel) {
            try {
                channel.postMessage({ key, time: Date.now() });
            } catch (e) { /* ignore */ }
        }

        try {
            window.dispatchEvent(new CustomEvent('looxshop:change', {
                detail: { key, time: Date.now() }
            }));
        } catch (e) { /* ignore */ }
    }

    function on(key, handler) {
        if (!listeners[key]) listeners[key] = [];
        listeners[key].push(handler);
        // Initial snapshot
        snapshots[key] = localStorage.getItem(key) || '';
    }

    function fire(key) {
        const arr = listeners[key];
        if (arr) {
            arr.forEach((fn) => {
                try { fn(); } catch (e) { console.error('Sync handler error:', e); }
            });
        }
    }

    function initListeners() {
        // storage event
        window.addEventListener('storage', (e) => {
            if (e.key && listeners[e.key]) {
                fire(e.key);
            }
        });

        // BroadcastChannel
        if (channel) {
            channel.addEventListener('message', (e) => {
                const key = e.data && e.data.key;
                if (key && listeners[key]) {
                    fire(key);
                }
            });
        }

        // CustomEvent
        window.addEventListener('looxshop:change', (e) => {
            const key = e.detail && e.detail.key;
            if (key && listeners[key]) {
                fire(key);
            }
        });
    }

    function initPolling() {
        setInterval(() => {
            Object.keys(listeners).forEach((key) => {
                const current = localStorage.getItem(key) || '';
                if (current !== snapshots[key]) {
                    snapshots[key] = current;
                    fire(key);
                }
            });
        }, POLL_INTERVAL);
    }

    document.addEventListener('DOMContentLoaded', () => {
        initListeners();
        initPolling();
    });

    window.LooxSync = {
        notify,
        on,
        debug() {
            console.log('Listeners:', listeners);
            console.log('Snapshots:', snapshots);
        }
    };

})();
