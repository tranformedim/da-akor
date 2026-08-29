/*
# Da Akɔ — Create All Tables

## Overview
Creates the complete database schema for Da Akɔ, a voting platform for event organizers in Ghana.
Supports multi-event voting competitions with mobile money payments, vote packages, contestant
categories, and a full reconciliation system.

## New Tables
1. `events` — Voting competition events (talent shows, debate championships, literary awards)
2. `categories` — Categories within an event (e.g., "Best Actor", "Senior Division")
3. `contestants` — Individual contestants with photos, bios, and live vote counts
4. `vote_packages` — Purchasable vote bundles (e.g., 10 votes for GHS 5)
5. `transactions` — Payment records from voters (MTN MoMo, Telecel Cash, ATMoney, physical cash)
6. `vote_batches` — Links confirmed transactions to the votes delivered to a contestant
7. `admins` — Admin accounts linked to Supabase auth.users
8. `registration_codes` — One-time codes for creating new admin accounts
9. `audit_logs` — Immutable record of all admin actions

## Important Notes
1. The app has a hybrid access model: public voting (no auth) + admin dashboard (auth).
2. Voter flow: browse → pick contestant → pick package → enter phone → pay → votes applied.
3. Admin flow: sign in → manage events/contestants/packages → view transactions → reconcile.
4. New admins sign up with a registration code issued by an existing admin.
5. All monetary values are in Ghana Cedis (GHS).
6. RLS enabled on all tables; policies added in a separate migration.
*/

-- ADMINS (must be first, referenced by other tables)
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- EVENTS
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  venue text,
  city text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'completed')),
  start_date date,
  end_date date,
  image_url text,
  is_sandbox boolean NOT NULL DEFAULT true,
  total_votes integer NOT NULL DEFAULT 0,
  total_revenue numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- CONTESTANTS
CREATE TABLE IF NOT EXISTS contestants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  bio text,
  photo_url text,
  vote_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- VOTE PACKAGES
CREATE TABLE IF NOT EXISTS vote_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  votes integer NOT NULL CHECK (votes > 0),
  bonus_votes integer NOT NULL DEFAULT 0 CHECK (bonus_votes >= 0),
  price_ghs numeric(10,2) NOT NULL CHECK (price_ghs >= 0),
  is_popular boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contestant_id uuid NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  vote_package_id uuid NOT NULL REFERENCES vote_packages(id) ON DELETE CASCADE,
  voter_name text NOT NULL,
  voter_phone text NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('mtn_momo', 'telecel_cash', 'atmoney', 'physical_cash')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'failed', 'refunded')),
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  votes_purchased integer NOT NULL CHECK (votes_purchased > 0),
  momo_reference text,
  momo_number text,
  reconciled boolean NOT NULL DEFAULT false,
  reconciled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

-- VOTE BATCHES
CREATE TABLE IF NOT EXISTS vote_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  contestant_id uuid NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  votes_count integer NOT NULL CHECK (votes_count > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'reversed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);

-- REGISTRATION CODES
CREATE TABLE IF NOT EXISTS registration_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  created_by uuid REFERENCES admins(id) ON DELETE SET NULL,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categories_event_id ON categories(event_id);
CREATE INDEX IF NOT EXISTS idx_contestants_event_id ON contestants(event_id);
CREATE INDEX IF NOT EXISTS idx_contestants_category_id ON contestants(category_id);
CREATE INDEX IF NOT EXISTS idx_vote_packages_event_id ON vote_packages(event_id);
CREATE INDEX IF NOT EXISTS idx_transactions_event_id ON transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_transactions_contestant_id ON transactions(contestant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_vote_batches_transaction_id ON vote_batches(transaction_id);
CREATE INDEX IF NOT EXISTS idx_vote_batches_event_id ON vote_batches(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);