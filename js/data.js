/**
 * SecureRegent — Realistic Dummy Data Engine
 * Seeded PRNG ensures 100% identical and deterministic data on every browser reload.
 */

(function (global) {
  'use strict';

  // --- Seeded Pseudo-Random Number Generator (Mulberry32) ---
  function createRandom(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rng = createRandom(20261017); // Fixed seed
  const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
  const randChoice = (arr) => arr[Math.floor(rng() * arr.length)];
  const randFloat = (min, max) => rng() * (max - min) + min;

  // Reference "Today": 2026-10-17
  const TODAY = new Date(2026, 9, 17, 18, 0, 0); // 17 Oct 2026

  // Helper to add days to a date
  function addDays(baseDate, days) {
    const d = new Date(baseDate.getTime());
    d.setDate(d.getDate() + days);
    return d > TODAY ? new Date(TODAY.getTime()) : d;
  }

  function addHours(baseDate, hours) {
    const d = new Date(baseDate.getTime() + hours * 3600 * 1000);
    return d > TODAY ? new Date(TODAY.getTime()) : d;
  }

  // --- Catalog: 6 Services & Categories ---
  const SERVICES = [
    {
      id: 'web-dev',
      name: 'Web Development',
      categories: ['Custom Portal', 'SaaS Frontend', 'E-Commerce Platform'],
      baseMin: 75000,
      baseMax: 450000
    },
    {
      id: 'seo',
      name: 'SEO & Content',
      categories: ['Enterprise Technical SEO', 'Content Strategy & Audits'],
      baseMin: 25000,
      baseMax: 150000
    },
    {
      id: 'smm',
      name: 'Social Media Marketing',
      categories: ['B2B Lead Generation', 'Multi-Channel Brand Growth'],
      baseMin: 20000,
      baseMax: 120000
    },
    {
      id: 'ui-ux',
      name: 'UI/UX Design',
      categories: ['Product Design System', 'UX Audit & Redesign'],
      baseMin: 40000,
      baseMax: 280000
    },
    {
      id: 'cybersec',
      name: 'Cybersecurity Audit',
      categories: ['Penetration Testing', 'SOC2/ISO Compliance Audit'],
      baseMin: 90000,
      baseMax: 500000
    },
    {
      id: 'cloud',
      name: 'Cloud Services',
      categories: ['AWS/Azure Architecture', 'DevOps CI/CD Automation'],
      baseMin: 60000,
      baseMax: 400000
    }
  ];

  const SOURCES = [
    'Website',
    'Referral',
    'LinkedIn',
    'Google Ads',
    'Cold Call',
    'Instagram'
  ];

  const FIRST_NAMES = [
    'Aarav', 'Aditi', 'Rohan', 'Priya', 'Vikram', 'Ananya', 'Karan', 'Sneha',
    'Arjun', 'Neha', 'Rahul', 'Pooja', 'Siddharth', 'Tanvi', 'Kabir', 'Rhea',
    'Aditya', 'Meera', 'Varun', 'Ishita', 'Sameer', 'Shreya', 'Dev', 'Kavya',
    'Nikhil', 'Divya', 'Gaurav', 'Ritu', 'Manish', 'Simran'
  ];

  const LAST_NAMES = [
    'Sharma', 'Verma', 'Patel', 'Mehta', 'Gupta', 'Singhania', 'Nair', 'Iyer',
    'Reddy', 'Deshmukh', 'Chopra', 'Malhotra', 'Kapoor', 'Bansal', 'Joshi',
    'Bhatia', 'Saxena', 'Menon', 'Rao', 'Agarwal'
  ];

  const COMPANIES = [
    'AuraPay Technologies', 'Zenith Logistics', 'Nextera Retail', 'Vertex Media Labs',
    'CloudMatrix Systems', 'Hyperion Health', 'Krypton Infosec', 'Solaris Energy',
    'QuantIQ Analytics', 'BlueSky SaaS', 'Starlight Hospitality', 'Elevate EdTech',
    'Cognitive Dynamics', 'Apex Wealth Management', 'Pulse Media', 'Prism Studio',
    'Optima ERP', 'AgileCore Solutions', 'Vanguard Mobility', 'Velox Fintech',
    'Beacon Pharma', 'Catalyst Ventures', 'Novus Real Estate', 'IronClad Security',
    'Streamline CRM', 'Orbit Robotics', 'Terraform Logistics', 'Echo Commerce',
    'OmniTech Global', 'Frontier Digital'
  ];

  // --- Master Relational Arrays ---
  const LEADS = [];
  const QUOTATIONS = [];
  const DEALS = [];
  const ORDERS = [];
  const PAYMENTS = [];

  let quoteCounter = 1;
  let dealCounter = 1;
  let orderCounter = 1;
  let paymentCounter = 1;

  // --- Generation Parameters ---
  const TOTAL_LEADS = 182; // ~180 leads over last 120 days

  // Pre-calculate date distribution: spread over last 120 days with higher density in recent 30 days
  for (let i = 1; i <= TOTAL_LEADS; i++) {
    const leadId = `LD-${String(i).padStart(4, '0')}`;
    const firstName = randChoice(FIRST_NAMES);
    const lastName = randChoice(LAST_NAMES);
    const fullName = `${firstName} ${lastName}`;
    const company = randChoice(COMPANIES);
    const source = randChoice(SOURCES);
    const serviceObj = randChoice(SERVICES);

    // Days ago between 0 and 119 (skewed slightly toward recent 45 days)
    const skew = Math.pow(rng(), 1.4);
    const daysAgo = Math.floor(skew * 120);
    const createdAt = new Date(TODAY.getTime() - (daysAgo * 86400 * 1000) - randInt(1000, 43200) * 1000);

    // Status distribution aiming for ~30% conversion
    // Converted: ~30%, Qualified: ~25%, Unqualified: ~25%, New: ~20%
    const statusRoll = rng();
    let status;
    if (statusRoll < 0.30) {
      status = 'Converted';
    } else if (statusRoll < 0.55) {
      status = 'Qualified';
    } else if (statusRoll < 0.80) {
      status = 'Unqualified';
    } else {
      status = 'New';
    }

    const lead = {
      id: leadId,
      name: fullName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      company: company,
      source: source,
      status: status,
      serviceInterest: serviceObj.name,
      createdAt: createdAt,
      score: randInt(40, 99)
    };
    LEADS.push(lead);

    // --- Generate Quotations ---
    // 0-3 per lead; Qualified and Converted get at least 1-3
    let numQuotes = 0;
    if (status === 'Converted') {
      numQuotes = randInt(1, 3);
    } else if (status === 'Qualified') {
      numQuotes = randInt(1, 2);
    } else if (status === 'Unqualified') {
      numQuotes = rng() < 0.35 ? 1 : 0;
    } else {
      // New
      numQuotes = rng() < 0.40 ? 1 : 0;
    }

    let acceptedQuote = null;

    for (let q = 0; q < numQuotes; q++) {
      const qId = `QT-${String(quoteCounter++).padStart(4, '0')}`;
      const qService = q === 0 ? serviceObj : randChoice(SERVICES);
      const qCategory = randChoice(qService.categories);
      // Realistic amount in range
      const rawAmount = randInt(qService.baseMin, qService.baseMax);
      const amount = Math.round(rawAmount / 5000) * 5000;

      // Status
      let qStatus = 'Draft';
      if (status === 'Converted') {
        // At least one quote must be Accepted
        if (q === numQuotes - 1 && !acceptedQuote) {
          qStatus = 'Accepted';
        } else {
          qStatus = randChoice(['Draft', 'Sent', 'Accepted']);
        }
      } else if (status === 'Qualified') {
        qStatus = randChoice(['Sent', 'Draft', 'Rejected']);
      } else {
        qStatus = randChoice(['Sent', 'Rejected', 'Draft']);
      }

      // Quote date is 1 to 14 days after lead creation
      const quoteDaysAfter = randInt(1, 8);
      const quoteDate = addDays(createdAt, quoteDaysAfter);

      const quotation = {
        id: qId,
        leadId: leadId,
        service: qService.name,
        category: qCategory,
        amount: amount,
        status: qStatus,
        createdAt: quoteDate
      };
      QUOTATIONS.push(quotation);

      if (qStatus === 'Accepted' && !acceptedQuote) {
        acceptedQuote = quotation;
      }
    }

    // --- Generate Deals ---
    // Converted leads always have at least 1 Deal (Won or high-stage In Progress)
    // Some qualified leads might also have an In-Progress or Lost deal
    const shouldCreateDeal = (status === 'Converted') || (status === 'Qualified' && rng() < 0.25);

    if (shouldCreateDeal) {
      const dealId = `DL-${String(dealCounter++).padStart(4, '0')}`;
      const dService = acceptedQuote ? acceptedQuote.service : serviceObj.name;
      const dCategory = acceptedQuote ? acceptedQuote.category : randChoice(serviceObj.categories);
      const dValue = acceptedQuote ? acceptedQuote.amount : Math.round(randInt(serviceObj.baseMin, serviceObj.baseMax) / 5000) * 5000;
      
      let dealStatus = 'In Progress';
      let progress = 50;
      let closedAt = null;

      if (status === 'Converted') {
        dealStatus = rng() < 0.88 ? 'Won' : 'In Progress';
      } else {
        dealStatus = randChoice(['In Progress', 'Lost']);
      }

      const dealCreatedAt = acceptedQuote 
        ? addDays(acceptedQuote.createdAt, randInt(1, 6))
        : addDays(createdAt, randInt(2, 10));

      if (dealStatus === 'Won') {
        progress = 100;
        closedAt = addDays(dealCreatedAt, randInt(4, 20));
      } else if (dealStatus === 'Lost') {
        progress = randInt(15, 60);
        closedAt = addDays(dealCreatedAt, randInt(5, 15));
      } else {
        // In Progress
        progress = randInt(30, 85);
        closedAt = null;
      }

      const priority = randChoice(['High', 'High', 'Medium', 'Medium', 'Low']);

      const deal = {
        id: dealId,
        leadId: leadId,
        quotationId: acceptedQuote ? acceptedQuote.id : null,
        service: dService,
        category: dCategory,
        value: dValue,
        priority: priority,
        status: dealStatus,
        progress: progress,
        createdAt: dealCreatedAt,
        closedAt: closedAt
      };
      DEALS.push(deal);

      // --- Generate Orders ---
      // 1-3 orders for Won or In-Progress deals
      if (dealStatus === 'Won' || dealStatus === 'In Progress') {
        const numOrders = randInt(1, 3);
        const orderPortions = [];
        let remainingVal = dValue;

        for (let o = 0; o < numOrders; o++) {
          const ordId = `ORD-${String(orderCounter++).padStart(4, '0')}`;
          const ordPortion = o === numOrders - 1 
            ? remainingVal 
            : Math.round((dValue / numOrders) / 1000) * 1000;
          remainingVal -= ordPortion;

          let ordStatus = 'In Progress';
          let ordProgress = 50;
          let ordCompletedAt = null;

          if (dealStatus === 'Won') {
            if (o === 0 || rng() < 0.70) {
              ordStatus = 'Completed';
              ordProgress = 100;
              ordCompletedAt = addDays(dealCreatedAt, randInt(10, 35));
            } else {
              ordStatus = 'In Progress';
              ordProgress = randInt(60, 90);
            }
          } else {
            // In Progress deal
            ordStatus = randChoice(['Pending', 'In Progress', 'In Progress']);
            ordProgress = ordStatus === 'Pending' ? 0 : randInt(25, 75);
          }

          const ordCreatedAt = addDays(dealCreatedAt, randInt(1, 4) + o * 5);

          const order = {
            id: ordId,
            dealId: dealId,
            title: `Phase ${o + 1}: ${dService} Deployment & Deliverables`,
            status: ordStatus,
            progress: ordProgress,
            amount: ordPortion > 0 ? ordPortion : Math.round(dValue / numOrders),
            createdAt: ordCreatedAt,
            completedAt: ordCompletedAt
          };
          ORDERS.push(order);

          // --- Generate Payments linked to Deal/Order ---
          // Won deals are 80%-100% paid; In-progress deals are partial (20%-60%)
          let paidRatio = dealStatus === 'Won' ? randFloat(0.80, 1.0) : randFloat(0.20, 0.60);
          const totalPaidTarget = Math.round((order.amount * paidRatio) / 1000) * 1000;

          if (totalPaidTarget > 0) {
            // Split into 1 or 2 payment tranches
            const numPayments = totalPaidTarget > 100000 ? 2 : 1;
            let currentPaid = 0;

            for (let p = 0; p < numPayments; p++) {
              const payId = `PAY-${String(paymentCounter++).padStart(4, '0')}`;
              const payAmount = p === numPayments - 1 
                ? (totalPaidTarget - currentPaid)
                : Math.round((totalPaidTarget * 0.5) / 1000) * 1000;
              
              currentPaid += payAmount;
              if (payAmount <= 0) continue;

              const payDate = addDays(ordCreatedAt, randInt(2, 14) + p * 15);
              const isPaid = (payDate <= TODAY);

              const payment = {
                id: payId,
                dealId: dealId,
                orderId: ordId,
                amount: payAmount,
                method: randChoice(['Bank Transfer', 'UPI', 'Bank Transfer', 'Card', 'Cash']),
                date: payDate,
                status: isPaid ? 'Paid' : 'Pending'
              };
              PAYMENTS.push(payment);
            }
          }
        }
      }
    }
  }

  // --- Sort Collections Chronologically by Creation Date ---
  LEADS.sort((a, b) => a.createdAt - b.createdAt);
  QUOTATIONS.sort((a, b) => a.createdAt - b.createdAt);
  DEALS.sort((a, b) => a.createdAt - b.createdAt);
  ORDERS.sort((a, b) => a.createdAt - b.createdAt);
  PAYMENTS.sort((a, b) => a.date - b.date);

  // --- Helper Functions ---

  /**
   * Filter leads created within a date range [from, to] (inclusive)
   */
  function getLeadsInRange(from, to) {
    const fromTime = new Date(from).setHours(0, 0, 0, 0);
    const toTime = new Date(to).setHours(23, 59, 59, 999);
    return LEADS.filter(l => {
      const t = l.createdAt.getTime();
      return t >= fromTime && t <= toTime;
    });
  }

  /**
   * Filter quotations created within a date range [from, to] (inclusive)
   */
  function getQuotationsInRange(from, to) {
    const fromTime = new Date(from).setHours(0, 0, 0, 0);
    const toTime = new Date(to).setHours(23, 59, 59, 999);
    return QUOTATIONS.filter(q => {
      const t = q.createdAt.getTime();
      return t >= fromTime && t <= toTime;
    });
  }

  /**
   * Filter deals created within a date range [from, to] (inclusive)
   */
  function getDealsInRange(from, to) {
    const fromTime = new Date(from).setHours(0, 0, 0, 0);
    const toTime = new Date(to).setHours(23, 59, 59, 999);
    return DEALS.filter(d => {
      const t = d.createdAt.getTime();
      return t >= fromTime && t <= toTime;
    });
  }

  /**
   * Filter orders created within a date range [from, to] (inclusive)
   */
  function getOrdersInRange(from, to) {
    const fromTime = new Date(from).setHours(0, 0, 0, 0);
    const toTime = new Date(to).setHours(23, 59, 59, 999);
    return ORDERS.filter(o => {
      const t = o.createdAt.getTime();
      return t >= fromTime && t <= toTime;
    });
  }

  /**
   * Filter payments with date within a date range [from, to] (inclusive)
   */
  function getPaymentsInRange(from, to) {
    const fromTime = new Date(from).setHours(0, 0, 0, 0);
    const toTime = new Date(to).setHours(23, 59, 59, 999);
    return PAYMENTS.filter(p => {
      const t = p.date.getTime();
      return t >= fromTime && t <= toTime;
    });
  }

  /**
   * Calculate immediately preceding equivalent period for comparison.
   * e.g., if range is Oct 11 - Oct 17 (7 days), previous period is Oct 4 - Oct 10 (7 days).
   */
  function getPreviousEquivalentPeriod(from, to) {
    const f = new Date(from);
    const t = new Date(to);
    f.setHours(0, 0, 0, 0);
    t.setHours(23, 59, 59, 999);
    
    // Difference in milliseconds
    const diffMs = t.getTime() - f.getTime();
    // Prior 'to' is immediately before 'from'
    const priorTo = new Date(f.getTime() - 1);
    const priorFrom = new Date(priorTo.getTime() - diffMs);
    
    return {
      from: priorFrom,
      to: priorTo
    };
  }

  /**
   * Relational cascade lookup for drill-down views
   */
  function getLeadCascade(leadId) {
    const lead = LEADS.find(l => l.id === leadId) || null;
    if (!lead) return null;

    const quotations = QUOTATIONS.filter(q => q.leadId === leadId);
    const deals = DEALS.filter(d => d.leadId === leadId);
    const dealIds = new Set(deals.map(d => d.id));
    const orders = ORDERS.filter(o => dealIds.has(o.dealId));
    const payments = PAYMENTS.filter(p => dealIds.has(p.dealId));

    return {
      lead,
      quotations,
      deals,
      orders,
      payments
    };
  }

  /**
   * Currency formatter in Indian Rupees (INR)
   */
  function formatCurrencyINR(num) {
    if (num === null || num === undefined || isNaN(num)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  }

  /**
   * Human readable date formatter (e.g. 14 Oct 2026)
   */
  function formatDate(d) {
    if (!d) return '—';
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    return dateObj.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  // --- Expose Globally ---
  global.TODAY = TODAY;
  global.SERVICES = SERVICES;
  global.LEADS = LEADS;
  global.QUOTATIONS = QUOTATIONS;
  global.DEALS = DEALS;
  global.ORDERS = ORDERS;
  global.PAYMENTS = PAYMENTS;

  global.SecureRegentData = {
    TODAY,
    SERVICES,
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
    getLeadCascade,
    formatCurrencyINR,
    formatDate
  };

})(window);
