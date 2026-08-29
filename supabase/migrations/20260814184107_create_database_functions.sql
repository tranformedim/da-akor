/*
# Da Akɔ — Database Functions

## Overview
Creates SECURITY DEFINER functions for privileged operations that bypass RLS:
1. `log_audit_action` — Records admin actions in audit_logs (callable by authenticated admins)
2. `confirm_transaction` — Confirms a pending transaction and applies votes to the contestant
3. `reverse_transaction` — Reverses a confirmed transaction and removes applied votes
4. `reconcile_transaction` — Marks a transaction as reconciled (payment matched to votes)
5. `register_admin` — Creates a new admin record after auth.users signup with a registration code
6. `generate_registration_code` — Issues a new one-time registration code (admin only)
7. `get_dashboard_stats` — Returns aggregate statistics for the admin overview

## Security
- All functions are SECURITY DEFINER (run with table owner privileges, bypassing RLS)
- Each function verifies the caller is an active admin via auth.uid() before performing privileged operations
- `register_admin` validates the registration code and marks it used atomically
- `confirm_transaction` atomically creates a vote_batch AND increments the contestant's vote_count
- `reverse_transaction` atomically reverses the vote_batch AND decrements the contestant's vote_count

## Important Notes
1. These functions are the ONLY way to perform these operations — direct INSERT/UPDATE on
   vote_batches, audit_logs (from non-admin context), and admins is blocked by RLS.
2. The public anon client can INSERT transactions but cannot confirm them — confirmation
   requires admin auth.
3. All functions use atomic operations to maintain data integrity.
*/

-- ============================================================================
-- log_audit_action
-- ============================================================================
CREATE OR REPLACE FUNCTION log_audit_action(
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_log_id uuid;
BEGIN
  -- Verify caller is an active admin
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = v_admin_id AND is_active = true) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details)
  VALUES (v_admin_id, p_action, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ============================================================================
-- confirm_transaction — confirms payment and applies votes
-- ============================================================================
CREATE OR REPLACE FUNCTION confirm_transaction(p_transaction_id uuid)
RETURNS transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_txn transactions;
  v_batch_id uuid;
BEGIN
  -- Verify caller is an active admin
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = v_admin_id AND is_active = true) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Lock and load the transaction
  SELECT * INTO v_txn FROM transactions WHERE id = p_transaction_id FOR UPDATE;

  IF v_txn IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_txn.payment_status = 'confirmed' THEN
    RAISE EXCEPTION 'Transaction already confirmed';
  END IF;

  IF v_txn.payment_status = 'failed' THEN
    RAISE EXCEPTION 'Cannot confirm a failed transaction';
  END IF;

  -- Create vote batch
  INSERT INTO vote_batches (transaction_id, contestant_id, event_id, votes_count, status, applied_at)
  VALUES (v_txn.id, v_txn.contestant_id, v_txn.event_id, v_txn.votes_purchased, 'applied', now())
  RETURNING id INTO v_batch_id;

  -- Apply votes to contestant
  UPDATE contestants
  SET vote_count = vote_count + v_txn.votes_purchased
  WHERE id = v_txn.contestant_id;

  -- Update event totals
  UPDATE events
  SET total_votes = total_votes + v_txn.votes_purchased,
      total_revenue = total_revenue + v_txn.amount,
      updated_at = now()
  WHERE id = v_txn.event_id;

  -- Mark transaction as confirmed
  UPDATE transactions
  SET payment_status = 'confirmed',
      confirmed_at = now()
  WHERE id = p_transaction_id
  RETURNING * INTO v_txn;

  -- Log the action
  PERFORM log_audit_action(
    'confirm_transaction',
    'transaction',
    p_transaction_id,
    jsonb_build_object('batch_id', v_batch_id, 'votes', v_txn.votes_purchased)
  );

  RETURN v_txn;
END;
$$;

-- ============================================================================
-- reverse_transaction — reverses a confirmed transaction
-- ============================================================================
CREATE OR REPLACE FUNCTION reverse_transaction(p_transaction_id uuid)
RETURNS transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_txn transactions;
BEGIN
  -- Verify caller is an active admin
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = v_admin_id AND is_active = true) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT * INTO v_txn FROM transactions WHERE id = p_transaction_id FOR UPDATE;

  IF v_txn IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_txn.payment_status != 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed transactions can be reversed';
  END IF;

  -- Reverse the vote batch
  UPDATE vote_batches
  SET status = 'reversed'
  WHERE transaction_id = p_transaction_id AND status = 'applied';

  -- Decrement contestant votes
  UPDATE contestants
  SET vote_count = GREATEST(vote_count - v_txn.votes_purchased, 0)
  WHERE id = v_txn.contestant_id;

  -- Update event totals
  UPDATE events
  SET total_votes = GREATEST(total_votes - v_txn.votes_purchased, 0),
      total_revenue = GREATEST(total_revenue - v_txn.amount, 0),
      updated_at = now()
  WHERE id = v_txn.event_id;

  -- Mark transaction as refunded
  UPDATE transactions
  SET payment_status = 'refunded'
  WHERE id = p_transaction_id
  RETURNING * INTO v_txn;

  PERFORM log_audit_action(
    'reverse_transaction',
    'transaction',
    p_transaction_id,
    jsonb_build_object('votes_reversed', v_txn.votes_purchased)
  );

  RETURN v_txn;
