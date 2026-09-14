import { NextRequest, NextResponse } from 'next/server';
import { updateExpectedCollection } from '@/lib/sheets';
import { addOrUpdateIssueClient } from '@/lib/issueClients';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rowIndex, actualDate, amount, remarks, dueDate, client } = body;

    if (rowIndex === undefined || actualDate === undefined || actualDate === null) {
      return NextResponse.json(
        { error: 'rowIndex and actualDate are required' },
        { status: 400 }
      );
    }

    const rowIdx = parseInt(String(rowIndex), 10);
    if (isNaN(rowIdx) || rowIdx <= 1) {
      return NextResponse.json(
        { error: 'Invalid rowIndex' },
        { status: 400 }
      );
    }

    // Parse amount to number if provided
    let parsedAmount: number | undefined = undefined;
    if (amount !== undefined && amount !== null && amount !== '') {
      parsedAmount = parseInt(String(amount).replace(/,/g, ''), 10);
      if (isNaN(parsedAmount)) {
        return NextResponse.json(
          { error: 'Invalid amount' },
          { status: 400 }
        );
      }
    }

    const result = await updateExpectedCollection(rowIdx, actualDate, parsedAmount, remarks, dueDate);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update sheet' },
        { status: 500 }
      );
    }

    // Auto record to issue clients watchlist if client name and non-empty remarks exist
    if (client && typeof client === 'string' && client.trim() && remarks && typeof remarks === 'string' && remarks.trim()) {
      try {
        addOrUpdateIssueClient(client.trim(), remarks.trim(), {
          amount: parsedAmount,
          dueDate,
          actualDate
        });
      } catch (err) {
        console.error('Failed to auto record issue client:', err);
      }
    }

    return NextResponse.json({ success: true, message: `Successfully updated row ${rowIdx} with date ${actualDate}` });
  } catch (error) {
    console.error('Error in POST /api/expected-collections/match:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

