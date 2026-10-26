# Email onboarding and account recovery

RevenueLens and InvoiceLens use one shared Lens Workspace email/password account. New accounts confirm their email before using private data. The app sends confirmation and password-reset links through Supabase Auth using server-only custom SMTP. No SMTP password, admin key or service-role key is in the frontend.

The configured sender is Lens Workspace, using the owner's main Gmail address. A dedicated Google App Password is held only in the private credential store and Supabase's encrypted SMTP configuration. Existing EmailJS OTP templates are not part of this flow and remain unchanged.

## User flow

- Create account: supply a valid email and a password of at least 12 characters. Open the confirmation link, which returns to the requesting app.
- Forgot password: enter your email. The response does not reveal whether an account exists. Check inbox and spam.
- Recovery link: the app detects the recovery session and opens Set a new password. Enter the same new password twice. Successful save signs out; sign in again with the new password.
- Invalid, expired or already-used links: request a new link. Callback tokens are removed from the address bar.
- RevenueLens and InvoiceLens share the credential, not each other's business records or files.

## Verified on 26 October 2026

Actual owner-inbox signup confirmation and recovery email delivery both passed. The confirmation established a live RevenueLens session at its exact Pages path. The reset link opened the deployed new-password form, accepted a new password, signed out and allowed a fresh password sign-in. Reopening the spent recovery link displayed an invalid/expired-link message with no callback fragment retained. No business data was added for these checks.

Local browser tests cover reset request UI, privacy-preserving notice, invalid/expired callback, recovery modal, mismatched passwords blocking updates, matching-password update/signout, no JavaScript errors and a 390px viewport. Desktop/mobile preview regression also passed. These mocked checks supplement, not replace, the actual email tests.

## Operational limits

The Supabase SMTP configuration currently caps auth email sends at 30/hour. Supabase warns that Gmail is a personal rather than transactional provider and delivery may be impacted. Passing a test inbox is not a guarantee of every recipient's delivery, throughput or uptime. Do not advertise unlimited or production-scale mail. Gmail account password changes revoke Google App Passwords; if mail stops, reconfigure a new dedicated App Password privately. A future transactional provider or higher limits require a separate owner decision. No paid service or upgrade was enabled.

Auth redirects are limited to the two deployed app URLs. Keep confirmations enabled. Do not weaken RLS, expose credentials, turn off confirmation or substitute EmailJS public templates to work around delivery problems.

## Test command

`node tests/auth-flow.cjs` uses mocked auth endpoints and creates no external account or email. `npm test` checks syntax. Real-email checks require explicit owner authorization, a controlled inbox and a private credential store. Never commit passwords, tokens or emailed auth links.
