export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { fetchExpectedCollections, fetchCashTransactions } from '@/lib/sheets';
import { ExpectedCollection } from '@/lib/types';

// Helper to parse date strings robustly to a Date object
function parseDateStr(dateStr: string): Date {
  if (!dateStr) return new Date();
  let clean = dateStr.trim()
    .replace(/[년월일]/g, '-')
    .replace(/[\.\/\s]/g, '-');
  clean = clean.replace(/-+/g, '-');
  clean = clean.replace(/^-|-$/g, '');
  
  const parts = clean.split('-');
  const year = Number(parts[0]) || 2026;
  const month = parts[1] ? Number(parts[1]) - 1 : 0;
  const day = parts[2] ? Number(parts[2]) : 1;
  return new Date(year, month, day);
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
  if (cleanTx.includes(cleanExp) || cleanExp.includes(cleanTx)) return true;

  // Fuzzy matching for parenthesized names (e.g. "이익재(수현산" vs "수현산업")
  // Extract parts inside and outside parentheses (length >= 2)
  const parts = cleanTx.split(/[\(\)]/).map(p => p.trim()).filter(p => p.length >= 2);
  for (const part of parts) {
    if (cleanExp.includes(part) || part.includes(cleanExp)) {
      return true;
    }
  }

  const expParts = cleanExp.split(/[\(\)]/).map(p => p.trim()).filter(p => p.length >= 2);
  for (const part of expParts) {
    if (cleanTx.includes(part) || part.includes(cleanTx)) {
      return true;
    }
  }

  return false;
}

