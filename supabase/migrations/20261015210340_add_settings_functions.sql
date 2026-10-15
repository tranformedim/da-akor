-- Functions to clear test data and switch events to live mode.
-- Both are SECURITY DEFINER, callable only by authenticated admins (checked via auth.uid).

-- 1) Clear all test data: deletes vote_batches, transactions, resets contestant vote_count to 0,
--    resets event total_votes and total_revenue to 0, clears audit logs.
--    Does NOT delete events, categories, contestants, or vote_packages — only transactional data.
CREATE OR REPLACE FUNCTION public.clear_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_batches_deleted int;
  v_txns_deleted int;
BEGIN
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to perform this action';
  END IF;

  -- Verify the caller is an active super_admin
  IF NOT EXISTS (
    SELECT 1 FROM admins
    WHERE id = v_admin_id AND is_active = true AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only super admins can clear test data';
  END IF;

  -- Delete vote batches first (FK depends on transactions)
  DELETE FROM vote_batches;
  GET DIAGNOSTICS v_batches_deleted = ROW_COUNT;

  -- Delete transactions
  DELETE FROM transactions;
  GET DIAGNOSTICS v_txns_deleted = ROW_COUNT;

  -- Reset contestant vote counts
  UPDATE contestants SET vote_count = 0;

  -- Reset event totals
  UPDATE events SET total_votes = 0, total_revenue = 0;

  -- Clear audit logs (optional — comment out if you want to keep them)
  DELETE FROM audit_logs;

  -- Log this action
  INSERT INTO audit_logs (admin_id, action, entity_type, details)
  VALUES (v_admin_id, 'clear_test_data', 'system',
    jsonb_build_object('batches_deleted', v_batches_deleted, 'transactions_deleted', v_txns_deleted));

  RETURN jsonb_build_object(
    'success', true,
    'batches_deleted', v_batches_deleted,
    'transactions_deleted', v_txns_deleted
  );
END;
$$;

-- 2) Go live: sets is_sandbox = false for all events, sets status to 'active' for upcoming events.
CREATE OR REPLACE FUNCTION public.go_live()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_events_updated int;
BEGIN
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to perform this action';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM admins
    WHERE id = v_admin_id AND is_active = true AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only super admins can switch to live mode';
  END IF;

  UPDATE events SET is_sandbox = false;
  GET DIAGNOSTICS v_events_updated = ROW_COUNT;

  INSERT INTO audit_logs (admin_id, action, entity_type, details)
  VALUES (v_admin_id, 'go_live', 'system', jsonb_build_object('events_updated', v_events_updated));

  RETURN jsonb_build_object(
    'success', true,
    'events_updated', v_events_updated
  );
END;
$$;

-- Revoke from anon/authenticated — only callable via service role or authenticated super_admins
REVOKE EXECUTE ON FUNCTION public.clear_test_data() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.go_live() FROM PUBLIC, anon;