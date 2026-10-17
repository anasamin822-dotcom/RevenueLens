/**
 * SecureRegent — Relational Drill-Down Slide-Over Drawer
 * Displays deep relational hierarchy: Lead -> Quotations -> Deals -> Orders -> Payments
 */

(function (global) {
  'use strict';

  function initDrilldown() {
    const backdrop = document.getElementById('drilldown-backdrop');
    const drawer = document.getElementById('drilldown-drawer');
    const closeBtn = document.getElementById('drilldown-close-btn');

    function closeDrawer() {
      if (drawer) drawer.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
      document.body.style.overflow = '';
      const nameEl = document.getElementById('dd-lead-name');
      const companyEl = document.getElementById('dd-lead-company');
      const emailEl = document.getElementById('dd-lead-email');
      const statusPill = document.getElementById('dd-lead-status');
      const sepEl = document.getElementById('dd-lead-sep');
      if (nameEl) nameEl.textContent = '';
      if (companyEl) companyEl.textContent = '';
      if (emailEl) emailEl.textContent = '';
      if (statusPill) statusPill.style.display = 'none';
      if (sepEl) sepEl.style.display = 'none';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    // Escape Key Handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) {
        closeDrawer();
      }
    });

    global.closeLeadDrilldown = closeDrawer;
  }

  function openLeadDrilldown(leadId) {
    const dataLayer = global.SecureRegentData;
    if (!dataLayer) return;

    const cascade = dataLayer.getLeadCascade(leadId);
    if (!cascade || !cascade.lead) {
      console.warn(`Lead ${leadId} not found`);
      return;
    }

    const { lead, quotations, deals, orders, payments } = cascade;
    const { formatCurrencyINR, formatDate } = dataLayer;

    // Financial summaries for this lead
    const totalQuoted = quotations.reduce((sum, q) => sum + q.amount, 0);
    const wonDeals = deals.filter(d => d.status === 'Won');
    const totalWon = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const totalPaid = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);

    // Populate Drawer Header
    const nameEl = document.getElementById('dd-lead-name');
    const companyEl = document.getElementById('dd-lead-company');
    const emailEl = document.getElementById('dd-lead-email');
    const statusPill = document.getElementById('dd-lead-status');
    const sourceEl = document.getElementById('dd-lead-source');
    const dateEl = document.getElementById('dd-lead-date');
    const scoreEl = document.getElementById('dd-lead-score');

    if (nameEl) nameEl.textContent = lead.name;
    if (companyEl) companyEl.textContent = lead.company;
    if (emailEl) emailEl.textContent = lead.email;
    if (sourceEl) sourceEl.textContent = lead.source;
    if (dateEl) dateEl.textContent = formatDate(lead.createdAt);
    if (scoreEl) scoreEl.textContent = `${lead.score}/100`;

    const sepEl = document.getElementById('dd-lead-sep');
    if (sepEl) sepEl.style.display = 'inline';

    if (statusPill) {
      statusPill.textContent = lead.status;
      statusPill.className = `status-badge badge-${lead.status.toLowerCase()}`;
      statusPill.style.display = 'inline-flex';
    }

    // Populate Metrics Row
    const mQuoted = document.getElementById('dd-metric-quoted');
    const mWon = document.getElementById('dd-metric-won');
    const mPaid = document.getElementById('dd-metric-paid');
    if (mQuoted) mQuoted.textContent = formatCurrencyINR(totalQuoted);
    if (mWon) mWon.textContent = formatCurrencyINR(totalWon);
    if (mPaid) mPaid.textContent = formatCurrencyINR(totalPaid);

    // 1. Render Quotations
    const quotesContainer = document.getElementById('dd-quotations-list');
    if (quotesContainer) {
      if (quotations.length === 0) {
        quotesContainer.innerHTML = `<div class="dd-empty">No quotations issued yet for this lead.</div>`;
      } else {
        quotesContainer.innerHTML = quotations.map(q => `
          <div class="dd-item-card">
            <div class="dd-item-header">
              <span class="dd-item-id">${q.id}</span>
              <span class="status-badge badge-${q.status.toLowerCase()}">${q.status}</span>
            </div>
            <div class="dd-item-title">${q.service}</div>
            <div class="dd-item-subtitle">${q.category} • Sent ${formatDate(q.createdAt)}</div>
            <div class="dd-item-amount">${formatCurrencyINR(q.amount)}</div>
          </div>
        `).join('');
      }
    }

    // 2. Render Deals
    const dealsContainer = document.getElementById('dd-deals-list');
    if (dealsContainer) {
      if (deals.length === 0) {
        dealsContainer.innerHTML = `<div class="dd-empty">No active or won deals recorded yet.</div>`;
      } else {
        dealsContainer.innerHTML = deals.map(d => `
          <div class="dd-item-card">
            <div class="dd-item-header">
              <div style="display:flex; align-items:center; gap:6px;">
                <span class="dd-item-id">${d.id}</span>
                <span class="priority-chip priority-${d.priority.toLowerCase()}">${d.priority} Priority</span>
              </div>
              <span class="status-badge badge-${d.status.toLowerCase().replace(' ', '-')}">${d.status}</span>
            </div>
            <div class="dd-item-title">${d.service}</div>
            <div class="dd-progress-wrap">
              <div class="dd-progress-label">
                <span>Stage Progress</span>
                <span>${d.progress}%</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${d.progress}%;"></div>
              </div>
            </div>
            <div class="dd-item-amount">${formatCurrencyINR(d.value)}</div>
          </div>
        `).join('');
      }
    }

    // 3. Render Orders
    const ordersContainer = document.getElementById('dd-orders-list');
    if (ordersContainer) {
      if (orders.length === 0) {
        ordersContainer.innerHTML = `<div class="dd-empty">No delivery orders generated.</div>`;
      } else {
        ordersContainer.innerHTML = orders.map(o => `
          <div class="dd-item-card">
            <div class="dd-item-header">
              <span class="dd-item-id">${o.id}</span>
              <span class="status-badge badge-${o.status.toLowerCase().replace(' ', '-')}">${o.status}</span>
            </div>
            <div class="dd-item-title">${o.title}</div>
            <div class="dd-progress-wrap">
              <div class="dd-progress-label">
                <span>Fulfillment</span>
                <span>${o.progress}%</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill fill-indigo" style="width: ${o.progress}%;"></div>
              </div>
            </div>
            <div class="dd-item-amount">${formatCurrencyINR(o.amount)}</div>
          </div>
        `).join('');
      }
    }

    // 4. Render Payments
    const paymentsContainer = document.getElementById('dd-payments-list');
    if (paymentsContainer) {
      if (payments.length === 0) {
        paymentsContainer.innerHTML = `<div class="dd-empty">No payments received yet.</div>`;
      } else {
        paymentsContainer.innerHTML = payments.map(p => `
          <div class="dd-item-card">
            <div class="dd-item-header">
              <span class="dd-item-id">${p.id}</span>
              <span class="status-badge badge-${p.status.toLowerCase()}">${p.status}</span>
            </div>
            <div class="dd-item-title">${p.method}</div>
            <div class="dd-item-subtitle">${formatDate(p.date)} ${p.orderId ? `• Linked to ${p.orderId}` : ''}</div>
            <div class="dd-item-amount text-success">${formatCurrencyINR(p.amount)}</div>
          </div>
        `).join('');
      }
    }

    // Open Drawer
    const drawer = document.getElementById('drilldown-drawer');
    const backdrop = document.getElementById('drilldown-backdrop');
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Apply magnetic hover to drawer close button
    if (typeof global.initMagneticButtons === 'function') {
      global.initMagneticButtons();
    }
  }

  global.openLeadDrilldown = openLeadDrilldown;
  global.initDrilldown = initDrilldown;

})(window);
