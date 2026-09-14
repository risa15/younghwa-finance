import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllIssueClients, 
  addOrUpdateIssueClient, 
  toggleIssueClientStatus 
} from '@/lib/issueClients';
import { fetchExpectedCollections } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Auto-sync remarks with isAutoSync: true to preserve existing status & history
    try {
      const expRes = await fetchExpectedCollections();
      if (expRes.data && expRes.data.length > 0) {
        expRes.data.forEach(item => {
          if (item.client && item.client.trim() && item.remarks && item.remarks.trim()) {
            addOrUpdateIssueClient(
              item.client.trim(), 
              item.remarks.trim(), 
              {
                amount: item.amount,
                dueDate: item.dueDate,
                actualDate: item.actualDate
              },
              { isAutoSync: true }
            );
          }
        });
      }
    } catch (syncErr) {
      console.warn('Syncing expected collections remarks warning:', syncErr);
    }

    const clients = getAllIssueClients();
    return NextResponse.json({ success: true, data: clients });
  } catch (error) {
    console.error('Error fetching issue clients:', error);
    return NextResponse.json({ error: 'Failed to fetch issue clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client, remarks, amount, dueDate, actualDate } = body;

    if (!client || !client.trim()) {
      return NextResponse.json({ error: 'client is required' }, { status: 400 });
    }

    if (remarks === undefined || remarks === null) {
      return NextResponse.json({ error: 'remarks is required' }, { status: 400 });
    }

    const updatedRecord = addOrUpdateIssueClient(client, remarks, {
      amount: amount ? Number(amount) : undefined,
      dueDate,
      actualDate
    });

    return NextResponse.json({ success: true, data: updatedRecord });
  } catch (error) {
    console.error('Error updating issue client:', error);
    return NextResponse.json({ error: 'Failed to update issue client' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { client, status } = body;

    if (!client || !status || (status !== 'ACTIVE' && status !== 'RESOLVED')) {
      return NextResponse.json({ error: 'Valid client and status (ACTIVE or RESOLVED) are required' }, { status: 400 });
    }

    const updated = toggleIssueClientStatus(client, status);
    if (!updated) {
      return NextResponse.json({ error: 'Issue client not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error toggling issue client status:', error);
    return NextResponse.json({ error: 'Failed to toggle status' }, { status: 500 });
  }
}
