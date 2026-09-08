import { CalculationRule, SurplusStrategy } from '../types';

export interface AuctionCalculationInput {
  baseCollection: number; // e.g. 250,000 (totalMembers * monthlyContribution)
  loansRecovered: number; // e.g. 125,000
  interestEarned: number; // e.g. 5,000
  openingCarryForward: number; // e.g. 0 or surplus from previous month
  winningBids: number[]; // e.g. [120000, 150000] (Net payouts to winners)
  totalMembers: number; // e.g. 50
  monthlyContribution: number; // e.g. 5,000
  rule: CalculationRule;
}

export interface AuctionCalculationResult {
  effectivePool: number; 
  totalWinningBids: number; // Total Net cash paid to the auction winners
  grossDiscount: number; // effectivePool - totalWinningBids
  agentCommission: number; // e.g. 5,000
  netPayout: number; // same as totalWinningBids
  surplusAmount: number; // grossDiscount - agentCommission
  surplusStrategy: SurplusStrategy;
  perMemberDividend: number; 
  totalDividendDistributed: number; 
  closingCarryForward: number; 
  nextMonthMemberDue: number; 
  lentOutAmount: number; // amount sent to lending pool
  formulaDescription: string;
}

/**
 * Calculates expected monthly collection pool:
 * Total Members × Monthly Contribution
 * e.g., 41 × ₹3,000 = ₹1,23,000
 */
export function calculateExpectedMonthlyPool(totalMembers: number, monthlyContribution: number): number {
  if (totalMembers <= 0 || monthlyContribution <= 0) return 0;
  return totalMembers * monthlyContribution;
}

/**
 * Calculates agent commission based on the configured rule.
 */
export function calculateCommission(
  effectivePool: number,
  grossDiscount: number,
  rule: CalculationRule
): number {
  switch (rule.commissionType) {
    case 'FIXED':
      return Math.min(rule.commissionValue, grossDiscount);
    case 'PERCENT_POOL':
      return Math.round((effectivePool * rule.commissionValue) / 100);
    case 'PERCENT_DISCOUNT':
      return Math.round((grossDiscount * rule.commissionValue) / 100);
    default:
      return 0;
  }
}

/**
 * Core Modular Auction Calculation Engine.
 * Implements the verified workflow from the Agent's handwritten book register:
 * 
 * 1. Effective Pool = Expected Collection + Carry Forward
 * 2. Winner Bids lowest acceptable amount (e.g. ₹1,10,000)
 * 3. Gross Discount = Pool - Winning Bid (e.g. ₹1,23,000 - ₹1,10,000 = ₹13,000)
 * 4. Agent Commission deducted from Gross Discount (e.g. ₹5,000)
 * 5. Surplus = Gross Discount - Commission (e.g. ₹13,000 - ₹5,000 = ₹8,000)
 * 6. Surplus allocated according to configurable strategy:
 *    - DIVIDEND_DEDUCTION: Each of 41 members gets ₹195 credit on next month's payment
 *    - POOL_CARRY_FORWARD: ₹8,000 carried to Month N+1 auction pool
 *    - CASH_DIVIDEND: Paid back in cash
 *    - SECOND_AUCTION_RESERVE: Reserved for secondary micro-draw/lending pot
 */
