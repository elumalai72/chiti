export interface AgentAccount {
  id: string;
  name: string;
  phone: string;
  email?: string;
  password?: string;
  businessName: string;
  town: string;
  state: string;
  address?: string;
  createdAt: string;
}

export interface Member {
  id: string;
  agentId: string;
  memberNumber: number;
  fullName: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  joiningDate: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export type AuctionType = 'REVERSE_BID_LOWEST_WINS' | 'FIXED_DISCOUNT_LOTTERY' | 'COMMISSION_ONLY';
export type CommissionType = 'FIXED' | 'PERCENT_POOL' | 'PERCENT_DISCOUNT';
export type SurplusStrategy = 
  | 'DIVIDEND_DEDUCTION'     // Deducted as credit from next month's payment
  | 'POOL_CARRY_FORWARD'      // Added to next month's auction pool
  | 'CASH_DIVIDEND'          // Directly paid back to members in cash
  | 'SECOND_AUCTION_RESERVE'; // Used for secondary micro-auction/reserve

export interface CalculationRule {
  id: string;
  chitiId: string;
  version: number;
  auctionType: AuctionType;
  minBidAmount?: number;
  maxBidAmount?: number;
  commissionType: CommissionType;
  commissionValue: number; // e.g. 5000 or 5 (percent)
  surplusStrategy: SurplusStrategy;
  effectiveFromMonth: number;
  description?: string;
}

export type ChitiStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface Chiti {
  id: string;
  agentId: string;
  code: string;
  name: string;
  totalMembers: number;
  monthlyContribution: number;
  expectedMonthlyPool: number; // totalMembers * monthlyContribution
  durationMonths: number;
  currentMonth: number; // 1..durationMonths
  startDate: string;
  paymentDueDay: number; // e.g. 10th
  status: ChitiStatus;
  rule: CalculationRule;
  notes?: string;
  createdAt: string;
}

export interface ChitMember {
  id: string;
  chitiId: string;
  memberId: string;
  memberNumber: number;
  fullName: string;
  phone: string;
  address?: string;
  hasWonAuction: boolean;
  wonMonth?: number;
  winningBidAmount?: number;
  payoutAmount?: number;
  totalPaid: number;
  pendingAmount: number;
  status: 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';
}

export type ChitMonthStatus = 
  | 'UPCOMING' 
  | 'OPEN' 
  | 'PAYMENT_COLLECTION' 
  | 'AUCTION_ACTIVE' 
  | 'PAYOUT_PENDING' 
  | 'CLOSED';

export interface ChitMonth {
  id: string;
  chitiId: string;
  monthNumber: number;
  cycleDate: string;
  openingCarryForward: number;
  expectedCollection: number;
  actualCollected: number;
  pendingCollection: number;
  auctionStatus: 'SCHEDULED' | 'BIDDING_OPEN' | 'COMPLETED';
  winningBid?: number;
  winnerMemberId?: string;
  winnerMemberName?: string;
  winnerMemberNumber?: number;
  grossDiscount?: number;
  agentCommission?: number;
  surplusAmount?: number;
  memberDividendCredit?: number; // per member rebate for next month
  netPayout?: number;
  closingCarryForward: number;
  status: ChitMonthStatus;
}

export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'REVERSED';

export interface Payment {
  id: string;
  agentId: string;
  chitiId: string;
  chitMonthId: string;
  monthNumber: number;
  memberId: string;
  memberName: string;
  memberNumber: number;
  amountDue: number;
  amountPaid: number;
  paymentDate?: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  receiptNumber: string;
  notes?: string;
}

export interface AuctionBid {
  id: string;
  chitiId: string;
  monthNumber: number;
  memberId: string;
  memberName: string;
  memberNumber: number;
  bidAmount: number;
  timestamp: string;
  isWinning: boolean;
}

export interface Payout {
  id: string;
  agentId: string;
  chitiId: string;
  chitMonthId: string;
  monthNumber: number;
  winnerMemberId: string;
  winnerMemberName: string;
  winnerMemberNumber: number;
  grossPool: number;
  winningBid: number;
  grossDiscount: number;
  commission: number;
  netPayout: number;
  surplus: number;
  payoutDate: string;
  payoutMethod: 'UPI' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  status: 'PENDING' | 'PAID' | 'REVERSED';
  confirmedByAgent: boolean;
  notes?: string;
}

export type LedgerTransactionType = 
  | 'MEMBER_PAYMENT' 
  | 'PARTIAL_PAYMENT' 
  | 'AUCTION_PAYOUT' 
  | 'COMMISSION_EARNED' 
  | 'DIVIDEND_CREDIT' 
  | 'CARRY_FORWARD' 
  | 'CORRECTION_REVERSAL';

export interface LedgerEntry {
  id: string;
  agentId: string;
  chitiId: string;
  monthNumber: number;
  memberId?: string;
  memberName?: string;
  type: LedgerTransactionType;
  amount: number;
  flow: 'CREDIT' | 'DEBIT';
  runningBalance: number;
  date: string;
  referenceId: string;
  isReversal: boolean;
  reversalOfId?: string;
  notes: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  agentName: string;
  businessName: string;
  agentPhone: string;
  chitiName: string;
  chitiCode: string;
  memberName: string;
  memberNumber: number;
  monthNumber: number;
  amountDue: number;
  amountPaid: number;
  remainingDue: number;
  paymentMethod: PaymentMethod;
  date: string;
  transactionId: string;
}

export interface AuditLog {
  id: string;
  agentId: string;
  actorName: string;
  action: string;
  target: string;
  timestamp: string;
  details: string;
}
