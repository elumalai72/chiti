import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from './storageService';

describe('CHITI Version 1 - Real Operational Lifecycle & Invariance', () => {
  beforeEach(() => {
    storage.clearAllData();
  });

  it('initializes in clean state with 0 Chitis, 0 members, and 0 transactions', () => {
    expect(storage.getCurrentAgent()).toBeNull();
    expect(storage.getChitisByAgent('any')).toHaveLength(0);
    expect(storage.getMembersByAgent('any')).toHaveLength(0);
  });

  it('registers a real agent account with business details', () => {
    const agent = storage.registerAgent({
      name: 'Madhan Kumar',
      phone: '9876543210',
      businessName: 'Sri Chiti Financial Services',
      town: 'Kallakurichi',
      state: 'Tamil Nadu'
    });

    expect(agent.id).toBeDefined();
    expect(agent.name).toBe('Madhan Kumar');
    expect(agent.businessName).toBe('Sri Chiti Financial Services');
    expect(storage.getCurrentAgent()?.id).toBe(agent.id);
  });

  it('creates a real Chiti and dynamically computes expected pool (41 × 3,000 = 1,23,000)', () => {
    const agent = storage.registerAgent({
      name: 'Madhan Kumar',
      phone: '9876543210',
      businessName: 'Sri Chiti Services',
      town: 'Kallakurichi',
      state: 'Tamil Nadu'
    });

    const chiti = storage.createChiti({
      agentId: agent.id,
      name: 'Lakshmi Chiti 01',
      code: 'LAKSHMI-01',
      totalMembers: 41,
      monthlyContribution: 3000,
      durationMonths: 41,
      startDate: '2026-09-01',
      paymentDueDay: 10,
      rule: {
        id: 'rule-01',
        chitiId: '',
        version: 1,
        auctionType: 'REVERSE_BID_LOWEST_WINS',
        commissionType: 'FIXED',
        commissionValue: 5000,
        surplusStrategy: 'DIVIDEND_DEDUCTION',
        effectiveFromMonth: 1
      },
      members: Array.from({ length: 41 }, (_, i) => ({
        fullName: `Member ${i + 1}`,
        phone: `98765${String(i + 1).padStart(5, '0')}`
      }))
    });

    expect(chiti.expectedMonthlyPool).toBe(123000);
    expect(chiti.totalMembers).toBe(41);
    expect(chiti.currentMonth).toBe(1);

    const members = storage.getChitMembers(chiti.id);
    expect(members).toHaveLength(41);

    const months = storage.getChitMonths(chiti.id);
    expect(months).toHaveLength(41);
    expect(months[0].expectedCollection).toBe(123000);
  });

  it('records real payment, updates ledger, and supports non-destructive reversal', () => {
    const agent = storage.registerAgent({
      name: 'Madhan Kumar',
      phone: '9876543210',
      businessName: 'Sri Chiti Services',
      town: 'Kallakurichi',
      state: 'Tamil Nadu'
    });

    const chiti = storage.createChiti({
      agentId: agent.id,
      name: 'Lakshmi Chiti 01',
      code: 'LAKSHMI-01',
      totalMembers: 41,
      monthlyContribution: 3000,
      durationMonths: 41,
      startDate: '2026-09-01',
      paymentDueDay: 10,
      rule: {
        id: 'rule-01',
        chitiId: '',
        version: 1,
        auctionType: 'REVERSE_BID_LOWEST_WINS',
        commissionType: 'FIXED',
        commissionValue: 5000,
        surplusStrategy: 'DIVIDEND_DEDUCTION',
        effectiveFromMonth: 1
      },
      members: [{ fullName: 'K. Venkatesh', phone: '9876543211' }]
    });

    const member = storage.getMembersByAgent(agent.id)[0];
    const month1 = storage.getChitMonths(chiti.id)[0];

    // 1. Record payment
    const { payment, receipt } = storage.recordPayment({
      agentId: agent.id,
      chitiId: chiti.id,
      chitMonthId: month1.id,
      monthNumber: 1,
      memberId: member.id,
      amountPaid: 3000,
      paymentMethod: 'UPI'
    });

    expect(payment.status).toBe('PAID');
    expect(receipt.amountPaid).toBe(3000);

    const ledger = storage.getLedgerByAgent(agent.id, chiti.id);
    expect(ledger).toHaveLength(1);
    expect(ledger[0].type).toBe('MEMBER_PAYMENT');
    expect(ledger[0].amount).toBe(3000);

    // 2. Reversal without deletion
    const reversal = storage.reversePayment({
      agentId: agent.id,
      paymentId: payment.id,
      reason: 'Wrong receipt issued'
    });

    expect(reversal.type).toBe('CORRECTION_REVERSAL');
    expect(reversal.amount).toBe(3000);

    const updatedLedger = storage.getLedgerByAgent(agent.id, chiti.id);
    expect(updatedLedger).toHaveLength(2); // Original + Reversal preserved
  });
});
