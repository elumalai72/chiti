-- Supabase Schema for Chiti App

-- 1. Agents Table
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password TEXT, -- In production, use Supabase Auth instead. This is just to match your current logic.
  business_name TEXT NOT NULL,
  town TEXT NOT NULL,
  state TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Calculation Rules Table
CREATE TABLE public.calculation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chiti_id UUID NOT NULL, -- Will add foreign key after Chitis table creation
  version INTEGER DEFAULT 1,
  auction_type TEXT NOT NULL,
  min_bid_amount DECIMAL,
  max_bid_amount DECIMAL,
  commission_type TEXT NOT NULL,
  commission_value DECIMAL NOT NULL,
  surplus_strategy TEXT NOT NULL,
  effective_from_month INTEGER DEFAULT 1,
  description TEXT
);

-- 3. Chitis Table
CREATE TABLE public.chitis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  total_members INTEGER NOT NULL,
  monthly_contribution DECIMAL NOT NULL,
  expected_monthly_pool DECIMAL NOT NULL,
  duration_months INTEGER NOT NULL,
  current_month INTEGER DEFAULT 1,
  start_date DATE NOT NULL,
  payment_due_day INTEGER NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  rule_id UUID REFERENCES public.calculation_rules(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint to calculation_rules now that chitis exists
ALTER TABLE public.calculation_rules ADD CONSTRAINT fk_rule_chiti FOREIGN KEY (chiti_id) REFERENCES public.chitis(id) ON DELETE CASCADE;

-- 4. Members Table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  member_number INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  alternate_phone TEXT,
  address TEXT,
  joining_date DATE NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'ACTIVE'
);

-- 5. Chit Members (Join table between Chitis and Members)
CREATE TABLE public.chit_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chiti_id UUID NOT NULL REFERENCES public.chitis(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  member_number INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  has_won_auction BOOLEAN DEFAULT FALSE,
  won_month INTEGER,
  winning_bid_amount DECIMAL,
  payout_amount DECIMAL,
  total_paid DECIMAL DEFAULT 0,
  pending_amount DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  UNIQUE (chiti_id, member_id)
);

-- 6. Chit Months Table
CREATE TABLE public.chit_months (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chiti_id UUID NOT NULL REFERENCES public.chitis(id) ON DELETE CASCADE,
  month_number INTEGER NOT NULL,
  cycle_date DATE NOT NULL,
  opening_carry_forward DECIMAL DEFAULT 0,
  expected_collection DECIMAL NOT NULL,
  actual_collected DECIMAL DEFAULT 0,
  pending_collection DECIMAL NOT NULL,
  auction_status TEXT DEFAULT 'SCHEDULED',
  winning_bid DECIMAL,
  winner_member_id UUID REFERENCES public.members(id),
  winner_member_name TEXT,
  winner_member_number INTEGER,
  gross_discount DECIMAL,
  agent_commission DECIMAL,
  surplus_amount DECIMAL,
  member_dividend_credit DECIMAL,
  net_payout DECIMAL,
  loans_recovered DECIMAL DEFAULT 0,
  interest_earned DECIMAL DEFAULT 0,
  lent_out_amount DECIMAL DEFAULT 0,
  closing_carry_forward DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'UPCOMING'
);

-- 7. Payments Table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id),
  chiti_id UUID NOT NULL REFERENCES public.chitis(id),
  chit_month_id UUID NOT NULL REFERENCES public.chit_months(id),
  month_number INTEGER NOT NULL,
  member_id UUID NOT NULL REFERENCES public.members(id),
  member_name TEXT NOT NULL,
  member_number INTEGER NOT NULL,
  amount_due DECIMAL NOT NULL,
  amount_paid DECIMAL NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL,
  receipt_number TEXT NOT NULL,
  notes TEXT
);

-- 8. Payouts Table
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id),
  chiti_id UUID NOT NULL REFERENCES public.chitis(id),
  chit_month_id UUID NOT NULL REFERENCES public.chit_months(id),
  month_number INTEGER NOT NULL,
  winner_member_id UUID NOT NULL REFERENCES public.members(id),
  winner_member_name TEXT NOT NULL,
  winner_member_number INTEGER NOT NULL,
  gross_pool DECIMAL NOT NULL,
  winning_bid DECIMAL NOT NULL,
  gross_discount DECIMAL NOT NULL,
  commission DECIMAL NOT NULL,
  net_payout DECIMAL NOT NULL,
  surplus DECIMAL NOT NULL,
  payout_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payout_method TEXT NOT NULL,
  status TEXT DEFAULT 'PAID',
  confirmed_by_agent BOOLEAN DEFAULT TRUE,
  notes TEXT
);

-- 9. Ledger Table
CREATE TABLE public.ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id),
  chiti_id UUID NOT NULL REFERENCES public.chitis(id),
  month_number INTEGER NOT NULL,
  member_id UUID REFERENCES public.members(id),
  member_name TEXT,
  type TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  flow TEXT NOT NULL, -- CREDIT or DEBIT
  running_balance DECIMAL NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reference_id UUID, -- References payment_id or payout_id
  is_reversal BOOLEAN DEFAULT FALSE,
  reversal_of_id UUID,
  notes TEXT
);

-- 10. Receipts Table
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number TEXT UNIQUE NOT NULL,
  agent_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  agent_phone TEXT NOT NULL,
  chiti_name TEXT NOT NULL,
  chiti_code TEXT NOT NULL,
  member_name TEXT NOT NULL,
  member_number INTEGER NOT NULL,
  month_number INTEGER NOT NULL,
  amount_due DECIMAL NOT NULL,
  amount_paid DECIMAL NOT NULL,
  remaining_due DECIMAL NOT NULL,
  payment_method TEXT NOT NULL,
  date TEXT NOT NULL, -- Keeping string as per current logic (e.g. DD MMM YYYY, HH:MM)
  transaction_id TEXT NOT NULL
);

-- 11. Audit Logs Table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id),
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details TEXT NOT NULL
);

-- 12. Loans Table
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id),
  chiti_id UUID NOT NULL REFERENCES public.chitis(id),
  issued_month_id UUID NOT NULL REFERENCES public.chit_months(id),
  member_id UUID NOT NULL REFERENCES public.members(id),
  member_name TEXT NOT NULL,
  principal_amount DECIMAL NOT NULL,
  expected_interest DECIMAL NOT NULL,
  repaid_amount DECIMAL DEFAULT 0,
  repaid_interest DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  issued_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- 13. Loan Repayments Table
CREATE TABLE public.loan_repayments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id),
  loan_id UUID NOT NULL REFERENCES public.loans(id),
  repayment_month_id UUID NOT NULL REFERENCES public.chit_months(id),
  principal_repaid DECIMAL NOT NULL,
  interest_repaid DECIMAL NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optional: Enable Row Level Security (RLS) policies
-- Example RLS for agents table:
-- ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Agents can view their own record" ON public.agents FOR SELECT USING (auth.uid() = id);
