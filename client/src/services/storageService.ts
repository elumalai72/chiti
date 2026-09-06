import { 
  AgentAccount, 
  Chiti, 
  Member, 
  ChitMember, 
  ChitMonth, 
  Payment, 
  Payout, 
  LedgerEntry, 
  Receipt, 
  AuditLog, 
  CalculationRule,
  PaymentMethod
} from '../types';
import { 
  calculateExpectedMonthlyPool, 
  calculateAuctionOutcome, 
  reconcileMonthlyFinancials 
} from '../engine/calculationEngine';

const STORAGE_KEYS = {
  AGENTS: 'chiti_v1_agents',
  CURRENT_AGENT_ID: 'chiti_v1_current_agent_id',
  CHITIS: 'chiti_v1_chitis',
  MEMBERS: 'chiti_v1_members',
  CHIT_MEMBERS: 'chiti_v1_chit_members',
  CHIT_MONTHS: 'chiti_v1_chit_months',
  PAYMENTS: 'chiti_v1_payments',
  PAYOUTS: 'chiti_v1_payouts',
  LEDGER: 'chiti_v1_ledger',
  RECEIPTS: 'chiti_v1_receipts',
  AUDIT_LOGS: 'chiti_v1_audit_logs'
};

class StorageService {
  private agents: AgentAccount[] = [];
  private currentAgentId: string | null = null;
  private chitis: Chiti[] = [];
  private members: Member[] = [];
  private chitMembers: ChitMember[] = [];
  private chitMonths: ChitMonth[] = [];
  private payments: Payment[] = [];
  private payouts: Payout[] = [];
  private ledger: LedgerEntry[] = [];
  private receipts: Receipt[] = [];
  private auditLogs: AuditLog[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      const storedAgents = localStorage.getItem(STORAGE_KEYS.AGENTS);
      if (storedAgents) {
        this.agents = JSON.parse(storedAgents);
        this.currentAgentId = localStorage.getItem(STORAGE_KEYS.CURRENT_AGENT_ID);
        this.chitis = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHITIS) || '[]');
        this.members = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEMBERS) || '[]');
        this.chitMembers = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHIT_MEMBERS) || '[]');
        this.chitMonths = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHIT_MONTHS) || '[]');
        this.payments = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS) || '[]');
        this.payouts = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYOUTS) || '[]');
        this.ledger = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEDGER) || '[]');
        this.receipts = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECEIPTS) || '[]');
        this.auditLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]');
      }
    } catch (e) {
      console.error('Failed to load Chiti storage:', e);
    }
  }

  private saveAll() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(this.agents));
      if (this.currentAgentId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_AGENT_ID, this.currentAgentId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_AGENT_ID);
      }
      localStorage.setItem(STORAGE_KEYS.CHITIS, JSON.stringify(this.chitis));
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(this.members));
      localStorage.setItem(STORAGE_KEYS.CHIT_MEMBERS, JSON.stringify(this.chitMembers));
      localStorage.setItem(STORAGE_KEYS.CHIT_MONTHS, JSON.stringify(this.chitMonths));
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(this.payments));
      localStorage.setItem(STORAGE_KEYS.PAYOUTS, JSON.stringify(this.payouts));
      localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(this.ledger));
      localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(this.receipts));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.auditLogs));
    } catch (e) {
      console.error('Failed to save Chiti storage:', e);
    }
  }

  public clearAllData() {
    this.agents = [];
    this.currentAgentId = null;
    this.chitis = [];
    this.members = [];
    this.chitMembers = [];
    this.chitMonths = [];
    this.payments = [];
    this.payouts = [];
    this.ledger = [];
    this.receipts = [];
    this.auditLogs = [];
    this.saveAll();
  }

  // ==========================================
  // REAL AGENT AUTHENTICATION
  // ==========================================
  public registerAgent(data: {
    name: string;
    phone: string;
    email?: string;
    password?: string;
    businessName: string;
    town: string;
    state: string;
    address?: string;
  }): AgentAccount {
    const existing = this.agents.find(a => a.phone === data.phone);
    if (existing) {
      throw new Error(`An account with phone number ${data.phone} already exists. Please log in.`);
    }

    const newAgent: AgentAccount = {
      id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim(),
      password: data.password || 'chiti123',
      businessName: data.businessName.trim(),
      town: data.town.trim(),
      state: data.state.trim(),
      address: data.address?.trim(),
      createdAt: new Date().toISOString()
    };

    this.agents.push(newAgent);
    this.currentAgentId = newAgent.id;

    this.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      agentId: newAgent.id,
      actorName: newAgent.name,
      action: 'AGENT_REGISTRATION',
      target: newAgent.businessName,
      timestamp: new Date().toISOString(),
      details: `Agent ${newAgent.name} registered account for ${newAgent.businessName} in ${newAgent.town}`
    });

    this.saveAll();
    return newAgent;
  }

  public loginAgent(phoneOrEmail: string, password?: string): AgentAccount {
    const clean = phoneOrEmail.trim().toLowerCase();
    const agent = this.agents.find(
      a => a.phone === clean || (a.email && a.email.toLowerCase() === clean)
    );

    if (!agent) {
      throw new Error('No registered Agent account found with this phone number or email.');
    }

    if (password && agent.password && agent.password !== password) {
      throw new Error('Incorrect password. Please verify and try again.');
    }

    this.currentAgentId = agent.id;
    this.saveAll();
    return agent;
  }

  public logoutAgent() {
    this.currentAgentId = null;
    this.saveAll();
  }

  public getCurrentAgent(): AgentAccount | null {
    if (!this.currentAgentId) return null;
    return this.agents.find(a => a.id === this.currentAgentId) || null;
  }

  public updateAgentProfile(data: Partial<AgentAccount>): AgentAccount {
    const agent = this.getCurrentAgent();
    if (!agent) throw new Error('Not logged in');

    Object.assign(agent, data);
    this.saveAll();
    return agent;
  }

  // ==========================================
  // AGENT SCOPED QUERIES (NO FAKE DATA)
  // ==========================================
  public getChitisByAgent(agentId: string): Chiti[] {
    return this.chitis.filter(c => c.agentId === agentId);
  }

  public getChitiById(agentId: string, chitiId: string): Chiti | undefined {
    return this.chitis.find(c => c.agentId === agentId && c.id === chitiId);
  }

  public getMembersByAgent(agentId: string): Member[] {
    return this.members.filter(m => m.agentId === agentId);
  }

  public getChitMembers(chitiId: string): ChitMember[] {
    return this.chitMembers.filter(cm => cm.chitiId === chitiId);
  }

  public getChitMonths(chitiId: string): ChitMonth[] {
    return this.chitMonths.filter(cm => cm.chitiId === chitiId);
  }

  public getPaymentsByMonth(chitiId: string, monthNumber: number): Payment[] {
    return this.payments.filter(p => p.chitiId === chitiId && p.monthNumber === monthNumber);
  }

  public getLedgerByAgent(agentId: string, chitiId?: string): LedgerEntry[] {
    return this.ledger
      .filter(l => l.agentId === agentId && (!chitiId || l.chitiId === chitiId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public getReceiptsByAgent(chitiCode?: string): Receipt[] {
    return this.receipts.filter(r => !chitiCode || r.chitiCode === chitiCode);
  }

  public getReceiptById(receiptIdOrNumber: string): Receipt | undefined {
    return this.receipts.find(r => r.id === receiptIdOrNumber || r.receiptNumber === receiptIdOrNumber);
  }

  public getAuditLogs(agentId: string): AuditLog[] {
    return this.auditLogs
      .filter(a => a.agentId === agentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // ==========================================
  // REAL CHITI CREATION & LIFECYCLE
  // ==========================================
  public createChiti(params: {
    agentId: string;
    code: string;
    name: string;
    totalMembers: number;
    monthlyContribution: number;
    durationMonths: number;
    startDate: string;
    paymentDueDay: number;
    rule: CalculationRule;
    members: Array<{ fullName: string; phone: string; alternatePhone?: string; address?: string; notes?: string }>;
    notes?: string;
  }): Chiti {
    const agent = this.agents.find(a => a.id === params.agentId);
    if (!agent) throw new Error('Agent account not found');

    const expectedMonthlyPool = calculateExpectedMonthlyPool(params.totalMembers, params.monthlyContribution);
    const chitiId = `chiti-${Date.now()}`;

    const newChiti: Chiti = {
      id: chitiId,
      agentId: params.agentId,
      code: params.code.trim().toUpperCase(),
      name: params.name.trim(),
      totalMembers: params.totalMembers,
      monthlyContribution: params.monthlyContribution,
      expectedMonthlyPool,
      durationMonths: params.durationMonths,
      currentMonth: 1,
      startDate: params.startDate,
      paymentDueDay: params.paymentDueDay,
      status: 'ACTIVE',
      rule: { ...params.rule, chitiId },
      notes: params.notes,
      createdAt: new Date().toISOString()
    };

    this.chitis.push(newChiti);

    // Enroll real members entered by the Agent
    params.members.forEach((m, idx) => {
      const memberNumber = idx + 1;
      const memberId = `member-${Date.now()}-${memberNumber}`;

      const realMember: Member = {
        id: memberId,
        agentId: params.agentId,
        memberNumber,
        fullName: m.fullName.trim(),
        phone: m.phone.trim(),
        alternatePhone: m.alternatePhone?.trim(),
        address: m.address?.trim() || `Town Member #${memberNumber}`,
        joiningDate: params.startDate,
        notes: m.notes,
        status: 'ACTIVE'
      };
      this.members.push(realMember);

      this.chitMembers.push({
        id: `cm-${chitiId}-${memberNumber}`,
        chitiId,
        memberId,
        memberNumber,
        fullName: realMember.fullName,
        phone: realMember.phone,
        address: realMember.address,
        hasWonAuction: false,
        totalPaid: 0,
        pendingAmount: params.monthlyContribution,
        status: 'ACTIVE'
      });
    });

    // Initialize all months 1..duration
    for (let m = 1; m <= params.durationMonths; m++) {
      this.chitMonths.push({
        id: `month-${chitiId}-${m}`,
        chitiId,
        monthNumber: m,
        cycleDate: params.startDate,
        openingCarryForward: 0,
        expectedCollection: expectedMonthlyPool,
        actualCollected: 0,
        pendingCollection: expectedMonthlyPool,
        auctionStatus: 'SCHEDULED',
        closingCarryForward: 0,
        status: m === 1 ? 'OPEN' : 'UPCOMING'
      });
    }

    this.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      agentId: params.agentId,
      actorName: agent.name,
      action: 'CREATE_CHITI',
      target: newChiti.name,
      timestamp: new Date().toISOString(),
      details: `Created new Chiti "${newChiti.name}" with ${params.members.length} members at ₹${newChiti.monthlyContribution.toLocaleString('en-IN')}/mo (Expected Pool: ₹${expectedMonthlyPool.toLocaleString('en-IN')})`
    });

    this.saveAll();
    return newChiti;
  }

  /**
   * Add an additional real member to an existing Chiti
   */
  public addMemberToChiti(params: {
    agentId: string;
    chitiId: string;
    fullName: string;
    phone: string;
    alternatePhone?: string;
    address?: string;
    notes?: string;
  }): ChitMember {
    const chiti = this.chitis.find(c => c.id === params.chitiId && c.agentId === params.agentId);
    if (!chiti) throw new Error('Chiti not found');

    const existingChitMembers = this.chitMembers.filter(cm => cm.chitiId === params.chitiId);
    const nextMemberNumber = existingChitMembers.length + 1;

    const memberId = `member-${Date.now()}-${nextMemberNumber}`;
    const newMember: Member = {
      id: memberId,
      agentId: params.agentId,
      memberNumber: nextMemberNumber,
      fullName: params.fullName.trim(),
      phone: params.phone.trim(),
      alternatePhone: params.alternatePhone?.trim(),
      address: params.address?.trim() || `Town Member #${nextMemberNumber}`,
      joiningDate: new Date().toISOString().slice(0, 10),
      notes: params.notes,
      status: 'ACTIVE'
    };
    this.members.push(newMember);

    const chitMember: ChitMember = {
      id: `cm-${params.chitiId}-${nextMemberNumber}`,
      chitiId: params.chitiId,
      memberId,
      memberNumber: nextMemberNumber,
      fullName: newMember.fullName,
      phone: newMember.phone,
      address: newMember.address,
      hasWonAuction: false,
      totalPaid: 0,
      pendingAmount: chiti.monthlyContribution * chiti.currentMonth,
      status: 'ACTIVE'
    };
    this.chitMembers.push(chitMember);

    this.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      agentId: params.agentId,
      actorName: this.getCurrentAgent()?.name || 'Agent',
      action: 'ADD_MEMBER',
      target: `${newMember.fullName} (#${nextMemberNumber})`,
      timestamp: new Date().toISOString(),
      details: `Added ${newMember.fullName} to ${chiti.name}`
    });

    this.saveAll();
    return chitMember;
  }

  // ==========================================
  // REAL PAYMENT RECORDING & REVERSALS
  // ==========================================
  public recordPayment(params: {
    agentId: string;
    chitiId: string;
    chitMonthId: string;
    monthNumber: number;
    memberId: string;
    amountPaid: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }): { payment: Payment; receipt: Receipt } {
    const chiti = this.chitis.find(c => c.id === params.chitiId);
    if (!chiti) throw new Error('Chiti not found');

    const member = this.members.find(m => m.id === params.memberId);
    if (!member) throw new Error('Member not found');

    const agent = this.agents.find(a => a.id === params.agentId);

    let payment = this.payments.find(
      p => p.chitiId === params.chitiId && 
           p.monthNumber === params.monthNumber && 
           p.memberId === params.memberId
    );

    const amountDue = chiti.monthlyContribution;
    const isFull = params.amountPaid >= amountDue;
    const status: Payment['status'] = isFull ? 'PAID' : 'PARTIAL';
    const paymentDate = new Date().toISOString();
    const receiptNum = `RCT-${chiti.code}-M${params.monthNumber}-${String(member.memberNumber).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;

    if (payment) {
      payment.amountPaid = params.amountPaid;
      payment.paymentMethod = params.paymentMethod;
      payment.paymentDate = paymentDate;
      payment.status = status;
      payment.notes = params.notes;
    } else {
      payment = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        agentId: params.agentId,
        chitiId: params.chitiId,
        chitMonthId: params.chitMonthId,
        monthNumber: params.monthNumber,
        memberId: params.memberId,
        memberName: member.fullName,
        memberNumber: member.memberNumber,
        amountDue,
        amountPaid: params.amountPaid,
        paymentDate,
        paymentMethod: params.paymentMethod,
        status,
        receiptNumber: receiptNum,
        notes: params.notes
      };
      this.payments.push(payment);
    }

    // Update ChitMember totalPaid & pending
    const chitMember = this.chitMembers.find(cm => cm.chitiId === params.chitiId && cm.memberId === params.memberId);
    if (chitMember) {
      const allMemberPayments = this.payments.filter(p => p.chitiId === params.chitiId && p.memberId === params.memberId && p.status !== 'REVERSED');
      chitMember.totalPaid = allMemberPayments.reduce((acc, p) => acc + p.amountPaid, 0);
      const totalDueSoFar = chiti.currentMonth * chiti.monthlyContribution;
      chitMember.pendingAmount = Math.max(0, totalDueSoFar - chitMember.totalPaid);
    }

    // Update ChitMonth actualCollected & pending
    const chitMonth = this.chitMonths.find(m => m.id === params.chitMonthId);
    if (chitMonth) {
      const monthPayments = this.payments.filter(p => p.chitMonthId === params.chitMonthId && p.status !== 'REVERSED');
      chitMonth.actualCollected = monthPayments.reduce((acc, p) => acc + p.amountPaid, 0);
      chitMonth.pendingCollection = Math.max(0, chitMonth.expectedCollection - chitMonth.actualCollected);
    }

    // Double-Entry Financial Ledger
    const lastRunningBalance = this.ledger.length > 0 ? this.ledger[0].runningBalance : 0;
    const ledgerEntry: LedgerEntry = {
      id: `led-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      agentId: params.agentId,
      chitiId: params.chitiId,
      monthNumber: params.monthNumber,
      memberId: params.memberId,
      memberName: member.fullName,
      type: status === 'PAID' ? 'MEMBER_PAYMENT' : 'PARTIAL_PAYMENT',
      amount: params.amountPaid,
      flow: 'CREDIT',
      runningBalance: lastRunningBalance + params.amountPaid,
      date: paymentDate,
      referenceId: payment.id,
      isReversal: false,
      notes: `${status} payment of ₹${params.amountPaid.toLocaleString('en-IN')} received via ${params.paymentMethod} from ${member.fullName}`
    };
    this.ledger.unshift(ledgerEntry);

    // Printable Receipt
    const receipt: Receipt = {
      id: `rec-${Date.now()}`,
      receiptNumber: receiptNum,
      agentName: agent?.name || 'Agent',
      businessName: agent?.businessName || 'Chiti Services',
      agentPhone: agent?.phone || '',
      chitiName: chiti.name,
      chitiCode: chiti.code,
      memberName: member.fullName,
      memberNumber: member.memberNumber,
      monthNumber: params.monthNumber,
      amountDue,
      amountPaid: params.amountPaid,
      remainingDue: Math.max(0, amountDue - params.amountPaid),
      paymentMethod: params.paymentMethod,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      transactionId: `TXN-${Date.now().toString().slice(-8)}`
    };
    this.receipts.unshift(receipt);

    // Audit Log
    this.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      agentId: params.agentId,
      actorName: agent?.name || 'Agent',
      action: 'RECORD_PAYMENT',
      target: `${member.fullName} (${receiptNum})`,
      timestamp: paymentDate,
      details: `Recorded ${status} payment of ₹${params.amountPaid.toLocaleString('en-IN')} for Month ${params.monthNumber}`
    });

    this.saveAll();
    return { payment, receipt };
  }

  public reversePayment(params: {
    agentId: string;
    paymentId: string;
    reason: string;
  }): LedgerEntry {
    const payment = this.payments.find(p => p.id === params.paymentId);
    if (!payment) throw new Error('Payment not found');
    if (payment.status === 'REVERSED') throw new Error('Payment is already reversed');

    const reversedAmount = payment.amountPaid;
    payment.status = 'REVERSED';
    payment.notes = `REVERSED: ${params.reason}`;

    const chitMember = this.chitMembers.find(cm => cm.chitiId === payment.chitiId && cm.memberId === payment.memberId);
    if (chitMember) {
      chitMember.totalPaid = Math.max(0, chitMember.totalPaid - reversedAmount);
      chitMember.pendingAmount += reversedAmount;
    }

    const chitMonth = this.chitMonths.find(m => m.id === payment.chitMonthId);
    if (chitMonth) {
      chitMonth.actualCollected = Math.max(0, chitMonth.actualCollected - reversedAmount);
      chitMonth.pendingCollection += reversedAmount;
    }

    const lastRunningBalance = this.ledger.length > 0 ? this.ledger[0].runningBalance : 0;
    const reversalLedgerEntry: LedgerEntry = {
      id: `led-rev-${Date.now()}`,
      agentId: params.agentId,
      chitiId: payment.chitiId,
      monthNumber: payment.monthNumber,
      memberId: payment.memberId,
      memberName: payment.memberName,
      type: 'CORRECTION_REVERSAL',
      amount: reversedAmount,
      flow: 'DEBIT',
      runningBalance: lastRunningBalance - reversedAmount,
      date: new Date().toISOString(),
      referenceId: payment.id,
      isReversal: true,
      reversalOfId: payment.id,
      notes: `Reversal of ₹${reversedAmount.toLocaleString('en-IN')} for ${payment.memberName}. Reason: ${params.reason}`
    };
    this.ledger.unshift(reversalLedgerEntry);

    this.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      agentId: params.agentId,
      actorName: this.getCurrentAgent()?.name || 'Agent',
      action: 'REVERSE_PAYMENT',
      target: `${payment.memberName} (${payment.receiptNumber})`,
      timestamp: new Date().toISOString(),
      details: `Reversed payment of ₹${reversedAmount.toLocaleString('en-IN')}. Reason: ${params.reason}`
    });

    this.saveAll();
    return reversalLedgerEntry;
  }

  // ==========================================
  // REAL AUCTION & PAYOUT SETTLEMENT
  // ==========================================
  public confirmAuctionPayout(params: {
    agentId: string;
    chitiId: string;
    monthNumber: number;
    winnerMemberId: string;
    winningBid: number;
    payoutMethod: Payout['payoutMethod'];
    notes?: string;
  }): Payout {
    const chiti = this.chitis.find(c => c.id === params.chitiId);
    if (!chiti) throw new Error('Chiti not found');

    const winner = this.members.find(m => m.id === params.winnerMemberId);
    if (!winner) throw new Error('Winner member not found');

    const month = this.chitMonths.find(m => m.chitiId === params.chitiId && m.monthNumber === params.monthNumber);
    if (!month) throw new Error('Chit month not found');

    const calculation = calculateAuctionOutcome({
      grossMonthlyPool: chiti.expectedMonthlyPool,
      openingCarryForward: month.openingCarryForward,
      winningBid: params.winningBid,
      totalMembers: chiti.totalMembers,
      monthlyContribution: chiti.monthlyContribution,
      rule: chiti.rule
    });

    const now = new Date().toISOString();

    const payout: Payout = {
      id: `payout-${Date.now()}`,
      agentId: params.agentId,
      chitiId: params.chitiId,
      chitMonthId: month.id,
      monthNumber: params.monthNumber,
      winnerMemberId: params.winnerMemberId,
      winnerMemberName: winner.fullName,
      winnerMemberNumber: winner.memberNumber,
      grossPool: calculation.effectivePool,
      winningBid: calculation.winningBid,
      grossDiscount: calculation.grossDiscount,
      commission: calculation.agentCommission,
      netPayout: calculation.netPayout,
      surplus: calculation.surplusAmount,
      payoutDate: now,
      payoutMethod: params.payoutMethod,
      status: 'PAID',
      confirmedByAgent: true,
      notes: params.notes
    };
    this.payouts.unshift(payout);

    // Update ChitMonth
    month.auctionStatus = 'COMPLETED';
    month.winningBid = calculation.winningBid;
    month.winnerMemberId = params.winnerMemberId;
    month.winnerMemberName = winner.fullName;
    month.winnerMemberNumber = winner.memberNumber;
    month.grossDiscount = calculation.grossDiscount;
    month.agentCommission = calculation.agentCommission;
    month.surplusAmount = calculation.surplusAmount;
    month.memberDividendCredit = calculation.perMemberDividend;
    month.netPayout = calculation.netPayout;
    month.closingCarryForward = calculation.closingCarryForward;
    month.status = 'PAYOUT_PENDING';

    // Update ChitMember
    const chitMember = this.chitMembers.find(cm => cm.chitiId === params.chitiId && cm.memberId === params.winnerMemberId);
    if (chitMember) {
      chitMember.hasWonAuction = true;
      chitMember.wonMonth = params.monthNumber;
      chitMember.winningBidAmount = calculation.winningBid;
      chitMember.payoutAmount = calculation.netPayout;
    }

    // Ledger entries
    let runningBal = this.ledger.length > 0 ? this.ledger[0].runningBalance : 0;

    // 1. Payout
    runningBal -= calculation.netPayout;
    this.ledger.unshift({
      id: `led-${Date.now()}-1`,
      agentId: params.agentId,
      chitiId: params.chitiId,
      monthNumber: params.monthNumber,
      memberId: params.winnerMemberId,
      memberName: winner.fullName,
      type: 'AUCTION_PAYOUT',
      amount: calculation.netPayout,
      flow: 'DEBIT',
      runningBalance: runningBal,
      date: now,
      referenceId: payout.id,
      isReversal: false,
      notes: `Month ${params.monthNumber} payout of ₹${calculation.netPayout.toLocaleString('en-IN')} settled to ${winner.fullName}`
    });

    // 2. Commission
    runningBal -= calculation.agentCommission;
    this.ledger.unshift({
      id: `led-${Date.now()}-2`,
      agentId: params.agentId,
      chitiId: params.chitiId,
      monthNumber: params.monthNumber,
      type: 'COMMISSION_EARNED',
      amount: calculation.agentCommission,
      flow: 'DEBIT',
      runningBalance: runningBal,
      date: now,
      referenceId: payout.id,
      isReversal: false,
      notes: `Agent commission of ₹${calculation.agentCommission.toLocaleString('en-IN')} deducted for Month ${params.monthNumber}`
    });

    // 3. Dividend or Carry Forward
    if (calculation.totalDividendDistributed > 0) {
      runningBal -= calculation.totalDividendDistributed;
      this.ledger.unshift({
        id: `led-${Date.now()}-3`,
        agentId: params.agentId,
        chitiId: params.chitiId,
        monthNumber: params.monthNumber,
        type: 'DIVIDEND_CREDIT',
        amount: calculation.totalDividendDistributed,
        flow: 'DEBIT',
        runningBalance: runningBal,
        date: now,
        referenceId: payout.id,
        isReversal: false,
        notes: `Surplus dividend distributed: ₹${calculation.perMemberDividend} rebate × ${chiti.totalMembers} members`
      });
    }

    this.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      agentId: params.agentId,
      actorName: this.getCurrentAgent()?.name || 'Agent',
      action: 'CONFIRM_AUCTION_PAYOUT',
      target: `${winner.fullName} (Month ${params.monthNumber})`,
      timestamp: now,
      details: `Awarded auction to ${winner.fullName} at ₹${calculation.winningBid.toLocaleString('en-IN')}. Payout: ₹${calculation.netPayout.toLocaleString('en-IN')}, Commission: ₹${calculation.agentCommission.toLocaleString('en-IN')}`
    });

    this.saveAll();
    return payout;
  }

  public closeMonth(agentId: string, chitiId: string, monthNumber: number): boolean {
    const chiti = this.chitis.find(c => c.id === chitiId && c.agentId === agentId);
    if (!chiti) throw new Error('Chiti not found');

    const month = this.chitMonths.find(m => m.chitiId === chitiId && m.monthNumber === monthNumber);
    if (!month) throw new Error('Month not found');

    // Invariant check
    reconcileMonthlyFinancials({
      actualCollected: month.actualCollected,
      openingCarryForward: month.openingCarryForward,
      netPayout: month.netPayout || 0,
      agentCommission: month.agentCommission || 0,
      totalDividendDistributed: (month.memberDividendCredit || 0) * chiti.totalMembers,
      closingCarryForward: month.closingCarryForward || 0
    });

    month.status = 'CLOSED';

    if (monthNumber < chiti.durationMonths) {
      chiti.currentMonth = monthNumber + 1;
      const nextMonth = this.chitMonths.find(m => m.chitiId === chitiId && m.monthNumber === monthNumber + 1);
      if (nextMonth) {
        nextMonth.status = 'OPEN';
        nextMonth.openingCarryForward = month.closingCarryForward;
      }
    } else {
      chiti.status = 'COMPLETED';
    }

    this.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      agentId,
      actorName: this.getCurrentAgent()?.name || 'Agent',
      action: 'CLOSE_MONTH',
      target: `${chiti.name} (Month ${monthNumber})`,
      timestamp: new Date().toISOString(),
      details: `Month ${monthNumber} closed. Chiti cycle advanced to Month ${chiti.currentMonth}`
    });

    this.saveAll();
    return true;
  }
}

export const storage = new StorageService();
