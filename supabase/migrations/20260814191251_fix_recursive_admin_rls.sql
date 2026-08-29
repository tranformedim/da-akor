-- Create a SECURITY DEFINER function that checks admin status without hitting RLS.
-- This breaks the circular dependency in the admins SELECT policy.
CREATE OR REPLACE FUNCTION is_active_admin(p_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE id = p_uid AND is_active = true);
$$;

GRANT EXECUTE ON FUNCTION is_active_admin(uuid) TO authenticated;

-- Replace the recursive admin_read_admins policy
DROP POLICY IF EXISTS "admin_read_admins" ON admins;
CREATE POLICY "admin_read_admins" ON admins FOR SELECT
  TO authenticated USING (is_active_admin(auth.uid()));

-- Replace all other admin policies that query admins directly (same recursion bug)
DROP POLICY IF EXISTS "admin_insert_events" ON events;
CREATE POLICY "admin_insert_events" ON events FOR INSERT
  TO authenticated WITH CHECK (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_update_events" ON events;
CREATE POLICY "admin_update_events" ON events FOR UPDATE
  TO authenticated USING (is_active_admin(auth.uid()))
  WITH CHECK (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_events" ON events;
CREATE POLICY "admin_delete_events" ON events FOR DELETE
  TO authenticated USING (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_categories" ON categories;
CREATE POLICY "admin_insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_update_categories" ON categories;
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE
  TO authenticated USING (is_active_admin(auth.uid()))
  WITH CHECK (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_categories" ON categories;
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE
  TO authenticated USING (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_contestants" ON contestants;
CREATE POLICY "admin_insert_contestants" ON contestants FOR INSERT
  TO authenticated WITH CHECK (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_update_contestants" ON contestants;
CREATE POLICY "admin_update_contestants" ON contestants FOR UPDATE
  TO authenticated USING (is_active_admin(auth.uid()))
  WITH CHECK (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_contestants" ON contestants;
CREATE POLICY "admin_delete_contestants" ON contestants FOR DELETE
  TO authenticated USING (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_vote_packages" ON vote_packages;
CREATE POLICY "admin_insert_vote_packages" ON vote_packages FOR INSERT
  TO authenticated WITH CHECK (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_update_vote_packages" ON vote_packages;
CREATE POLICY "admin_update_vote_packages" ON vote_packages FOR UPDATE
  TO authenticated USING (is_active_admin(auth.uid()))
  WITH CHECK (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_vote_packages" ON vote_packages;
CREATE POLICY "admin_delete_vote_packages" ON vote_packages FOR DELETE
  TO authenticated USING (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_update_transactions" ON transactions;
CREATE POLICY "admin_update_transactions" ON transactions FOR UPDATE
  TO authenticated USING (is_active_admin(auth.uid()))
  WITH CHECK (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_transactions" ON transactions;
CREATE POLICY "admin_delete_transactions" ON transactions FOR DELETE
  TO authenticated USING (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_vote_batches" ON vote_batches;
CREATE POLICY "admin_insert_vote_batches" ON vote_batches FOR INSERT
  TO authenticated WITH CHECK (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_update_vote_batches" ON vote_batches;
CREATE POLICY "admin_update_vote_batches" ON vote_batches FOR UPDATE
  TO authenticated USING (is_active_admin(auth.uid()))
  WITH CHECK (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_vote_batches" ON vote_batches;
CREATE POLICY "admin_delete_vote_batches" ON vote_batches FOR DELETE
  TO authenticated USING (is_active_admin(auth.uid()));

-- Admins update policy: self or super_admin
DROP POLICY IF EXISTS "admin_update_admins" ON admins;
CREATE POLICY "admin_update_admins" ON admins FOR UPDATE
  TO authenticated USING (
    id = auth.uid() OR EXISTS (
      SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  ) WITH CHECK (
    id = auth.uid() OR EXISTS (
      SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

-- Registration codes
DROP POLICY IF EXISTS "admin_insert_registration_codes" ON registration_codes;
CREATE POLICY "admin_insert_registration_codes" ON registration_codes FOR INSERT
  TO authenticated WITH CHECK (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_update_registration_codes" ON registration_codes;
CREATE POLICY "admin_update_registration_codes" ON registration_codes FOR UPDATE
  TO authenticated USING (is_active_admin(auth.uid()))
  WITH CHECK (is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_registration_codes" ON registration_codes;
CREATE POLICY "admin_delete_registration_codes" ON registration_codes FOR DELETE
  TO authenticated USING (is_active_admin(auth.uid()));

-- Audit logs
DROP POLICY IF EXISTS "admin_read_audit_logs" ON audit_logs;
CREATE POLICY "admin_read_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (is_active_admin(auth.uid()));
