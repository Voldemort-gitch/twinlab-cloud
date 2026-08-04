-- ============================================================================
-- TwinLab — RLS fix: allow INSERTs into ticket_history
-- ============================================================================
-- Why: ticket_history had RLS enabled with only a SELECT policy, so every
-- INSERT from the app (create ticket, status change, assignment, notes) was
-- denied for ALL roles, including admins. This migration adds INSERT policies.
--
-- How to apply (one-time):
--   1. Open https://app.supabase.com  →  your project  →  SQL Editor
--   2. Paste the contents of this file
--   3. Click Execute (Ctrl/Cmd+Enter)
-- Idempotent: safe to re-run.

-- Admins can record ticket history
DROP POLICY IF EXISTS "Admins can insert ticket history" ON ticket_history;
CREATE POLICY "Admins can insert ticket history" ON ticket_history
  FOR INSERT WITH CHECK (public.is_admin());

-- Technicians can record history for tickets assigned to them
DROP POLICY IF EXISTS "Technicians can insert history for assigned tickets" ON ticket_history;
CREATE POLICY "Technicians can insert history for assigned tickets" ON ticket_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM maintenance_tickets
      WHERE maintenance_tickets.id = ticket_id
        AND maintenance_tickets.assigned_technician_id = (
          SELECT id FROM user_profiles WHERE auth_id = auth.uid()
        )
    )
  );
