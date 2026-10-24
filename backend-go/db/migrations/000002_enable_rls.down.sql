-- 000002_enable_rls.down.sql
-- Disables PostgreSQL Row-Level Security (RLS) on core multi-tenant tables.

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
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', t);
        EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY;', t);
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;
