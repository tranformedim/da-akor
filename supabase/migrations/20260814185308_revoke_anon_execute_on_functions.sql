/*
# Revoke EXECUTE on admin functions from anon role

## Overview
The SECURITY DEFINER functions were callable by the anon role by default.
While each function internally checks auth.uid() and verifies admin status,
revoking EXECUTE from anon is defense-in-depth best practice.

## Security Changes
- REVOKE EXECUTE on all 7 SECURITY DEFINER functions from anon
- Authenticated users retain EXECUTE (functions check admin status internally)
*/

REVOKE EXECUTE ON FUNCTION log_audit_action(text, text, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION confirm_transaction(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION reverse_transaction(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION reconcile_transaction(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION register_admin(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION generate_registration_code() FROM anon;
REVOKE EXECUTE ON FUNCTION get_dashboard_stats(uuid) FROM anon;
