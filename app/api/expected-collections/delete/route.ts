import { NextRequest, NextResponse } from 'next/server';
import { deleteExpectedCollections } from '@/lib/sheets';

// POST /api/expected-collections/delete  { rowIndices: number[] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rowIndices: number[] = Array.isArray(body?.rowIndices)
      ? body.rowIndices.map((r: any) => parseInt(String(r), 10)).filter((r: number) => !isNaN(r) && r > 1)
      : [];

    if (rowIndices.length === 0) {
      return NextResponse.json({ error: 'rowIndices is required' }, { status: 400 });
    }

    const result = await deleteExpectedCollections(rowIndices);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to delete rows' }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: rowIndices.length });
  } catch (error) {
    console.error('Error in POST /api/expected-collections/delete:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
