import 'server-only';
import fs from 'fs';
import path from 'path';
import { getSheetsClient, getSpreadsheetId } from './sheets';

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

type IssueClientMap = Record<string, IssueClientRecord>;

// ─────────────────────────────────────────────────────────────
// 저장소: 각 회사의 구글 시트 '이슈거래처' 탭에 영구 저장
// (회사마다 GOOGLE_SHEETS_ID가 다르므로 데이터가 자동으로 분리됨)
// 시트 연결이 없으면 로컬 JSON 파일로 대체 (개발/데모용)
// ─────────────────────────────────────────────────────────────
const SHEET_TAB = '이슈거래처';
const HEADER = ['거래처', '상태', '최근 비고', '최근 수정일', '데이터(JSON, 수정 금지)'];

// 회사별 로컬 파일명 (영화포장은 기존 파일 유지) — 시트 미연결 시 및 최초 이관용
const getFileName = () => {
  const company = (process.env.NEXT_PUBLIC_COMPANY_NAME || '영화포장').trim();
  if (company === '영화포장') return 'issue_clients.json';
  return `issue_clients_${company.replace(/[^0-9A-Za-z가-힣]/g, '')}.json`;
};

const getFilePath = () => {
  const fileName = getFileName();
  try {
    const primaryPath = path.join(process.cwd(), 'scratch', fileName);
    const dirname = path.dirname(primaryPath);
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }
    return primaryPath;
  } catch (e) {
    return path.join('/tmp', fileName);
  }
};

let inMemoryIssueClients: IssueClientMap = {};

function loadFromFile(): IssueClientMap {
  try {
    const filePath = getFilePath();
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      inMemoryIssueClients = parsed;
      return parsed;
    }
  } catch (err) {
    console.error('Failed to read issue clients file, using in-memory store:', err);
  }
  return inMemoryIssueClients;
}

function saveToFile(data: IssueClientMap) {
  inMemoryIssueClients = data;
  try {
    fs.writeFileSync(getFilePath(), JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save issue clients file:', err);
  }
}

async function ensureSheetTab(sheets: NonNullable<ReturnType<typeof getSheetsClient>>, spreadsheetId: string) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' });
  const exists = meta.data.sheets?.some(s => s.properties?.title === SHEET_TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_TAB } } }] }
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${SHEET_TAB}'!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER] }
    });
    return false; // 새로 생성됨
  }
  return true;
}

async function loadData(): Promise<IssueClientMap> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  if (!sheets || !spreadsheetId) return loadFromFile();

  try {
    const existed = await ensureSheetTab(sheets, spreadsheetId);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_TAB}'!A2:E`
    });
    const rows = res.data.values || [];
    const data: IssueClientMap = {};
    rows.forEach(row => {
      const json = row[4];
      if (!json) return;
      try {
        const record = JSON.parse(json) as IssueClientRecord;
        // 시트에서 직접 상태를 바꿨다면 반영
        if (row[1] === 'RESOLVED' || row[1] === 'ACTIVE') record.status = row[1];
        if (record.client) data[record.client] = record;
      } catch {
        /* skip malformed row */
      }
    });

    // 최초 1회: 시트 탭이 비어있으면 기존 로컬 파일 데이터를 시트로 이관
    if (rows.length === 0 && !existed) {
      const legacy = loadFromFile();
      if (Object.keys(legacy).length > 0) {
        await saveData(legacy);
        return legacy;
      }
    }
    return data;
  } catch (err) {
    console.error('Failed to load issue clients from sheet, falling back to file:', err);
    return loadFromFile();
  }
}

async function saveData(data: IssueClientMap) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  if (!sheets || !spreadsheetId) {
    saveToFile(data);
    return;
  }

  const records = Object.values(data).sort((a, b) => a.client.localeCompare(b.client, 'ko'));
  const values = records.map(r => [
    r.client,
    r.status,
    r.latestRemarks,
    r.updatedAt.split('T')[0],
    JSON.stringify(r)
  ]);

  await ensureSheetTab(sheets, spreadsheetId);
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `'${SHEET_TAB}'!A2:E` });
  if (values.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${SHEET_TAB}'!A2`,
      valueInputOption: 'RAW',
      requestBody: { values }
    });
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

export async function getAllIssueClients(): Promise<IssueClientRecord[]> {
  const data = await loadData();
  return Object.values(data).sort((a, b) => a.client.localeCompare(b.client, 'ko'));
}

export async function getIssueClient(client: string): Promise<IssueClientRecord | undefined> {
  const data = await loadData();
  const targetKey = getCleanKey(client);
  const matchedKey = Object.keys(data).find(k => getCleanKey(k) === targetKey);
  return matchedKey ? data[matchedKey] : undefined;
}

// 메모리 상의 map에 반영만 하고 변경 여부를 반환 (저장은 호출자가 수행)
function applyIssueClient(
  data: IssueClientMap,
  clientName: string,
  remarks: string,
  extra?: { amount?: number; dueDate?: string; actualDate?: string },
  options?: { isAutoSync?: boolean }
): { record: IssueClientRecord; changed: boolean } {
  const cleanKey = getCleanKey(clientName);
  const trimmedName = clientName.trim();
  const now = new Date().toISOString();
  const dateStr = now.split('T')[0];

  const existingEntryKey = Object.keys(data).find(k => getCleanKey(k) === cleanKey);
  const existing = existingEntryKey ? data[existingEntryKey] : undefined;

  // If auto-syncing from sheet and client already exists in Watchlist, PRESERVE existing status and history!
  if (options?.isAutoSync && existing) {
    return { record: existing, changed: false };
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
    return { record: newRecord, changed: true };
  }

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
  return { record: updatedRecord, changed: true };
}

export async function addOrUpdateIssueClient(
  clientName: string,
  remarks: string,
  extra?: { amount?: number; dueDate?: string; actualDate?: string },
  options?: { isAutoSync?: boolean }
): Promise<IssueClientRecord> {
  const data = await loadData();
  const { record, changed } = applyIssueClient(data, clientName, remarks, extra, options);
  if (changed) await saveData(data);
  return record;
}

// 수금 예정 시트의 비고를 한 번에 동기화 (시트 API 호출 최소화)
export async function syncIssueClientsAndGetAll(
  items: { client: string; remarks: string; amount?: number; dueDate?: string; actualDate?: string }[]
): Promise<IssueClientRecord[]> {
  const data = await loadData();
  let anyChanged = false;
  items.forEach(item => {
    const { changed } = applyIssueClient(
      data,
      item.client,
      item.remarks,
      { amount: item.amount, dueDate: item.dueDate, actualDate: item.actualDate },
      { isAutoSync: true }
    );
    if (changed) anyChanged = true;
  });
  if (anyChanged) await saveData(data);
  return Object.values(data).sort((a, b) => a.client.localeCompare(b.client, 'ko'));
}

export async function toggleIssueClientStatus(
  clientName: string,
  status: 'ACTIVE' | 'RESOLVED'
): Promise<IssueClientRecord | null> {
  const data = await loadData();
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
  await saveData(data);
  return updatedRecord;
}
