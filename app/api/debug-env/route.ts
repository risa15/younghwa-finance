import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    sheetsId: process.env.GOOGLE_SHEETS_ID,
    companyName: process.env.NEXT_PUBLIC_COMPANY_NAME
  });
}
