# RevenueLens — Business Performance & Revenue Analytics Dashboard

An interactive, responsive admin dashboard engineered with a modern **Bento Grid** minimalist aesthetic for tracking leads, quotations, deals, orders, and realized revenue for a high-growth service agency.

## 🚀 Live Demo
- **GitHub Pages:** [https://anasamin822-dotcom.github.io/RevenueLens/](https://anasamin822-dotcom.github.io/RevenueLens/)

---

## 💎 Features & Capabilities

### 1. Bento Grid Architecture & Aceternity UI Polish
- **Minimalist Light Aesthetic:** `#f8fafc` canvas with a subtle 24px ambient dot-grid pattern, clean `#ffffff` cards, dark text, and a single violet/indigo accent (`#6366f1`).
- **Dynamic Card Spotlight Effect:** Mouse-tracking radial gradient glow on KPI and chart cards (`[data-spotlight]`).
- **Active Filter Moving Gradient Border:** Continuous conic-gradient rotating perimeter sweep on active date presets.
- **Animated Count-Up Numbers:** Smooth cubic ease-out numbers (`requestAnimationFrame`) scrubbing to new values on filter changes.
- **Shimmer Skeleton Loading:** Snappy 200ms skeleton gradient shimmer during data recalculation.

### 2. Complete Lead-to-Cash Pipeline
- **Lead KPIs & Funnel:** Total Leads, Qualified, Converted, Unqualified, and Conversion Rate with previous-period comparison % change chips.
- **Funnel & Trend Visualizations:**
  - Lead Retention Funnel (`New` → `Qualified` → `Converted`).
  - Lead Status Velocity area chart.
  - Inbound Channel Share doughnut chart with centered total count.
  - Channel Inflow stacked bar chart over time.
- **Quotations Pipeline:**
  - KPIs: Total Quotes, Quoted Pipeline Value (`₹`), Accepted Quotes, and Quote-to-Deal Conversion Rate.
  - Charts: Quotations by Service (count & value in ₹ Lakhs) and Quoted Value by Category.
  - Sortable/clickable Quotations ledger table.
- **Deals & Revenue Realization:**
  - KPIs: Total Deals, Won Deal Revenue, Realized Collections, and Outstanding Balance.
  - Charts: Deals by Service, Deals by Priority, Daily Revenue Collection Trend, and Revenue Realization Audit (Won vs Collected vs Outstanding).
  - Deal Progress Table with visual fulfillment percentage bars.
- **Orders & Payments:**
  - KPIs: Total Orders, Completed Orders, Completion Rate, and Period Collections.
  - Charts: Order Fulfillment Status (doughnut) and Payment Collection Timeline.
  - Reconciled Payment History Table with payment method badges (`UPI`, `Bank Transfer`, `Card`, `Cash`).

### 3. Interactive Relational Drill-Down
Clicking any Lead, Quotation, Deal, or Payment row across tables slides out a 480px frosted drawer displaying the entity's complete relational cascade:
- Lead contact info, company, acquisition channel, and lead score.
- Financial summary strip (Total Quoted, Deals Won, Collected).
- All issued quotations with status and amounts.
- All linked deals with progress bars and priority chips.
- All delivery orders with progress tracking.
- Reconciled payment transactions.

### 4. Dynamic Comparative Date Filtering
- **Presets:** `Today`, `Last 7 Days`, `Last 30 Days` (default), and `Custom Date Range` (with dual date pickers).
- **Previous Equivalent Period Engine:**
  - Automatically calculates the exact preceding equivalent baseline period.
  - Renders directional comparison chips (emerald green `↑ +X.X%`, rose red `↓ -X.X%`, or neutral `— 0.0%`).
  - Updates all 13 KPI cards, 8 Chart.js instances, and all 4 data tables simultaneously.

### 5. 100% Pure Static & Offline Ready
- **Zero build tools, zero dependencies:** Vanilla HTML5, CSS3, and JavaScript (ES6+).
- **Chart.js v4.4 via CDN:** Responsive, animated canvas charts.
- **Deterministic Seeded Data Layer:** Generates realistic 90-day relational datasets using Mulberry32 PRNG for consistency on every reload.
- **Responsive down to 320px:** Tested without horizontal overflow across mobile, tablet, and desktop viewports.

---

## 🛠️ How to Run Locally

No build step or Node.js environment is required.

1. Clone or download the repository:
   ```bash
   git clone https://github.com/anasamin822-dotcom/RevenueLens.git
   cd RevenueLens
   ```
2. Open `index.html` directly in any web browser, or launch a local static server:
   ```bash
   # Using Node.js
   node server.js
   # Or using Python
   python -m http.server 8080
   ```
3. Visit `http://localhost:8080` in your browser.

---

## 📁 Project Structure

```text
RevenueLens/
├── index.html              # Main dashboard single-page shell (Bento layout, 3 views, drill-down)
├── 404.html                # Custom branded 404 error page
├── css/
│   └── style.css           # Complete Bento CSS design system, spotlight, shimmer, animations, media queries
├── js/
│   ├── data.js             # Deterministic seeded relational data engine (Leads, Quotes, Deals, Orders, Payments)
│   ├── charts.js           # Chart.js visualization configurations and reactive update handlers
│   ├── drilldown.js        # Relational drill-down slide-over drawer controller
│   └── app.js              # State manager, date filter calculations, table rendering, tab router
├── server.js               # Minimal local static server
├── LICENSE                 # MIT License
└── README.md               # Project documentation & live demo link
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).

## Private cloud workspace

RevenueLens now supports Supabase email/password private records, server validation, owner-only access and audit export. The static preview uses clearly labeled sample data until sign-in. Production schema is in `supabase/001_revenuelens.sql`; see `docs/` for scope, setup, security, design and acceptance checks. No database/service credentials belong in the frontend.

Run `npm ci && npm start` for http://localhost:4318. `npm test` checks syntax. Cloud tests require private QA credentials supplied locally, never committed. Free Supabase can pause after a week of inactivity and has no automatic database backups; export business records regularly. Signup confirmation and password recovery are configured through server-only Supabase SMTP and passed actual owner-inbox delivery plus live callback tests on 26 October 2026. RevenueLens and InvoiceLens share one Lens Workspace login. Gmail is limited-scale mail, with the current auth cap of 30/hour and a provider deliverability warning. See `docs/17-email-onboarding.md` for flows, tests and operational limits.
