import { NextRequest, NextResponse } from 'next/server';
import { fetchLoans } from '@/lib/sheets';

// Helper to parse YYYY-MM-DD
function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let referenceDate = searchParams.get('date');

    const { data: loans, isDemo } = await fetchLoans();

    if (!referenceDate) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      referenceDate = `${yyyy}-${mm}-${dd}`;
    }

    const refDateObj = parseDateStr(referenceDate);
    const startYear = refDateObj.getFullYear();
    const startMonth = refDateObj.getMonth(); // 0-11

    // Generate interest schedule for the next 3 months (Month 0, Month 1, Month 2)
    const schedule = Array.from({ length: 3 }).map((_, index) => {
      // Calculate target year and month
      const targetDate = new Date(startYear, startMonth + index, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth(); // 0-11
      const targetMonthStr = String(targetMonth + 1).padStart(2, '0');
      
      const payments = loans
        .filter(loan => {
          // Verify if the loan is active during the target month
          const start = parseDateStr(loan.startDate);
          const due = parseDateStr(loan.dueDate);
          const loanStartCompare = new Date(start.getFullYear(), start.getMonth(), 1);
          const loanDueCompare = new Date(due.getFullYear(), due.getMonth(), 1);
          
          return targetDate >= loanStartCompare && targetDate <= loanDueCompare;
        })
        .map(loan => ({
          loanId: loan.loanId,
          bank: loan.bank,
          loanType: loan.loanType,
          paymentDay: loan.paymentDay,
          amount: loan.monthlyInterest,
          // Format specific payment date (e.g. "2026-06-15")
          paymentDate: `${targetYear}-${targetMonthStr}-${String(loan.paymentDay).padStart(2, '0')}`
        }))
        // Sort by payment day of the month
        .sort((a, b) => a.paymentDay - b.paymentDay);

      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

      return {
        year: targetYear,
        month: targetMonth + 1, // 1-12
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
