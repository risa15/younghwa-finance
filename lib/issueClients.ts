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

const DATA_FILE_PATH = path.join(process.cwd(), 'scratch', 'issue_clients.json');

// Rich In-memory Seed Data
let inMemoryIssueClients: Record<string, IssueClientRecord> = {
  "석진종합포장": {
    client: "석진종합포장",
    status: "ACTIVE",
    latestRemarks: "8월 결재 15일 지연입금, 지속 모니터링 필요",
    remarksHistory: [
      {
        id: "demo-1",
        date: "2026-08-15",
        remarks: "8월 결재 15일 지연입금, 지속 모니터링 필요",
        amount: 688050,
        dueDate: "2026-08-01",
        actualDate: "2026-08-15"
      }
    ],
    createdAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-15T00:00:00.000Z"
  },
  "진아로지스틱스㈜": {
    client: "진아로지스틱스㈜",
    status: "ACTIVE",
    latestRemarks: "분할 입금 및 미수금 입금 차액 모니터링 건",
    remarksHistory: [
      {
        id: "demo-2",
        date: "2026-06-15",
        remarks: "분할 입금 및 미수금 입금 차액 모니터링 건",
        amount: 15000000,
        dueDate: "2026-06-16"
      }
    ],
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z"
  },
  "로뎀시스템체어": {
    client: "로뎀시스템체어",
    status: "ACTIVE",
    latestRemarks: "단가 조정으로 차액 발생 가능성, 입금확인 필요",
    remarksHistory: [
      {
        id: "demo-3",
        date: "2026-06-16",
        remarks: "단가 조정으로 차액 발생 가능성, 입금확인 필요",
        amount: 2800000,
        dueDate: "2026-06-16",
        actualDate: "2026-06-16"
      }
    ],
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z"
  },
  "유닉스 코퍼레이션": {
    client: "유닉스 코퍼레이션",
    status: "ACTIVE",
    latestRemarks: "과거 결재 지연 및 미수 연체 이력 보유",
    remarksHistory: [
      {
        id: "demo-4",
        date: "2026-06-14",
        remarks: "과거 결재 지연 및 미수 연체 이력 보유",
        amount: 4200000,
        dueDate: "2026-06-14"
      }
    ],
    createdAt: "2026-06-14T00:00:00.000Z",
    updatedAt: "2026-06-14T00:00:00.000Z"
  },
  "브랜드팩": {
    client: "브랜드팩",
    status: "RESOLVED",
    latestRemarks: "입금명의 다름 (브랜드팩(주) 명의로 입금 확인 완료)",
    remarksHistory: [
      {
        id: "demo-5",
        date: "2026-06-16",
        remarks: "입금명의 다름 (브랜드팩(주) 명의로 입금 확인 완료)",
        amount: 2804961,
        dueDate: "2026-06-16",
        actualDate: "2026-06-16"
      }
    ],
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z"
  }
};

function ensureDirectoryExists(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExists(dirname);
  fs.mkdirSync(dirname);
}

function loadData(): Record<string, IssueClientRecord> {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const data = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      // Merge with seed data if keys don't exist
      let updated = false;
      for (const [key, val] of Object.entries(inMemoryIssueClients)) {
        if (!parsed[key]) {
          parsed[key] = val;
          updated = true;
        }
      }
      if (updated) {
        saveData(parsed);
      }
      return parsed;
    }
  } catch (err) {
    console.error('Failed to read issue_clients.json, using in-memory store:', err);
  }
  saveData(inMemoryIssueClients);
  return inMemoryIssueClients;
}

function saveData(data: Record<string, IssueClientRecord>) {
  try {
    ensureDirectoryExists(DATA_FILE_PATH);
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    inMemoryIssueClients = data;
  } catch (err) {
    console.error('Failed to save issue_clients.json:', err);
    inMemoryIssueClients = data;
  }
}

export function getAllIssueClients(): IssueClientRecord[] {
  const data = loadData();
  return Object.values(data).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getIssueClient(client: string): IssueClientRecord | undefined {
  const data = loadData();
  const cleanKey = client.trim();
  return data[cleanKey];
}

export function addOrUpdateIssueClient(
  clientName: string,
  remarks: string,
  extra?: { amount?: number; dueDate?: string; actualDate?: string }
): IssueClientRecord {
  const data = loadData();
  const cleanKey = clientName.trim();
  const now = new Date().toISOString();
  const dateStr = now.split('T')[0];

  const existing = data[cleanKey];

  if (!existing) {
    const newRecord: IssueClientRecord = {
      client: cleanKey,
      status: 'ACTIVE',
      latestRemarks: remarks,
      remarksHistory: [
        {
          id: `${Date.now()}-1`,
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
    data[cleanKey] = newRecord;
    saveData(data);
    return newRecord;
  } else {
    const lastHistory = existing.remarksHistory[0];
    const isSameDayAndRemarks = lastHistory && lastHistory.date === dateStr && lastHistory.remarks === remarks;

    const historyItems = isSameDayAndRemarks
      ? existing.remarksHistory
      : [
          {
            id: `${Date.now()}-${existing.remarksHistory.length + 1}`,
            date: dateStr,
            remarks,
            amount: extra?.amount,
            dueDate: extra?.dueDate,
            actualDate: extra?.actualDate
          },
          ...existing.remarksHistory
        ];

    const updatedRecord: IssueClientRecord = {
      ...existing,
      status: 'ACTIVE',
      latestRemarks: remarks,
      remarksHistory: historyItems,
      updatedAt: now
    };
    data[cleanKey] = updatedRecord;
    saveData(data);
    return updatedRecord;
  }
}

export function toggleIssueClientStatus(clientName: string, status: 'ACTIVE' | 'RESOLVED'): IssueClientRecord | null {
  const data = loadData();
  const cleanKey = clientName.trim();

  if (!data[cleanKey]) {
    return null;
  }

  data[cleanKey] = {
    ...data[cleanKey],
    status,
    updatedAt: new Date().toISOString()
  };

  saveData(data);
  return data[cleanKey];
}
