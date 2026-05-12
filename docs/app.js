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
                { label: 'סופר משקיעים 13F', id: 'מס׳ קרן 5141833', ytd: summary.ytd, y1: summary['1y'], y3: cum3y },
                spyData ? { label: 'S&P 500', id: '', ytd: spyData.ytd, y1: spyData.months_12, y3: spyData.years_3 } : null,
            ].filter(Boolean);

            const fields = ['ytd', 'y1', 'y3'];
            const winners = fields.map(f => {
                const vals = rows.map(r => parseNumeric(r[f]) ?? -Infinity);
                const max = Math.max(...vals);
                return rows.map((_, i) => isFinite(max) && vals[i] === max);
            });

            const investorSvg = `<svg viewBox="0 0 300 108" xmlns="http://www.w3.org/2000/svg" fill="none" class="cmp-heroes-svg" aria-hidden="true">
  <polyline points="0,95 25,82 55,86 85,68 115,72 145,52 175,56 205,38 235,42 265,24 295,28 300,26" stroke="#4A1432" stroke-width="1" stroke-opacity="0.09"/>
  <!-- Warren Buffett -->
  <path d="M48,108 L44,80 Q46,71 55,67 L64,64 L68,61 L75,69 L82,61 L86,64 Q95,67 106,71 L102,108" stroke="#1A1612" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M71,61 L75,69" stroke="#1A1612" stroke-width="0.9"/>
  <line x1="75" y1="69" x2="75" y2="79" stroke="#1A1612" stroke-width="0.8"/>
  <ellipse cx="75" cy="41" rx="21" ry="22" stroke="#1A1612" stroke-width="1.4"/>
  <path d="M56,34 Q60,24 75,22 Q90,24 94,34" stroke="#1A1612" stroke-width="0.9" fill="#1A1612" fill-opacity="0.06"/>
  <circle cx="67" cy="42" r="7.5" stroke="#1A1612" stroke-width="1.1"/>
  <circle cx="83" cy="42" r="7.5" stroke="#1A1612" stroke-width="1.1"/>
  <line x1="74.5" y1="42" x2="75.5" y2="42" stroke="#1A1612" stroke-width="1.1"/>
  <line x1="59.5" y1="42" x2="55" y2="40" stroke="#1A1612" stroke-width="1"/>
  <line x1="90.5" y1="42" x2="95" y2="40" stroke="#1A1612" stroke-width="1"/>
  <path d="M75,45 L73,51 L77,51" stroke="#1A1612" stroke-width="0.9"/>
  <path d="M67,56 Q75,62 83,56" stroke="#1A1612" stroke-width="1.2"/>
  <path d="M54,40 Q51,43 52,47 Q53,50 55,48" stroke="#1A1612" stroke-width="0.9"/>
  <path d="M96,40 Q99,43 98,47 Q97,50 95,48" stroke="#1A1612" stroke-width="0.9"/>
  <text x="75" y="106" text-anchor="middle" font-family="Georgia,serif" font-size="7" fill="#4A1432" letter-spacing="0.5" opacity="0.65">Warren Buffett</text>
  <!-- Divider -->
  <line x1="150" y1="14" x2="150" y2="96" stroke="#4A1432" stroke-width="0.5" stroke-opacity="0.13" stroke-dasharray="3,4"/>
  <text x="150" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="10" fill="#4A1432" opacity="0.07" font-weight="bold">13F</text>
  <!-- Charlie Munger -->
  <path d="M198,108 L194,80 Q196,71 205,67 L214,64 L218,61 L225,69 L232,61 L236,64 Q245,67 256,71 L252,108" stroke="#1A1612" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M221,61 L225,69" stroke="#1A1612" stroke-width="0.9"/>
  <line x1="225" y1="69" x2="225" y2="79" stroke="#1A1612" stroke-width="0.8"/>
  <ellipse cx="225" cy="41" rx="21" ry="22" stroke="#1A1612" stroke-width="1.4"/>
  <path d="M205,33 Q208,21 225,19 Q242,21 245,33" stroke="#1A1612" stroke-width="0.9" fill="#1A1612" fill-opacity="0.1"/>
  <path d="M213,36 Q220,32 226,35" stroke="#1A1612" stroke-width="2" stroke-linecap="round"/>
  <path d="M224,35 Q230,32 237,36" stroke="#1A1612" stroke-width="2" stroke-linecap="round"/>
  <ellipse cx="218" cy="43" rx="5.5" ry="5" stroke="#1A1612" stroke-width="1.1"/>
  <ellipse cx="232" cy="43" rx="5.5" ry="5" stroke="#1A1612" stroke-width="1.1"/>
  <circle cx="218" cy="43" r="2.5" fill="#1A1612"/>
  <circle cx="232" cy="43" r="2.5" fill="#1A1612"/>
  <path d="M225,46 L223,52 L227,52" stroke="#1A1612" stroke-width="0.9"/>
  <path d="M218,57 Q225,60 232,57" stroke="#1A1612" stroke-width="1.1"/>
  <path d="M204,40 Q201,43 202,47 Q203,50 205,48" stroke="#1A1612" stroke-width="0.9"/>
  <path d="M246,40 Q249,43 248,47 Q247,50 245,48" stroke="#1A1612" stroke-width="0.9"/>
  <text x="225" y="106" text-anchor="middle" font-family="Georgia,serif" font-size="7" fill="#4A1432" letter-spacing="0.5" opacity="0.65">Charlie Munger</text>
  <text x="132" y="32" font-family="Georgia,serif" font-size="13" fill="#B8860B" opacity="0.18">$</text>
  <text x="162" y="78" font-family="Georgia,serif" font-size="10" fill="#B8860B" opacity="0.13">$</text>
</svg>`;

            globalElements.comparisonSection.innerHTML = `
                <div class="cmp-wrap">
                    ${investorSvg}
                    <p class="cmp-title">השוואת ביצועים</p>
                    <table class="cmp-table">
                        <thead>
                            <tr>
                                <th>מדד / קרן</th>
                                <th>מתחילת שנה</th>
                                <th>שנה אחרונה</th>
                                <th>3 שנים מצטבר</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map((r, ri) => `
                                <tr>
                                    <td>
                                        <span class="cmp-name">${escapeHtml(r.label)}</span>
                                        ${r.id ? `<span class="cmp-id">${escapeHtml(r.id)}</span>` : ''}
                                    </td>
                                    ${fields.map((f, fi) =>
                                        `<td${winners[fi][ri] ? ' class="cmp-best"' : ''}>${formatReturn(r[f])}</td>`
                                    ).join('')}
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`;
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