END;
$$;

-- ============================================================================
-- reconcile_transaction — marks a transaction as reconciled
-- ============================================================================
CREATE OR REPLACE FUNCTION reconcile_transaction(p_transaction_id uuid)
RETURNS transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_txn transactions;
BEGIN
  -- Verify caller is an active admin
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = v_admin_id AND is_active = true) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT * INTO v_txn FROM transactions WHERE id = p_transaction_id FOR UPDATE;

  IF v_txn IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_txn.payment_status != 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed transactions can be reconciled';
  END IF;

  IF v_txn.reconciled = true THEN
    RAISE EXCEPTION 'Transaction already reconciled';
  END IF;

  UPDATE transactions
  SET reconciled = true,
      reconciled_at = now()
  WHERE id = p_transaction_id
  RETURNING * INTO v_txn;

  PERFORM log_audit_action(
    'reconcile_transaction',
    'transaction',
    p_transaction_id,
    NULL
  );

  RETURN v_txn;
END;
$$;

-- ============================================================================
-- register_admin — creates admin record after signup with a registration code
-- ============================================================================
CREATE OR REPLACE FUNCTION register_admin(p_code text, p_full_name text)
RETURNS admins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code registration_codes%ROWTYPE;
  v_admin admins;
  v_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  -- Lock and validate the registration code
  SELECT * INTO v_code FROM registration_codes WHERE code = p_code FOR UPDATE;

  IF v_code IS NULL THEN
    RAISE EXCEPTION 'Invalid registration code';
  END IF;

  IF v_code.is_used = true THEN
    RAISE EXCEPTION 'Registration code already used';
  END IF;

  -- Get email from auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User not found in auth.users';
  END IF;

  -- Check if already an admin
  IF EXISTS (SELECT 1 FROM admins WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User is already an admin';
  END IF;

  -- Create admin record
  INSERT INTO admins (id, email, full_name, role, is_active)
  VALUES (v_user_id, v_email, p_full_name, 'admin', true)
  RETURNING * INTO v_admin;

  -- Mark code as used
  UPDATE registration_codes
  SET is_used = true, used_by = v_user_id, used_at = now()
  WHERE id = v_code.id;

  PERFORM log_audit_action(
    'register_admin',
    'admin',
    v_user_id,
    jsonb_build_object('email', v_email, 'full_name', p_full_name, 'code', p_code)
  );

  RETURN v_admin;
END;
$$;

-- ============================================================================
-- generate_registration_code — issues a new one-time code
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_registration_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_code text;
  v_exists boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = v_admin_id AND is_active = true) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    SELECT EXISTS (SELECT 1 FROM registration_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  INSERT INTO registration_codes (code, created_by)
  VALUES (v_code, v_admin_id);

  PERFORM log_audit_action(
    'generate_registration_code',
    'registration_code',
    NULL,
    jsonb_build_object('code', v_code)
  );

  RETURN v_code;
END;
$$;

-- ============================================================================
-- get_dashboard_stats — returns aggregate stats for admin overview
-- ============================================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_event_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = v_admin_id AND is_active = true) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT jsonb_build_object(
    'total_events', (SELECT count(*) FROM events WHERE p_event_id IS NULL OR id = p_event_id),
    'total_contestants', (SELECT count(*) FROM contestants WHERE p_event_id IS NULL OR event_id = p_event_id),
    'total_transactions', (SELECT count(*) FROM transactions WHERE p_event_id IS NULL OR event_id = p_event_id),
    'confirmed_transactions', (SELECT count(*) FROM transactions WHERE payment_status = 'confirmed' AND (p_event_id IS NULL OR event_id = p_event_id)),
    'pending_transactions', (SELECT count(*) FROM transactions WHERE payment_status = 'pending' AND (p_event_id IS NULL OR event_id = p_event_id)),
    'total_votes', COALESCE((SELECT sum(votes_purchased) FROM transactions WHERE payment_status = 'confirmed' AND (p_event_id IS NULL OR event_id = p_event_id)), 0),
    'total_revenue', COALESCE((SELECT sum(amount) FROM transactions WHERE payment_status = 'confirmed' AND (p_event_id IS NULL OR event_id = p_event_id)), 0),
    'reconciled_transactions', (SELECT count(*) FROM transactions WHERE reconciled = true AND (p_event_id IS NULL OR event_id = p_event_id)),
    'unreconciled_transactions', (SELECT count(*) FROM transactions WHERE payment_status = 'confirmed' AND reconciled = false AND (p_event_id IS NULL OR event_id = p_event_id)),
    'total_admins', (SELECT count(*) FROM admins WHERE is_active = true)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute on functions to authenticated
GRANT EXECUTE ON FUNCTION log_audit_action(text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reverse_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reconcile_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION register_admin(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_registration_code() TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(uuid) TO authenticated;