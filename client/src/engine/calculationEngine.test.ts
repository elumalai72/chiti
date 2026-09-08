import { describe, it, expect } from 'vitest';
import { 
  calculateExpectedMonthlyPool, 
  calculateAuctionOutcome, 
  reconcileMonthlyFinancials,
  formatINR 
} from './calculationEngine';
import { CalculationRule } from '../types';

describe('Chiti Calculation Engine - Financial Correctness', () => {
  it('correctly calculates expected monthly collections across various Chiti tiers', () => {
    // Reference Chiti from user's register:
    expect(calculateExpectedMonthlyPool(41, 3000)).toBe(123000);

    // Other standard tiers:
    expect(calculateExpectedMonthlyPool(30, 2000)).toBe(60000);
    expect(calculateExpectedMonthlyPool(50, 5000)).toBe(250000);
    expect(calculateExpectedMonthlyPool(100, 10000)).toBe(1000000);
  });

  it('correctly processes reverse auction with DIVIDEND_DEDUCTION strategy (as per register)', () => {
    const rule: CalculationRule = {
      id: 'rule-test-1',
      chitiId: 'chiti-01',
      version: 1,
      auctionType: 'REVERSE_BID_LOWEST_WINS',
      commissionType: 'FIXED',
      commissionValue: 5000,
      surplusStrategy: 'DIVIDEND_DEDUCTION',
      effectiveFromMonth: 1
    };

    const outcome = calculateAuctionOutcome({
      baseCollection: 123000,
      loansRecovered: 0,
      interestEarned: 0,
      openingCarryForward: 0,
      winningBids: [110000],
      totalMembers: 41,
      monthlyContribution: 3000,
      rule
    });

    expect(outcome.effectivePool).toBe(123000);
    expect(outcome.totalWinningBids).toBe(110000);
    expect(outcome.grossDiscount).toBe(13000); // 1,23,000 - 1,10,000
    expect(outcome.agentCommission).toBe(5000);
    expect(outcome.surplusAmount).toBe(8000); // 13,000 - 5,000
    expect(outcome.perMemberDividend).toBe(195); // Math.floor(8000 / 41)
    expect(outcome.totalDividendDistributed).toBe(195 * 41); // 7,995
    expect(outcome.closingCarryForward).toBe(5); // Remainder 8000 - 7995
    expect(outcome.nextMonthMemberDue).toBe(2805); // 3,000 - 195

    // Zero leakage check:
    const totalOut = outcome.netPayout + outcome.agentCommission + outcome.totalDividendDistributed + outcome.closingCarryForward;
    expect(totalOut).toBe(123000);

    const reconciliation = reconcileMonthlyFinancials({
      actualCollected: 123000,
      loansRecovered: 0,
      interestEarned: 0,
      openingCarryForward: 0,
      netPayout: outcome.netPayout,
      agentCommission: outcome.agentCommission,
      totalDividendDistributed: outcome.totalDividendDistributed,
      lentOutAmount: outcome.lentOutAmount,
      closingCarryForward: outcome.closingCarryForward
    });

    expect(reconciliation.isBalanced).toBe(true);
    expect(reconciliation.variance).toBe(0);
  });

  it('correctly processes POOL_CARRY_FORWARD strategy', () => {
    const rule: CalculationRule = {
      id: 'rule-test-2',
      chitiId: 'chiti-02',
      version: 1,
      auctionType: 'REVERSE_BID_LOWEST_WINS',
      commissionType: 'FIXED',
      commissionValue: 5000,
      surplusStrategy: 'POOL_CARRY_FORWARD',
      effectiveFromMonth: 1
    };

    const outcome = calculateAuctionOutcome({
      baseCollection: 123000,
      loansRecovered: 0,
      interestEarned: 0,
      openingCarryForward: 0,
      winningBids: [110000],
      totalMembers: 41,
      monthlyContribution: 3000,
      rule
    });

    expect(outcome.perMemberDividend).toBe(0);
    expect(outcome.totalDividendDistributed).toBe(0);
    expect(outcome.closingCarryForward).toBe(8000); // Entire surplus carried forward
    expect(outcome.nextMonthMemberDue).toBe(3000); // Member still pays base 3,000

    // Next month with carry forward of 8,000
    const nextMonthOutcome = calculateAuctionOutcome({
      baseCollection: 123000,
      loansRecovered: 0,
      interestEarned: 0,
      openingCarryForward: outcome.closingCarryForward, // 8,000
      winningBids: [115000],
      totalMembers: 41,
      monthlyContribution: 3000,
      rule
    });

    expect(nextMonthOutcome.effectivePool).toBe(131000); // 1,23,000 + 8,000
    expect(nextMonthOutcome.grossDiscount).toBe(16000); // 1,31,000 - 1,15,000
  });

  it('correctly calculates percentage-based commissions', () => {
    const percentPoolRule: CalculationRule = {
      id: 'rule-percent',
      chitiId: 'chiti-03',
      version: 1,
      auctionType: 'REVERSE_BID_LOWEST_WINS',
      commissionType: 'PERCENT_POOL',
      commissionValue: 5, // 5% of 1,23,000 = 6,150
      surplusStrategy: 'DIVIDEND_DEDUCTION',
      effectiveFromMonth: 1
    };

    const outcome = calculateAuctionOutcome({
      baseCollection: 123000,
      loansRecovered: 0,
      interestEarned: 0,
      openingCarryForward: 0,
      winningBids: [110000],
      totalMembers: 41,
      monthlyContribution: 3000,
      rule: percentPoolRule
    });

    expect(outcome.agentCommission).toBe(6150);
    expect(outcome.surplusAmount).toBe(13000 - 6150); // 6,850
  });

  it('formats Indian currency strings correctly', () => {
    expect(formatINR(123000)).toBe('₹1,23,000');
    expect(formatINR(5000)).toBe('₹5,000');
    expect(formatINR(0)).toBe('₹0');
  });
});
