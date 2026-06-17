import { NextRequest, NextResponse } from 'next/server';
import { fetchAccountBalances, fetchCashTransactions, fetchNoteBonds } from '@/lib/sheets';
import { AccountBalance, CashTransaction, NoteBond } from '@/lib/types';

// Simple helper to parse YYYY-MM-DD to a Date object at midnight local time
function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Get format string from Date
function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let requestedDate = searchParams.get('date');

    const [balancesRes, transactionsRes, notesRes] = await Promise.all([
      fetchAccountBalances(),
      fetchCashTransactions(),
      fetchNoteBonds()
    ]);

    const isDemo = balancesRes.isDemo || transactionsRes.isDemo || notesRes.isDemo;

    // Determine max available date in database
    let maxAvailableDate = '2026-06-16'; // Use 2026-06-16 as primary demo date now
    if (balancesRes.data.length > 0) {
      const dates = balancesRes.data.map(b => b.date).filter(Boolean);
      if (dates.length > 0) {
        maxAvailableDate = dates.reduce((max, d) => d > max ? d : max, dates[0]);
      }
    }

    if (!requestedDate) {
      requestedDate = isDemo ? maxAvailableDate : formatDate(new Date());
    }

    // Resolve balance date (closest date in AccountBalance that is <= requestedDate)
    const availableBalanceDates = Array.from(new Set(balancesRes.data.map(b => b.date))).sort();
    let balanceDate = '';
    if (availableBalanceDates.includes(requestedDate)) {
      balanceDate = requestedDate;
    } else {
      const pastDates = availableBalanceDates.filter(d => d <= requestedDate!);
      if (pastDates.length > 0) {
        balanceDate = pastDates[pastDates.length - 1];
      } else if (availableBalanceDates.length > 0) {
        balanceDate = availableBalanceDates[0];
      } else {
        balanceDate = requestedDate;
      }
    }

    // Filter balances for target date
    const dayBalances = balancesRes.data.filter(b => b.date === balanceDate);

    // Filter transactions for target date
    const dayTransactions = transactionsRes.data.filter(t => t.date === requestedDate);

    // Helper: Normalize account name for matching (removes spaces, parentheses etc. if needed, but basic match first)
    const normalizeName = (name: string) => name.replace(/\s+/g, '').toLowerCase();

    // 1. Group 1: 보통예금
    const rawOrdinary = dayBalances.filter(b => b.type === '보통예금');
    const ordinaryAccounts = rawOrdinary.map(acc => {
      // Find matching transactions for this account
      const accTx = dayTransactions.filter(t => {
        if (!t.account) return false; // If transaction has no account specified
        return normalizeName(t.account) === normalizeName(acc.accountName) ||
               normalizeName(acc.accountName).includes(normalizeName(t.account)) ||
               normalizeName(t.account).includes(normalizeName(acc.accountName));
      });

      // Sum transaction deposits and withdrawals
      const computedDeposit = accTx.filter(t => t.type === '입금').reduce((sum, t) => sum + t.amount, 0);
      const computedWithdrawal = accTx.filter(t => t.type === '출금').reduce((sum, t) => sum + t.amount, 0);

      // Use spreadsheet's daily deposit/withdrawal if available, otherwise fallback to transaction sums
      const todayDeposit = acc.todayDeposit !== undefined && acc.todayDeposit > 0 ? acc.todayDeposit : computedDeposit;
      const todayWithdrawal = acc.todayWithdrawal !== undefined && acc.todayWithdrawal > 0 ? acc.todayWithdrawal : computedWithdrawal;

      // prevBalance = currentBalance - todayDeposit + todayWithdrawal
      const prevBalance = acc.balance - todayDeposit + todayWithdrawal;

      return {
        accountName: acc.accountName,
        prevBalance,
        todayDeposit,
        todayWithdrawal,
        balance: acc.balance,
        remarks: acc.remarks || '',
        transactions: accTx.map(t => ({
          client: t.client,
          deposit: t.type === '입금' ? t.amount : 0,
          withdrawal: t.type === '출금' ? t.amount : 0,
          memo: t.memo || ''
        }))
      };
    });

    // Subtotals for Ordinary
    const ordinaryTotal = ordinaryAccounts.reduce(
      (tot, acc) => {
        tot.prevBalance += acc.prevBalance;
        tot.todayDeposit += acc.todayDeposit;
        tot.todayWithdrawal += acc.todayWithdrawal;
        tot.balance += acc.balance;
        return tot;
      },
      { prevBalance: 0, todayDeposit: 0, todayWithdrawal: 0, balance: 0 }
    );

    // 2. Group 2: 특정예금
    const rawSpecific = dayBalances.filter(b => b.type === '특정예금');
    const specificAccounts = rawSpecific.map(acc => {
      const todayDeposit = acc.todayDeposit || 0;
      const todayWithdrawal = acc.todayWithdrawal || 0;
      const prevBalance = acc.balance - todayDeposit + todayWithdrawal;
      return {
        accountName: acc.accountName,
        prevBalance,
        todayDeposit,
        todayWithdrawal,
        balance: acc.balance,
        remarks: acc.remarks || ''
      };
    });

    const specificTotal = specificAccounts.reduce(
      (tot, acc) => {
        tot.prevBalance += acc.prevBalance;
        tot.todayDeposit += acc.todayDeposit;
        tot.todayWithdrawal += acc.todayWithdrawal;
        tot.balance += acc.balance;
        return tot;
      },
      { prevBalance: 0, todayDeposit: 0, todayWithdrawal: 0, balance: 0 }
    );

    // 3. Group 3: 현금
    const rawCash = dayBalances.filter(b => b.type === '현금');
    const cashAccount = rawCash[0] || { balance: 0, todayDeposit: 0, todayWithdrawal: 0 };
    const cashPrev = cashAccount.balance - (cashAccount.todayDeposit || 0) + (cashAccount.todayWithdrawal || 0);
    const cashData = {
      prevBalance: cashPrev,
      todayDeposit: cashAccount.todayDeposit || 0,
      todayWithdrawal: cashAccount.todayWithdrawal || 0,
      balance: cashAccount.balance
    };

    // 4. Grand Total (Ordinary + Specific + Cash)
    const grandTotal = {
      prevBalance: ordinaryTotal.prevBalance + specificTotal.prevBalance + cashData.prevBalance,
      todayDeposit: ordinaryTotal.todayDeposit + specificTotal.todayDeposit + cashData.todayDeposit,
      todayWithdrawal: ordinaryTotal.todayWithdrawal + specificTotal.todayWithdrawal + cashData.todayWithdrawal,
      balance: ordinaryTotal.balance + specificTotal.balance + cashData.balance
    };

    // 5. Group 4: 어음채권 (Notes and Receivables)
    // Filter active notes as of requestedDate:
    // Registered on or before requestedDate, and (status === '미결제' or settledDate > requestedDate)
    const activeNotes = notesRes.data.filter(n => {
      if (!n.regDate || n.regDate > requestedDate!) return false;
      if (n.status === '미결제') return true;
      if (n.settledDate && n.settledDate > requestedDate!) return true;
      return false;
    });

    // Categorization logic matching the Excel file:
    // - 종이어음
    // - 전자어음
    // - [issuer](기업채권)
    // - [issuer]([은행]외담)
    const noteItems: Array<{ category: string; bankOrDetail: string; details: string; balance: number }> = [];

    // Filter by note type:
    // Paper Notes (종이어음)
    const paperNotes = activeNotes.filter(n => n.type === '종이어음');
    const paperTotal = paperNotes.reduce((sum, n) => sum + n.amount, 0);
    noteItems.push({
      category: '어음채권',
      bankOrDetail: '종이어음',
      details: paperNotes.map(n => `${n.issuer} ${n.dueDate.substring(2).replace(/-/g, '.')} ${n.amount.toLocaleString()}`).join('\n') || '',
      balance: paperTotal
    });

    // Electronic Notes (전자어음)
    const elecNotes = activeNotes.filter(n => n.type === '전자어음');
    const elecTotal = elecNotes.reduce((sum, n) => sum + n.amount, 0);
    noteItems.push({
      category: '',
      bankOrDetail: '전자어음',
      details: elecNotes.map(n => `${n.issuer}(${n.realClient || ''}) ${n.dueDate.substring(2).replace(/-/g, '.')} ${n.amount.toLocaleString()}`).join('\n'),
      balance: elecTotal
    });

    // Corporate Bonds (기업채권)
    const corpBonds = activeNotes.filter(n => n.type === '기업채권');
    corpBonds.forEach(n => {
      noteItems.push({
        category: '',
        bankOrDetail: `${n.issuer}(기업채권)`,
        details: `${n.issuer} ${n.dueDate.substring(2).replace(/-/g, '.')} ${n.amount.toLocaleString()}`,
        balance: n.amount
      });
    });

    // Account Receivables Loan (외담대)
    const loanReceivables = activeNotes.filter(n => n.type === '외담대');
    loanReceivables.forEach(n => {
      // Map issuer to standard bank name for 외담대 if possible, or look up
      let bankSuffix = '외담';
      if (normalizeName(n.remarks || '').includes('신한') || normalizeName(n.realClient || '').includes('신한')) {
        bankSuffix = '신한외담';
      } else if (normalizeName(n.remarks || '').includes('하나') || normalizeName(n.realClient || '').includes('하나')) {
        bankSuffix = '하나외담';
      } else {
        // default bank mapping based on demo database
        if (n.issuer.includes('유닉스')) bankSuffix = '신한외담';
        else if (n.issuer.includes('경동에버런')) bankSuffix = '하나외담';
      }
      
      noteItems.push({
        category: '',
        bankOrDetail: `${n.issuer}(${bankSuffix})`,
        details: `${n.realClient || n.issuer} ${n.dueDate.substring(2).replace(/-/g, '.')} ${n.amount.toLocaleString()}`,
        balance: n.amount
      });
    });

    // Sum of all Note Bonds
    const noteBondsTotal = activeNotes.reduce((sum, n) => sum + n.amount, 0);

    const reportData = {
      selectedDate: requestedDate,
      balanceDate,
      isDemo,
      approvalBox: {
        drafter: '담  당',
        approver: '대  표'
      },
      ordinaryDeposits: {
        accounts: ordinaryAccounts,
        total: ordinaryTotal
      },
      specificDeposits: {
        accounts: specificAccounts,
        total: specificTotal
      },
      cash: cashData,
      grandTotal,
      noteBonds: {
        items: noteItems,
        total: noteBondsTotal
      }
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Error in daily report API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
