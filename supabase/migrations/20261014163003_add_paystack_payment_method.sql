/*
# Add paystack to allowed payment methods

## Overview
Adds 'paystack' as a valid payment_method value on the transactions table so Paystack
payments can be recorded and tracked.

## Changes
1. Modifies the CHECK constraint on transactions.payment_method to include 'paystack'.
*/

BEGIN;
  ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
  ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check
    CHECK (payment_method IN ('mtn_momo', 'telecel_cash', 'atmoney', 'physical_cash', 'paystack'));
COMMIT;