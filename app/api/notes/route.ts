import { NextRequest, NextResponse } from 'next/server';
import { fetchNoteBonds } from '@/lib/sheets';

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let referenceDate = searchParams.get('date');

    const { data: noteBonds, isDemo } = await fetchNoteBonds();

    if (!referenceDate) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      referenceDate = `${yyyy}-${mm}-${dd}`;
    }

    // Process items to add D-day based on the reference date
    const processedNotes = noteBonds.map(note => {
      const daysLeft = getDaysDifference(note.dueDate, referenceDate!);
      return {
        ...note,
        daysLeft
      };
    });

    // Calculate total unpaid amount
    const totalUnpaidAmount = noteBonds
      .filter(n => n.status === '미결제')
      .reduce((sum, n) => sum + n.amount, 0);

    return NextResponse.json({
      notes: processedNotes,
      totalUnpaidAmount,
      isDemo
    });
  } catch (error) {
    console.error('Error fetching notes data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
