-- Revoke EXECUTE on all SECURITY DEFINER functions from PUBLIC, anon, and authenticated.
-- These functions should only be callable from edge functions using the service role key.
-- Without this, anyone with the anon key could call /rest/v1/rpc/confirm_paystack_transaction
-- or /rest/v1/rpc/confirm_transaction to confirm their own pending transactions without paying.

REVOKE EXECUTE ON FUNCTION public.confirm_paystack_transaction(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_transaction(uuid) FROM PUBLIC, anon, authenticated;