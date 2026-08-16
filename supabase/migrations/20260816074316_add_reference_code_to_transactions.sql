/*
# Add reference_code column to transactions

## Overview
Adds a dedicated `reference_code` column to the `transactions` table. This column stores the
unique 6-character alphanumeric code (e.g. VOTE-X892) that voters generate during checkout and
must include as their MoMo reference message or write down for cash payments. This allows admins
to match incoming payments to pending transactions for manual reconciliation.

## Changes
1. New column on `transactions`:
   - `reference_code` (text, nullable) — the unique voter-facing reference code. Nullable so
     existing transactions don't break, but new transactions will always set it.

## Security
- No RLS policy changes. The existing public INSERT policy already allows the anon client to
  set any column on insert. The existing public SELECT policy already exposes all columns.
*/