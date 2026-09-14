import { supabase } from './supabaseClient';
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
  PaymentMethod,
  Loan,
  LoanRepayment
} from '../types';
import { 
  calculateExpectedMonthlyPool, 
  calculateAuctionOutcome, 
  reconcileMonthlyFinancials 
} from '../engine/calculationEngine';

const CURRENT_AGENT_KEY = 'chiti_v1_current_agent_id';

class DbService {
  private currentAgentId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.currentAgentId = localStorage.getItem(CURRENT_AGENT_KEY);
    }
  }

  // ==========================================
  // AGENT AUTHENTICATION
  // ==========================================
  public async registerAgent(data: {
    name: string;
    phone: string;
    email?: string;
    password?: string;
    businessName: string;
    town: string;
    state: string;
    address?: string;
  }): Promise<AgentAccount> {
    const { data: existing, error: checkErr } = await supabase.from('agents').select('id').eq('phone', data.phone).maybeSingle();
    if (checkErr) throw checkErr;
    if (existing) throw new Error(`An account with phone number ${data.phone} already exists. Please log in.`);

    const newAgent = {
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim(),
      password: data.password || 'chiti123',
      business_name: data.businessName.trim(),
      town: data.town.trim(),
      state: data.state.trim(),
      address: data.address?.trim()
    };

    const { data: inserted, error: insertErr } = await supabase.from('agents').insert(newAgent).select().single();
    if (insertErr) throw insertErr;

    const agent: AgentAccount = this.mapAgent(inserted);
    this.currentAgentId = agent.id;
    localStorage.setItem(CURRENT_AGENT_KEY, agent.id);

    await this.logAudit({
      agentId: agent.id,
      actorName: agent.name,
      action: 'AGENT_REGISTRATION',
      target: agent.businessName,
      details: `Agent ${agent.name} registered account for ${agent.businessName} in ${agent.town}`
    });

    return agent;
  }

  public async loginAgent(phoneOrEmail: string, password?: string): Promise<AgentAccount> {
    const clean = phoneOrEmail.trim().toLowerCase();
    
    let { data: agentData, error } = await supabase.from('agents').select('*').eq('phone', clean).maybeSingle();

    if (!agentData) {
      const { data: emailData, error: emailErr } = await supabase.from('agents').select('*').eq('email', clean).maybeSingle();
      if (emailErr) throw emailErr;
      agentData = emailData;
    }

    if (!agentData) throw new Error('No registered Agent account found with this phone number or email.');
    if (password && agentData.password && agentData.password !== password) throw new Error('Incorrect password. Please verify and try again.');

    const agent = this.mapAgent(agentData);
    this.currentAgentId = agent.id;
    localStorage.setItem(CURRENT_AGENT_KEY, agent.id);
    return agent;
  }

  public logoutAgent() {
    this.currentAgentId = null;
    localStorage.removeItem(CURRENT_AGENT_KEY);
  }

  public async getCurrentAgent(): Promise<AgentAccount | null> {
    if (!this.currentAgentId) return null;
    const { data, error } = await supabase.from('agents').select('*').eq('id', this.currentAgentId).maybeSingle();
    if (error || !data) {
      this.logoutAgent();
      return null;
    }
    return this.mapAgent(data);
  }

  // ==========================================
  // QUERIES
  // ==========================================
  public async getChitisByAgent(agentId: string): Promise<Chiti[]> {
    const { data, error } = await supabase.from('chitis').select(`*, calculation_rules!fk_rule_chiti (*)`).eq('agent_id', agentId).order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(this.mapChiti);
  }

  public async getChitiById(chitiId: string): Promise<Chiti | null> {
    const { data, error } = await supabase.from('chitis').select(`*, calculation_rules!fk_rule_chiti (*)`).eq('id', chitiId).maybeSingle();
    if (error) throw error;
    return data ? this.mapChiti(data) : null;
  }

  public async getMembersByAgent(agentId: string): Promise<Member[]> {
    const { data, error } = await supabase.from('members').select('*').eq('agent_id', agentId).order('member_number', { ascending: true });
    if (error) throw error;
    return data.map(this.mapMember);
  }

  public async getChitMembers(chitiId: string): Promise<ChitMember[]> {
    const { data, error } = await supabase.from('chit_members').select('*').eq('chiti_id', chitiId).order('member_number', { ascending: true });
    if (error) throw error;
    return data.map(this.mapChitMember);
  }

  public async getChitMonths(chitiId: string): Promise<ChitMonth[]> {
    const { data, error } = await supabase.from('chit_months').select('*').eq('chiti_id', chitiId).order('month_number', { ascending: true });
    if (error) throw error;

    // Auto-heal: If months are missing or incomplete, automatically create them
    if (!data || data.length === 0) {
      const chiti = await this.getChitiById(chitiId);
      if (chiti && chiti.durationMonths > 0) {
        const expectedMonthlyPool = chiti.expectedMonthlyPool || (chiti.totalMembers * chiti.monthlyContribution);
        const missingMonths = Array.from({ length: chiti.durationMonths }, (_, i) => ({
          chiti_id: chitiId,
          month_number: i + 1,
          cycle_date: chiti.startDate,
          expected_collection: expectedMonthlyPool,
          pending_collection: expectedMonthlyPool,
          status: i === 0 ? 'OPEN' : 'UPCOMING'
        }));
        await supabase.from('chit_months').insert(missingMonths);
        const { data: refetched } = await supabase.from('chit_months').select('*').eq('chiti_id', chitiId).order('month_number', { ascending: true });
        if (refetched) return refetched.map(this.mapChitMonth);
      }
    }

    return data.map(this.mapChitMonth);
  }

  public async getLoans(chitiId: string): Promise<any[]> {
    const { data, error } = await supabase.from('loans').select('*').eq('chiti_id', chitiId).order('issued_date', { ascending: false });
    if (error) throw error;
    return data;
  }

  public async getPaymentsByMonth(chitiId: string, monthNumber: number): Promise<Payment[]> {
    const { data, error } = await supabase.from('payments').select('*').eq('chiti_id', chitiId).eq('month_number', monthNumber);
    if (error) throw error;
    return data.map(this.mapPayment);
  }

  public async getLedgerByAgent(agentId: string, chitiId?: string): Promise<LedgerEntry[]> {
    let query = supabase.from('ledger').select('*').eq('agent_id', agentId).order('date', { ascending: false });
    if (chitiId) query = query.eq('chiti_id', chitiId);
    const { data, error } = await query;
    if (error) throw error;
    return data.map(this.mapLedger);
  }

  public async getReceiptsByAgent(chitiCode?: string): Promise<Receipt[]> {
    let query = supabase.from('receipts').select('*').order('date', { ascending: false });
    if (chitiCode) query = query.eq('chiti_code', chitiCode);
    const { data, error } = await query;
    if (error) throw error;
    return data.map(this.mapReceipt);
  }

  public async getReceiptByNumber(receiptNumber: string): Promise<Receipt | null> {
    const { data, error } = await supabase.from('receipts').select('*').eq('receipt_number', receiptNumber).maybeSingle();
    if (error) throw error;
    return data ? this.mapReceipt(data) : null;
  }

  public async getAllPaymentsForChiti(chitiId: string): Promise<Payment[]> {
    const { data, error } = await supabase.from('payments')
      .select('*')
      .eq('chiti_id', chitiId)
      .neq('status', 'REVERSED');
    if (error) throw error;
    return (data || []).map(this.mapPayment);
  }

  // ==========================================
  // MUTATIONS (Simplified for client side)
  // ==========================================
  public async createChiti(params: {
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
  }): Promise<Chiti> {
    const expectedMonthlyPool = calculateExpectedMonthlyPool(params.totalMembers, params.monthlyContribution);
    
    // 1. Insert Chiti
    const { data: chitiData, error: chitiErr } = await supabase.from('chitis').insert({
      agent_id: params.agentId,
      code: params.code.trim().toUpperCase(),
      name: params.name.trim(),
      total_members: params.totalMembers,
      monthly_contribution: params.monthlyContribution,
      expected_monthly_pool: expectedMonthlyPool,
      duration_months: params.durationMonths,
      current_month: 1,
      start_date: params.startDate,
      payment_due_day: params.paymentDueDay,
      status: 'ACTIVE',
      notes: params.notes
    }).select().single();
    if (chitiErr) throw chitiErr;
    const chitiId = chitiData.id;

    // 2. Insert Rule
    await supabase.from('calculation_rules').insert({
      chiti_id: chitiId,
      auction_type: params.rule.auctionType,
      commission_type: params.rule.commissionType,
      commission_value: params.rule.commissionValue,
      surplus_strategy: params.rule.surplusStrategy,
      description: params.rule.description
    });

    // 3. Batch Insert Members & ChitMembers (fast, robust against mobile connection drops)
    const membersToInsert = params.members.map((m, idx) => ({
      agent_id: params.agentId,
      member_number: idx + 1,
      full_name: m.fullName.trim() || `Member ${idx + 1}`,
      phone: m.phone.trim(),
      address: m.address?.trim() || `Town Member #${idx + 1}`,
      joining_date: params.startDate
    }));

    const { data: insertedMembers, error: memErr } = await supabase
      .from('members')
      .insert(membersToInsert)
      .select();
    if (memErr) throw memErr;

    const chitMembersToInsert = insertedMembers.map(mem => ({
      chiti_id: chitiId,
      member_id: mem.id,
      member_number: mem.member_number,
      full_name: mem.full_name,
      phone: mem.phone,
      address: mem.address,
      pending_amount: params.monthlyContribution
    }));

    const { error: cmErr } = await supabase
      .from('chit_members')
      .insert(chitMembersToInsert);
    if (cmErr) throw cmErr;

    // 4. Batch Insert Months
    const monthsToInsert = Array.from({length: params.durationMonths}, (_, i) => ({
      chiti_id: chitiId,
      month_number: i + 1,
      cycle_date: params.startDate,
      expected_collection: expectedMonthlyPool,
      pending_collection: expectedMonthlyPool,
      status: i === 0 ? 'OPEN' : 'UPCOMING'
    }));
    const { error: moErr } = await supabase.from('chit_months').insert(monthsToInsert);
    if (moErr) throw moErr;

    return this.getChitiById(chitiId) as Promise<Chiti>;
  }

  public async deleteChiti(chitiId: string): Promise<void> {
    // Manually cascade delete just in case Supabase doesn't have ON DELETE CASCADE set
    await supabase.from('ledger').delete().eq('chiti_id', chitiId);
    await supabase.from('payments').delete().eq('chiti_id', chitiId);
    await supabase.from('payouts').delete().eq('chiti_id', chitiId);
    await supabase.from('loans').delete().eq('chiti_id', chitiId);
    await supabase.from('chit_months').delete().eq('chiti_id', chitiId);
    await supabase.from('chit_members').delete().eq('chiti_id', chitiId);
    await supabase.from('calculation_rules').delete().eq('chiti_id', chitiId);
    
    // Finally delete the Chiti itself
    const { error } = await supabase.from('chitis').delete().eq('id', chitiId);
    if (error) throw error;
  }

  public async addMemberToChiti(params: {
    agentId: string;
    chitiId: string;
    fullName: string;
    phone: string;
    alternatePhone?: string;
    address?: string;
    notes?: string;
  }): Promise<ChitMember> {
    const chiti = await this.getChitiById(params.chitiId);
    if (!chiti) throw new Error('Chiti not found');

    const chitMembers = await this.getChitMembers(params.chitiId);
    const nextMemberNumber = chitMembers.length + 1;

    // 1. Create Member
    const { data: newMember, error: memErr } = await supabase.from('members').insert({
      agent_id: params.agentId,
      member_number: nextMemberNumber,
      full_name: params.fullName.trim(),
      phone: params.phone.trim(),
      alternate_phone: params.alternatePhone?.trim(),
      address: params.address?.trim() || `Town Member #${nextMemberNumber}`,
      joining_date: new Date().toISOString().slice(0, 10),
      notes: params.notes,
      status: 'ACTIVE'
    }).select().single();
    if (memErr) throw memErr;

    // 2. Create ChitMember
    const pendingAmount = chiti.monthlyContribution * chiti.currentMonth;
    const { data: chitMemberData, error: cmErr } = await supabase.from('chit_members').insert({
      chiti_id: params.chitiId,
      member_id: newMember.id,
      member_number: nextMemberNumber,
      full_name: newMember.full_name,
      phone: newMember.phone,
      address: newMember.address,
      pending_amount: pendingAmount,
      status: 'ACTIVE'
    }).select().single();
    if (cmErr) throw cmErr;

    // 3. Log Audit
    const agent = await this.getCurrentAgent();
    await this.logAudit({
      agentId: params.agentId,
      actorName: agent?.name || 'Agent',
      action: 'ADD_MEMBER',
      target: `${newMember.full_name} (#${nextMemberNumber})`,
      details: `Added ${newMember.full_name} to ${chiti.name}`
    });

    return this.mapChitMember(chitMemberData);
  }

  public async recordPayment(params: {
    agentId: string;
    chitiId: string;
    chitMonthId: string;
    monthNumber: number;
    memberId: string;
    amountPaid: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }): Promise<{ payment: Payment; receipt: Receipt }> {
    // Stage 1: Fetch prerequisite data in parallel
    const [chiti, memberRes, agent, existingPaymentRes] = await Promise.all([
      this.getChitiById(params.chitiId),
      supabase.from('members').select('*').eq('id', params.memberId).single(),
      this.getCurrentAgent(),
      supabase.from('payments')
        .select('*')
        .eq('chiti_id', params.chitiId)
        .eq('month_number', params.monthNumber)
        .eq('member_id', params.memberId)
        .maybeSingle()
    ]);

    if (!chiti) throw new Error('Chiti not found');
    if (memberRes.error || !memberRes.data) throw memberRes.error || new Error('Member not found');

    const member = memberRes.data;
    const existingPayment = existingPaymentRes.data;

    const amountDue = chiti.monthlyContribution;
    const isFull = params.amountPaid >= amountDue;
    const status = isFull ? 'PAID' : 'PARTIAL';
    const paymentDate = new Date().toISOString();
    const receiptNum = `RCT-${chiti.code}-M${params.monthNumber}-${String(member.member_number).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;

    // Stage 2: Save payment
    let paymentData;
    if (existingPayment) {
      const { data, error } = await supabase.from('payments').update({
        amount_paid: params.amountPaid,
        payment_method: params.paymentMethod,
        payment_date: paymentDate,
        status,
        notes: params.notes
      }).eq('id', existingPayment.id).select().single();
      if (error) throw error;
      paymentData = data;
    } else {
      const { data, error } = await supabase.from('payments').insert({
        agent_id: params.agentId,
        chiti_id: params.chitiId,
        chit_month_id: params.chitMonthId,
        month_number: params.monthNumber,
        member_id: params.memberId,
        member_name: member.full_name,
        member_number: member.member_number,
        amount_due: amountDue,
        amount_paid: params.amountPaid,
        payment_date: paymentDate,
        payment_method: params.paymentMethod,
        status,
        receipt_number: receiptNum,
        notes: params.notes
      }).select().single();
      if (error) throw error;
      paymentData = data;
    }

    // Stage 3: Fetch updated totals in parallel
    const [allPaymentsRes, monthRes, monthPaymentsRes, lastLedgerRes] = await Promise.all([
      supabase.from('payments').select('amount_paid').eq('chiti_id', params.chitiId).eq('member_id', params.memberId).neq('status', 'REVERSED'),
      supabase.from('chit_months').select('*').eq('id', params.chitMonthId).single(),
      supabase.from('payments').select('amount_paid').eq('chit_month_id', params.chitMonthId).neq('status', 'REVERSED'),
      supabase.from('ledger').select('running_balance').eq('agent_id', params.agentId).order('date', { ascending: false }).limit(1).maybeSingle()
    ]);

    const totalPaid = (allPaymentsRes.data || []).reduce((acc, p) => acc + Number(p.amount_paid), 0);
    const pendingAmount = Math.max(0, (chiti.currentMonth * chiti.monthlyContribution) - totalPaid);

    const month = monthRes.data;
    const actualCollected = (monthPaymentsRes.data || []).reduce((acc, p) => acc + Number(p.amount_paid), 0);
    const pendingCollection = Math.max(0, Number(month?.expected_collection || 0) - actualCollected);
    const lastRunningBalance = lastLedgerRes.data ? Number(lastLedgerRes.data.running_balance) : 0;

    // Stage 4: Commit member update, month update, ledger insert, receipt insert in parallel
    const [,, , receiptRes] = await Promise.all([
      supabase.from('chit_members').update({
        total_paid: totalPaid,
        pending_amount: pendingAmount
      }).eq('chiti_id', params.chitiId).eq('member_id', params.memberId),

      month ? supabase.from('chit_months').update({
        actual_collected: actualCollected,
        pending_collection: pendingCollection
      }).eq('id', params.chitMonthId) : Promise.resolve(),

      supabase.from('ledger').insert({
        agent_id: params.agentId,
        chiti_id: params.chitiId,
        month_number: params.monthNumber,
        member_id: params.memberId,
        member_name: member.full_name,
        type: status === 'PAID' ? 'MEMBER_PAYMENT' : 'PARTIAL_PAYMENT',
        amount: params.amountPaid,
        flow: 'CREDIT',
        running_balance: lastRunningBalance + params.amountPaid,
        date: paymentDate,
        reference_id: paymentData.id,
        notes: `${status} payment of ₹${params.amountPaid.toLocaleString('en-IN')} received via ${params.paymentMethod} from ${member.full_name}`
      }),

      supabase.from('receipts').insert({
        receipt_number: receiptNum,
        agent_name: agent?.name || 'Agent',
        business_name: agent?.businessName || 'Chiti Services',
        agent_phone: agent?.phone || '',
        chiti_name: chiti.name,
        chiti_code: chiti.code,
        member_name: member.full_name,
        member_number: member.member_number,
        month_number: params.monthNumber,
        amount_due: amountDue,
        amount_paid: params.amountPaid,
        remaining_due: Math.max(0, amountDue - params.amountPaid),
        payment_method: params.paymentMethod,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        transaction_id: `TXN-${Date.now().toString().slice(-8)}`
      }).select().single()
    ]);

    const receiptData = receiptRes.data || {
      id: receiptNum,
      receipt_number: receiptNum,
      agent_name: agent?.name || 'Agent',
      business_name: agent?.businessName || 'Chiti Services',
      agent_phone: agent?.phone || '',
      chiti_name: chiti.name,
      chiti_code: chiti.code,
      member_name: member.full_name,
      member_number: member.member_number,
      month_number: params.monthNumber,
      amount_due: amountDue,
      amount_paid: params.amountPaid,
      remaining_due: Math.max(0, amountDue - params.amountPaid),
      payment_method: params.paymentMethod,
      date: new Date().toLocaleDateString('en-IN'),
      transaction_id: `TXN-${Date.now().toString().slice(-8)}`
    };

    return { payment: this.mapPayment(paymentData), receipt: this.mapReceipt(receiptData) };
  }

  public async reversePayment(params: {
    agentId: string;
    paymentId: string;
    reason: string;
  }): Promise<LedgerEntry> {
    const { data: payment, error: payErr } = await supabase.from('payments').select('*').eq('id', params.paymentId).single();
    if (payErr) throw payErr;
    if (payment.status === 'REVERSED') throw new Error('Payment is already reversed');

    const reversedAmount = Number(payment.amount_paid);
    
    // In parallel: update payment status, fetch chit_member, fetch chit_month, and fetch last ledger balance
    const [, chitMemberRes, chitMonthRes, lastLedgerRes] = await Promise.all([
      supabase.from('payments').update({
        status: 'REVERSED',
        notes: `REVERSED: ${params.reason}`
      }).eq('id', params.paymentId),
      supabase.from('chit_members').select('total_paid, pending_amount').eq('chiti_id', payment.chiti_id).eq('member_id', payment.member_id).single(),
      supabase.from('chit_months').select('actual_collected, pending_collection').eq('id', payment.chit_month_id).single(),
      supabase.from('ledger').select('running_balance').eq('agent_id', params.agentId).order('date', { ascending: false }).limit(1).maybeSingle()
    ]);

    const chitMember = chitMemberRes.data;
    const chitMonth = chitMonthRes.data;
    const lastRunningBalance = lastLedgerRes.data ? Number(lastLedgerRes.data.running_balance) : 0;

    // In parallel: update chit_member, update chit_month, insert ledger reversal
    const [, , ledgerRes] = await Promise.all([
      chitMember ? supabase.from('chit_members').update({
        total_paid: Math.max(0, Number(chitMember.total_paid) - reversedAmount),
        pending_amount: Number(chitMember.pending_amount) + reversedAmount
      }).eq('chiti_id', payment.chiti_id).eq('member_id', payment.member_id) : Promise.resolve(),

      chitMonth ? supabase.from('chit_months').update({
        actual_collected: Math.max(0, Number(chitMonth.actual_collected) - reversedAmount),
        pending_collection: Number(chitMonth.pending_collection) + reversedAmount
      }).eq('id', payment.chit_month_id) : Promise.resolve(),

      supabase.from('ledger').insert({
        agent_id: params.agentId,
        chiti_id: payment.chiti_id,
        month_number: payment.month_number,
        member_id: payment.member_id,
        member_name: payment.member_name,
        type: 'CORRECTION_REVERSAL',
        amount: reversedAmount,
        flow: 'DEBIT',
        running_balance: lastRunningBalance - reversedAmount,
        reference_id: payment.id,
        is_reversal: true,
        reversal_of_id: payment.id,
        notes: `Reversal of ₹${reversedAmount.toLocaleString('en-IN')} for ${payment.member_name}. Reason: ${params.reason}`
      }).select().single()
    ]);

    if (ledgerRes.error) throw ledgerRes.error;
    return this.mapLedger(ledgerRes.data);
  }

  public async confirmAuctionsPayout(params: {
    agentId: string;
    chitiId: string;
    monthNumber: number;
    winners: Array<{
      winnerMemberId: string;
      winningBid: number;
      payoutMethod: Payout['payoutMethod'];
    }>;
    notes?: string;
  }): Promise<Payout[]> {
    const chiti = await this.getChitiById(params.chitiId);
    if (!chiti) throw new Error('Chiti not found');

    const { data: month } = await supabase.from('chit_months').select('*').eq('chiti_id', params.chitiId).eq('month_number', params.monthNumber).single();
    
    // Support dynamic pool:
    const baseCollection = chiti.expectedMonthlyPool;
    const loansRecovered = Number(month.loans_recovered || 0);
    const interestEarned = Number(month.interest_earned || 0);

    const calculation = calculateAuctionOutcome({
      baseCollection,
      loansRecovered,
      interestEarned,
      openingCarryForward: Number(month.opening_carry_forward),
      winningBids: params.winners.map(w => w.winningBid),
      totalMembers: chiti.totalMembers,
      monthlyContribution: chiti.monthlyContribution,
      rule: chiti.rule
    });

    const payouts = [];
    let runningBal = 0; // We'll get last ledger below
    const { data: lastLedger } = await supabase.from('ledger').select('running_balance').eq('agent_id', params.agentId).order('date', { ascending: false }).limit(1).maybeSingle();
    runningBal = lastLedger ? Number(lastLedger.running_balance) : 0;
    const now = new Date().toISOString();
    const ledgerInserts = [];

    // Process each winner
    for (const winnerInput of params.winners) {
      const { data: winner } = await supabase.from('members').select('*').eq('id', winnerInput.winnerMemberId).single();
      
      const { data: payoutData, error: payErr } = await supabase.from('payouts').insert({
        agent_id: params.agentId,
        chiti_id: params.chitiId,
        chit_month_id: month.id,
        month_number: params.monthNumber,
        winner_member_id: winnerInput.winnerMemberId,
        winner_member_name: winner.full_name,
        winner_member_number: winner.member_number,
        gross_pool: calculation.effectivePool,
        winning_bid: winnerInput.winningBid,
        gross_discount: calculation.effectivePool - winnerInput.winningBid,
        commission: 0, // Recorded below
        net_payout: winnerInput.winningBid,
        surplus: 0,
        payout_method: winnerInput.payoutMethod,
        notes: params.notes
      }).select().single();
      if (payErr) throw payErr;
      
      payouts.push(payoutData);
      
      runningBal -= winnerInput.winningBid;
      ledgerInserts.push({ agent_id: params.agentId, chiti_id: params.chitiId, month_number: params.monthNumber, member_id: winnerInput.winnerMemberId, member_name: winner.full_name, type: 'AUCTION_PAYOUT', amount: winnerInput.winningBid, flow: 'DEBIT', running_balance: runningBal, date: now, reference_id: payoutData.id, notes: `Month ${params.monthNumber} payout of ₹${winnerInput.winningBid.toLocaleString('en-IN')} settled to ${winner.full_name}` });

      // Update ChitMember for each winner
      await supabase.from('chit_members').update({
        has_won_auction: true,
        won_month: params.monthNumber,
        winning_bid_amount: winnerInput.winningBid,
        payout_amount: winnerInput.winningBid
      }).eq('chiti_id', params.chitiId).eq('member_id', winnerInput.winnerMemberId);
    }

    // Agent Commission Ledger
    runningBal -= calculation.agentCommission;
    ledgerInserts.push({ agent_id: params.agentId, chiti_id: params.chitiId, month_number: params.monthNumber, type: 'COMMISSION_EARNED', amount: calculation.agentCommission, flow: 'DEBIT', running_balance: runningBal, date: now, reference_id: payouts[0].id, notes: `Agent commission of ₹${calculation.agentCommission.toLocaleString('en-IN')} deducted for Month ${params.monthNumber}` });

    if (calculation.totalDividendDistributed > 0) {
      runningBal -= calculation.totalDividendDistributed;
      ledgerInserts.push({ agent_id: params.agentId, chiti_id: params.chitiId, month_number: params.monthNumber, type: 'DIVIDEND_CREDIT', amount: calculation.totalDividendDistributed, flow: 'DEBIT', running_balance: runningBal, date: now, reference_id: payouts[0].id, notes: `Surplus dividend distributed: ₹${calculation.perMemberDividend} rebate × ${chiti.totalMembers} members` });
    }

    await supabase.from('ledger').insert(ledgerInserts);

    // Update ChitMonth with aggregate data
    await supabase.from('chit_months').update({
      auction_status: 'COMPLETED',
      gross_discount: calculation.grossDiscount,
      agent_commission: calculation.agentCommission,
      surplus_amount: calculation.surplusAmount,
      member_dividend_credit: calculation.perMemberDividend,
      net_payout: calculation.netPayout,
      lent_out_amount: calculation.lentOutAmount,
      closing_carry_forward: calculation.closingCarryForward,
      status: 'PAYOUT_PENDING'
    }).eq('id', month.id);

    return payouts;
  }

  public async getLoansByChiti(chitiId: string): Promise<Loan[]> {
    const { data, error } = await supabase.from('loans').select('*').eq('chiti_id', chitiId).order('issued_date', { ascending: false });
    if (error) throw error;
    return data.map(this.mapLoan);
  }

  public async updateLoan(loanId: string, updates: any) {
    const dbUpdates: any = {};
    if (updates.principalAmount !== undefined) dbUpdates.principal_amount = updates.principalAmount;
    if (updates.expectedInterest !== undefined) dbUpdates.expected_interest = updates.expectedInterest;
    if (updates.memberName !== undefined) dbUpdates.member_name = updates.memberName;
    if (updates.issuedDate !== undefined) dbUpdates.issued_date = updates.issuedDate;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    
    const { error } = await supabase.from('loans').update(dbUpdates).eq('id', loanId);
    if (error) throw error;
  }

  public async getExtraCommissionsByChiti(chitiId: string): Promise<LedgerEntry[]> {
    const { data, error } = await supabase
      .from('ledger')
      .select('*')
      .eq('chiti_id', chitiId)
      .eq('type', 'EXTRA_COMMISSION')
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return data.map((d: any) => ({
      id: d.id,
      agentId: d.agent_id,
      chitiId: d.chiti_id,
      monthNumber: d.month_number,
      memberId: d.member_id,
      memberName: d.member_name,
      type: d.type,
      amount: Number(d.amount),
      flow: d.flow,
      runningBalance: Number(d.running_balance),
      date: d.date,
      referenceId: d.reference_id,
      isReversal: d.is_reversal,
      reversalOfId: d.reversal_of_id,
      notes: d.notes
    }));
  }

  public async getLoanRepayments(loanId: string): Promise<LoanRepayment[]> {
    const { data, error } = await supabase.from('loan_repayments').select('*').eq('loan_id', loanId).order('date', { ascending: true });
    if (error) throw error;
    return data.map(this.mapLoanRepayment);
  }

  public async issueLoan(params: {
    agentId: string;
    chitiId: string;
    issuedMonthId: string;
    memberId: string;
    principalAmount: number;
    expectedInterest: number;
    notes?: string;
  }) {
    const { data: member } = await supabase.from('members').select('*').eq('id', params.memberId).single();
    
    const { data: loan, error } = await supabase.from('loans').insert({
      agent_id: params.agentId,
      chiti_id: params.chitiId,
      issued_month_id: params.issuedMonthId,
      member_id: params.memberId,
      member_name: member.full_name,
      principal_amount: params.principalAmount,
      expected_interest: params.expectedInterest,
      notes: params.notes
    }).select().single();
    if (error) throw error;
    return loan;
  }

  public async repayLoan(params: {
    agentId: string;
    loanId: string;
    repaymentMonthId: string;
    principalRepaid: number;
    interestRepaid: number;
  }) {
    const { data: loan } = await supabase.from('loans').select('*').eq('id', params.loanId).single();
    
    // Update loan record
    const newRepaidAmount = Number(loan.repaid_amount) + params.principalRepaid;
    const newRepaidInterest = Number(loan.repaid_interest) + params.interestRepaid;
    const status = newRepaidAmount >= Number(loan.principal_amount) ? 'REPAID' : 'ACTIVE';
    
    await supabase.from('loans').update({
      repaid_amount: newRepaidAmount,
      repaid_interest: newRepaidInterest,
      status
    }).eq('id', params.loanId);

    // Insert repayment
    await supabase.from('loan_repayments').insert({
      agent_id: params.agentId,
      loan_id: params.loanId,
      repayment_month_id: params.repaymentMonthId,
      principal_repaid: params.principalRepaid,
      interest_repaid: params.interestRepaid
    });

    // Update ChitMonth for the month the repayment was received in
    const { data: month } = await supabase.from('chit_months').select('*').eq('id', params.repaymentMonthId).single();
    await supabase.from('chit_months').update({
      loans_recovered: Number(month.loans_recovered || 0) + params.principalRepaid,
      interest_earned: Number(month.interest_earned || 0) + params.interestRepaid
    }).eq('id', params.repaymentMonthId);

    return true;
  }

  public async updateMonthCycleDate(monthId: string, newDate: string): Promise<boolean> {
    const { data: month } = await supabase.from('chit_months').select('*').eq('id', monthId).single();
    if (!month) throw new Error('Month not found');

    const chitiId = month.chiti_id;
    const baseMonthNumber = month.month_number;
    
    // newDate is expected to be in YYYY-MM-DD format
    const baseDate = new Date(newDate);

    // Get all months >= baseMonthNumber for this chiti
    const { data: monthsToUpdate } = await supabase.from('chit_months')
      .select('id, month_number')
      .eq('chiti_id', chitiId)
      .gte('month_number', baseMonthNumber)
      .order('month_number', { ascending: true });

    if (monthsToUpdate) {
      for (const m of monthsToUpdate) {
        const offset = m.month_number - baseMonthNumber;
        const targetDate = new Date(baseDate);
        targetDate.setMonth(targetDate.getMonth() + offset);
        
        const year = targetDate.getFullYear();
        const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${monthStr}-${day}`;

        await supabase.from('chit_months').update({ cycle_date: formattedDate }).eq('id', m.id);
      }
    }
    
    return true;
  }

  public async recordExtraCommission(params: {
    agentId: string;
    chitiId: string;
    monthNumber: number;
    memberId: string;
    memberName: string;
    commissionAmount: number;
    interestAmount: number;
    notes?: string;
  }): Promise<boolean> {
    const totalAmount = params.commissionAmount + params.interestAmount;
    if (totalAmount <= 0) return false;

    // We get the last ledger balance
    const { data: lastLedger } = await supabase.from('ledger')
      .select('running_balance')
      .eq('agent_id', params.agentId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    let runningBal = lastLedger ? Number(lastLedger.running_balance) : 0;
    
    // We add this extra commission/interest to the agent's ledger (debit/withdrawal from pool into agent's pocket)
    runningBal -= totalAmount;

    await supabase.from('ledger').insert({
      agent_id: params.agentId,
      chiti_id: params.chitiId,
      month_number: params.monthNumber,
      member_id: params.memberId,
      member_name: params.memberName,
      type: 'EXTRA_COMMISSION',
      amount: totalAmount,
      flow: 'DEBIT',
      running_balance: runningBal,
      date: new Date().toISOString(),
      notes: `Extra Commission: ₹${params.commissionAmount}, Interest: ₹${params.interestAmount} from ${params.memberName}. ${params.notes || ''}`
    });

    return true;
  }

  public async closeMonth(agentId: string, chitiId: string, monthNumber: number): Promise<boolean> {
    const chiti = await this.getChitiById(chitiId);
    if (!chiti) throw new Error('Chiti not found');

    const { data: month } = await supabase.from('chit_months').select('*').eq('chiti_id', chitiId).eq('month_number', monthNumber).single();

    reconcileMonthlyFinancials({
      actualCollected: Number(month.actual_collected),
      loansRecovered: Number(month.loans_recovered || 0),
      interestEarned: Number(month.interest_earned || 0),
      openingCarryForward: Number(month.opening_carry_forward),
      netPayout: Number(month.net_payout) || 0,
      agentCommission: Number(month.agent_commission) || 0,
      totalDividendDistributed: (Number(month.member_dividend_credit) || 0) * chiti.totalMembers,
      lentOutAmount: Number(month.lent_out_amount) || 0,
      closingCarryForward: Number(month.closing_carry_forward) || 0
    });

    await supabase.from('chit_months').update({ status: 'CLOSED' }).eq('id', month.id);

    if (monthNumber < chiti.durationMonths) {
      await supabase.from('chitis').update({ current_month: monthNumber + 1 }).eq('id', chitiId);
      const { data: nextMonth } = await supabase.from('chit_months').select('*').eq('chiti_id', chitiId).eq('month_number', monthNumber + 1).single();
      if (nextMonth) {
        await supabase.from('chit_months').update({ status: 'OPEN', opening_carry_forward: month.closing_carry_forward }).eq('id', nextMonth.id);
      }
    } else {
      await supabase.from('chitis').update({ status: 'COMPLETED' }).eq('id', chitiId);
    }
    return true;
  }

  // Helper mappings
  private mapAgent(row: any): AgentAccount { return { id: row.id, name: row.name, phone: row.phone, email: row.email, password: row.password, businessName: row.business_name, town: row.town, state: row.state, address: row.address, createdAt: row.created_at }; }
  private mapChiti = (row: any): Chiti => { const r = row.calculation_rules?.[0] || row.calculation_rules; return { id: row.id, agentId: row.agent_id, code: row.code, name: row.name, totalMembers: row.total_members, monthlyContribution: Number(row.monthly_contribution), expectedMonthlyPool: Number(row.expected_monthly_pool), durationMonths: row.duration_months, currentMonth: row.current_month, startDate: row.start_date, paymentDueDay: row.payment_due_day, status: row.status, notes: row.notes, createdAt: row.created_at, rule: r ? { id: r.id, chitiId: r.chiti_id, version: r.version, effectiveFromMonth: r.effective_from_month || 1, auctionType: r.auction_type, commissionType: r.commission_type, commissionValue: Number(r.commission_value), surplusStrategy: r.surplus_strategy, description: r.description } : {} as CalculationRule }; }
  private mapMember(row: any): Member { return { id: row.id, agentId: row.agent_id, memberNumber: row.member_number, fullName: row.full_name, phone: row.phone, address: row.address, joiningDate: row.joining_date, status: row.status }; }
  private mapChitMember(row: any): ChitMember { return { id: row.id, chitiId: row.chiti_id, memberId: row.member_id, memberNumber: row.member_number, fullName: row.full_name, phone: row.phone, address: row.address, hasWonAuction: row.has_won_auction, wonMonth: row.won_month, winningBidAmount: row.winning_bid_amount ? Number(row.winning_bid_amount) : undefined, payoutAmount: row.payout_amount ? Number(row.payout_amount) : undefined, totalPaid: Number(row.total_paid), pendingAmount: Number(row.pending_amount), status: row.status }; }
  private mapChitMonth(row: any): ChitMonth { return { id: row.id, chitiId: row.chiti_id, monthNumber: row.month_number, cycleDate: row.cycle_date, openingCarryForward: Number(row.opening_carry_forward), expectedCollection: Number(row.expected_collection), actualCollected: Number(row.actual_collected), pendingCollection: Number(row.pending_collection), auctionStatus: row.auction_status, grossDiscount: Number(row.gross_discount), agentCommission: Number(row.agent_commission), surplusAmount: Number(row.surplus_amount), memberDividendCredit: Number(row.member_dividend_credit), netPayout: Number(row.net_payout), loansRecovered: Number(row.loans_recovered || 0), interestEarned: Number(row.interest_earned || 0), lentOutAmount: Number(row.lent_out_amount || 0), closingCarryForward: Number(row.closing_carry_forward), status: row.status }; }
  private mapPayment(row: any): Payment { return { id: row.id, agentId: row.agent_id, chitiId: row.chiti_id, chitMonthId: row.chit_month_id, monthNumber: row.month_number, memberId: row.member_id, memberName: row.member_name, memberNumber: row.member_number, amountDue: Number(row.amount_due), amountPaid: Number(row.amount_paid), paymentMethod: row.payment_method, status: row.status, receiptNumber: row.receipt_number, notes: row.notes }; }
  private mapLedger(row: any): LedgerEntry { return { id: row.id, agentId: row.agent_id, chitiId: row.chiti_id, monthNumber: row.month_number, memberId: row.member_id, memberName: row.member_name, type: row.type, amount: Number(row.amount), flow: row.flow, runningBalance: Number(row.running_balance), date: row.date, referenceId: row.reference_id, isReversal: row.is_reversal, reversalOfId: row.reversal_of_id, notes: row.notes }; }
  private mapReceipt(row: any): Receipt { return { id: row.id, receiptNumber: row.receipt_number, agentName: row.agent_name, businessName: row.business_name, agentPhone: row.agent_phone, chitiName: row.chiti_name, chitiCode: row.chiti_code, memberName: row.member_name, memberNumber: row.member_number, monthNumber: row.month_number, amountDue: Number(row.amount_due), amountPaid: Number(row.amount_paid), remainingDue: Number(row.remaining_due), paymentMethod: row.payment_method, date: row.date, transactionId: row.transaction_id }; }
  private mapLoan(row: any): Loan { return { id: row.id, agentId: row.agent_id, chitiId: row.chiti_id, issuedMonthId: row.issued_month_id, memberId: row.member_id, memberName: row.member_name, principalAmount: Number(row.principal_amount), expectedInterest: Number(row.expected_interest), repaidAmount: Number(row.repaid_amount), repaidInterest: Number(row.repaid_interest), status: row.status, issuedDate: row.issued_date, notes: row.notes }; }
  private mapLoanRepayment(row: any): LoanRepayment { return { id: row.id, agentId: row.agent_id, loanId: row.loan_id, repaymentMonthId: row.repayment_month_id, principalRepaid: Number(row.principal_repaid), interestRepaid: Number(row.interest_repaid), date: row.date }; }

  private async logAudit(params: { agentId: string; actorName: string; action: string; target: string; details: string }) {
    await supabase.from('audit_logs').insert({ agent_id: params.agentId, actor_name: params.actorName, action: params.action, target: params.target, details: params.details });
  }
}

export const dbService = new DbService();
