/* ============================================================
   LOOXSHOP — FAQ Page Script
   Description: Handles FAQ search and category filter.
============================================================ */

(function () {
    'use strict';

    let activeCat = 'all';
    let activeSearch = '';

    /* ------------------------------------------------------------
       FILTER LOGIC
    ------------------------------------------------------------ */
    function applyFilters() {
        const groups = document.querySelectorAll('.faq-group');
        const allItems = document.querySelectorAll('.faq-item');
        let visible = 0;

        // Search & category on items
        allItems.forEach((item) => {
            const question = item.querySelector('summary')?.textContent?.toLowerCase() || '';
            const answer = item.querySelector('.faq-answer')?.textContent?.toLowerCase() || '';
            const group = item.closest('.faq-group');
            const groupCat = group?.dataset.cat || '';

            const matchCat = activeCat === 'all' || groupCat === activeCat;
            const matchSearch = activeSearch === '' ||
                question.includes(activeSearch) ||
                answer.includes(activeSearch);

            const ok = matchCat && matchSearch;
            item.hidden = !ok;
            if (ok) visible += 1;
        });

        // Hide groups with no visible items
        groups.forEach((grp) => {
            const hasVisible = Array.from(grp.querySelectorAll('.faq-item'))
                .some((it) => !it.hidden);
            grp.hidden = !hasVisible;
        });

        // Empty state
        const empty = document.getElementById('faqEmpty');
        if (empty) empty.hidden = visible > 0;
    }

    /* ------------------------------------------------------------
       EVENTS
    ------------------------------------------------------------ */
    function initEvents() {

        // Category chips
        document.querySelectorAll('.faq-categories .chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.faq-categories .chip')
                    .forEach((c) => c.classList.remove('is-active'));
                chip.classList.add('is-active');
                activeCat = chip.dataset.cat || 'all';
                applyFilters();
            });
        });

        // Search
        const searchInput = document.getElementById('faqSearch');
        let debounce = null;

        searchInput?.addEventListener('input', (e) => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                activeSearch = e.target.value.trim().toLowerCase();
                applyFilters();
            }, 200);
        });

        // Open only one FAQ at a time (optional nicety)
        document.querySelectorAll('.faq-item').forEach((item) => {
            item.addEventListener('toggle', () => {
                if (item.open) {
                    document.querySelectorAll('.faq-item').forEach((other) => {
                        if (other !== item && other.open) other.open = false;
                    });
                }
            });
        });
    }

    /* ------------------------------------------------------------
       INIT
    ------------------------------------------------------------ */
    document.addEventListener('DOMContentLoaded', () => {
        initEvents();
        applyFilters();
    });

})();
