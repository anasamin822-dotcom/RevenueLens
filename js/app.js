/**
 * SecureRegent — Application State & Unified Controller
 * Aesthetic: Bento Grid Minimalism with Aceternity-inspired micro-interactions
 */

(function (global) {
  'use strict';

  // --- Ensure Data Layer Ready ---
  const dataLayer = global.SecureRegentData;
  if (!dataLayer) {
    console.error('Fatal: SecureRegentData layer missing.');
    return;
  }

  const {
    TODAY,
    LEADS,
    QUOTATIONS,
    DEALS,
    ORDERS,
    PAYMENTS,
    getLeadsInRange,
    getQuotationsInRange,
    getDealsInRange,
    getOrdersInRange,
    getPaymentsInRange,
    getPreviousEquivalentPeriod,
    formatCurrencyINR,
    formatDate
  } = dataLayer;

  // --- Global Application State ---
  const DashboardState = {
    currentPreset: '30d',
    currentView: 'overview',
    from: null,
    to: null,
    priorFrom: null,
    priorTo: null,
    listeners: [],

    subscribe(fn) {
      if (typeof fn === 'function') {
        this.listeners.push(fn);
      }
    },

    notify() {
      this.listeners.forEach(fn => fn(this));
    }
  };

  global.DashboardState = DashboardState;

  // --- Date Math Helpers ---
  function computePeriodDates(preset, customFromStr, customToStr) {
    const to = new Date(TODAY.getTime());
    to.setHours(23, 59, 59, 999);
    let from = new Date(TODAY.getTime());

    if (preset === 'today') {
      from.setHours(0, 0, 0, 0);
    } else if (preset === '7d') {
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
    } else if (preset === '30d') {
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
    } else if (preset === 'custom' && customFromStr && customToStr) {
      from = new Date(customFromStr);
      from.setHours(0, 0, 0, 0);
      const customTo = new Date(customToStr);
      customTo.setHours(23, 59, 59, 999);
      const prior = getPreviousEquivalentPeriod(from, customTo);
      return { from, to: customTo, priorFrom: prior.from, priorTo: prior.to };
    }

    const prior = getPreviousEquivalentPeriod(from, to);
    return { from, to, priorFrom: prior.from, priorTo: prior.to };
  }

  // Percentage Delta Calculator
  function calcPercentDelta(current, prior) {
    if (prior === 0) {
      if (current === 0) return { delta: 0, str: '0.0%', dir: 'neutral' };
      return { delta: 100, str: '+100%', dir: 'positive' };
    }
    const pct = ((current - prior) / prior) * 100;
    const sign = pct > 0 ? '+' : '';
    const dir = pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'neutral';
    return {
      delta: pct,
      str: `${sign}${pct.toFixed(1)}%`,
      dir: dir
    };
  }

  // Helper to update chip
  function updateChip(chipId, deltaObj, customText = null) {
    const chip = document.getElementById(chipId);
    if (!chip) return;
    chip.className = `delta-chip ${deltaObj.dir}`;
    const arrow = chip.querySelector('.delta-arrow');
    const text = chip.querySelector('.delta-text');
    if (arrow) arrow.textContent = deltaObj.dir === 'positive' ? '↑' : deltaObj.dir === 'negative' ? '↓' : '—';
    if (text) text.textContent = customText || deltaObj.str;
  }

  // --- Count-Up Animation (Cubic Ease-Out) ---
  function animateCountUp(element, targetVal, isPercent = false, isCurrency = false, duration = 600) {
    if (!element) return;
    const startVal = parseFloat(element.getAttribute('data-val') || '0');
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (targetVal - startVal) * ease;

      if (isCurrency) {
        element.textContent = formatCurrencyINR(Math.round(current));
      } else if (isPercent) {
        element.textContent = `${current.toFixed(1)}%`;
      } else {
        element.textContent = Math.round(current).toLocaleString('en-IN');
      }

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        element.setAttribute('data-val', targetVal.toString());
      }
    }

    requestAnimationFrame(frame);
  }

  // --- Aceternity UI: Card Spotlight Hover Listener ---
  function initSpotlightCards() {
    const cards = document.querySelectorAll('[data-spotlight]');
    cards.forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--mouse-x', `-999px`);
        card.style.setProperty('--mouse-y', `-999px`);
      });
    });
  }

  // --- Navigation & View Tab Switcher ---
  function initNavigation() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const closeBtn = document.getElementById('sidebar-close-btn');
    const heading = document.getElementById('page-heading');

    function openNav() {
      sidebar.classList.add('mobile-open');
      backdrop.classList.add('mobile-open');
    }

    function closeNav() {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('mobile-open');
    }

    if (toggleBtn) toggleBtn.addEventListener('click', openNav);
    if (closeBtn) closeBtn.addEventListener('click', closeNav);
    if (backdrop) backdrop.addEventListener('click', closeNav);

    const navButtons = document.querySelectorAll('.sidebar-nav .nav-item');
    const views = {
      'overview': { el: document.getElementById('view-overview'), title: 'Lead Acquisition & Performance Overview' },
      'quotations-deals': { el: document.getElementById('view-quotations-deals'), title: 'Quotations, Deals & Revenue Realization' },
      'orders-revenue': { el: document.getElementById('view-orders-revenue'), title: 'Orders Fulfillment & Payment Collections' }
    };

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (!views[tab]) return;

        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        Object.keys(views).forEach(k => {
          if (views[k].el) views[k].el.classList.remove('active');
        });

        if (views[tab].el) {
          views[tab].el.classList.add('active');
          if (heading) heading.textContent = views[tab].title;
        }

        DashboardState.currentView = tab;
        closeNav();
        // Re-attach spotlight on newly displayed cards
        initSpotlightCards();
      });
    });
  }

  // --- SECTION 1: Lead KPI Controller ---
  function renderLeadKPIs(state) {
    const kpiGrid = document.getElementById('lead-kpi-grid');
    if (!kpiGrid) return;

    kpiGrid.classList.add('is-loading');

    setTimeout(() => {
      const currLeads = getLeadsInRange(state.from, state.to);
      const priorLeads = getLeadsInRange(state.priorFrom, state.priorTo);

      const currTotal = currLeads.length;
      const currQualified = currLeads.filter(l => l.status === 'Qualified').length;
      const currConverted = currLeads.filter(l => l.status === 'Converted').length;
      const currUnqualified = currLeads.filter(l => l.status === 'Unqualified').length;
      const currConvRate = currTotal > 0 ? (currConverted / currTotal) * 100 : 0;

      const priorTotal = priorLeads.length;
      const priorQualified = priorLeads.filter(l => l.status === 'Qualified').length;
      const priorConverted = priorLeads.filter(l => l.status === 'Converted').length;
      const priorUnqualified = priorLeads.filter(l => l.status === 'Unqualified').length;
      const priorConvRate = priorTotal > 0 ? (priorConverted / priorTotal) * 100 : 0;

      const deltaTotal = calcPercentDelta(currTotal, priorTotal);
      const deltaQualified = calcPercentDelta(currQualified, priorQualified);
      const deltaConverted = calcPercentDelta(currConverted, priorConverted);
      const deltaUnqualified = calcPercentDelta(currUnqualified, priorUnqualified);

      const convRatePtChange = currConvRate - priorConvRate;
      const convRateSign = convRatePtChange > 0 ? '+' : '';
      const convRateDir = convRatePtChange > 0 ? 'positive' : convRatePtChange < 0 ? 'negative' : 'neutral';

      animateCountUp(document.getElementById('val-total-leads'), currTotal, false);
      animateCountUp(document.getElementById('val-qualified-leads'), currQualified, false);
      animateCountUp(document.getElementById('val-converted-leads'), currConverted, false);
      animateCountUp(document.getElementById('val-unqualified-leads'), currUnqualified, false);
      animateCountUp(document.getElementById('val-conversion-rate'), currConvRate, true);

      updateChip('chip-total-leads', deltaTotal);
      updateChip('chip-qualified-leads', deltaQualified);
      updateChip('chip-converted-leads', deltaConverted);
      updateChip('chip-unqualified-leads', deltaUnqualified);
      updateChip('chip-conversion-rate', { dir: convRateDir }, `${convRateSign}${convRatePtChange.toFixed(1)}% pts`);

      const label = document.getElementById('period-comparison-label');
      if (label) {
        label.textContent = `Comparing ${formatDate(state.from)} – ${formatDate(state.to)} vs prior (${formatDate(state.priorFrom)} – ${formatDate(state.priorTo)})`;
      }

      kpiGrid.classList.remove('is-loading');
    }, 200);
  }

  // --- SECTION 2: Quotations & Deals KPIs Controller ---
  function renderQuotationsAndDealsKPIs(state) {
    const qGrid = document.getElementById('quotes-kpi-grid');
    const dGrid = document.getElementById('deals-kpi-grid');
    if (qGrid) qGrid.classList.add('is-loading');
    if (dGrid) dGrid.classList.add('is-loading');

    setTimeout(() => {
      // 1. Quotations Data
      const currQuotes = getQuotationsInRange(state.from, state.to);
      const priorQuotes = getQuotationsInRange(state.priorFrom, state.priorTo);

      const currQCount = currQuotes.length;
      const priorQCount = priorQuotes.length;
      const currQValue = currQuotes.reduce((acc, q) => acc + q.amount, 0);
      const priorQValue = priorQuotes.reduce((acc, q) => acc + q.amount, 0);
      const currQAccepted = currQuotes.filter(q => q.status === 'Accepted').length;
      const priorQAccepted = priorQuotes.filter(q => q.status === 'Accepted').length;
      const currQConvRate = currQCount > 0 ? (currQAccepted / currQCount) * 100 : 0;
      const priorQConvRate = priorQCount > 0 ? (priorQAccepted / priorQCount) * 100 : 0;

      animateCountUp(document.getElementById('val-total-quotes'), currQCount, false);
      animateCountUp(document.getElementById('val-total-quoted-value'), currQValue, false, true);
      animateCountUp(document.getElementById('val-accepted-quotes'), currQAccepted, false);
      animateCountUp(document.getElementById('val-quote-conv-rate'), currQConvRate, true);

      updateChip('chip-total-quotes', calcPercentDelta(currQCount, priorQCount));
      updateChip('chip-quoted-value', calcPercentDelta(currQValue, priorQValue));
      updateChip('chip-accepted-quotes', calcPercentDelta(currQAccepted, priorQAccepted));
      updateChip('chip-quote-conv-rate', calcPercentDelta(currQConvRate, priorQConvRate));

      // 2. Deals Data
      const currDeals = getDealsInRange(state.from, state.to);
      const priorDeals = getDealsInRange(state.priorFrom, state.priorTo);
      const currPayments = getPaymentsInRange(state.from, state.to);
      const priorPayments = getPaymentsInRange(state.priorFrom, state.priorTo);

      const currDCount = currDeals.length;
      const priorDCount = priorDeals.length;

      const wonDealsInRange = currDeals.filter(d => d.status === 'Won');
      const currWonRev = wonDealsInRange.reduce((acc, d) => acc + d.value, 0);
      const wonDealIds = new Set(wonDealsInRange.map(d => d.id));
      const currCollected = PAYMENTS.filter(p => wonDealIds.has(p.dealId) && p.status === 'Paid').reduce((acc, p) => acc + p.amount, 0);
      const currOutstanding = Math.max(0, currWonRev - currCollected);

      const priorWonDeals = priorDeals.filter(d => d.status === 'Won');
      const priorWonRev = priorWonDeals.reduce((acc, d) => acc + d.value, 0);
      const priorWonDealIds = new Set(priorWonDeals.map(d => d.id));
      const priorCollected = PAYMENTS.filter(p => priorWonDealIds.has(p.dealId) && p.status === 'Paid').reduce((acc, p) => acc + p.amount, 0);
      const priorOutstanding = Math.max(0, priorWonRev - priorCollected);

      animateCountUp(document.getElementById('val-total-deals'), currDCount, false);
      animateCountUp(document.getElementById('val-won-revenue'), currWonRev, false, true);
      animateCountUp(document.getElementById('val-collected-revenue'), currCollected, false, true);
      animateCountUp(document.getElementById('val-outstanding-revenue'), currOutstanding, false, true);

      updateChip('chip-total-deals', calcPercentDelta(currDCount, priorDCount));
      updateChip('chip-won-revenue', calcPercentDelta(currWonRev, priorWonRev));
      updateChip('chip-collected-revenue', calcPercentDelta(currCollected, priorCollected));
      updateChip('chip-outstanding-revenue', calcPercentDelta(currOutstanding, priorOutstanding));

      if (qGrid) qGrid.classList.remove('is-loading');
      if (dGrid) dGrid.classList.remove('is-loading');
    }, 200);
  }

  // --- SECTION 3: Orders & Payments KPIs Controller ---
  function renderOrdersAndPaymentsKPIs(state) {
    const oGrid = document.getElementById('orders-kpi-grid');
    if (oGrid) oGrid.classList.add('is-loading');

    setTimeout(() => {
      const currOrders = getOrdersInRange(state.from, state.to);
      const priorOrders = getOrdersInRange(state.priorFrom, state.priorTo);
      const currPayments = getPaymentsInRange(state.from, state.to);
      const priorPayments = getPaymentsInRange(state.priorFrom, state.priorTo);

      const currOCount = currOrders.length;
      const priorOCount = priorOrders.length;

      const currOCompleted = currOrders.filter(o => o.status === 'Completed').length;
      const priorOCompleted = priorOrders.filter(o => o.status === 'Completed').length;

      const currOCompRate = currOCount > 0 ? (currOCompleted / currOCount) * 100 : 0;
      const priorOCompRate = priorOCount > 0 ? (priorOCompleted / priorOCount) * 100 : 0;

      const currPaidSum = currPayments.filter(p => p.status === 'Paid').reduce((acc, p) => acc + p.amount, 0);
      const priorPaidSum = priorPayments.filter(p => p.status === 'Paid').reduce((acc, p) => acc + p.amount, 0);

      animateCountUp(document.getElementById('val-total-orders'), currOCount, false);
      animateCountUp(document.getElementById('val-completed-orders'), currOCompleted, false);
      animateCountUp(document.getElementById('val-order-completion-rate'), currOCompRate, true);
      animateCountUp(document.getElementById('val-order-payments-collected'), currPaidSum, false, true);

      updateChip('chip-total-orders', calcPercentDelta(currOCount, priorOCount));
      updateChip('chip-completed-orders', calcPercentDelta(currOCompleted, priorOCompleted));
      updateChip('chip-order-completion-rate', calcPercentDelta(currOCompRate, priorOCompRate));
      updateChip('chip-order-payments-collected', calcPercentDelta(currPaidSum, priorPaidSum));

      if (oGrid) oGrid.classList.remove('is-loading');
    }, 200);
  }

  // --- All Charts Synchronizer ---
  function renderAllCharts(state) {
    if (global.SecureRegentCharts) {
      const leads = getLeadsInRange(state.from, state.to);
      const quotes = getQuotationsInRange(state.from, state.to);
      const deals = getDealsInRange(state.from, state.to);
      const orders = getOrdersInRange(state.from, state.to);
      const payments = getPaymentsInRange(state.from, state.to);

      global.SecureRegentCharts.updateAllCharts({ leads, quotes, deals, orders, payments }, state.from, state.to);
    }
  }

  // --- SECTION 1: Leads Directory Table ---
  function filterAndDisplayLeads() {
    const tableBody = document.getElementById('leads-table-body');
    const countLabel = document.getElementById('table-leads-count-label');
    const paginationInfo = document.getElementById('table-pagination-info');
    const searchInput = document.getElementById('table-search-input');
    const statusSelect = document.getElementById('table-status-filter');
    const sourceSelect = document.getElementById('table-source-filter');

    if (!tableBody) return;

    const searchTerm = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const statusFilter = statusSelect ? statusSelect.value : 'ALL';
    const sourceFilter = sourceSelect ? sourceSelect.value : 'ALL';

    const leadsInRange = getLeadsInRange(DashboardState.from, DashboardState.to);

    const filtered = leadsInRange.filter(lead => {
      const matchesSearch = !searchTerm || 
        lead.name.toLowerCase().includes(searchTerm) || 
        lead.company.toLowerCase().includes(searchTerm);

      const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
      const matchesSource = sourceFilter === 'ALL' || lead.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });

    if (countLabel) {
      countLabel.textContent = `Showing ${filtered.length} leads in selected range`;
    }

    if (paginationInfo) {
      paginationInfo.textContent = `Displaying ${filtered.length} of ${leadsInRange.length} total leads`;
    }

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: #94a3b8;">No leads match filters.</td></tr>`;
      return;
    }

    tableBody.innerHTML = filtered.map(lead => `
      <tr data-lead-id="${lead.id}">
        <td>
          <div class="lead-name-cell">
            <span class="lead-primary-name">${lead.name}</span>
            <span class="lead-company-sub">${lead.id}</span>
          </div>
        </td>
        <td><strong>${lead.company}</strong></td>
        <td>${lead.source}</td>
        <td>${lead.serviceInterest}</td>
        <td><span class="status-badge badge-${lead.status.toLowerCase()}">${lead.status}</span></td>
        <td>${formatDate(lead.createdAt)}</td>
        <td style="text-align: right;">
          <button class="btn-row-action" data-lead-btn="${lead.id}">View Details →</button>
        </td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('tr[data-lead-id]').forEach(row => {
      row.addEventListener('click', () => {
        global.openLeadDrilldown(row.getAttribute('data-lead-id'));
      });
    });

    tableBody.querySelectorAll('[data-lead-btn]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        global.openLeadDrilldown(btn.getAttribute('data-lead-btn'));
      });
    });
  }

  // --- SECTION 2: Quotations Table ---
  function renderQuotationsTable(state) {
    const tableBody = document.getElementById('quotations-table-body');
    if (!tableBody) return;

    const quotes = getQuotationsInRange(state.from, state.to);

    if (quotes.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2.5rem; color: #94a3b8;">No quotations issued in this date range.</td></tr>`;
      return;
    }

    tableBody.innerHTML = quotes.map(q => {
      const lead = LEADS.find(l => l.id === q.leadId);
      const leadName = lead ? `${lead.name} (${lead.company})` : q.leadId;
      return `
        <tr data-lead-id="${q.leadId}">
          <td><strong style="color: #6366f1;">${q.id}</strong></td>
          <td>${leadName}</td>
          <td>${q.service}</td>
          <td>${q.category}</td>
          <td><strong>${formatCurrencyINR(q.amount)}</strong></td>
          <td><span class="status-badge badge-${q.status.toLowerCase()}">${q.status}</span></td>
          <td>${formatDate(q.createdAt)}</td>
          <td style="text-align: right;">
            <button class="btn-row-action" data-lead-btn="${q.leadId}">Lead Drilldown →</button>
          </td>
        </tr>
      `;
    }).join('');

    tableBody.querySelectorAll('tr[data-lead-id]').forEach(row => {
      row.addEventListener('click', () => {
        global.openLeadDrilldown(row.getAttribute('data-lead-id'));
      });
    });

    tableBody.querySelectorAll('[data-lead-btn]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        global.openLeadDrilldown(btn.getAttribute('data-lead-btn'));
      });
    });
  }

  // --- SECTION 2: Deals Progress Table ---
  function renderDealsTable(state) {
    const tableBody = document.getElementById('deals-table-body');
    if (!tableBody) return;

    const deals = getDealsInRange(state.from, state.to);

    if (deals.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2.5rem; color: #94a3b8;">No deals active in this period.</td></tr>`;
      return;
    }

    tableBody.innerHTML = deals.map(d => {
      const lead = LEADS.find(l => l.id === d.leadId);
      const leadCompany = lead ? lead.company : d.leadId;
      return `
        <tr data-lead-id="${d.leadId}">
          <td><strong style="color: #6366f1;">${d.id}</strong></td>
          <td>${leadCompany}</td>
          <td>${d.service}</td>
          <td><strong>${formatCurrencyINR(d.value)}</strong></td>
          <td><span class="priority-chip priority-${d.priority.toLowerCase()}">${d.priority}</span></td>
          <td><span class="status-badge badge-${d.status.toLowerCase().replace(' ', '-')}">${d.status}</span></td>
          <td style="min-width: 140px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="progress-bar-bg" style="flex: 1;">
                <div class="progress-bar-fill ${d.status === 'Won' ? '' : 'fill-indigo'}" style="width: ${d.progress}%;"></div>
              </div>
              <span style="font-size: 0.75rem; font-weight: 600; color: #475569;">${d.progress}%</span>
            </div>
          </td>
          <td style="text-align: right;">
            <button class="btn-row-action" data-lead-btn="${d.leadId}">Lead Drilldown →</button>
          </td>
        </tr>
      `;
    }).join('');

    tableBody.querySelectorAll('tr[data-lead-id]').forEach(row => {
      row.addEventListener('click', () => {
        global.openLeadDrilldown(row.getAttribute('data-lead-id'));
      });
    });

    tableBody.querySelectorAll('[data-lead-btn]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        global.openLeadDrilldown(btn.getAttribute('data-lead-btn'));
      });
    });
  }

  // --- SECTION 3: Payments History Table ---
  function renderPaymentsTable(state) {
    const tableBody = document.getElementById('payments-table-body');
    if (!tableBody) return;

    const payments = getPaymentsInRange(state.from, state.to);

    if (payments.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2.5rem; color: #94a3b8;">No payments recorded in this period.</td></tr>`;
      return;
    }

    tableBody.innerHTML = payments.map(p => {
      const deal = DEALS.find(d => d.id === p.dealId);
      const leadId = deal ? deal.leadId : null;
      return `
        <tr ${leadId ? `data-lead-id="${leadId}"` : ''}>
          <td><strong style="color: #6366f1;">${p.id}</strong></td>
          <td>${p.dealId}</td>
          <td>${p.orderId || '—'}</td>
          <td><strong class="text-success">${formatCurrencyINR(p.amount)}</strong></td>
          <td>${p.method}</td>
          <td><span class="status-badge badge-${p.status.toLowerCase()}">${p.status}</span></td>
          <td>${formatDate(p.date)}</td>
          <td style="text-align: right;">
            ${leadId ? `<button class="btn-row-action" data-lead-btn="${leadId}">Lead Drilldown →</button>` : '—'}
          </td>
        </tr>
      `;
    }).join('');

    tableBody.querySelectorAll('tr[data-lead-id]').forEach(row => {
      row.addEventListener('click', () => {
        const lid = row.getAttribute('data-lead-id');
        if (lid) global.openLeadDrilldown(lid);
      });
    });

    tableBody.querySelectorAll('[data-lead-btn]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const lid = btn.getAttribute('data-lead-btn');
        if (lid) global.openLeadDrilldown(lid);
      });
    });
  }

  // --- Table Filters Listeners ---
  function initTableFilterListeners() {
    const searchInput = document.getElementById('table-search-input');
    const statusSelect = document.getElementById('table-status-filter');
    const sourceSelect = document.getElementById('table-source-filter');

    if (searchInput) searchInput.addEventListener('input', filterAndDisplayLeads);
    if (statusSelect) statusSelect.addEventListener('change', filterAndDisplayLeads);
    if (sourceSelect) sourceSelect.addEventListener('change', filterAndDisplayLeads);
  }

  // --- Date Filter Setup ---
  function initFilterBar() {
    const presetButtons = document.querySelectorAll('.filter-preset-btn');
    const customPanel = document.getElementById('custom-range-panel');
    const applyBtn = document.getElementById('apply-custom-range-btn');
    const fromInput = document.getElementById('custom-from');
    const toInput = document.getElementById('custom-to');

    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');

        if (preset === 'custom') {
          const isVisible = customPanel.style.display === 'flex';
          customPanel.style.display = isVisible ? 'none' : 'flex';
          return;
        }

        if (customPanel) customPanel.style.display = 'none';

        presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        DashboardState.currentPreset = preset;
        const dates = computePeriodDates(preset);
        DashboardState.from = dates.from;
        DashboardState.to = dates.to;
        DashboardState.priorFrom = dates.priorFrom;
        DashboardState.priorTo = dates.priorTo;

        DashboardState.notify();
      });
    });

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const fromVal = fromInput.value;
        const toVal = toInput.value;

        if (!fromVal || !toVal) return;
        if (new Date(fromVal) > new Date(toVal)) {
          alert('From date must be earlier than or equal to To date.');
          return;
        }

        presetButtons.forEach(b => b.classList.remove('active'));
        const customBtn = document.querySelector('[data-preset="custom"]');
        if (customBtn) customBtn.classList.add('active');

        customPanel.style.display = 'none';

        DashboardState.currentPreset = 'custom';
        const dates = computePeriodDates('custom', fromVal, toVal);
        DashboardState.from = dates.from;
        DashboardState.to = dates.to;
        DashboardState.priorFrom = dates.priorFrom;
        DashboardState.priorTo = dates.priorTo;

        DashboardState.notify();
      });
    }

    document.addEventListener('click', e => {
      if (customPanel && customPanel.style.display === 'flex') {
        const isClickInside = customPanel.contains(e.target) || e.target.closest('[data-preset="custom"]');
        if (!isClickInside) {
          customPanel.style.display = 'none';
        }
      }
    });
  }

  // --- Application Bootstrap ---
  function initDashboard() {
    // 1. Initial State
    const initialDates = computePeriodDates('30d');
    DashboardState.from = initialDates.from;
    DashboardState.to = initialDates.to;
    DashboardState.priorFrom = initialDates.priorFrom;
    DashboardState.priorTo = initialDates.priorTo;

    // 2. Initialize Components
    if (global.SecureRegentCharts) {
      global.SecureRegentCharts.initAllCharts();
    }
    if (global.initDrilldown) {
      global.initDrilldown();
    }

    // 3. Subscribe renderers to state changes
    DashboardState.subscribe(renderLeadKPIs);
    DashboardState.subscribe(renderQuotationsAndDealsKPIs);
    DashboardState.subscribe(renderOrdersAndPaymentsKPIs);
    DashboardState.subscribe(renderAllCharts);
    DashboardState.subscribe(filterAndDisplayLeads);
    DashboardState.subscribe(renderQuotationsTable);
    DashboardState.subscribe(renderDealsTable);
    DashboardState.subscribe(renderPaymentsTable);

    // 4. Initialize DOM Event Listeners
    initFilterBar();
    initNavigation();
    initSpotlightCards();
    initTableFilterListeners();

    // 5. Initial Render
    DashboardState.notify();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
  } else {
    initDashboard();
  }

})(window);
