/* ==========================================================
   תכלית TTF · Dashboard application
   ========================================================== */

(function () {
    'use strict';

    /* ---------- Helpers ---------- */

    function parseNumeric(value) {
        if (value === null || value === undefined || value === '') return null;
        const cleaned = String(value).replace(/[%,+]/g, '').trim();
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

    function formatBigMetric(value) {
        if (!value) return '—';
        const num = parseNumeric(value);
        if (num === null) return value;
        const sign = num > 0 ? '+' : '';
        const cls = num > 0 ? 'return-pos' : (num < 0 ? 'return-neg' : 'return-zero');
        return `<span class="${cls}" style="padding: 2px 8px; border-radius: 3px;">${sign}${num.toFixed(2)}%</span>`;
    }

    function escapeHtml(s) {
        if (s === null || s === undefined) return '';
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /* ==========================================================
       VIEW 1: TTF Funds (Tachlit)
       ========================================================== */

    const ttfState = {
        funds: [],
        category: 'all',
        search: '',
        sortKey: null,
        sortDir: 'desc',
    };

    const ttfElements = {
        total: document.getElementById('ttf-total'),
        searchInput: document.getElementById('ttf-search'),
        categoryChips: document.getElementById('ttf-categories'),
        tbody: document.getElementById('ttf-tbody'),
        count: document.getElementById('ttf-count'),
        table: document.getElementById('ttf-table'),
    };

    async function loadTTF() {
        try {
            const r = await fetch('data/funds.json?_=' + Date.now());
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const payload = await r.json();
            ttfState.funds = payload.funds || [];
            ttfElements.total.textContent = `${payload.found || 0} / ${payload.total_funds || ttfState.funds.length}`;
            updateMastheadDate(payload.updated_at_display);
            renderTTFCategories();
            renderTTFTable();
        } catch (err) {
            console.error('TTF load failed:', err);
            ttfElements.tbody.innerHTML = `<tr><td colspan="14" class="loading">שגיאה בטעינת נתוני קרנות תכלית.<br><small>${err.message}</small></td></tr>`;
        }
    }

    function renderTTFCategories() {
        const counts = { all: ttfState.funds.length };
        for (const f of ttfState.funds) counts[f.category] = (counts[f.category] || 0) + 1;

        const order = [
            'all', 'מניות בארץ', 'חו"ל חשופי מטבע', 'חו"ל מנוטרלי מטבע',
            'משולבות', 'אג"ח ממשלתי', 'אג"ח קונצרני', 'אינדקס אג"ח חברות',
        ];

        ttfElements.categoryChips.innerHTML = order
            .filter(c => counts[c] !== undefined)
            .map(c => {
                const label = c === 'all' ? 'הכל' : c;
                const active = ttfState.category === c ? 'active' : '';
                return `<button class="chip ${active}" data-category="${escapeHtml(c)}">${escapeHtml(label)}<span class="chip__count">${counts[c]}</span></button>`;
            }).join('');

        ttfElements.categoryChips.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                ttfState.category = chip.dataset.category;
                renderTTFCategories();
                renderTTFTable();
            });
        });
    }

    function getTTFFiltered() {
        let funds = ttfState.funds;
        if (ttfState.category !== 'all') funds = funds.filter(f => f.category === ttfState.category);
        if (ttfState.search) {
            const q = ttfState.search.toLowerCase();
            funds = funds.filter(f => (f.name || '').toLowerCase().includes(q) || (f.fund_id || '').includes(q));
        }
        if (ttfState.sortKey) {
            funds = sortFunds(funds, ttfState.sortKey, ttfState.sortDir);
        }
        return funds;
    }

    function sortFunds(funds, key, dir) {
        const mult = dir === 'asc' ? 1 : -1;
        return [...funds].sort((a, b) => {
            const aN = parseNumeric(a[key]);
            const bN = parseNumeric(b[key]);
            if (aN !== null && bN !== null) return (aN - bN) * mult;
            if (aN === null && bN !== null) return 1;
            if (aN !== null && bN === null) return -1;
            return String(a[key] || '').localeCompare(String(b[key] || ''), 'he') * mult;
        });
    }

    function renderTTFTable() {
        const funds = getTTFFiltered();
        if (funds.length === 0) {
            ttfElements.tbody.innerHTML = `<tr><td colspan="14" class="loading">לא נמצאו קרנות התואמות את החיפוש</td></tr>`;
            ttfElements.count.textContent = '0 קרנות';
            return;
        }

        ttfElements.tbody.innerHTML = funds.map((f, i) => {
            const nf = f.status === 'not_found';
            return `
                <tr class="${nf ? 'not-found' : ''}" style="--row-index: ${i}">
                    <td class="col-name">${escapeHtml(f.name)}<span class="fund-category">${escapeHtml(f.category)}</span></td>
                    <td class="col-id">${escapeHtml(f.fund_id)}</td>
                    <td class="col-num">${nf ? '<span class="empty-cell">—</span>' : formatPrice(f.price)}</td>
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
                </tr>`;
        }).join('');

        ttfElements.count.textContent = `מציג ${funds.length} מתוך ${ttfState.funds.length} קרנות`;
        updateSortIndicators(ttfElements.table, ttfState);
    }

    /* ==========================================================
       VIEW 2: Global indices + 13F spotlight
       ========================================================== */

    const globalState = {
        indices: [],
        sortKey: null,
        sortDir: 'desc',
    };

    const globalElements = {
        spotlightMetrics: document.getElementById('spotlight-metrics'),
        comparisonSection: document.getElementById('comparison-section'),
        riskThead: document.getElementById('risk-thead'),
        riskTbody: document.getElementById('risk-tbody'),
        holdingsTbody: document.getElementById('holdings-tbody'),
        holdingsMeta: document.getElementById('holdings-meta'),
        globalTbody: document.getElementById('global-tbody'),
        globalTable: document.getElementById('global-table'),
    };

    async function loadGlobal() {
        const ts = Date.now();
        const [indxxRes, globalRes] = await Promise.all([
            fetch('data/indxx_13f.json?_=' + ts).catch(() => null),
            fetch('data/global_indices.json?_=' + ts).catch(() => null),
        ]);

        let spyData = null;

        // Global indices
        if (globalRes && globalRes.ok) {
            try {
                const payload = await globalRes.json();
                globalState.indices = payload.indices || [];
                spyData = globalState.indices.find(i => i.symbol === 'SPY') || null;
                renderGlobalTable();
            } catch (err) {
                console.error('Global parse failed:', err);
                globalElements.globalTbody.innerHTML = `<tr><td colspan="12" class="loading">שגיאה בפענוח מדדים גלובליים</td></tr>`;
            }
        } else {
            globalElements.globalTbody.innerHTML = `<tr><td colspan="12" class="loading">שגיאה בטעינת מדדים גלובליים</td></tr>`;
        }

        // Indxx 13F
        if (indxxRes && indxxRes.ok) {
            try {
                const payload = await indxxRes.json();
                renderSpotlight(payload, spyData);
            } catch (err) {
                console.error('Indxx parse failed:', err);
                renderSpotlightError(err.message);
            }
        } else {
            renderSpotlightError('לא הצלחנו לטעון נתוני 13F');
        }
    }

    function annToCum(pctStr, years) {
        const n = parseNumeric(pctStr);
        if (n === null) return pctStr || '—';
        const cum = ((1 + n / 100) ** years - 1) * 100;
        return (cum >= 0 ? '+' : '') + cum.toFixed(1) + '%';
    }

    function renderSpotlight(payload, spyData) {
        if (payload.status === 'error') {
            renderSpotlightError(payload.error || 'שגיאה לא ידועה');
            return;
        }

        const summary = payload.returns_summary || {};
        const cum3y = annToCum(summary['3y'], 3);

        // Metric cards — 3Y shown as cumulative
        const metrics = [
            { label: 'מתחילת שנה (YTD)', value: summary.ytd },
            { label: 'שנה אחרונה',        value: summary['1y'] },
            { label: '3 שנים (מצטבר)',    value: cum3y },
            { label: 'מאז הקמה',          value: summary.since_base },
        ];

        globalElements.spotlightMetrics.innerHTML = metrics.map(m => `
            <div class="metric-card">
                <div class="metric-card__label">${m.label}</div>
                <div class="metric-card__value">${formatBigMetric(m.value)}</div>
            </div>`).join('');

        // Comparison table: 13F vs S&P 500
        if (globalElements.comparisonSection) {
            const rows = [
                { label: 'Indxx 13F',   ytd: summary.ytd, y1: summary['1y'], y3: cum3y },
                spyData ? { label: 'S&P 500 (SPY)', ytd: spyData.ytd, y1: spyData.months_12, y3: spyData.years_3 } : null,
            ].filter(Boolean);

            globalElements.comparisonSection.innerHTML = `
                <h3 class="section-title" style="margin-top:1.5rem;">השוואה: Indxx 13F מול S&amp;P 500</h3>
                <div class="table-wrapper" style="margin-bottom:1.5rem;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th class="col-name">מדד</th>
                                <th class="col-num">מתחילת שנה</th>
                                <th class="col-num">שנה אחרונה</th>
                                <th class="col-num">3 שנים (מצטבר)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map(r => `
                                <tr>
                                    <td class="col-name">${escapeHtml(r.label)}</td>
                                    <td class="col-num">${formatReturn(r.ytd)}</td>
                                    <td class="col-num">${formatReturn(r.y1)}</td>
                                    <td class="col-num">${formatReturn(r.y3)}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`;
        }

        // Risk & Return table
        const rt = payload.returns_table;
        if (rt) {
            globalElements.riskThead.innerHTML = rt.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('');
            globalElements.riskTbody.innerHTML = rt.rows.map(row => `
                <tr>
                    <td>${escapeHtml(row.label)}</td>
                    ${row.values.map(v => {
                        if (v && v.includes && v.includes('%')) {
                            return `<td class="col-num">${formatReturn(v)}</td>`;
                        }
                        return `<td class="col-num">${escapeHtml(v)}</td>`;
                    }).join('')}
                </tr>`).join('');
        }

        // Holdings
        const holdings = payload.holdings || [];
        globalElements.holdingsMeta.textContent = `${holdings.length} מניות`;
        globalElements.holdingsTbody.innerHTML = holdings.map((h, i) => `
            <tr>
                <td class="rank-cell">${i + 1}</td>
                <td class="col-name">${escapeHtml(h.name)}</td>
                <td class="weight-cell">${escapeHtml(h.weight)}</td>
            </tr>`).join('');
    }

    function renderSpotlightError(msg) {
        globalElements.spotlightMetrics.innerHTML = `<div class="loading" style="grid-column: 1 / -1;">לא ניתן לטעון נתוני 13F. ${escapeHtml(msg)}</div>`;
        if (globalElements.comparisonSection) globalElements.comparisonSection.innerHTML = '';
        globalElements.riskTbody.innerHTML = '';
        globalElements.holdingsTbody.innerHTML = '';
    }

    function renderGlobalTable() {
        let indices = globalState.indices;

        if (globalState.sortKey) {
            const key = globalState.sortKey;
            const mult = globalState.sortDir === 'asc' ? 1 : -1;
            indices = [...indices].sort((a, b) => {
                const aN = parseNumeric(a[key]);
                const bN = parseNumeric(b[key]);
                if (aN !== null && bN !== null) return (aN - bN) * mult;
                if (aN === null && bN !== null) return 1;
                if (aN !== null && bN === null) return -1;
                return String(a[key] || '').localeCompare(String(b[key] || ''), 'he') * mult;
            });
        }

        if (indices.length === 0) {
            globalElements.globalTbody.innerHTML = `<tr><td colspan="12" class="loading">אין נתונים</td></tr>`;
            return;
        }

        globalElements.globalTbody.innerHTML = indices.map((idx, i) => {
            const nf = idx.status === 'not_found';
            return `
                <tr class="${nf ? 'not-found' : ''}" style="--row-index: ${i}">
                    <td class="col-name">${escapeHtml(idx.name_he)}<span class="fund-category">${escapeHtml(idx.name)}</span></td>
                    <td class="col-symbol">${escapeHtml(idx.symbol)}</td>
                    <td>${escapeHtml(idx.type)}</td>
                    <td class="col-num">${nf ? '<span class="empty-cell">—</span>' : formatPrice(idx.price)}</td>
                    <td class="col-num">${formatReturn(idx.daily)}</td>
                    <td class="col-num">${formatReturn(idx.weekly)}</td>
                    <td class="col-num">${formatReturn(idx.month_to_date)}</td>
                    <td class="col-num">${formatReturn(idx.months_3)}</td>
                    <td class="col-num">${formatReturn(idx.ytd)}</td>
                    <td class="col-num">${formatReturn(idx.months_12)}</td>
                    <td class="col-num">${formatReturn(idx.years_3)}</td>
                    <td class="col-num">${formatReturn(idx.years_5)}</td>
                </tr>`;
        }).join('');

        updateSortIndicators(globalElements.globalTable, globalState);
    }

    /* ==========================================================
       Tabs + masthead
       ========================================================== */

    function updateMastheadDate(value) {
        const el = document.getElementById('updated-at');
        if (value && (!el.textContent || el.textContent === '—')) el.textContent = value;
    }

    function setupTabs() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const view = tab.dataset.view;
                document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
                document.querySelectorAll('.view').forEach(v => {
                    v.classList.toggle('active', v.id === `view-${view}`);
                });

                // Lazy-load global view
                if (view === 'global' && globalState.indices.length === 0) {
                    loadGlobal();
                }
            });
        });
    }

    function updateSortIndicators(table, state) {
        table.querySelectorAll('th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === state.sortKey) {
                th.classList.add(state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });
    }

    function setupSortHandlers(table, state, renderFn) {
        table.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.sort;
                if (state.sortKey === key) {
                    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    state.sortKey = key;
                    state.sortDir = 'desc';
                }
                renderFn();
            });
        });
    }

    /* ==========================================================
       Init
       ========================================================== */

    document.addEventListener('DOMContentLoaded', () => {
        // Tabs
        setupTabs();

        // TTF
        ttfElements.searchInput.addEventListener('input', (e) => {
            ttfState.search = e.target.value.trim();
            renderTTFTable();
        });
        setupSortHandlers(ttfElements.table, ttfState, renderTTFTable);

        // Global
        setupSortHandlers(globalElements.globalTable, globalState, renderGlobalTable);

        // Initial loads
        loadTTF();
        // Global view loads lazily on first tab click
    });
})();
