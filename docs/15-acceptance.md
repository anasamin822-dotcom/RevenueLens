# 15-acceptance

Completed on 26 October 2026: approved Signal Studio design; full coherent source release; owner-only Supabase records, validation and audit export; authenticated CRUD and persistence; desktop/mobile regression with no JavaScript errors or horizontal overflow; synthetic QA cleanup; actual signup confirmation delivery; live email callback; actual recovery delivery; new-password save and forced signout; fresh password login; spent-link rejection.

The checked-in auth-flow test adds mocked reset-request, invalid/expired callback, recovery form, password mismatch, successful update/signout and mobile checks. Actual email evidence is separate from these mocks. See [email onboarding](17-email-onboarding.md).

Limits remain: Gmail is personal rather than transactional mail, current Supabase auth cap is 30 emails/hour and delivery is not guaranteed for every recipient. Free Supabase can pause after inactivity and has no automatic database backup. Export regularly. No paid service enabled, no real business data imported and no Portfolio redesign included.
