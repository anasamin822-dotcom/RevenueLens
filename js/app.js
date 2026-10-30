/**
 * SecureRegent — Application State & Unified Controller
 * Aesthetic: Bento Grid Minimalism with Aceternity-inspired micro-interactions
 */

(function (global) {
  'use strict';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));


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
  function parseLocalDate(dateStr, h = 0, m = 0, s = 0, ms = 0) {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) {
      const d = new Date(dateStr.getTime());
      d.setHours(h, m, s, ms);
      return d;
    }
    const parts = dateStr.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], h, m, s, ms);
  }

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
      from = parseLocalDate(customFromStr, 0, 0, 0, 0);
      const customTo = parseLocalDate(customToStr, 23, 59, 59, 999);
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

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      chip.classList.remove('chip-pop');
      void chip.offsetWidth; // trigger reflow
      chip.classList.add('chip-pop');
    }
  }

  // --- Count-Up Animation (Originkit Ease-Out Exponential) ---
  function animateCountUp(element, targetVal, isPercent = false, isCurrency = false, duration = 480) {
    if (!element) return;

    function formatVal(v) {
      if (isCurrency) return formatCurrencyINR(Math.round(v));
      if (isPercent) return `${v.toFixed(1)}%`;
      return Math.round(v).toLocaleString('en-IN');
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || element.offsetParent === null) {
      element.textContent = formatVal(targetVal);
      element.setAttribute('data-val', targetVal.toString());
      return;
    }

    const startVal = parseFloat(element.getAttribute('data-val') || '0');
    if (isNaN(startVal) || startVal === targetVal) {
      element.textContent = formatVal(targetVal);
      element.setAttribute('data-val', targetVal.toString());
      return;
    }

    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startVal + (targetVal - startVal) * ease;

      element.textContent = formatVal(current);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        element.textContent = formatVal(targetVal);
        element.setAttribute('data-val', targetVal.toString());
      }
    }

    requestAnimationFrame(frame);
  }

  // --- DaisyUI Radial Progress Ring Controller ---
  function animateRadialProgress(fillId, textId, pct) {
    const fill = document.getElementById(fillId);
    const text = document.getElementById(textId);
    const clamped = Math.max(0, Math.min(100, isNaN(pct) ? 0 : pct));
    const circumference = 125.66; // 2 * PI * 20
    const offset = circumference * (1 - clamped / 100);

    if (fill) {
      fill.style.strokeDasharray = `${circumference}`;
      fill.style.strokeDashoffset = `${offset.toFixed(2)}`;
    }

    if (text) {
      const startVal = parseFloat(text.getAttribute('data-val') || '0') || 0;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || text.offsetParent === null) {
        text.textContent = `${Math.round(clamped)}%`;
        text.setAttribute('data-val', clamped.toString());
        return;
      }
      const startTime = performance.now();
      const duration = 480;
      function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const cur = startVal + (clamped - startVal) * ease;
        text.textContent = `${Math.round(cur)}%`;
        if (progress < 1) {
          requestAnimationFrame(frame);
        } else {
          text.textContent = `${Math.round(clamped)}%`;
          text.setAttribute('data-val', clamped.toString());
        }
      }
      requestAnimationFrame(frame);
    }
  }

  // --- Real-Data SVG Sparkline Generator ---
  function bucketDataSeries(items, dateField, valFn, from, to, bucketCount = 8) {
    if (!from || !to) return new Array(bucketCount).fill(0);
    const fTime = from.getTime();
    const tTime = to.getTime();
    const span = Math.max(1, tTime - fTime);
    const step = span / bucketCount;

    const buckets = new Array(bucketCount).fill(0);

    items.forEach(item => {
      const rawDate = item[dateField];
      if (!rawDate) return;
      const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
      const time = d.getTime();
      if (time >= fTime && time <= tTime) {
        let bIdx = Math.floor((time - fTime) / step);
        if (bIdx >= bucketCount) bIdx = bucketCount - 1;
        if (bIdx < 0) bIdx = 0;
        buckets[bIdx] += (valFn ? valFn(item) : 1);
      }
    });

    return buckets;
  }

  function renderSparkline(containerId, points, strokeColor = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!points || points.length === 0) {
      container.innerHTML = '';
      return;
    }

    const width = 64;
    const height = 20;
    const padding = 2;
    const w = width - padding * 2;
    const h = height - padding * 2;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = (max - min) === 0 ? 1 : (max - min);

    const step = points.length > 1 ? w / (points.length - 1) : w;
    const coords = points.map((val, idx) => {
      const x = padding + idx * step;
      const y = height - padding - ((val - min) / range) * h;
      return [x.toFixed(1), y.toFixed(1)];
    });

    const linePath = coords.map((c, i) => (i === 0 ? `M ${c[0]} ${c[1]}` : `L ${c[0]} ${c[1]}`)).join(' ');
    const areaPath = `${linePath} L ${coords[coords.length - 1][0]} ${height} L ${coords[0][0]} ${height} Z`;

    const strokeStyle = strokeColor ? `style="stroke: ${strokeColor};"` : '';
    const fillStyle = strokeColor ? `style="fill: ${strokeColor}25;"` : '';

    container.innerHTML = `
      <svg class="kpi-sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <path class="sparkline-area" d="${areaPath}" ${fillStyle} />
        <path class="sparkline-line" d="${linePath}" ${strokeStyle} />
      </svg>
    `;
  }

  // --- Table Skeleton Shimmer Row Renderer ---
  const tableRenderTimers = {};
  let hasBootstrappedTables = false;

  function showTableSkeleton(tbody, cols = 7, rowCount = 4) {
    if (!tbody) return;
    let html = '';
    for (let r = 0; r < rowCount; r++) {
      html += '<tr class="table-skeleton-row">';
      for (let c = 0; c < cols; c++) {
        const widthPct = 40 + ((r * 19 + c * 29) % 45);
        html += `<td><div class="table-skeleton-bar" style="width: ${widthPct}%;"></div></td>`;
      }
      html += '</tr>';
    }
    tbody.innerHTML = html;
  }

  // --- Theme Controller (Light / Dark) with Persistent Storage ---
  function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (!toggleBtn) return;

    const activeTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('sr_theme') || 'light';
    document.documentElement.setAttribute('data-theme', activeTheme);

    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';

      document.documentElement.setAttribute('data-theme', nextTheme);
      try {
        localStorage.setItem('sr_theme', nextTheme);
      } catch (e) {}

      if (global.SecureRegentCharts && typeof global.SecureRegentCharts.updateTheme === 'function') {
        global.SecureRegentCharts.updateTheme(nextTheme);
      }

      if (typeof global.setParticleTheme === 'function') {
        global.setParticleTheme(nextTheme);
      }
    });
  }

  // --- Originkit Text Scramble / Decrypt Effect ---
  const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#@$%&';
  function scrambleText(element, finalText, duration = 380) {
    if (!element || !finalText) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.textContent = finalText;
      return;
    }

    const start = performance.now();
    const len = finalText.length;

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const solvedCount = Math.floor(progress * len);

      let result = '';
      for (let i = 0; i < len; i++) {
        if (finalText[i] === ' ' || finalText[i] === '•' || finalText[i] === '&' || finalText[i] === '—' || finalText[i] === ',') {
          result += finalText[i];
        } else if (i < solvedCount) {
          result += finalText[i];
        } else {
          result += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }

      element.textContent = result;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = finalText;
      }
    }

    requestAnimationFrame(update);
  }

  // --- Aceternity / Originkit UI: Card Spotlight + 3D Pointer Tilt ---
  function initSpotlightCards() {
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const cards = document.querySelectorAll('[data-spotlight]');

    cards.forEach(card => {
      if (card._hasSpotlightListener) return;
      card._hasSpotlightListener = true;

      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        if (isFinePointer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = ((y - centerY) / centerY) * -3.2;
          const rotateY = ((x - centerX) / centerX) * 3.2;
          card.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
        }
      });

      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--mouse-x', `-999px`);
        card.style.setProperty('--mouse-y', `-999px`);
        if (isFinePointer) {
          card.style.transform = '';
        }
      });
    });
  }

  // --- Magnetic Pull for Primary Action Elements ---
  function initMagneticButtons() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = document.querySelectorAll('.filter-preset-btn, .apply-range-btn, .btn-row-action, .dd-close-btn');
    targets.forEach(btn => {
      if (btn._hasMagneticListener) return;
      btn._hasMagneticListener = true;

      btn.addEventListener('mousemove', e => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const pullX = (x / (rect.width / 2)) * 3;
        const pullY = (y / (rect.height / 2)) * 3;
        btn.style.transform = `translate(${pullX.toFixed(1)}px, ${pullY.toFixed(1)}px)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }
  global.initMagneticButtons = initMagneticButtons;

  // --- Click Ripple Wave Effect ---
  function initRippleEffects() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.addEventListener('click', e => {
      const target = e.target.closest('.filter-preset-btn, .apply-range-btn, .btn-row-action, .nav-item, .delta-chip');
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple-wave';
      const size = Math.max(rect.width, rect.height) * 2;
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      target.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  }

  // --- Ambient Aurora Visibility & Performance Governor ---
  function initAuroraGovernor() {
    const auroraWrap = document.querySelector('.ambient-aurora-wrap');
    if (!auroraWrap) return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        auroraWrap.classList.add('aurora-paused');
      } else {
        auroraWrap.classList.remove('aurora-paused');
      }
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

    // Stagger indices and original text labels for default overview
    if (views['overview'] && views['overview'].el) {
      views['overview'].el.querySelectorAll('.bento-card').forEach((c, idx) => {
        c.style.setProperty('--card-index', idx);
      });
      views['overview'].el.querySelectorAll('.section-title').forEach(st => {
        st.setAttribute('data-original-text', st.textContent);
      });
    }

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
          if (heading) {
            scrambleText(heading, views[tab].title);
          }

          // Scramble section titles in newly active view
          views[tab].el.querySelectorAll('.section-title').forEach(st => {
            const orig = st.getAttribute('data-original-text') || st.textContent;
            st.setAttribute('data-original-text', orig);
            scrambleText(st, orig);
          });

          // Stagger card entrance animations
          const cards = views[tab].el.querySelectorAll('.bento-card');
          cards.forEach((c, idx) => {
            c.style.setProperty('--card-index', idx);
          });

          // Reset counters so they count up cleanly
          views[tab].el.querySelectorAll('.count-up-val').forEach(el => {
            el.setAttribute('data-val', '0');
          });
        }

        DashboardState.currentView = tab;
        closeNav();
        // Re-attach spotlight on newly displayed cards
        initSpotlightCards();
        initMagneticButtons();

        // Immediately resize charts and re-render data for the newly active view
        requestAnimationFrame(() => {
          if (global.SecureRegentCharts && global.SecureRegentCharts.resizeAll) {
            global.SecureRegentCharts.resizeAll();
          }
          DashboardState.notify();
        });
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

      // Sparklines (real bucketed data)
      const sparkTotal = bucketDataSeries(currLeads, 'createdAt', null, state.from, state.to);
      const sparkQual = bucketDataSeries(currLeads.filter(l => l.status === 'Qualified'), 'createdAt', null, state.from, state.to);
      const sparkConv = bucketDataSeries(currLeads.filter(l => l.status === 'Converted'), 'createdAt', null, state.from, state.to);
      const sparkUnqual = bucketDataSeries(currLeads.filter(l => l.status === 'Unqualified'), 'createdAt', null, state.from, state.to);

      renderSparkline('spark-total-leads', sparkTotal);
      renderSparkline('spark-qualified-leads', sparkQual, '#0ea5e9');
      renderSparkline('spark-converted-leads', sparkConv, '#10b981');
      renderSparkline('spark-unqualified-leads', sparkUnqual, '#f43f5e');

      // Animated SVG radial progress ring for Lead Conversion Rate
      animateRadialProgress('radial-fill-conversion-rate', 'radial-text-conversion-rate', currConvRate);

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

      // Sparklines for Quotes
      const sparkQuotes = bucketDataSeries(currQuotes, 'createdAt', null, state.from, state.to);
      const sparkQVal = bucketDataSeries(currQuotes, 'createdAt', q => q.amount, state.from, state.to);
      const sparkQAcc = bucketDataSeries(currQuotes.filter(q => q.status === 'Accepted'), 'createdAt', null, state.from, state.to);

      renderSparkline('spark-total-quotes', sparkQuotes);
      renderSparkline('spark-quoted-value', sparkQVal, '#8b5cf6');
      renderSparkline('spark-accepted-quotes', sparkQAcc, '#10b981');

      // 2. Deals Data
      const currDeals = getDealsInRange(state.from, state.to);
      const priorDeals = getDealsInRange(state.priorFrom, state.priorTo);
      const currPayments = getPaymentsInRange(state.from, state.to);
      const priorPayments = getPaymentsInRange(state.priorFrom, state.priorTo);

      const currDCount = currDeals.length;
      const priorDCount = priorDeals.length;

      const wonDealsInRange = currDeals.filter(d => d.status === 'Won');
      const currWonRev = wonDealsInRange.reduce((acc, d) => acc + d.value, 0);
      const currCollected = currPayments.filter(p => p.status === 'Paid').reduce((acc, p) => acc + p.amount, 0);
      const currOutstanding = Math.max(0, currWonRev - currCollected);

      const priorWonDeals = priorDeals.filter(d => d.status === 'Won');
      const priorWonRev = priorWonDeals.reduce((acc, d) => acc + d.value, 0);
      const priorCollected = priorPayments.filter(p => p.status === 'Paid').reduce((acc, p) => acc + p.amount, 0);
      const priorOutstanding = Math.max(0, priorWonRev - priorCollected);

      animateCountUp(document.getElementById('val-total-deals'), currDCount, false);
      animateCountUp(document.getElementById('val-won-revenue'), currWonRev, false, true);
      animateCountUp(document.getElementById('val-collected-revenue'), currCollected, false, true);
      animateCountUp(document.getElementById('val-outstanding-revenue'), currOutstanding, false, true);

      updateChip('chip-total-deals', calcPercentDelta(currDCount, priorDCount));
      updateChip('chip-won-revenue', calcPercentDelta(currWonRev, priorWonRev));
      updateChip('chip-collected-revenue', calcPercentDelta(currCollected, priorCollected));
      updateChip('chip-outstanding-revenue', calcPercentDelta(currOutstanding, priorOutstanding));

      // Sparklines for Deals
      const sparkDeals = bucketDataSeries(currDeals, 'createdAt', null, state.from, state.to);
      const sparkWon = bucketDataSeries(wonDealsInRange, 'createdAt', d => d.value, state.from, state.to);
      const sparkColl = bucketDataSeries(currPayments.filter(p => p.status === 'Paid'), 'date', p => p.amount, state.from, state.to);
      const sparkOut = sparkWon.map((w, idx) => Math.max(0, w - (sparkColl[idx] || 0)));

      renderSparkline('spark-total-deals', sparkDeals);
      renderSparkline('spark-won-revenue', sparkWon, '#10b981');
      renderSparkline('spark-collected-revenue', sparkColl, '#0ea5e9');
      renderSparkline('spark-outstanding-revenue', sparkOut, '#f59e0b');

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

      // Sparklines for Orders
      const sparkOrders = bucketDataSeries(currOrders, 'createdAt', null, state.from, state.to);
      const sparkOrdComp = bucketDataSeries(currOrders.filter(o => o.status === 'Completed'), 'createdAt', null, state.from, state.to);
      const sparkOrdPay = bucketDataSeries(currPayments.filter(p => p.status === 'Paid'), 'date', p => p.amount, state.from, state.to);

      renderSparkline('spark-total-orders', sparkOrders);
      renderSparkline('spark-completed-orders', sparkOrdComp, '#10b981');
      renderSparkline('spark-order-payments-collected', sparkOrdPay, '#10b981');

      // Animated SVG radial progress ring for Order Completion Rate
      animateRadialProgress('radial-fill-order-completion', 'radial-text-order-completion', currOCompRate);

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
  function filterAndDisplayLeads(withShimmer = false) {
    const tableBody = document.getElementById('leads-table-body');
    const countLabel = document.getElementById('table-leads-count-label');
    const paginationInfo = document.getElementById('table-pagination-info');
    const searchInput = document.getElementById('table-search-input');
    const statusSelect = document.getElementById('table-status-filter');
    const sourceSelect = document.getElementById('table-source-filter');

    if (!tableBody) return;

    if (tableRenderTimers['leads']) clearTimeout(tableRenderTimers['leads']);

    const doRender = () => {
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
        <tr data-lead-id="${esc(lead.id)}">
          <td>
            <div class="lead-name-cell">
              <span class="lead-primary-name">${esc(lead.name)}</span>
              <span class="lead-company-sub">${esc(lead.id)}</span>
            </div>
          </td>
          <td><strong>${esc(lead.company)}</strong></td>
          <td>${esc(lead.source)}</td>
          <td>${esc(lead.serviceInterest)}</td>
          <td><span class="status-badge badge-${esc(String(lead.status).toLowerCase())}">${esc(lead.status)}</span></td>
          <td>${formatDate(lead.createdAt)}</td>
          <td style="text-align: right;">
            <button class="btn-row-action" data-lead-btn="${esc(lead.id)}">View Details →</button>
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
    };

    if (withShimmer && hasBootstrappedTables && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showTableSkeleton(tableBody, 7, 4);
      tableRenderTimers['leads'] = setTimeout(doRender, 260);
    } else {
      doRender();
    }
  }

  // --- SECTION 2: Quotations Table ---
  function renderQuotationsTable(state, withShimmer = false) {
    const tableBody = document.getElementById('quotations-table-body');
    if (!tableBody) return;

    if (tableRenderTimers['quotes']) clearTimeout(tableRenderTimers['quotes']);

    const doRender = () => {
      const quotes = getQuotationsInRange(state.from, state.to);

      if (quotes.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2.5rem; color: #94a3b8;">No quotations issued in this date range.</td></tr>`;
        return;
      }

      tableBody.innerHTML = quotes.map(q => {
        const lead = LEADS.find(l => l.id === q.leadId);
        const leadName = lead ? `${lead.name} (${lead.company})` : q.leadId;
        return `
          <tr data-lead-id="${esc(q.leadId)}">
            <td><strong style="color: #6366f1;">${esc(q.id)}</strong></td>
            <td>${esc(leadName)}</td>
            <td>${esc(q.service)}</td>
            <td>${esc(q.category)}</td>
            <td class="cell-amount"><strong class="cell-amount">${formatCurrencyINR(q.amount)}</strong></td>
            <td><span class="status-badge badge-${esc(String(q.status).toLowerCase())}">${esc(q.status)}</span></td>
            <td>${formatDate(q.createdAt)}</td>
            <td style="text-align: right;">
              <button class="btn-row-action" data-lead-btn="${esc(q.leadId)}">Lead Drilldown →</button>
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
    };

    if (withShimmer && hasBootstrappedTables && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showTableSkeleton(tableBody, 8, 4);
      tableRenderTimers['quotes'] = setTimeout(doRender, 260);
    } else {
      doRender();
    }
  }

  // --- SECTION 2: Deals Progress Table ---
  function renderDealsTable(state, withShimmer = false) {
    const tableBody = document.getElementById('deals-table-body');
    if (!tableBody) return;

    if (tableRenderTimers['deals']) clearTimeout(tableRenderTimers['deals']);

    const doRender = () => {
      const deals = getDealsInRange(state.from, state.to);

      if (deals.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2.5rem; color: #94a3b8;">No deals active in this period.</td></tr>`;
        return;
      }

      tableBody.innerHTML = deals.map(d => {
        const lead = LEADS.find(l => l.id === d.leadId);
        const leadCompany = lead ? lead.company : d.leadId;
        return `
          <tr data-lead-id="${esc(d.leadId)}">
            <td><strong style="color: #6366f1;">${esc(d.id)}</strong></td>
            <td>${esc(leadCompany)}</td>
            <td>${esc(d.service)}</td>
            <td class="cell-amount"><strong class="cell-amount">${formatCurrencyINR(d.value)}</strong></td>
            <td><span class="priority-chip priority-${esc(String(d.priority).toLowerCase())}">${esc(d.priority)}</span></td>
            <td><span class="status-badge badge-${esc(String(d.status).toLowerCase().replace(' ', '-'))}">${esc(d.status)}</span></td>
            <td style="min-width: 140px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="progress-bar-bg" style="flex: 1;">
                  <div class="progress-bar-fill ${d.status === 'Won' ? '' : 'fill-indigo'}" style="width: ${Number(d.progress) || 0}%;"></div>
                </div>
                <span style="font-size: 0.75rem; font-weight: 600; color: #475569;">${Number(d.progress) || 0}%</span>
              </div>
            </td>
            <td style="text-align: right;">
              <button class="btn-row-action" data-lead-btn="${esc(d.leadId)}">Lead Drilldown →</button>
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
    };

    if (withShimmer && hasBootstrappedTables && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showTableSkeleton(tableBody, 8, 4);
      tableRenderTimers['deals'] = setTimeout(doRender, 260);
    } else {
      doRender();
    }
  }

  // --- SECTION 3: Payments History Table ---
  function renderPaymentsTable(state, withShimmer = false) {
    const tableBody = document.getElementById('payments-table-body');
    if (!tableBody) return;

    if (tableRenderTimers['payments']) clearTimeout(tableRenderTimers['payments']);

    const doRender = () => {
      const payments = getPaymentsInRange(state.from, state.to);

      if (payments.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2.5rem; color: #94a3b8;">No payments recorded in this period.</td></tr>`;
        return;
      }

      tableBody.innerHTML = payments.map(p => {
        const deal = DEALS.find(d => d.id === p.dealId);
        const leadId = deal ? deal.leadId : null;
        return `
          <tr ${leadId ? `data-lead-id="${esc(leadId)}"` : ''}>
            <td><strong style="color: #6366f1;">${esc(p.id)}</strong></td>
            <td>${esc(p.dealId)}</td>
            <td>${esc(p.orderId || '—')}</td>
            <td class="cell-amount"><strong class="text-success cell-amount">${formatCurrencyINR(p.amount)}</strong></td>
            <td>${esc(p.method)}</td>
            <td><span class="status-badge badge-${esc(String(p.status).toLowerCase())}">${esc(p.status)}</span></td>
            <td>${formatDate(p.date)}</td>
            <td style="text-align: right;">
              ${leadId ? `<button class="btn-row-action" data-lead-btn="${esc(leadId)}">Lead Drilldown →</button>` : '—'}
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
    };

    if (withShimmer && hasBootstrappedTables && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showTableSkeleton(tableBody, 8, 4);
      tableRenderTimers['payments'] = setTimeout(doRender, 260);
    } else {
      doRender();
    }
  }

  // --- Table Filters Listeners ---
  function initTableFilterListeners() {
    const searchInput = document.getElementById('table-search-input');
    const statusSelect = document.getElementById('table-status-filter');
    const sourceSelect = document.getElementById('table-source-filter');

    if (searchInput) searchInput.addEventListener('input', () => filterAndDisplayLeads(false));
    if (statusSelect) statusSelect.addEventListener('change', () => filterAndDisplayLeads(true));
    if (sourceSelect) sourceSelect.addEventListener('change', () => filterAndDisplayLeads(true));
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

  // --- Page-Load Sequence: Brief Branded Intro (<1s, skippable, sessionStorage cached) ---
  function initBrandedIntro() {
    const overlay = document.getElementById('brand-intro-overlay');
    if (!overlay) return;

    const alreadySeen = sessionStorage.getItem('sr_intro_seen');
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function dismissIntro() {
      if (!overlay || overlay._dismissed) return;
      overlay._dismissed = true;
      try {
        sessionStorage.setItem('sr_intro_seen', '1');
      } catch (e) {}
      overlay.classList.add('fade-out');
      setTimeout(() => {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 230);
    }

    if (alreadySeen || prefersReduced) {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      return;
    }

    overlay.addEventListener('click', dismissIntro);
    const skipBtn = document.getElementById('intro-skip-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', e => {
        e.stopPropagation();
        dismissIntro();
      });
    }

    const escHandler = e => {
      if (e.key === 'Escape') {
        dismissIntro();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Particle convergence inward toward logo mark
    const canvas = document.getElementById('intro-particle-canvas');
    if (canvas && canvas.getContext) {
      const ctx = canvas.getContext('2d');
      const w = canvas.width || 180;
      const h = canvas.height || 180;
      const cx = w / 2;
      const cy = h / 2;
      const count = 28;
      const particles = [];
      const isDark = (document.documentElement.getAttribute('data-theme') === 'dark');
      const baseColors = isDark 
        ? ['rgba(129, 140, 248, 0.75)', 'rgba(192, 132, 252, 0.75)', 'rgba(56, 189, 248, 0.65)']
        : ['rgba(99, 102, 241, 0.7)', 'rgba(139, 92, 246, 0.7)', 'rgba(6, 182, 212, 0.6)'];

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 55 + Math.random() * 32;
        particles.push({
          angle,
          dist,
          targetDist: 18 + Math.random() * 10,
          radius: 1.4 + Math.random() * 1.8,
          color: baseColors[i % baseColors.length]
        });
      }

      let start = null;
      function animateAssemble(timestamp) {
        if (overlay._dismissed) return;
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / 520, 1);
        ctx.clearRect(0, 0, w, h);

        const ease = 1 - Math.pow(1 - progress, 3);
        for (let i = 0; i < count; i++) {
          const p = particles[i];
          const curDist = p.dist - (p.dist - p.targetDist) * ease;
          const curAngle = p.angle + (1 - ease) * 0.35;
          const x = cx + Math.cos(curAngle) * curDist;
          const y = cy + Math.sin(curAngle) * curDist;

          ctx.beginPath();
          ctx.arc(x, y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }

        if (progress < 1) {
          requestAnimationFrame(animateAssemble);
        }
      }
      requestAnimationFrame(animateAssemble);
    }

    // Automatically dismiss at 750ms (<1s total)
    setTimeout(dismissIntro, 750);
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
    DashboardState.subscribe(state => filterAndDisplayLeads(true));
    DashboardState.subscribe(state => renderQuotationsTable(state, true));
    DashboardState.subscribe(state => renderDealsTable(state, true));
    DashboardState.subscribe(state => renderPaymentsTable(state, true));

    // 4. Initialize DOM Event Listeners
    initFilterBar();
    initNavigation();
    initSpotlightCards();
    initMagneticButtons();
    initRippleEffects();
    initAuroraGovernor();
    initTableFilterListeners();
    initThemeToggle();
    initBrandedIntro();

    // 5. Initial Render (Instant on first paint, shimmer on subsequent filter changes)
    DashboardState.notify();
    hasBootstrappedTables = true;

    // 6. Synchronize initial theme if dark
    const initialTheme = document.documentElement.getAttribute('data-theme') || 'light';
    if (initialTheme === 'dark') {
      if (global.SecureRegentCharts && typeof global.SecureRegentCharts.updateTheme === 'function') {
        global.SecureRegentCharts.updateTheme('dark');
      }
      if (typeof global.setParticleTheme === 'function') {
        global.setParticleTheme('dark');
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
  } else {
    initDashboard();
  }

})(window);