export function calculateAuctionOutcome(input: AuctionCalculationInput): AuctionCalculationResult {
  const effectivePool = input.baseCollection + input.loansRecovered + input.interestEarned + input.openingCarryForward;
  const totalWinningBids = input.winningBids.reduce((sum, bid) => sum + bid, 0);
  
  if (totalWinningBids > effectivePool) {
    throw new Error(`Total winning bids (₹${totalWinningBids}) cannot exceed total available pool (₹${effectivePool})`);
  }

  const grossDiscount = effectivePool - totalWinningBids;
  const agentCommission = calculateCommission(effectivePool, grossDiscount, input.rule);
  const surplusAmount = Math.max(0, grossDiscount - agentCommission);

  let perMemberDividend = 0;
  let totalDividendDistributed = 0;
  let closingCarryForward = 0;
  let nextMonthMemberDue = input.monthlyContribution;
  let lentOutAmount = 0;

  switch (input.rule.surplusStrategy) {
    case 'DIVIDEND_DEDUCTION': {
      perMemberDividend = Math.floor(surplusAmount / input.totalMembers);
      totalDividendDistributed = perMemberDividend * input.totalMembers;
      // Remainder (e.g. 8000 - 7995 = 5) carried forward so no paisa is lost
      closingCarryForward = surplusAmount - totalDividendDistributed;
      nextMonthMemberDue = Math.max(0, input.monthlyContribution - perMemberDividend);
      break;
    }
    case 'POOL_CARRY_FORWARD': {
      perMemberDividend = 0;
      totalDividendDistributed = 0;
      closingCarryForward = surplusAmount;
      nextMonthMemberDue = input.monthlyContribution;
      break;
    }
    case 'CASH_DIVIDEND': {
      perMemberDividend = Math.floor(surplusAmount / input.totalMembers);
      totalDividendDistributed = perMemberDividend * input.totalMembers;
      closingCarryForward = surplusAmount - totalDividendDistributed;
      nextMonthMemberDue = input.monthlyContribution;
      break;
    }
    case 'SECOND_AUCTION_RESERVE': {
      perMemberDividend = 0;
      totalDividendDistributed = 0;
      closingCarryForward = surplusAmount;
      nextMonthMemberDue = input.monthlyContribution;
      break;
    }
    case 'LENDING_POOL': {
      perMemberDividend = 0;
      totalDividendDistributed = 0;
      closingCarryForward = 0;
      lentOutAmount = surplusAmount;
      nextMonthMemberDue = input.monthlyContribution;
      break;
    }
  }

  const formulaDescription = 
    `Pool: ₹${effectivePool.toLocaleString('en-IN')} | Bids: ₹${totalWinningBids.toLocaleString('en-IN')} | ` +
    `Discount: ₹${grossDiscount.toLocaleString('en-IN')} | Commission: ₹${agentCommission.toLocaleString('en-IN')} | ` +
    `Surplus: ₹${surplusAmount.toLocaleString('en-IN')} (Strategy: ${input.rule.surplusStrategy})`;

  return {
    effectivePool,
    totalWinningBids,
    grossDiscount,
    agentCommission,
    netPayout: totalWinningBids,
    surplusAmount,
    surplusStrategy: input.rule.surplusStrategy,
    perMemberDividend,
    totalDividendDistributed,
    closingCarryForward,
    nextMonthMemberDue,
    lentOutAmount,
    formulaDescription
  };
}

/**
 * Reconciles monthly financials to ensure zero leakage before month closure.
 * Invariant:
 * Inflows (Actual Collected + Opening Carry Forward) ==
 * Outflows (Net Payout + Agent Commission + Total Dividend Distributed + Closing Carry Forward)
 */
export function reconcileMonthlyFinancials(params: {
  actualCollected: number;
  loansRecovered: number;
  interestEarned: number;
  openingCarryForward: number;
  netPayout: number;
  agentCommission: number;
  totalDividendDistributed: number;
  lentOutAmount: number;
  closingCarryForward: number;
}): { isBalanced: boolean; totalInflows: number; totalOutflows: number; variance: number } {
  const totalInflows = params.actualCollected + params.loansRecovered + params.interestEarned + params.openingCarryForward;
  const totalOutflows = 
    params.netPayout + 
    params.agentCommission + 
    params.totalDividendDistributed + 
    params.lentOutAmount + 
    params.closingCarryForward;
  
  const variance = Math.abs(totalInflows - totalOutflows);
  const isBalanced = variance === 0;

  return {
    isBalanced,
    totalInflows,
    totalOutflows,
    variance
  };
}

/**
 * Formats numbers into standard Indian Currency format (e.g. ₹1,23,000)
 */
export function formatINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  return '₹' + amount.toLocaleString('en-IN');
}
