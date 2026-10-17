/**
 * SecureRegent — Chart.js Visualizations Layer
 * High-performance, reactive charts for Leads, Quotations, Deals, Orders and Payments.
 */

(function (global) {
  'use strict';

  // Chart Registry
  const chartInstances = {};

  // Global Chart.js Defaults
  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#475569';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.94)';
    Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
    Chart.defaults.plugins.tooltip.bodyColor = '#f8fafc';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.15)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.titleFont = { family: "'Outfit', sans-serif", weight: '600' };
    Chart.defaults.plugins.tooltip.bodyFont = { family: "'JetBrains Mono', monospace" };
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
    Chart.defaults.plugins.legend.labels.boxHeight = 8;
    Chart.defaults.plugins.legend.labels.padding = 14;
    Chart.defaults.plugins.legend.labels.color = '#334155';
    Chart.defaults.plugins.legend.labels.font = { family: "'Outfit', sans-serif", weight: '500' };
  }

  // --- Palette & Theme Constants ---
  const COLORS = {
    indigo: '#6366f1',
    indigoLight: 'rgba(99, 102, 241, 0.14)',
    purple: '#8b5cf6',
    purpleLight: 'rgba(139, 92, 246, 0.14)',
    emerald: '#10b981',
    emeraldLight: 'rgba(16, 185, 129, 0.14)',
    sky: '#0ea5e9',
    skyLight: 'rgba(14, 165, 233, 0.14)',
    amber: '#f59e0b',
    amberLight: 'rgba(245, 158, 11, 0.14)',
    rose: '#f43f5e',
    roseLight: 'rgba(244, 63, 94, 0.14)',
    pink: '#ec4899',
    pinkLight: 'rgba(236, 72, 153, 0.14)',
    slate: '#64748b',
    grid: 'rgba(226, 232, 240, 0.75)'
  };

  const SOURCE_COLORS = {
    'Website': '#6366f1',
    'Referral': '#10b981',
    'LinkedIn': '#0ea5e9',
    'Google Ads': '#f59e0b',
    'Cold Call': '#8b5cf6',
    'Instagram': '#ec4899'
  };

  const CATEGORY_COLORS = [
    '#6366f1', '#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
  ];

  /**
   * Generates clean time buckets based on range duration.
   */
  function generateTimeBuckets(from, to) {
    const f = new Date(from);
    const t = new Date(to);
    f.setHours(0, 0, 0, 0);
    t.setHours(23, 59, 59, 999);

    const diffDays = Math.ceil((t.getTime() - f.getTime()) / (86400 * 1000));
    const buckets = [];

    if (diffDays <= 1) {
      // Hourly buckets for Today
      for (let h = 8; h <= 20; h += 2) {
        const start = new Date(f.getFullYear(), f.getMonth(), f.getDate(), h, 0, 0);
        const end = new Date(f.getFullYear(), f.getMonth(), f.getDate(), h + 1, 59, 59);
        buckets.push({ label: `${h}:00`, start, end });
      }
    } else if (diffDays <= 14) {
      // Daily buckets
      for (let i = 0; i < diffDays; i++) {
        const d = new Date(f.getTime() + i * 86400 * 1000);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
        const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        buckets.push({ label, start, end });
      }
    } else {
      // Multi-day interval groupings
      const step = diffDays <= 35 ? 3 : 5;
      for (let i = 0; i < diffDays; i += step) {
        const bStart = new Date(f.getTime() + i * 86400 * 1000);
        const bEnd = new Date(Math.min(t.getTime(), f.getTime() + (i + step) * 86400 * 1000 - 1));
        const label = `${bStart.getDate()} ${bStart.toLocaleString('en-IN', { month: 'short' })}`;
        buckets.push({ label, start: bStart, end: bEnd });
      }
    }

    return buckets;
  }

  // ==========================================================================
  // PART 1: LEADS CHARTS
  // ==========================================================================

  function initLeadCharts() {
    // 1. Funnel
    const cFunnel = document.getElementById('chart-lead-funnel');
    if (cFunnel) {
      chartInstances.funnel = new Chart(cFunnel.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['New Leads', 'Qualified', 'Converted'],
          datasets: [{
            data: [0, 0, 0],
            backgroundColor: [COLORS.indigo, COLORS.sky, COLORS.emerald],
            borderRadius: 8,
            barThickness: 28
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 750, easing: 'easeOutQuart' },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.raw || 0;
                  const total = ctx.chart.data.datasets[0].data[0] || 1;
                  return ` ${val} leads (${((val / total) * 100).toFixed(1)}% of top funnel)`;
                }
              }
            }
          },
          scales: {
            x: { grid: { color: COLORS.grid }, ticks: { precision: 0 } },
            y: { grid: { display: false }, ticks: { font: { weight: '600' }, color: '#1e293b' } }
          }
        }
      });
    }

    // 2. Status Trend
    const cStatus = document.getElementById('chart-status-trend');
    if (cStatus) {
      chartInstances.statusTrend = new Chart(cStatus.getContext('2d'), {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            { label: 'Converted', data: [], borderColor: COLORS.emerald, backgroundColor: COLORS.emeraldLight, fill: true, tension: 0.35, borderWidth: 2, pointRadius: 3 },
            { label: 'Qualified', data: [], borderColor: COLORS.sky, backgroundColor: COLORS.skyLight, fill: true, tension: 0.35, borderWidth: 2, pointRadius: 3 },
            { label: 'New', data: [], borderColor: COLORS.indigo, backgroundColor: COLORS.indigoLight, fill: true, tension: 0.35, borderWidth: 2, pointRadius: 3 },
            { label: 'Unqualified', data: [], borderColor: COLORS.rose, backgroundColor: COLORS.roseLight, fill: false, tension: 0.35, borderWidth: 1.5, borderDash: [4, 4], pointRadius: 2 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 800 },
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'top', align: 'end' } },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: COLORS.grid }, ticks: { precision: 0 }, beginAtZero: true }
          }
        }
      });
    }

    // 3. Source Share
    const cSourceShare = document.getElementById('chart-source-share');
    if (cSourceShare) {
      chartInstances.sourceShare = new Chart(cSourceShare.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: Object.keys(SOURCE_COLORS),
          datasets: [{ data: [], backgroundColor: Object.values(SOURCE_COLORS), borderWidth: 2, borderColor: '#fff' }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: { position: 'bottom', labels: { padding: 10, font: { size: 11 } } }
          }
        }
      });
    }

    // 4. Source Trend
    const cSourceTrend = document.getElementById('chart-source-trend');
    if (cSourceTrend) {
      const sources = Object.keys(SOURCE_COLORS);
      chartInstances.sourceTrend = new Chart(cSourceTrend.getContext('2d'), {
        type: 'bar',
        data: {
          labels: [],
          datasets: sources.map(src => ({
            label: src,
            data: [],
            backgroundColor: SOURCE_COLORS[src],
            borderRadius: 4,
            stack: 'src'
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 8, padding: 8 } } },
          scales: {
            x: { stacked: true, grid: { display: false } },
            y: { stacked: true, grid: { color: COLORS.grid }, ticks: { precision: 0 }, beginAtZero: true }
          }
        }
      });
    }
  }

  function updateLeadCharts(leads, from, to) {
    // Funnel
    if (chartInstances.funnel) {
      const total = leads.length;
      const qual = leads.filter(l => l.status === 'Qualified' || l.status === 'Converted').length;
      const conv = leads.filter(l => l.status === 'Converted').length;
      chartInstances.funnel.data.datasets[0].data = [total, qual, conv];
      chartInstances.funnel.update();

      const fTotal = document.getElementById('funnel-stat-total');
      const fQual = document.getElementById('funnel-stat-qual');
      const fConv = document.getElementById('funnel-stat-conv');
      if (fTotal) fTotal.textContent = total;
      if (fQual) fQual.textContent = `${qual} (${total > 0 ? ((qual / total) * 100).toFixed(0) : 0}%)`;
      if (fConv) fConv.textContent = `${conv} (${total > 0 ? ((conv / total) * 100).toFixed(0) : 0}%)`;
    }

    // Status Trend
    if (chartInstances.statusTrend) {
      const buckets = generateTimeBuckets(from, to);
      chartInstances.statusTrend.data.labels = buckets.map(b => b.label);
      chartInstances.statusTrend.data.datasets[0].data = buckets.map(b => leads.filter(l => l.status === 'Converted' && l.createdAt >= b.start && l.createdAt <= b.end).length);
      chartInstances.statusTrend.data.datasets[1].data = buckets.map(b => leads.filter(l => l.status === 'Qualified' && l.createdAt >= b.start && l.createdAt <= b.end).length);
      chartInstances.statusTrend.data.datasets[2].data = buckets.map(b => leads.filter(l => l.status === 'New' && l.createdAt >= b.start && l.createdAt <= b.end).length);
      chartInstances.statusTrend.data.datasets[3].data = buckets.map(b => leads.filter(l => l.status === 'Unqualified' && l.createdAt >= b.start && l.createdAt <= b.end).length);
      chartInstances.statusTrend.update();
    }

    // Source Share
    if (chartInstances.sourceShare) {
      const sources = Object.keys(SOURCE_COLORS);
      chartInstances.sourceShare.data.datasets[0].data = sources.map(s => leads.filter(l => l.source === s).length);
      chartInstances.sourceShare.update();

      const center = document.getElementById('source-share-center-total');
      if (center) center.textContent = leads.length;
    }

    // Source Trend
    if (chartInstances.sourceTrend) {
      const buckets = generateTimeBuckets(from, to);
      const sources = Object.keys(SOURCE_COLORS);
      chartInstances.sourceTrend.data.labels = buckets.map(b => b.label);
      sources.forEach((src, idx) => {
        chartInstances.sourceTrend.data.datasets[idx].data = buckets.map(b => 
          leads.filter(l => l.source === src && l.createdAt >= b.start && l.createdAt <= b.end).length
        );
      });
      chartInstances.sourceTrend.update();
    }
  }

  // ==========================================================================
  // PART 2: QUOTATIONS CHARTS
  // ==========================================================================

  function initQuotationsCharts() {
    // 1. Quotations by Service (Bar: Count & Value)
    const cService = document.getElementById('chart-quote-service');
    if (cService) {
      chartInstances.quoteService = new Chart(cService.getContext('2d'), {
        type: 'bar',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Quote Count',
              data: [],
              backgroundColor: COLORS.indigo,
              borderRadius: 6,
              yAxisID: 'y'
            },
            {
              label: 'Total Value (₹ Lakhs)',
              data: [],
              backgroundColor: COLORS.purpleLight,
              borderColor: COLORS.purple,
              borderWidth: 1.5,
              borderRadius: 6,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: { right: 28, left: 6, top: 10, bottom: 0 }
          },
          plugins: {
            legend: { position: 'top', align: 'end' },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  if (ctx.datasetIndex === 0) return ` Quotes: ${ctx.raw}`;
                  return ` Value: ₹${(ctx.raw * 100000).toLocaleString('en-IN')}`;
                }
              }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              type: 'linear',
              position: 'left',
              grid: { color: COLORS.grid },
              ticks: { precision: 0 },
              title: { display: true, text: 'Quotes Count' }
            },
            y1: {
              type: 'linear',
              position: 'right',
              grid: { display: false },
              title: { display: true, text: '₹ Lakhs' }
            }
          }
        }
      });
    }

    // 2. Quotations by Category (Doughnut)
    const cCategory = document.getElementById('chart-quote-category');
    if (cCategory) {
      chartInstances.quoteCategory = new Chart(cCategory.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: [],
          datasets: [{ data: [], backgroundColor: CATEGORY_COLORS, borderWidth: 2, borderColor: '#fff' }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 8,
                padding: 8,
                font: { size: 11 }
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}`
              }
            }
          }
        }
      });
    }
  }

  function updateQuotationsCharts(quotes) {
    const services = window.SecureRegentData.SERVICES.map(s => s.name);

    if (chartInstances.quoteService) {
      const counts = services.map(s => quotes.filter(q => q.service === s).length);
      const valuesInLakhs = services.map(s => {
        const sum = quotes.filter(q => q.service === s).reduce((acc, q) => acc + q.amount, 0);
        return parseFloat((sum / 100000).toFixed(2));
      });

      chartInstances.quoteService.data.labels = services;
      chartInstances.quoteService.data.datasets[0].data = counts;
      chartInstances.quoteService.data.datasets[1].data = valuesInLakhs;
      chartInstances.quoteService.update();
    }

    if (chartInstances.quoteCategory) {
      const catMap = {};
      quotes.forEach(q => {
        catMap[q.category] = (catMap[q.category] || 0) + q.amount;
      });

      const catLabels = Object.keys(catMap);
      const catVals = Object.values(catMap);

      chartInstances.quoteCategory.data.labels = catLabels;
      chartInstances.quoteCategory.data.datasets[0].data = catVals;
      chartInstances.quoteCategory.update();
    }
  }

  // ==========================================================================
  // PART 3: DEALS & REVENUE CHARTS
  // ==========================================================================

  function initDealsCharts() {
    // 1. Deals and Revenue by Service
    const cDealsService = document.getElementById('chart-deals-service');
    if (cDealsService) {
      chartInstances.dealsService = new Chart(cDealsService.getContext('2d'), {
        type: 'bar',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Won Deals',
              data: [],
              backgroundColor: COLORS.emerald,
              borderRadius: 6
            },
            {
              label: 'In Progress Deals',
              data: [],
              backgroundColor: COLORS.sky,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', align: 'end' } },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: COLORS.grid }, ticks: { precision: 0 }, beginAtZero: true }
          }
        }
      });
    }

    // 2. Deals by Priority (Doughnut)
    const cPriority = document.getElementById('chart-deals-priority');
    if (cPriority) {
      chartInstances.dealsPriority = new Chart(cPriority.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['High', 'Medium', 'Low'],
          datasets: [{
            data: [0, 0, 0],
            backgroundColor: [COLORS.rose, COLORS.amber, COLORS.slate],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 8, padding: 10 } }
          }
        }
      });
    }

    // 3. Daily Revenue Trend (Line of Collected Payments)
    const cRevTrend = document.getElementById('chart-daily-revenue-trend');
    if (cRevTrend) {
      chartInstances.revenueTrend = new Chart(cRevTrend.getContext('2d'), {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Collected Payments',
            data: [],
            borderColor: COLORS.indigo,
            backgroundColor: COLORS.indigoLight,
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (ctx) => ` Collected: ₹${Number(ctx.raw).toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              grid: { color: COLORS.grid },
              ticks: {
                callback: (val) => `₹${val >= 100000 ? (val / 100000) + 'L' : val}`
              },
              beginAtZero: true
            }
          }
        }
      });
    }

    // 4. Total vs Collected vs Outstanding (Bar)
    const cRevComp = document.getElementById('chart-revenue-comparison');
    if (cRevComp) {
      chartInstances.revComparison = new Chart(cRevComp.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['Total Won Value', 'Collected', 'Outstanding'],
          datasets: [{
            data: [0, 0, 0],
            backgroundColor: [COLORS.indigo, COLORS.emerald, COLORS.amber],
            borderRadius: 8,
            barThickness: 36
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ₹${Number(ctx.raw).toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              grid: { color: COLORS.grid },
              ticks: {
                callback: (val) => `₹${val >= 100000 ? (val / 100000).toFixed(0) + 'L' : val}`
              },
              beginAtZero: true
            }
          }
        }
      });
    }
  }

  function updateDealsCharts(deals, payments, from, to) {
    const services = window.SecureRegentData.SERVICES.map(s => s.name);

    if (chartInstances.dealsService) {
      const wonCounts = services.map(s => deals.filter(d => d.service === s && d.status === 'Won').length);
      const progCounts = services.map(s => deals.filter(d => d.service === s && d.status === 'In Progress').length);

      chartInstances.dealsService.data.labels = services;
      chartInstances.dealsService.data.datasets[0].data = wonCounts;
      chartInstances.dealsService.data.datasets[1].data = progCounts;
      chartInstances.dealsService.update();
    }

    if (chartInstances.dealsPriority) {
      const high = deals.filter(d => d.priority === 'High').length;
      const med = deals.filter(d => d.priority === 'Medium').length;
      const low = deals.filter(d => d.priority === 'Low').length;

      chartInstances.dealsPriority.data.datasets[0].data = [high, med, low];
      chartInstances.dealsPriority.update();
    }

    if (chartInstances.revenueTrend) {
      const buckets = generateTimeBuckets(from, to);
      chartInstances.revenueTrend.data.labels = buckets.map(b => b.label);

      const bucketAmounts = buckets.map(b => {
        return payments.filter(p => p.status === 'Paid' && p.date >= b.start && p.date <= b.end)
          .reduce((acc, p) => acc + p.amount, 0);
      });

      chartInstances.revenueTrend.data.datasets[0].data = bucketAmounts;
      chartInstances.revenueTrend.update();
    }

    if (chartInstances.revComparison) {
      const wonDeals = deals.filter(d => d.status === 'Won');
      const totalWon = wonDeals.reduce((sum, d) => sum + d.value, 0);
      const wonDealIds = new Set(wonDeals.map(d => d.id));
      const allPayments = window.SecureRegentData ? window.SecureRegentData.PAYMENTS : payments;
      const collected = allPayments.filter(p => wonDealIds.has(p.dealId) && p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
      const outstanding = Math.max(0, totalWon - collected);

      chartInstances.revComparison.data.datasets[0].data = [totalWon, collected, outstanding];
      chartInstances.revComparison.update();
    }
  }

  // ==========================================================================
  // PART 4: ORDERS & PAYMENTS CHARTS
  // ==========================================================================

  function initOrdersPaymentsCharts() {
    // 1. Order Status Breakdown (Doughnut)
    const cOrdStatus = document.getElementById('chart-order-status');
    if (cOrdStatus) {
      chartInstances.orderStatus = new Chart(cOrdStatus.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Completed', 'In Progress', 'Pending'],
          datasets: [{
            data: [0, 0, 0],
            backgroundColor: [COLORS.emerald, COLORS.sky, COLORS.amber],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 8, padding: 10 } }
          }
        }
      });
    }

    // 2. Payment Collection Trend (Spline)
    const cPayTrend = document.getElementById('chart-payment-trend');
    if (cPayTrend) {
      chartInstances.paymentTrend = new Chart(cPayTrend.getContext('2d'), {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Collection Inflow',
            data: [],
            borderColor: COLORS.emerald,
            backgroundColor: COLORS.emeraldLight,
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (ctx) => ` Inflow: ₹${Number(ctx.raw).toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              grid: { color: COLORS.grid },
              ticks: { callback: (val) => `₹${val >= 100000 ? (val / 100000) + 'L' : val}` },
              beginAtZero: true
            }
          }
        }
      });
    }
  }

  function updateOrdersPaymentsCharts(orders, payments, from, to) {
    if (chartInstances.orderStatus) {
      const completed = orders.filter(o => o.status === 'Completed').length;
      const inProg = orders.filter(o => o.status === 'In Progress').length;
      const pending = orders.filter(o => o.status === 'Pending').length;

      chartInstances.orderStatus.data.datasets[0].data = [completed, inProg, pending];
      chartInstances.orderStatus.update();
    }

    if (chartInstances.paymentTrend) {
      const buckets = generateTimeBuckets(from, to);
      chartInstances.paymentTrend.data.labels = buckets.map(b => b.label);

      const bucketSums = buckets.map(b => {
        return payments.filter(p => p.status === 'Paid' && p.date >= b.start && p.date <= b.end)
          .reduce((sum, p) => sum + p.amount, 0);
      });

      chartInstances.paymentTrend.data.datasets[0].data = bucketSums;
      chartInstances.paymentTrend.update();
    }
  }

  // --- Public Master Initializer & Synchronizer ---
  function initAllCharts() {
    initLeadCharts();
    initQuotationsCharts();
    initDealsCharts();
    initOrdersPaymentsCharts();
  }

  function updateAllCharts(dataRange, from, to) {
    const { leads, quotes, deals, orders, payments } = dataRange;
    updateLeadCharts(leads, from, to);
    updateQuotationsCharts(quotes);
    updateDealsCharts(deals, payments, from, to);
    updateOrdersPaymentsCharts(orders, payments, from, to);
  }

  global.SecureRegentCharts = {
    initAllCharts,
    updateAllCharts,
    chartInstances
  };

})(window);