// Find a subset of transactions that sum up to the target amount (with a tolerance of up to 1000 won)
function findSubsetSum(txs: any[], target: number, tolerance = 1000): any[] | null {
  const list = txs.slice(0, 10); // Limit search depth for safety
  let bestSubset: any[] | null = null;
  let bestDiff = Infinity;
  
  function backtrack(index: number, currentSum: number, currentSet: any[]) {
    const diff = Math.abs(currentSum - target);
    if (diff <= tolerance) {
      if (diff < bestDiff) {
        bestDiff = diff;
        bestSubset = [...currentSet];
      }
      if (diff === 0) return; // Exact match found
    }
    if (currentSum > target + tolerance || index >= list.length) {
      return;
    }
    
    // Try including list[index]
    currentSet.push(list[index]);
    backtrack(index + 1, currentSum + list[index].amount, currentSet);
    currentSet.pop();
    
    // Try excluding list[index]
    backtrack(index + 1, currentSum, currentSet);
  }
  
  backtrack(0, 0, []);
  return bestSubset;
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
      
      // Filter transactions matching client name and within +/- 30 days of actualDate
      const matchingTxs = transactionsRes.data.filter(tx => {
        if (tx.type !== '입금') return false;
        
        const nameMatched = isNameMatch(c.client, c.depositorName, tx.client);
        if (!nameMatched) return false;

        try {
          const txDate = parseDateStr(tx.date);
          const actDate = parseDateStr(actualDepositDate);
          const diffTime = Math.abs(txDate.getTime() - actDate.getTime());
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 30; // Matched within 30 days
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

      // Sort matchingTxs by date proximity to actualDepositDate
      matchingTxs.sort((a, b) => {
        try {
          const aDate = parseDateStr(a.date);
          const bDate = parseDateStr(b.date);
          const actDate = parseDateStr(actualDepositDate);
          return Math.abs(aDate.getTime() - actDate.getTime()) - Math.abs(bDate.getTime() - actDate.getTime());
        } catch {
          return 0;
        }
      });

      // 2.1 Check if single transaction matches amount within tolerance (1,000 won)
      const exactSingleMatch = matchingTxs.find(tx => Math.abs(tx.amount - c.amount) <= 1000);
      if (exactSingleMatch) {
        const difference = exactSingleMatch.amount - c.amount;
        const diffText = difference === 0 ? '' : ` (차액: ${difference > 0 ? '+' : ''}${difference.toLocaleString()}원)`;
        return {
          ...c,
          status: '완료',
          matchDetails: {
            actualAmount: exactSingleMatch.amount,
            actualDate: exactSingleMatch.date,
            actualClient: exactSingleMatch.client,
            difference,
            message: `입출금 장부와 일치합니다${diffText}.`
          }
        };
      }

      // 2.2 Check if a subset of transactions sums to c.amount within tolerance (1,000 won)
      const subset = findSubsetSum(matchingTxs, c.amount, 1000);
      if (subset && subset.length > 0) {
        const totalAmount = subset.reduce((sum, tx) => sum + tx.amount, 0);
        const difference = totalAmount - c.amount;
        const diffText = difference === 0 ? '' : ` (차액: ${difference > 0 ? '+' : ''}${difference.toLocaleString()}원)`;
        const latestTx = subset.reduce((latest, tx) => tx.date > latest.date ? tx : latest, subset[0]);
        const matchedDetailsList = subset.map(tx => `${tx.amount.toLocaleString()}원(${tx.date.substring(5)})`).join(' + ');
        return {
          ...c,
          status: '완료',
          matchDetails: {
            actualAmount: totalAmount,
            actualDate: latestTx.date,
            actualClient: subset[0].client,
            difference,
            message: `입출금 장부와 일치합니다${diffText} (${subset.length}건 분할 입금: ${matchedDetailsList})`
          }
        };
      }

      // 2.3 Fallback 1: Sum up transactions close to actualDepositDate (+/- 3 days)
      const closeTxs = matchingTxs.filter(tx => {
        try {
          const txDate = parseDateStr(tx.date);
          const actDate = parseDateStr(actualDepositDate);
          const diffTime = Math.abs(txDate.getTime() - actDate.getTime());
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 3;
        } catch {
          return false;
        }
      });

      if (closeTxs.length > 0) {
        const totalAmount = closeTxs.reduce((sum, tx) => sum + tx.amount, 0);
        const difference = totalAmount - c.amount;
        const latestTx = closeTxs.reduce((latest, tx) => tx.date > latest.date ? tx : latest, closeTxs[0]);
        const sumDetailsList = closeTxs.map(tx => `${tx.amount.toLocaleString()}원(${tx.date.substring(5)})`).join(' + ');
        
        return {
          ...c,
          status: '불일치_금액오차',
          matchDetails: {
            actualAmount: totalAmount,
            actualDate: latestTx.date,
            actualClient: closeTxs[0].client,
            difference,
            message: `금액 불일치 (차액: ${difference > 0 ? '+' : ''}${difference.toLocaleString()}원) (${closeTxs.length}건 합산: ${sumDetailsList})`
          }
        };
      }

      // 2.4 Fallback 2: Pick the single closest transaction within 30 days
      const closestTx = matchingTxs[0];
      const difference = closestTx.amount - c.amount;
      return {
        ...c,
        status: '불일치_금액오차',
        matchDetails: {
          actualAmount: closestTx.amount,
          actualDate: closestTx.date,
          actualClient: closestTx.client,
          difference,
          message: `금액 불일치 (차액: ${difference > 0 ? '+' : ''}${difference.toLocaleString()}원) (가장 가까운 내역: ${closestTx.amount.toLocaleString()}원(${closestTx.date.substring(5)}))`
        }
      };
    });

    // Filter by the month of requestedDate
    const filteredCollections = processedCollections.filter(c => c.dueDate.startsWith(targetMonthStr));

    // Calculate smart matching suggestions for unpaid expected collections
    const unpaidCollections = expectedRes.data.filter(
      c => !c.actualDate || c.actualDate.trim().length === 0
    );

    const depositTransactions = transactionsRes.data.filter(
      t => t.type === '입금'
    );

    const matchingSuggestions: any[] = [];
    const matchedTransactionIds = new Set<string>();

    for (const collection of unpaidCollections) {
      // Find all unused deposit transactions within +/- 30 days of due date
      const eligibleTxs = depositTransactions.filter(t => {
        const tId = `${t.date}-${t.client}-${t.amount}`;
        if (matchedTransactionIds.has(tId)) return false;

        try {
          const txDate = parseDateStr(t.date);
          const due = parseDateStr(collection.dueDate);
          const diffTime = Math.abs(txDate.getTime() - due.getTime());
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 30; // within 30 days of due date
        } catch {
          return false;
        }
      });

      // Split eligibleTxs into those with matching names and those with different names
      const nameMatchedTxs = eligibleTxs.filter(t => isNameMatch(collection.client, collection.depositorName, t.client));
      const differentNameTxs = eligibleTxs.filter(t => !isNameMatch(collection.client, collection.depositorName, t.client));

      // Sort both arrays by proximity to collection.dueDate
      const sortByProximity = (txs: any[]) => {
        txs.sort((a, b) => {
          try {
            const aDate = parseDateStr(a.date);
            const bDate = parseDateStr(b.date);
            const due = parseDateStr(collection.dueDate);
            return Math.abs(aDate.getTime() - due.getTime()) - Math.abs(bDate.getTime() - due.getTime());
          } catch {
            return 0;
          }
        });
      };
      sortByProximity(nameMatchedTxs);
      sortByProximity(differentNameTxs);

      // 1. First priority: Single transaction with MATCHING NAME (within tolerance)
      const singleNameMatch = nameMatchedTxs.find(t => Math.abs(t.amount - collection.amount) <= 1000);
      if (singleNameMatch) {
        const tId = `${singleNameMatch.date}-${singleNameMatch.client}-${singleNameMatch.amount}`;
        matchedTransactionIds.add(tId);
        matchingSuggestions.push({
          expected: collection,
          actual: singleNameMatch,
          actuals: [singleNameMatch]
        });
        continue;
      }

      // 2. Second priority: Subset sum with MATCHING NAME (within tolerance)
      const nameSubset = findSubsetSum(nameMatchedTxs, collection.amount, 1000);
      if (nameSubset && nameSubset.length > 0) {
        const totalAmount = nameSubset.reduce((sum, tx) => sum + tx.amount, 0);
        for (const t of nameSubset) {
          const tId = `${t.date}-${t.client}-${t.amount}`;
          matchedTransactionIds.add(tId);
        }
        const latestTx = nameSubset.reduce((latest, tx) => tx.date > latest.date ? tx : latest, nameSubset[0]);
        matchingSuggestions.push({
          expected: collection,
          actual: {
            date: latestTx.date,
            client: nameSubset[0].client,
            amount: totalAmount,
            type: '입금'
          },
          actuals: nameSubset
        });
        continue;
      }

      // 3. Third priority: Single transaction with DIFFERENT NAME (within tolerance)
      const singleDiffNameMatch = differentNameTxs.find(t => Math.abs(t.amount - collection.amount) <= 1000);
      if (singleDiffNameMatch) {
        const tId = `${singleDiffNameMatch.date}-${singleDiffNameMatch.client}-${singleDiffNameMatch.amount}`;
        matchedTransactionIds.add(tId);
        matchingSuggestions.push({
          expected: collection,
          actual: singleDiffNameMatch,
          actuals: [singleDiffNameMatch]
        });
      }
    }

    return NextResponse.json({
      data: filteredCollections,
      matchingSuggestions,
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
