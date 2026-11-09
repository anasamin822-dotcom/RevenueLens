# RevenueLens

A revenue analytics dashboard for a service agency: leads, quotations, deals, orders and payments, from first lead to collected money. Plain HTML, CSS and JavaScript with Chart.js from a CDN - no build step.

**Live demo:** https://anasamin822-dotcom.github.io/RevenueLens/

## What's inside

- **Leads:** total, qualified, converted, unqualified and conversion rate, each compared against the previous period. Funnel, status velocity, channel share and channel inflow charts.
- **Quotations:** quoted pipeline value, accepted quotes and quote-to-deal conversion, charts by service and category, and a sortable ledger.
- **Deals and revenue:** won revenue, collected amount and outstanding balance, with a daily collection trend and a won-vs-collected audit chart.
- **Orders and payments:** completion rate, period collections, and a reconciled payment history with method badges (UPI, bank transfer, card, cash).
- **Drill-down:** clicking any lead, quote, deal or payment row slides out a drawer with its full chain - contact info, quotations, deals, orders and payments for that party.
- **Date filters:** Today, Last 7 days, Last 30 days (default) or a custom range. Every KPI chip shows the change against the matching previous period.

The sample data is generated on load with a seeded PRNG (Mulberry32), so the numbers look real and stay identical on every reload. The layout is a light bento grid: white cards on a `#f8fafc` canvas with a dot pattern, one violet accent (`#6366f1`), count-up number animations, a spotlight glow that follows the mouse, and a rotating gradient border on the active filter. Responsive down to 320px.

## Run it

No build step. Open `index.html` in a browser, or serve the folder:

```bash
git clone https://github.com/anasamin822-dotcom/RevenueLens.git
cd RevenueLens
node server.js            # or: python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Project structure

```text
RevenueLens/
├── index.html              # Dashboard single-page shell (bento layout, 3 views, drill-down)
├── 404.html                # Custom 404 page
├── css/
│   └── style.css           # Bento CSS, spotlight, shimmer, animations, media queries
├── js/
│   ├── data.js             # Seeded relational data (Leads, Quotes, Deals, Orders, Payments)
│   ├── charts.js           # Chart.js setup and update handlers
│   ├── drilldown.js        # Drill-down drawer
│   └── app.js              # State, date filters, table rendering, tab router
├── server.js               # Minimal local static server
├── LICENSE                 # MIT
└── README.md
```

## Private cloud workspace

RevenueLens also supports private records over Supabase email/password auth, with server validation, owner-only access and audit export. Until you sign in, the static preview uses clearly labeled sample data. The production schema is in `supabase/001_revenuelens.sql`; see `docs/` for scope, setup, security, design and acceptance checks. No database or service credentials belong in the frontend.

Run `npm ci && npm start` for http://localhost:4318. `npm test` checks syntax. Cloud tests need private QA credentials supplied locally, never committed. Free Supabase can pause after a week of inactivity and has no automatic database backups; export business records regularly. Signup confirmation and password recovery run through server-only Supabase SMTP and passed real owner-inbox delivery plus live callback tests on 26 October 2026. RevenueLens and InvoiceLens share one Lens Workspace login. Gmail is limited-scale mail, with a current auth-send cap of 30/hour and a provider deliverability warning. See `docs/17-email-onboarding.md` for flows, tests and operational limits.

## License

MIT - see [LICENSE](LICENSE).
