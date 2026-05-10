/* ==========================================================
   תכלית TTF · Dashboard application
   ========================================================== */

(function () {
    'use strict';

    const DATA_URL = '../data/funds.json';

    const state = {
        funds: [],
        category: 'all',
        search: '',
        sortKey: null,
        sortDir: 'desc',
    };

    const elements = {
        updatedAt: document.getElementById('updated-at'),
        totalFunds: document.getElementById('total-funds'),
        searchInput: document.getElementById('search-input'),
        categoryChips: document.getElementById('category-chips'),
        tbody: document.getElementById('funds-tbody'),
        resultsCount: document.getElementById('results-count'),
        table: document.getElementById('funds-table'),
    };

    /* ---------- Number parsing & formatting ---------- */

    function parseNumeric(value) {
        if (value === null || value === undefined || value === '') return null;
        const cleaned = String(value).replace(/[%,]/g, '').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    }

    function formatReturn(value) {
        if (value === null || value === undefined || value === '') {
            return '<span class="empty-cell">—</span>';
        }
        const num = parseNumeric(value);
        if (num === null) return value;

        let cls = 'return-zero';
        if (num > 0.001) cls = 'return-pos';
        else if (num < -0.001) cls = 'return-neg';

        const sign = num > 0 ? '+' : '';
        // bdi forces LTR display so "-0.06%" doesn't render as "%-0.06"
        return `<span class="${cls}"><bdi>${sign}${num.toFixed(2)}%</bdi></span>`;
    }

    function formatPrice(value) {
        if (!value) return '<span class="empty-cell">—</span>';
        const num = parseNumeric(value);
        if (num === null) return value;
        return num.toLocaleString('he-IL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    /* ---------- Data loading ---------- */

    async function loadData() {
        try {
            const response = await fetch(DATA_URL + '?_=' + Date.now());
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const payload = await response.json();

            state.funds = payload.funds || [];
            elements.updatedAt.textContent = payload.updated_at_display || '—';
            elements.totalFunds.textContent = `${payload.found || 0} / ${payload.total_funds || state.funds.length}`;

            renderCategoryChips();
            renderTable();
        } catch (err) {
            console.error('Failed to load data:', err);
            elements.tbody.innerHTML = `
                <tr>
                    <td colspan="14" class="loading">
                        שגיאה בטעינת הנתונים. נסה לרענן את הדף.
                        <br><small style="color:#999;">${err.message}</small>
                    </td>
                </tr>`;
        }
    }

    /* ---------- Category chips ---------- */

    function renderCategoryChips() {
        const counts = { all: state.funds.length };
        for (const f of state.funds) {
            counts[f.category] = (counts[f.category] || 0) + 1;
        }

        const order = [
            'all',
            'מניות בארץ',
            'חו"ל חשופי מטבע',
            'חו"ל מנוטרלי מטבע',
            'משולבות',
            'אג"ח ממשלתי',
            'אג"ח קונצרני',
            'אינדקס אג"ח חברות',
        ];

        const chips = order
            .filter(cat => counts[cat] !== undefined)
            .map(cat => {
                const label = cat === 'all' ? 'הכל' : cat;
                const isActive = state.category === cat;
                return `<button class="chip ${isActive ? 'active' : ''}" data-category="${escapeHtml(cat)}">
                    ${escapeHtml(label)}
                    <span class="chip__count">${counts[cat]}</span>
                </button>`;
            })
            .join('');

        elements.categoryChips.innerHTML = chips;
        elements.categoryChips.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                state.category = chip.dataset.category;
                renderCategoryChips();
                renderTable();
            });
        });
    }

    /* ---------- Filtering & sorting ---------- */

    function getFilteredFunds() {
        let funds = state.funds;

        if (state.category !== 'all') {
            funds = funds.filter(f => f.category === state.category);
        }

        if (state.search) {
            const q = state.search.toLowerCase();
            funds = funds.filter(f =>
                (f.name || '').toLowerCase().includes(q) ||
                (f.fund_id || '').includes(q)
            );
        }

        if (state.sortKey) {
            const key = state.sortKey;
            const dir = state.sortDir === 'asc' ? 1 : -1;
            funds = [...funds].sort((a, b) => {
                const aRaw = a[key];
                const bRaw = b[key];
                const aNum = parseNumeric(aRaw);
                const bNum = parseNumeric(bRaw);

                // Numeric comparison if both are numeric
                if (aNum !== null && bNum !== null) {
                    return (aNum - bNum) * dir;
                }
                // Nulls go to the bottom regardless of direction
                if (aNum === null && bNum !== null) return 1;
                if (aNum !== null && bNum === null) return -1;
                // String comparison
                const aStr = String(aRaw || '');
                const bStr = String(bRaw || '');
                return aStr.localeCompare(bStr, 'he') * dir;
            });
        }

        return funds;
    }

    /* ---------- Table rendering ---------- */

    function renderTable() {
        const funds = getFilteredFunds();

        if (funds.length === 0) {
            elements.tbody.innerHTML = `
                <tr><td colspan="14" class="loading">לא נמצאו קרנות התואמות את החיפוש</td></tr>`;
            elements.resultsCount.textContent = '0 קרנות';
            return;
        }

        const rows = funds.map((f, i) => {
            const isNotFound = f.status === 'not_found';
            const trClass = isNotFound ? 'not-found' : '';

            return `
                <tr class="${trClass}" style="--row-index: ${i}">
                    <td class="col-name">
                        ${escapeHtml(f.name)}
                        <span class="fund-category">${escapeHtml(f.category)}</span>
                    </td>
                    <td class="col-id">${escapeHtml(f.fund_id)}</td>
                    <td class="col-num">${isNotFound ? '<span class="empty-cell">—</span>' : formatPrice(f.price)}</td>
                    <td class="col-num">${formatReturn(f.daily)}</td>
                    <td class="col-num">${formatReturn(f.weekly)}</td>
                    <td class="col-num">${formatReturn(f.month_to_date)}</td>
                    <td class="col-num">${formatReturn(f.months_3)}</td>
                    <td class="col-num">${formatReturn(f.ytd)}</td>
                    <td class="col-num">${formatReturn(f.months_12)}</td>
                    <td class="col-num">${formatReturn(f.years_3)}</td>
                    <td class="col-num">${formatReturn(f.years_5)}</td>
                    <td class="col-num">${formatReturn(f.y2025)}</td>
                    <td class="col-num">${formatReturn(f.y2024)}</td>
                    <td class="col-num">${formatReturn(f.y2023)}</td>
                </tr>
            `;
        }).join('');

        elements.tbody.innerHTML = rows;
        elements.resultsCount.textContent = `מציג ${funds.length} מתוך ${state.funds.length} קרנות`;

        updateSortIndicators();
    }

    function updateSortIndicators() {
        elements.table.querySelectorAll('th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === state.sortKey) {
                th.classList.add(state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });
    }

    /* ---------- Event handlers ---------- */

    function attachEventHandlers() {
        elements.searchInput.addEventListener('input', (e) => {
            state.search = e.target.value.trim();
            renderTable();
        });

        elements.table.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.sort;
                if (state.sortKey === key) {
                    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    state.sortKey = key;
                    state.sortDir = 'desc';
                }
                renderTable();
            });
        });
    }

    /* ---------- Helpers ---------- */

    function escapeHtml(s) {
        if (s === null || s === undefined) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* ---------- Init ---------- */

    document.addEventListener('DOMContentLoaded', () => {
        attachEventHandlers();
        loadData();
    });
})();
