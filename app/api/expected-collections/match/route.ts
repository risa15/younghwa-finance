import { NextRequest, NextResponse } from 'next/server';
import { updateExpectedCollection } from '@/lib/sheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rowIndex, actualDate, amount, remarks } = body;

    if (rowIndex === undefined || !actualDate) {
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

    const result = await updateExpectedCollection(rowIdx, actualDate, parsedAmount, remarks);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update sheet' },
        { status: 500 }
      );
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
