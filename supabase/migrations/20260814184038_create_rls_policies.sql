/*
# Da Akɔ — Row Level Security Policies

## Overview
Adds RLS policies to all tables. The app has a hybrid access model:
- Public (anon) can read events, categories, contestants, vote_packages, transactions, vote_batches.
- Public (anon) can create transactions (voters don't sign in).
- Authenticated admins can manage all data via EXISTS check against admins table.

## Security Changes
- Public read on: events, categories, contestants, vote_packages, transactions, vote_batches
- Public insert on: transactions (voters create payment records)
- Admin-only CRUD on: events, categories, contestants, vote_packages, vote_batches (except SELECT)
- Admin-only read on: admins, audit_logs
- Authenticated read on: registration_codes (for admin signup code validation)
- Admin-only management on: registration_codes
*/

-- EVENTS
DROP POLICY IF EXISTS "public_read_events" ON events;
CREATE POLICY "public_read_events" ON events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_events" ON events;
CREATE POLICY "admin_insert_events" ON events FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_update_events" ON events;
CREATE POLICY "admin_update_events" ON events FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_delete_events" ON events;
CREATE POLICY "admin_delete_events" ON events FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- CATEGORIES
DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_categories" ON categories;
CREATE POLICY "admin_insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_update_categories" ON categories;
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_delete_categories" ON categories;
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- CONTESTANTS
DROP POLICY IF EXISTS "public_read_contestants" ON contestants;
CREATE POLICY "public_read_contestants" ON contestants FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_contestants" ON contestants;
CREATE POLICY "admin_insert_contestants" ON contestants FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_update_contestants" ON contestants;
CREATE POLICY "admin_update_contestants" ON contestants FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_delete_contestants" ON contestants;
CREATE POLICY "admin_delete_contestants" ON contestants FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- VOTE PACKAGES
DROP POLICY IF EXISTS "public_read_vote_packages" ON vote_packages;
CREATE POLICY "public_read_vote_packages" ON vote_packages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_vote_packages" ON vote_packages;
CREATE POLICY "admin_insert_vote_packages" ON vote_packages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_update_vote_packages" ON vote_packages;
CREATE POLICY "admin_update_vote_packages" ON vote_packages FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_delete_vote_packages" ON vote_packages;
CREATE POLICY "admin_delete_vote_packages" ON vote_packages FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- TRANSACTIONS
DROP POLICY IF EXISTS "public_insert_transactions" ON transactions;
CREATE POLICY "public_insert_transactions" ON transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_transactions" ON transactions;
CREATE POLICY "public_read_transactions" ON transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_transactions" ON transactions;
CREATE POLICY "admin_update_transactions" ON transactions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_delete_transactions" ON transactions;
CREATE POLICY "admin_delete_transactions" ON transactions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- VOTE BATCHES
DROP POLICY IF EXISTS "public_read_vote_batches" ON vote_batches;
CREATE POLICY "public_read_vote_batches" ON vote_batches FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_vote_batches" ON vote_batches;
CREATE POLICY "admin_insert_vote_batches" ON vote_batches FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_update_vote_batches" ON vote_batches;
CREATE POLICY "admin_update_vote_batches" ON vote_batches FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_delete_vote_batches" ON vote_batches;
CREATE POLICY "admin_delete_vote_batches" ON vote_batches FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- ADMINS
DROP POLICY IF EXISTS "admin_read_admins" ON admins;
CREATE POLICY "admin_read_admins" ON admins FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_update_admins" ON admins;
CREATE POLICY "admin_update_admins" ON admins FOR UPDATE
  TO authenticated USING (
    id = auth.uid() OR EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.role = 'super_admin')
  ) WITH CHECK (
    id = auth.uid() OR EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid() AND a.role = 'super_admin')
  );

-- REGISTRATION CODES
DROP POLICY IF EXISTS "authed_read_registration_codes" ON registration_codes;
CREATE POLICY "authed_read_registration_codes" ON registration_codes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_registration_codes" ON registration_codes;
CREATE POLICY "admin_insert_registration_codes" ON registration_codes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_update_registration_codes" ON registration_codes;
CREATE POLICY "admin_update_registration_codes" ON registration_codes FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_delete_registration_codes" ON registration_codes;
CREATE POLICY "admin_delete_registration_codes" ON registration_codes FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- AUDIT LOGS
DROP POLICY IF EXISTS "admin_read_audit_logs" ON audit_logs;
CREATE POLICY "admin_read_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );