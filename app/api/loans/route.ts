export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { fetchLoans, fetchAccountBalances, calculateDynamicBalance, getPaymentInfoForMonth } from '@/lib/sheets';

// Helper to parse YYYY-MM-DD
function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let referenceDate = searchParams.get('date');

    const [loansRes, balancesRes] = await Promise.all([
      fetchLoans(),
      fetchAccountBalances()
    ]);

    const { data: rawLoans, isDemo } = loansRes;
    const { data: balances } = balancesRes;

    // 1. Resolve base reference date (the latest date in the sheet data)
    let baseDate = '2026-06-10'; // Default fallback
    if (balances.length > 0) {
      const dates = balances.map(b => b.date).filter(Boolean);
      if (dates.length > 0) {
        baseDate = dates.reduce((max, d) => d > max ? d : max, dates[0]);
      }
    }

    if (!referenceDate) {
      referenceDate = baseDate;
    }

    // 2. Map loans to calculate dynamic remaining balance as of the requested date
    const loans = rawLoans.map(loan => {
      const dynamicBalance = calculateDynamicBalance(loan, referenceDate!, baseDate);
      return {
        ...loan,
        balance: dynamicBalance
      };
    });

    const refDateObj = parseDateStr(referenceDate!);
    const startYear = refDateObj.getFullYear();
    const startMonth = refDateObj.getMonth(); // 0-11

    // 3. Generate schedule for the next 3 months (Month 0, Month 1, Month 2)
    const schedule = Array.from({ length: 3 }).map((_, index) => {
      const targetDate = new Date(startYear, startMonth + index, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth(); // 0-11
      const targetMonthStr = String(targetMonth + 1).padStart(2, '0');
      
      const payments: any[] = [];

      loans.forEach(loan => {
        const start = parseDateStr(loan.startDate);
        const due = parseDateStr(loan.dueDate);
        const loanStartCompare = new Date(start.getFullYear(), start.getMonth(), 1);
        const loanDueCompare = new Date(due.getFullYear(), due.getMonth(), 1);
        
        // Skip if loan is not active in this month
        if (targetDate < loanStartCompare || targetDate > loanDueCompare) {
          return;
        }

        // Add Interest Payment
        const pmtInfo = getPaymentInfoForMonth(loan.paymentDay, loan.startDate, targetYear, targetMonth);
        if (pmtInfo) {
          payments.push({
            loanId: loan.loanId,
            bank: loan.bank,
            loanType: loan.loanType,
            paymentDay: pmtInfo.paymentDay,
            amount: loan.monthlyInterest,
            type: '이자',
            paymentDate: pmtInfo.paymentDate
          });
        }

        // Add Principal Repayment (if active)
        if (loan.repayStartDate && loan.repayAmount && loan.repayAmount > 0) {
          const repayStart = parseDateStr(loan.repayStartDate);
          const repayStartCompare = new Date(repayStart.getFullYear(), repayStart.getMonth(), 1);
          
          if (targetDate >= repayStartCompare && targetDate <= loanDueCompare) {
            const repayDayVal = loan.repayPaymentDay || loan.paymentDay || '1';
            const repayInfo = getPaymentInfoForMonth(String(repayDayVal), loan.repayStartDate, targetYear, targetMonth);
            if (repayInfo) {
              payments.push({
                loanId: loan.loanId,
                bank: loan.bank,
                loanType: loan.loanType,
                paymentDay: repayInfo.paymentDay,
                amount: loan.repayAmount,
                type: '원금상환',
                paymentDate: repayInfo.paymentDate
              });
            }
          }
        }
      });

      // Sort by payment day of the month
      payments.sort((a, b) => a.paymentDay - b.paymentDay);
      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

      return {
        year: targetYear,
        month: targetMonth + 1,
        payments,
        totalAmount
      };
    });

    return NextResponse.json({
      loans,
      schedule,
      isDemo
    });
  } catch (error) {
    console.error('Error fetching loans data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

