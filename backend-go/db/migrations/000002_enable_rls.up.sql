-- 000002_enable_rls.up.sql
-- Enables PostgreSQL Row-Level Security (RLS) across core multi-tenant tables
-- using session/transaction setting `app.org_id` as Defense-in-Depth.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'otp_app') THEN
        CREATE ROLE otp_app NOLOGIN NOSUPERUSER NOBYPASSRLS;
    END IF;
END $$;

GRANT USAGE ON SCHEMA public TO otp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO otp_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO otp_app;

DO $$
DECLARE
    t text;
    tenant_tables text[] := ARRAY[
        'users',
        'zones',
        'inv_categories',
        'inv_items',
        'inv_transactions',
        'kp_tbank_items',
        'kp_bank_accounts',
        'kp_purchase_transactions',
        'kiosks',
        'kp_welfare_configs',
        'kp_welfare_payouts',
        'tw_meter_infos',
        'tw_invoice',
        'tw_acc_transactions'
    ];
BEGIN
    FOREACH t IN ARRAY tenant_tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', t);
        EXECUTE format($pol$
            CREATE POLICY tenant_isolation_policy ON %I
            USING (
                COALESCE(NULLIF(current_setting('app.org_id', true), ''), '') = ''
                OR org_id IS NULL
                OR org_id = NULLIF(current_setting('app.org_id', true), '')::bigint
            )
            WITH CHECK (
                COALESCE(NULLIF(current_setting('app.org_id', true), ''), '') = ''
                OR org_id IS NULL
                OR org_id = NULLIF(current_setting('app.org_id', true), '')::bigint
            );
        $pol$, t);
    END LOOP;
END $$;
