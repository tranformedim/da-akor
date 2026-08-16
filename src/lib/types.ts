export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  venue: string | null;
  city: string | null;
  status: 'upcoming' | 'active' | 'completed';
  start_date: string | null;
  end_date: string | null;
  image_url: string | null;
  is_sandbox: boolean;
  total_votes: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Contestant {
  id: string;
  event_id: string;
  category_id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  vote_count: number;
  is_active: boolean;
  created_at: string;
  category?: Category;
}

export interface VotePackage {
  id: string;
  event_id: string;
  name: string;
  votes: number;
  bonus_votes: number;
  price_ghs: number;
  is_popular: boolean;
  created_at: string;
}

export type PaymentMethod = 'mtn_momo' | 'telecel_cash' | 'atmoney' | 'physical_cash';
export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'refunded';

export interface Transaction {
  id: string;
  event_id: string;
  contestant_id: string;
  vote_package_id: string;
  voter_name: string;
  voter_phone: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  amount: number;
  votes_purchased: number;
  momo_reference: string | null;
  momo_number: string | null;
  reference_code: string | null;
  reconciled: boolean;
  reconciled_at: string | null;
  created_at: string;
  confirmed_at: string | null;
  contestant?: Contestant;
  vote_package?: VotePackage;
}

export interface VoteBatch {
  id: string;
  transaction_id: string;
  contestant_id: string;
  event_id: string;
  votes_count: number;
  status: 'pending' | 'applied' | 'reversed';
  created_at: string;
  applied_at: string | null;
  contestant?: Contestant;
  transaction?: Transaction;
}

export interface Admin {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  created_at: string;
}

export interface RegistrationCode {
  id: string;
  code: string;
  created_by: string | null;
  used_by: string | null;
  is_used: boolean;
  created_at: string;
  used_at: string | null;
}

export interface AuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  admin?: Admin;
}

export interface DashboardStats {
  total_events: number;
  total_contestants: number;
  total_transactions: number;
  confirmed_transactions: number;
  pending_transactions: number;
  total_votes: number;
  total_revenue: number;
  reconciled_transactions: number;
  unreconciled_transactions: number;
  total_admins: number;
}
