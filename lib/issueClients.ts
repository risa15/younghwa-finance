import fs from 'fs';
import path from 'path';

export interface RemarksHistoryItem {
  id: string;
  date: string;
  remarks: string;
  amount?: number;
  dueDate?: string;
  actualDate?: string;
}

export interface IssueClientRecord {
  client: string;
  status: 'ACTIVE' | 'RESOLVED';
  latestRemarks: string;
  remarksHistory: RemarksHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

// In serverless environment (e.g. Vercel), fallback to /tmp if cwd is read-only
const getFilePath = () => {
  try {
    const primaryPath = path.join(process.cwd(), 'scratch', 'issue_clients.json');
    const dirname = path.dirname(primaryPath);
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }
    return primaryPath;
  } catch (e) {
    return path.join('/tmp', 'issue_clients.json');
  }
};

let inMemoryIssueClients: Record<string, IssueClientRecord> = {};

function loadData(): Record<string, IssueClientRecord> {
  try {
    const filePath = getFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      inMemoryIssueClients = parsed;
      return parsed;
    }
  } catch (err) {
    console.error('Failed to read issue_clients.json, using in-memory store:', err);
  }
  return inMemoryIssueClients;
}

function saveData(data: Record<string, IssueClientRecord>) {
  try {
    const filePath = getFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    inMemoryIssueClients = data;
  } catch (err) {
    console.error('Failed to save issue_clients.json:', err);
    inMemoryIssueClients = data;
  }
}

export function getCleanKey(name: string): string {
  if (!name) return '';
  return name
    .replace(/\(주\)/g, '')
    .replace(/주식회사/g, '')
    .replace(/㈜/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

export function getAllIssueClients(): IssueClientRecord[] {
  const data = loadData();
  return Object.values(data).sort((a, b) => a.client.localeCompare(b.client, 'ko'));
}

export function getIssueClient(client: string): IssueClientRecord | undefined {
  const data = loadData();
  const targetKey = getCleanKey(client);
  const matchedKey = Object.keys(data).find(k => getCleanKey(k) === targetKey);
  return matchedKey ? data[matchedKey] : undefined;
}

export function addOrUpdateIssueClient(
  clientName: string,
  remarks: string,
  extra?: { amount?: number; dueDate?: string; actualDate?: string },
  options?: { isAutoSync?: boolean }
): IssueClientRecord {
  const data = loadData();
  const cleanKey = getCleanKey(clientName);
  const trimmedName = clientName.trim();
  const now = new Date().toISOString();
  const dateStr = now.split('T')[0];

  const existingEntryKey = Object.keys(data).find(k => getCleanKey(k) === cleanKey);
  const existing = existingEntryKey ? data[existingEntryKey] : undefined;

  // If auto-syncing from sheet and client already exists in Watchlist, PRESERVE existing status and history!
  if (options?.isAutoSync && existing) {
    return existing;
  }

  if (!existing) {
    const newRecord: IssueClientRecord = {
      client: trimmedName,
      status: 'ACTIVE',
      latestRemarks: remarks,
      remarksHistory: [
        {
          id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          date: dateStr,
          remarks,
          amount: extra?.amount,
          dueDate: extra?.dueDate,
          actualDate: extra?.actualDate
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    data[trimmedName] = newRecord;
    saveData(data);
    return newRecord;
  } else {
    // Adding/updating remarks manually by user
    const newHistoryItem: RemarksHistoryItem = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: dateStr,
      remarks,
      amount: extra?.amount || existing.remarksHistory[0]?.amount,
      dueDate: extra?.dueDate || existing.remarksHistory[0]?.dueDate,
      actualDate: extra?.actualDate || existing.remarksHistory[0]?.actualDate
    };

    // Keep existing status (e.g. RESOLVED remains RESOLVED unless reactivated explicitly)
    const updatedRecord: IssueClientRecord = {
      ...existing,
      latestRemarks: remarks,
      remarksHistory: [newHistoryItem, ...existing.remarksHistory],
      updatedAt: now
    };
    data[existingEntryKey!] = updatedRecord;
    saveData(data);
    return updatedRecord;
  }
}

export function toggleIssueClientStatus(clientName: string, status: 'ACTIVE' | 'RESOLVED'): IssueClientRecord | null {
  const data = loadData();
  const cleanKey = getCleanKey(clientName);

  const existingEntryKey = Object.keys(data).find(k => getCleanKey(k) === cleanKey);
  if (!existingEntryKey || !data[existingEntryKey]) {
    return null;
  }

  const updatedRecord: IssueClientRecord = {
    ...data[existingEntryKey],
    status,
    updatedAt: new Date().toISOString()
  };

  data[existingEntryKey] = updatedRecord;
  saveData(data);
  return updatedRecord;
}
