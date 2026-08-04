-- ============================================================================
-- TwinLab — Development helper: wipe all data
-- ============================================================================
-- !!! DANGER !!!
-- This TRUNCATEs every table and BYPASSES row-level security (TRUNCATE is not
-- governed by RLS). It must only ever be executed by the database owner /
-- service role via psql or the Supabase SQL editor.
--
-- DO NOT grant EXECUTE on this function to the `authenticated` or `anon`
-- roles — any logged-in user could wipe the entire database.
-- ============================================================================

CREATE OR REPLACE FUNCTION clear_all_data()
RETURNS void AS $$
BEGIN
    -- Truncate all tables in reverse dependency order
    TRUNCATE attachments CASCADE;
    TRUNCATE ticket_history CASCADE;
    TRUNCATE maintenance_tickets CASCADE;
    TRUNCATE alerts CASCADE;
    TRUNCATE software_inventory CASCADE;
    TRUNCATE computer_metrics CASCADE;
    TRUNCATE health_scores CASCADE;
    TRUNCATE computers CASCADE;
    TRUNCATE labs CASCADE;
END;
$$ LANGUAGE plpgsql;

-- No GRANT to app roles. The function is only callable by the owner/superuser.
