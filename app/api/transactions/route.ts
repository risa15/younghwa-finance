import { NextResponse } from 'next/server';
import { fetchCashTransactions } from '@/lib/sheets';

export async function GET() {
  try {
    const { data, isDemo } = await fetchCashTransactions();
    return NextResponse.json({ data, isDemo });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
