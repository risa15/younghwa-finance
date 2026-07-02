export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { fetchAccountBalances, fetchCashTransactions, fetchNoteBonds, fetchLoans, fetchExpectedCollections, getPaymentInfoForMonth } from '@/lib/sheets';
import { AccountBalance, DashboardData } from '@/lib/types';

// Simple helper to parse YYYY-MM-DD to a Date object at midnight local time
function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Get day difference between two dates (d1 - d2)
function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = parseDateStr(dateStr1);
  const d2 = parseDateStr(dateStr2);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
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

    const [balancesRes, transactionsRes, notesRes, loansRes, expectedRes] = await Promise.all([
      fetchAccountBalances(),
      fetchCashTransactions(),
      fetchNoteBonds(),
      fetchLoans(),
      fetchExpectedCollections()
    ]);

    const isDemo = balancesRes.isDemo || transactionsRes.isDemo || notesRes.isDemo || loansRes.isDemo || expectedRes.isDemo;

    // 1. Find the maximum available date in the balances sheet
    let maxAvailableDate = '2026-06-10'; // Default fallback
    if (balancesRes.data.length > 0) {
      const dates = balancesRes.data.map(b => b.date).filter(Boolean);
      if (dates.length > 0) {
        maxAvailableDate = dates.reduce((max, d) => d > max ? d : max, dates[0]);
      }
    }

    // If no date was requested, use today's date (or maxAvailableDate if today exceeds data range in demo)
    if (!requestedDate) {
      const todayStr = formatDate(new Date());
      // In demo mode, since today might be far in the future compared to demo data (which is 2026-06-10),
      // we default to the maximum available date in the dataset to show real data.
      requestedDate = isDemo ? maxAvailableDate : todayStr;
    }

    // 2. Resolve target balance date: find the closest date in AccountBalance that is <= requestedDate
    const availableBalanceDates = Array.from(new Set(balancesRes.data.map(b => b.date))).sort();
    let balanceDate = '';
    
    if (availableBalanceDates.includes(requestedDate)) {
      balanceDate = requestedDate;
    } else {
      // Find the latest date that is <= requestedDate
      const pastDates = availableBalanceDates.filter(d => d <= requestedDate!);
      if (pastDates.length > 0) {
        balanceDate = pastDates[pastDates.length - 1];
      } else if (availableBalanceDates.length > 0) {
        // If all available dates are in the future, fallback to the earliest date
        balanceDate = availableBalanceDates[0];
      }
    }

    // 3. Filter balances for the resolved balance date
    const selectedBalances = balancesRes.data.filter(b => b.date === balanceDate);

    // 4. Calculate KPI metrics
    // 당일 수금액 (Deposits on the exact requested date)
    const todayTransactions = transactionsRes.data.filter(t => t.date === requestedDate);
    const todayCollection = todayTransactions
      .filter(t => t.type === '입금')
      .reduce((sum, t) => sum + t.amount, 0);

    // 당일 지출액 (Withdrawals on the exact requested date)
    const todayExpense = todayTransactions
      .filter(t => t.type === '출금')
      .reduce((sum, t) => sum + t.amount, 0);

    // 총 유동자산 (보통예금 + 특정예금 + 현금 잔액 on balanceDate)
    const totalLiquidAssets = selectedBalances
      .filter(b => b.type === '보통예금' || b.type === '특정예금' || b.type === '현금')
      .reduce((sum, b) => sum + b.balance, 0);

    // 현금 잔액 (on balanceDate)
    const cashBalance = selectedBalances
      .filter(b => b.type === '현금')
      .reduce((sum, b) => sum + b.balance, 0);

    // [New] Calculate expected collection metrics for the requested month
    const targetMonthStr = requestedDate!.substring(0, 7); // e.g. "2026-06"
    const collectionsThisMonth = expectedRes.data.filter(c => c.dueDate.startsWith(targetMonthStr));
    const expectedCollectionThisMonth = collectionsThisMonth.reduce((sum, c) => sum + c.amount, 0);
    const collectedThisMonth = collectionsThisMonth
      .filter(c => c.actualDate && c.actualDate.trim().length > 0)
      .reduce((sum, c) => sum + c.amount, 0);
    const uncollectedThisMonth = expectedCollectionThisMonth - collectedThisMonth;

    // [New] Calculate upcoming notes/bonds maturing within 30 days (including overdue if unpaid)
    const upcomingNotes30Days = notesRes.data
      .filter(n => n.status === '미결제')
      .map(n => {
        const daysLeft = getDaysDifference(n.dueDate, requestedDate!);
        return { amount: n.amount, daysLeft };
      })
      .filter(n => n.daysLeft <= 30)
      .reduce((sum, n) => sum + n.amount, 0);

    // [New] Calculate expected collections due within 10 days (including overdue if unpaid)
    const expectedCollection10Days = expectedRes.data
      .filter(c => !c.actualDate || c.actualDate.trim() === '')
      .map(c => {
        const daysLeft = getDaysDifference(c.dueDate, requestedDate!);
        return { amount: c.amount, daysLeft };
      })
      .filter(c => c.daysLeft <= 10)
      .reduce((sum, c) => sum + c.amount, 0);

    // 5. Calculate upcoming notes and bonds alerts relative to requestedDate (D-7 or less, including overdue)
    const upcomingAlerts = notesRes.data
      .filter(n => n.status === '미결제')
      .map(n => {
        const daysLeft = getDaysDifference(n.dueDate, requestedDate!);
        return {
          id: `${n.issuer}-${n.dueDate}-${n.amount}`,
          type: n.type,
          client: n.issuer,
          amount: n.amount,
          dueDate: n.dueDate,
          daysLeft
        };
      })
      .filter(n => n.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    // [New] Calculate upcoming collection alerts relative to requestedDate (D-15 / D-30)
    const upcomingCollections = expectedRes.data
      .filter(c => !c.actualDate || c.actualDate.trim().length === 0)
      .map(c => {
        const daysLeft = getDaysDifference(c.dueDate, requestedDate!);
        return {
          id: `${c.client}-${c.dueDate}-${c.amount}`,
          client: c.client,
          amount: c.amount,
          dueDate: c.dueDate,
          daysLeft,
          status: (daysLeft < 0 ? '연체' : '대기') as '연체' | '대기' | '완료'
        };
      })
      .filter(c => c.daysLeft >= -30 && c.daysLeft <= 30) // Show overdue within 30 days and upcoming within 30 days
      .sort((a, b) => a.daysLeft - b.daysLeft);

    // 6. Calculate daily capital simulation for requestedDate
    const reqDateParsed = parseDateStr(requestedDate!);
    const reqDay = reqDateParsed.getDate();

    // Notes reaching maturity on this exact date
    const notesMaturing = notesRes.data
      .filter(n => n.status === '미결제' && n.dueDate === requestedDate)
      .map(n => ({
        client: n.issuer,
        type: n.type,
        amount: n.amount
      }));

    // Expected collections due on this exact date (unpaid)
    const expectedCollectionsDueToday = expectedRes.data
      .filter(c => (!c.actualDate || c.actualDate.trim() === '') && c.dueDate === requestedDate)
      .map(c => ({
        client: c.client,
        amount: c.amount
      }));

    // Active loan interests due on this exact date
    const interestDue = loansRes.data
      .filter(loan => {
        const start = parseDateStr(loan.startDate);
        const due = parseDateStr(loan.dueDate);
        const reqMonthCompare = new Date(reqDateParsed.getFullYear(), reqDateParsed.getMonth(), 1);
        const startCompare = new Date(start.getFullYear(), start.getMonth(), 1);
        const dueCompare = new Date(due.getFullYear(), due.getMonth(), 1);
        
        if (reqMonthCompare < startCompare || reqMonthCompare > dueCompare) {
          return false;
        }
        
        const pmtInfo = getPaymentInfoForMonth(String(loan.paymentDay), loan.startDate, reqDateParsed.getFullYear(), reqDateParsed.getMonth());
        return pmtInfo !== null && pmtInfo.paymentDay === reqDay;
      })
      .map(loan => ({
        bank: loan.bank,
        loanType: loan.loanType,
        amount: loan.monthlyInterest
      }));

    // Active loan principal repayments due on this exact date
    const principalRepayments = loansRes.data
      .filter(loan => {
        if (!loan.repayStartDate || !loan.repayAmount || loan.repayAmount <= 0) return false;
        const start = parseDateStr(loan.repayStartDate);
        const due = parseDateStr(loan.dueDate);
        const reqMonthCompare = new Date(reqDateParsed.getFullYear(), reqDateParsed.getMonth(), 1);
        const startCompare = new Date(start.getFullYear(), start.getMonth(), 1);
        const dueCompare = new Date(due.getFullYear(), due.getMonth(), 1);
        
        if (reqMonthCompare < startCompare || reqMonthCompare > dueCompare) {
          return false;
        }
        
        const repayDayVal = loan.repayPaymentDay || loan.paymentDay || '1';
        const repayInfo = getPaymentInfoForMonth(String(repayDayVal), loan.repayStartDate, reqDateParsed.getFullYear(), reqDateParsed.getMonth());
        return repayInfo !== null && repayInfo.paymentDay === reqDay;
      })
      .map(loan => ({
        bank: loan.bank,
        loanType: loan.loanType,
        amount: loan.repayAmount || 0
      }));

    // Actual transaction amounts on this day
    const actualDeposits = todayTransactions
      .filter(t => t.type === '입금')
      .reduce((sum, t) => sum + t.amount, 0);

    const actualWithdrawals = todayTransactions
      .filter(t => t.type === '출금')
      .reduce((sum, t) => sum + t.amount, 0);

    const sumNotesMaturing = notesMaturing.reduce((sum, n) => sum + n.amount, 0);
    const sumExpectedCollections = expectedCollectionsDueToday.reduce((sum, c) => sum + c.amount, 0);
    const sumInterestDue = interestDue.reduce((sum, i) => sum + i.amount, 0);
    const sumPrincipalRepayments = principalRepayments.reduce((sum, r) => sum + r.amount, 0);

    // Expected inflow = actual deposits + maturing notes + expected collections
    const expectedIn = actualDeposits + sumNotesMaturing + sumExpectedCollections;
    // Expected outflow = actual withdrawals + interest due + principal repayments (payables)
    const expectedOut = actualWithdrawals + sumInterestDue + sumPrincipalRepayments;

    const startLiquidAssets = totalLiquidAssets;
    const endLiquidAssets = startLiquidAssets + expectedIn - expectedOut;

    const dashboardData: DashboardData = {
      selectedDate: requestedDate!,
      maxAvailableDate,
      isDemo,
      kpis: {
        todayCollection,
        todayExpense,
        totalLiquidAssets,
        cashBalance,
        expectedCollectionThisMonth,
        collectedThisMonth,
        uncollectedThisMonth,
        upcomingNotes30Days,
        expectedCollection10Days
      },
      upcomingAlerts,
      upcomingCollections,
      accounts: selectedBalances,
      simulation: {
        notesMaturing,
        interestDue,
        principalRepayments,
        expectedCollections: expectedCollectionsDueToday,
        actualDeposits,
        actualWithdrawals,
        expectedIn,
        expectedOut,
        startLiquidAssets,
        endLiquidAssets
      }
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
