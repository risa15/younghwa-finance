export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { fetchExpectedCollections, fetchCashTransactions } from '@/lib/sheets';
import { ExpectedCollection } from '@/lib/types';

// Helper to parse YYYY-MM-DD to a Date object at midnight local time
function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Clean names for smart matching
function cleanName(name: string): string {
  if (!name) return '';
  return name
    .replace(/\(주\)/g, '')
    .replace(/주식회사/g, '')
    .replace(/★/g, '')
    .replace(/㈜/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

// Check if names match fuzzily or via designated depositor name
function isNameMatch(expectedName: string, depositorName: string | undefined, actualTxName: string): boolean {
  const cleanTx = cleanName(actualTxName);
  
  if (depositorName && depositorName.trim()) {
    const cleanDep = cleanName(depositorName);
    if (cleanTx.includes(cleanDep) || cleanDep.includes(cleanTx)) return true;
  }
  
  const cleanExp = cleanName(expectedName);
  return cleanTx.includes(cleanExp) || cleanExp.includes(cleanTx);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedDate = searchParams.get('date') || '2026-06-16'; // Fallback to key demo date
    const targetMonthStr = requestedDate.substring(0, 7); // YYYY-MM

    const [expectedRes, transactionsRes] = await Promise.all([
      fetchExpectedCollections(),
      fetchCashTransactions()
    ]);

    const isDemo = expectedRes.isDemo || transactionsRes.isDemo;

    // We want to process expected collections for cross-checking
    const processedCollections = expectedRes.data.map(c => {
      // 1. If not collected yet
      if (!c.actualDate || c.actualDate.trim() === '') {
        const today = parseDateStr(requestedDate);
        const due = parseDateStr(c.dueDate);
        const isOverdue = today > due;
        
        return {
          ...c,
          status: isOverdue ? '연체' : '대기',
          matchDetails: null
        };
      }

      // 2. If actualDate is provided, perform cross-checking with cash ledger
      const actualDepositDate = c.actualDate.trim();
      
      // Filter transactions matching client name and within +/- 3 days of actualDate
      const matchingTxs = transactionsRes.data.filter(tx => {
        if (tx.type !== '입금') return false;
        
        const nameMatched = isNameMatch(c.client, c.depositorName, tx.client);
        if (!nameMatched) return false;

        try {
          const txDate = parseDateStr(tx.date);
          const actDate = parseDateStr(actualDepositDate);
          const diffTime = Math.abs(txDate.getTime() - actDate.getTime());
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 3; // Matched within 3 days
        } catch {
          return false;
        }
      });

      if (matchingTxs.length === 0) {
        // Case: No matching transaction found in ledger
        return {
          ...c,
          status: '불일치_내역없음',
          matchDetails: {
            actualAmount: 0,
            actualDate: null,
            difference: -c.amount,
            message: '입출금 장부에서 해당 날짜 부근의 입금 내역을 찾을 수 없습니다.'
          }
        };
      }

      // Find the best match: prioritize exact amount match, otherwise closest amount
      let bestMatch = matchingTxs[0];
      let exactMatchFound = false;

      for (const tx of matchingTxs) {
        if (tx.amount === c.amount) {
          bestMatch = tx;
          exactMatchFound = true;
          break;
        }
      }

      const difference = bestMatch.amount - c.amount;
      
      if (exactMatchFound) {
        return {
          ...c,
          status: '완료',
          matchDetails: {
            actualAmount: bestMatch.amount,
            actualDate: bestMatch.date,
            actualClient: bestMatch.client,
            difference: 0,
            message: '입출금 장부와 일치합니다.'
          }
        };
      } else {
        return {
          ...c,
          status: '불일치_금액오차',
          matchDetails: {
            actualAmount: bestMatch.amount,
            actualDate: bestMatch.date,
            actualClient: bestMatch.client,
            difference,
            message: `금액 불일치 (차액: ${difference > 0 ? '+' : ''}${difference.toLocaleString()}원)`
          }
        };
      }
    });

    // Filter by the month of requestedDate
    const filteredCollections = processedCollections.filter(c => c.dueDate.startsWith(targetMonthStr));

    return NextResponse.json({
      data: filteredCollections,
      isDemo
    });
  } catch (error) {
    console.error('Error in expected-collections API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
