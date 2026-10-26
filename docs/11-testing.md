# 11-testing

Verified actual Auth/REST: lead/deal/order/payment CRUD, other-user read/update/audit isolation, payment overallocation denial, dependency delete protection, server audit. Actual Chromium browser: login, empty private state, lead create/edit/delete, full reload persistence, mobile390 layout, signout, zero JS errors. Shared Invoice storage/RPC transport tests pass. QA accounts and all synthetic cloud data cleaned to0. Syntax npm test passes. Live post-deploy regression still required.

Reproduce: `npx playwright install chromium`; `node tests/preview.cjs`; `QA_USERS_FILE=/private/users.json node tests/browser-workflow.cjs`; `node scripts/revenue-cloud-check.mjs /private/public-config.json /private/users.json`. QA users must be disposable confirmed accounts; never commit credential JSON.
