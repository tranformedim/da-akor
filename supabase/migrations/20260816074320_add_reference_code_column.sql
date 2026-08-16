/*
# Add reference_code column to transactions

## Overview
Adds a dedicated `reference_code` column to the `transactions` table for the unique voter-facing
reference code (e.g. VOTE-X892).

## Changes
1. New column: `reference_code` (text, nullable) on transactions.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'reference_code'
  ) THEN
    ALTER TABLE transactions ADD COLUMN reference_code text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_reference_code ON transactions(reference_code);