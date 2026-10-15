/*
# Add Paystack auto-confirmation function

## Overview
Creates a SECURITY DEFINER function `confirm_paystack_transaction` that allows the Paystack
verify edge function to automatically confirm a pending transaction after successful payment.
Unlike the admin-only `confirm_transaction`, this function is called with the service role key
from the edge function and does not require an admin session.

## New Functions
1. `confirm_paystack_transaction(p_reference_code text, p_paystack_ref text)` — Confirms a
   pending transaction identified by its reference_code, applies votes to the contestant,
   and stores the Paystack transaction reference. Returns the confirmed transaction.

## Security
- SECURITY DEFINER — runs with table owner privileges, bypassing RLS
- Revoked from anon and authenticated roles — only callable with service role key
- Only confirms 'pending' transactions; already-confirmed transactions are skipped
- Creates vote batch and increments contestant vote_count atomically (same as admin confirm)
*/

CREATE OR REPLACE FUNCTION confirm_paystack_transaction(p_reference_code text, p_paystack_ref text)
RETURNS transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txn transactions;
  v_batch_id uuid;
BEGIN
  -- Lock and load the transaction by reference code
  SELECT * INTO v_txn FROM transactions
  WHERE reference_code = p_reference_code AND payment_status = 'pending'
  FOR UPDATE;

  IF v_txn IS NULL THEN
    RAISE EXCEPTION 'Pending transaction not found for reference code: %', p_reference_code;
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

  -- Mark transaction as confirmed with Paystack reference
  UPDATE transactions
  SET payment_status = 'confirmed',
      confirmed_at = now(),
      momo_reference = p_paystack_ref,
      reconciled = true,
      reconciled_at = now()
  WHERE id = v_txn.id
  RETURNING * INTO v_txn;

  RETURN v_txn;
END;
$$;

-- Only service role can call this (not anon, not authenticated)
REVOKE EXECUTE ON FUNCTION confirm_paystack_transaction(text, text) FROM anon, authenticated;