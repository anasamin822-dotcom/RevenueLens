# 03-architecture

GitHub Pages static UI calls Supabase Auth and PostgREST directly with public client configuration. PostgreSQL owner RLS, trigger validation, row-lock monetary allocation and server audit enforce the boundary. Private InvoiceLens storage shares infrastructure but separate tables/policies. Local Node server is a preview only, never the durable backend. The original SQLite proposal was superseded before deployment.
