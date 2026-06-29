import 'server-only';
import { google } from 'googleapis';
import { CashTransaction, AccountBalance, NoteBond, LoanStatus } from './types';

// Google Sheets Credentials & Config
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

// 1. Mock Data Definitions
const MOCK_CASH_TRANSACTIONS: CashTransaction[] = [
  { date: '2026-06-01', client: '영화포장(본사)', type: '입금', amount: 150000000, memo: '초기 운용자금 이체' },
  { date: '2026-06-01', client: '한국전력공사', type: '출금', amount: 3500000, memo: '5월 전기세 납부' },
  { date: '2026-06-02', client: '현대스틸', type: '출금', amount: 12000000, memo: '원자재 구매 대금' },
  { date: '2026-06-03', client: '에스원', type: '출금', amount: 450000, memo: '보안 경비 용역비' },
  { date: '2026-06-05', client: '진아로지스틱스㈜', type: '입금', amount: 12300000, memo: '물류 대금 입금' },
  { date: '2026-06-08', client: '진아로지스틱스㈜', type: '입금', amount: 1452550, memo: '미수금 일부 입금' },
  { date: '2026-06-08', client: '배한근(레드캣)', type: '입금', amount: 2482128, memo: '포장재 납품 대금' },
  { date: '2026-06-08', client: '임직원 급여', type: '출금', amount: 45000000, memo: '6월 급여 선지급분' },
  { date: '2026-06-09', client: '세무법인 한빛', type: '출금', amount: 1200000, memo: '기장 세무 대리 수수료' },
  { date: '2026-06-10', client: '진아로지스틱스㈜', type: '입금', amount: 21358913, memo: '납품 대금 입금' },
  { date: '2026-06-10', client: '경동에버런', type: '출금', amount: 7450000, memo: '외상 매입금 상환' },
  { date: '2026-06-11', client: '국민건강보험', type: '출금', amount: 8430000, memo: '4대보험 납부' },
  { date: '2026-06-15', client: '아그니코리아㈜', type: '입금', amount: 35000000, memo: '주문 선급금' },
  { date: '2026-06-20', client: '신한카드', type: '출금', amount: 4200000, memo: '법인카드 이용대금' },
  { date: '2026-06-25', client: '진아로지스틱스㈜', type: '입금', amount: 18200000, memo: '6월 2차 입금' },
  { date: '2026-06-28', client: '기업은행 대출이자', type: '출금', amount: 1800000, memo: 'L001 이자 자동이체' },

  // 2026-06-16 시재일보 전용 트랜잭션 데이터 추가
  { date: '2026-06-16', account: '기업은행', client: '석진종합포장', type: '입금', amount: 688050, memo: '석진종합포장 입금' },
  { date: '2026-06-16', account: '기업은행', client: '㈜샘터', type: '출금', amount: 688050, memo: '㈜샘터 출금' },
  { date: '2026-06-16', account: '기업은행', client: '로뎀시스템체어', type: '입금', amount: 2816000, memo: '로뎀시스템체어 입금' },
  { date: '2026-06-16', account: '기업은행', client: '브랜드팩', type: '입금', amount: 2804961, memo: '브랜드팩 입금' },
  { date: '2026-06-16', account: '기업은행', client: '㈜레트웍스', type: '입금', amount: 1098240, memo: '㈜레트웍스 입금' },
  { date: '2026-06-16', account: '기업은행', client: '아세아텍스㈜', type: '입금', amount: 777870, memo: '아세아텍스㈜ 입금' },
  { date: '2026-06-16', account: '기업은행', client: '한국피엘에이㈜', type: '입금', amount: 6972075, memo: '한국피엘에이㈜ 입금' },
  { date: '2026-06-16', account: '기업은행', client: '미나비주식회사', type: '입금', amount: 2567400, memo: '미나비주식회사 입금' },
  { date: '2026-06-16', account: '현금', client: '퀵서비스(오성)', type: '출금', amount: 35000, memo: '원자재 샘플 퀵 발송' },
  { date: '2026-06-16', account: '현금', client: '잡지출(음료)', type: '출금', amount: 12000, memo: '사무실 손님 접대용 음료' }
];

const MOCK_ACCOUNT_BALANCES: AccountBalance[] = [
  // 2026-06-08 balances
  { date: '2026-06-08', type: '보통예금', accountName: '기업은행(MMT)', balance: 1205000000 },
  { date: '2026-06-08', type: '보통예금', accountName: '신한은행 보통', balance: 250000000 },
  { date: '2026-06-08', type: '보통예금', accountName: '농협은행 보통', balance: 154000000 },
  { date: '2026-06-08', type: '보통예금', accountName: '국민은행 보통', balance: 87000000 },
  { date: '2026-06-08', type: '보통예금', accountName: '우리은행 보통', balance: 43000000 },
  { date: '2026-06-08', type: '보통예금', accountName: '하나은행 보통', balance: 33000000 },
  { date: '2026-06-08', type: '특정예금', accountName: '기업은행(채권)', balance: 300000000 },
  { date: '2026-06-08', type: '특정예금', accountName: '신한은행(신탁)', balance: 250000000 },
  { date: '2026-06-08', type: '특정예금', accountName: '하나은행(외환)', balance: 100000000 },
  { date: '2026-06-08', type: '현금', accountName: '현금잔액', balance: 1200000 },

  // 2026-06-09 balances
  { date: '2026-06-09', type: '보통예금', accountName: '기업은행(MMT)', balance: 1203800000 },
  { date: '2026-06-09', type: '보통예금', accountName: '신한은행 보통', balance: 250000000 },
  { date: '2026-06-09', type: '보통예금', accountName: '농협은행 보통', balance: 154000000 },
  { date: '2026-06-09', type: '보통예금', accountName: '국민은행 보통', balance: 87000000 },
  { date: '2026-06-09', type: '보통예금', accountName: '우리은행 보통', balance: 43000000 },
  { date: '2026-06-09', type: '보통예금', accountName: '하나은행 보통', balance: 33000000 },
  { date: '2026-06-09', type: '특정예금', accountName: '기업은행(채권)', balance: 300000000 },
  { date: '2026-06-09', type: '특정예금', accountName: '신한은행(신탁)', balance: 250000000 },
  { date: '2026-06-09', type: '특정예금', accountName: '하나은행(외환)', balance: 100000000 },
  { date: '2026-06-09', type: '현금', accountName: '현금잔액', balance: 1180000 },

  // 2026-06-10 balances
  { date: '2026-06-10', type: '보통예금', accountName: '기업은행(MMT)', balance: 1217708913 },
  { date: '2026-06-10', type: '보통예금', accountName: '신한은행 보통', balance: 250000000 },
  { date: '2026-06-10', type: '보통예금', accountName: '농협은행 보통', balance: 154000000 },
  { date: '2026-06-10', type: '보통예금', accountName: '국민은행 보통', balance: 87000000 },
  { date: '2026-06-10', type: '보통예금', accountName: '우리은행 보통', balance: 43000000 },
  { date: '2026-06-10', type: '보통예금', accountName: '하나은행 보통', balance: 33000000 },
  { date: '2026-06-10', type: '특정예금', accountName: '기업은행(채권)', balance: 300000000 },
  { date: '2026-06-10', type: '특정예금', accountName: '신한은행(신탁)', balance: 250000000 },
  { date: '2026-06-10', type: '특정예금', accountName: '하나은행(외환)', balance: 100000000 },
  { date: '2026-06-10', type: '현금', accountName: '현금잔액', balance: 1180000 },

  // 2026-06-16 시재일보 전용 계좌잔액 데이터 추가
  { date: '2026-06-16', type: '보통예금', accountName: '기업은행', balance: 20336508, todayDeposit: 17724596, todayWithdrawal: 688050 },
  { date: '2026-06-16', type: '보통예금', accountName: '기업은행(MMT)', balance: 1155000000, todayDeposit: 0, todayWithdrawal: 0 },
  { date: '2026-06-16', type: '보통예금', accountName: '신한은행 보통', balance: 75177153, todayDeposit: 0, todayWithdrawal: 0 },
  { date: '2026-06-16', type: '보통예금', accountName: '농협은행 보통', balance: 518, todayDeposit: 0, todayWithdrawal: 0 },
  { date: '2026-06-16', type: '보통예금', accountName: '국민은행 보통', balance: 3941533, todayDeposit: 0, todayWithdrawal: 0 },
  { date: '2026-06-16', type: '보통예금', accountName: '우리은행 보통', balance: 4622796, todayDeposit: 0, todayWithdrawal: 0 },
  { date: '2026-06-16', type: '보통예금', accountName: '하나은행 보통', balance: 17041376, todayDeposit: 0, todayWithdrawal: 0 },
  { date: '2026-06-16', type: '특정예금', accountName: '기업은행(채권)', balance: 400000000, todayDeposit: 0, todayWithdrawal: 0 },
  { date: '2026-06-16', type: '특정예금', accountName: '기업은행(신탁)', balance: 600000000, todayDeposit: 0, todayWithdrawal: 0 },
  { date: '2026-06-16', type: '특정예금', accountName: '기업은행(외환)', balance: 29263474, todayDeposit: 0, todayWithdrawal: 0 },
  { date: '2026-06-16', type: '현금', accountName: '현금잔액', balance: 1139989, todayDeposit: 0, todayWithdrawal: 0 }
];

const MOCK_NOTE_BONDS: NoteBond[] = [
  { regDate: '2026-05-05', type: '외담대', issuer: '한국타이어㈜', realClient: '한국타이어 테크노', dueDate: '2026-06-05', amount: 8500000, status: '결제완료' },
  { regDate: '2026-05-26', type: '외담대', issuer: '유닉스㈜', realClient: '유닉스 코퍼레이션', dueDate: '2026-06-26', amount: 12200000, status: '미결제' },
  { regDate: '2026-05-29', type: '외담대', issuer: '경동에버런', realClient: '경동 나비엔', dueDate: '2026-06-29', amount: 17378123, status: '미결제' },
  { regDate: '2026-05-30', type: '전자어음', issuer: '아그니코리아㈜', realClient: '주식회사 무경', dueDate: '2026-06-30', amount: 7131953, status: '미결제' },
  { regDate: '2026-06-05', type: '전자어음', issuer: '동양물산', realClient: '동양 기계', dueDate: '2026-07-05', amount: 25000000, status: '미결제' },
  { regDate: '2026-06-15', type: '종이어음', issuer: '대원강업', realClient: '대원 스프링', dueDate: '2026-07-15', amount: 14000000, status: '미결제' },
  { regDate: '2026-05-10', type: '기업채권', issuer: '삼화왕관', realClient: '삼화 패키징', dueDate: '2026-08-10', amount: 50000000, status: '미결제' },

  // 2026-06-16 시재일보 어음 채권 내역 추가
  { regDate: '2026-05-01', type: '전자어음', issuer: '아그니코리아㈜', realClient: '주식회사 무경', dueDate: '2026-07-01', amount: 13395996, status: '미결제' },
  { regDate: '2026-05-01', type: '전자어음', issuer: '(주)보라미', realClient: '주식회사삼현제약', dueDate: '2026-07-06', amount: 5432145, status: '미결제' },
  { regDate: '2026-05-01', type: '전자어음', issuer: '주식회사삼현제약', realClient: '', dueDate: '2026-07-06', amount: 6830554, status: '미결제' },
  { regDate: '2026-05-01', type: '전자어음', issuer: '아그니코리아㈜', realClient: '대영이앤디㈜', dueDate: '2026-06-30', amount: 7131953, status: '미결제' },
  { regDate: '2026-05-01', type: '전자어음', issuer: '주식회사삼현제약', realClient: '', dueDate: '2026-08-06', amount: 15765108, status: '미결제' },
  { regDate: '2026-05-01', type: '전자어음', issuer: '아그니코리아㈜', realClient: '주식회사 무경', dueDate: '2026-08-01', amount: 24685826, status: '미결제' },
  { regDate: '2026-05-01', type: '전자어음', issuer: '주식회사 삼현제약', realClient: '', dueDate: '2026-09-05', amount: 13952728, status: '미결제' },
  { regDate: '2026-05-01', type: '기업채권', issuer: '㈜코아스', realClient: '', dueDate: '2026-07-10', amount: 3984200, status: '미결제' },
  { regDate: '2026-05-01', type: '외담대', issuer: '㈜유닉스', realClient: '', dueDate: '2026-06-26', amount: 12259687, status: '미결제' },
  { regDate: '2026-05-01', type: '외담대', issuer: '㈜경동에버런', realClient: '', dueDate: '2026-06-29', amount: 17378123, status: '미결제' }
];

const MOCK_LOANS: LoanStatus[] = [
  {
    loanId: 'L001',
    bank: '기업은행',
    loanType: '시설자금대출',
    loanAmount: 500000000,
    balance: 480000000,
    interestRate: 4.5,
    startDate: '2024-01-15',
    dueDate: '2027-01-15',
    paymentDay: '15',
    monthlyInterest: 1800000,
    memo: '시설2공장 구축 자금'
  },
  {
    loanId: 'L002',
    bank: '기업은행',
    loanType: '운전자금대출',
    loanAmount: 200000000,
    balance: 200000000,
    interestRate: 4.8,
    startDate: '2025-06-01',
    dueDate: '2026-12-01',
    paymentDay: '25',
    monthlyInterest: 800000,
    memo: '운전자금 확보'
  },
  {
    loanId: 'L003',
    bank: '신한은행',
    loanType: '외담대한도',
    loanAmount: 100000000,
    balance: 87000000,
    interestRate: 4.2,
    startDate: '2025-03-01',
    dueDate: '2026-09-30',
    paymentDay: '10',
    monthlyInterest: 362500,
    memo: '외담대한도 대출'
  }
];

// Helper to initialize Google Sheets API
function getSheetsClient() {
  if (!SERVICE_ACCOUNT_KEY || !SPREADSHEET_ID) {
    return null;
  }
  try {
    let cleanKey = SERVICE_ACCOUNT_KEY.trim();
    if ((cleanKey.startsWith("'") && cleanKey.endsWith("'")) || 
        (cleanKey.startsWith('"') && cleanKey.endsWith('"'))) {
      cleanKey = cleanKey.slice(1, -1);
    }
    
    let credentials: any = {};
    try {
      credentials = JSON.parse(cleanKey);
    } catch (parseErr) {
      console.warn('JSON.parse failed for SERVICE_ACCOUNT_KEY, trying regex fallback:', parseErr);
      
      const projectIdMatch = cleanKey.match(/"project_id"\s*:\s*"([^"]+)"/);
      const clientEmailMatch = cleanKey.match(/"client_email"\s*:\s*"([^"]+)"/);
      const privateKeyMatch = cleanKey.match(/"private_key"\s*:\s*"([\s\S]+?)"\s*(?:,|\})/);

      if (projectIdMatch && clientEmailMatch && privateKeyMatch) {
        credentials = {
          project_id: projectIdMatch[1],
          client_email: clientEmailMatch[1],
          private_key: privateKeyMatch[1]
        };
      } else {
        throw new Error('Regex fallback parsing failed for Google key');
      }
    }
    
    let privateKey = credentials.private_key;
    if (privateKey && typeof privateKey === 'string') {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    return google.sheets({ version: 'v4', auth });
  } catch (err) {
    console.error('Failed to initialize Google Sheets client:', err);
    return null;
  }
}

// 2. Exported Fetchers (Fallbacks automatically to Mock Data)

export async function fetchCashTransactions(): Promise<{ data: CashTransaction[]; isDemo: boolean }> {
  const sheets = getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    return { data: MOCK_CASH_TRANSACTIONS, isDemo: true };
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '현금입출금!A2:G',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { data: [], isDemo: false };
    }

    const data = rows
      .filter(row => row[0] && /^\d{4}-\d{2}-\d{2}$/.test(row[0].trim()))
      .map((row): CashTransaction => ({
        date: row[0].trim(),
        account: row[1] || '',
        client: row[2] || '', // C열 (내역)
        type: (row[3] === '출금' ? '출금' : '입금') as '입금' | '출금', // D열 (구분)
        amount: parseInt((row[4] || '0').replace(/,/g, ''), 10) || 0, // E열 (금액)
        category: row[5] || '', // F열 (카테고리)
        memo: row[6] || '', // G열 (메모)
      }));

    return { data, isDemo: false };
  } catch (err) {
    console.error('Google Sheets fetchCashTransactions failed, using mock:', err);
    return { data: MOCK_CASH_TRANSACTIONS, isDemo: true };
  }
}

export async function fetchAccountBalances(): Promise<{ data: AccountBalance[]; isDemo: boolean }> {
  const sheets = getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    return { data: MOCK_ACCOUNT_BALANCES, isDemo: true };
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '계좌잔액!A2:G',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { data: [], isDemo: false };
    }

    const data = rows
      .filter(row => row[0] && /^\d{4}-\d{2}-\d{2}$/.test(row[0].trim()))
      .map((row): AccountBalance => ({
        date: row[0].trim(),
        type: (row[1] || '보통예금').trim() as '보통예금' | '특정예금' | '현금',
        accountName: row[2] || '',
        todayDeposit: parseInt((row[3] || '0').replace(/,/g, ''), 10) || 0,
        todayWithdrawal: parseInt((row[4] || '0').replace(/,/g, ''), 10) || 0,
        balance: parseInt((row[5] || '0').replace(/,/g, ''), 10) || 0, // F열 (잔액)
        remarks: row[6] || '', // G열 (비고)
      }));

    return { data, isDemo: false };
  } catch (err) {
    console.error('Google Sheets fetchAccountBalances failed, using mock:', err);
    return { data: MOCK_ACCOUNT_BALANCES, isDemo: true };
  }
}

export async function fetchNoteBonds(): Promise<{ data: NoteBond[]; isDemo: boolean }> {
  const sheets = getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    return { data: MOCK_NOTE_BONDS, isDemo: true };
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '어음채권!A2:I',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { data: [], isDemo: false };
    }

    const data = rows
      .filter(row => row[0] && /^\d{4}-\d{2}-\d{2}$/.test(row[0].trim()))
      .map((row): NoteBond => ({
        regDate: row[0].trim(),
        type: (row[1] || '전자어음').trim() as '전자어음' | '종이어음' | '기업채권' | '외담대',
        issuer: row[2] || '',
        realClient: row[3] || '',
        dueDate: row[4] || '',
        amount: parseInt((row[5] || '0').replace(/,/g, ''), 10) || 0,
        status: (row[6] === '결제완료' ? '결제완료' : '미결제') as '미결제' | '결제완료',
        settledDate: row[7] || '', // H열 (결제일)
        remarks: row[8] || '', // I열 (비고)
      }));

    return { data, isDemo: false };
  } catch (err) {
    console.error('Google Sheets fetchNoteBonds failed, using mock:', err);
    return { data: MOCK_NOTE_BONDS, isDemo: true };
  }
}

export async function fetchLoans(): Promise<{ data: LoanStatus[]; isDemo: boolean }> {
  const sheets = getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    return { data: MOCK_LOANS, isDemo: true };
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '대출현황!A2:N',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { data: [], isDemo: false };
    }

    const data = rows
      .filter(row => row[0] && /^L\d+$/.test(row[0].trim()))
      .map((row): LoanStatus => ({
        loanId: row[0].trim(),
        bank: row[1] || '',
        loanType: row[2] || '',
        loanAmount: parseInt((row[3] || '0').replace(/,/g, ''), 10) || 0,
        balance: parseInt((row[4] || '0').replace(/,/g, ''), 10) || 0,
        interestRate: parseFloat((row[5] || '0').replace(/%/g, '')) || 0,
        startDate: row[6] || '',
        dueDate: row[7] || '',
        paymentDay: String(row[8] || '').trim() || '1',
        monthlyInterest: parseInt((row[9] || '0').replace(/,/g, ''), 10) || 0,
        repayStartDate: row[10] || '', // K열 (상환시작일)
        repayPaymentDay: row[11] ? String(row[11]).trim() : undefined, // L열 (상환납부일)
        repayAmount: parseInt((row[12] || '0').replace(/,/g, ''), 10) || 0, // M열 (상환금액)
        memo: row[13] || '', // N열 (비고)
      }));

    return { data, isDemo: false };
  } catch (err) {
    console.error('Google Sheets fetchLoans failed, using mock:', err);
    return { data: MOCK_LOANS, isDemo: true };
  }
}

// Helper to parse YYYY-MM-DD to Date object
function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Resolve specific payment day number in a year/month for a given paymentDayStr (e.g. "3/말일", "말일", "25")
export function getPaymentDayForMonth(paymentDayStr: string, year: number, month: number): number {
  let dayRule = '25';
  const parts = String(paymentDayStr).split('/');
  if (parts.length === 2) {
    dayRule = parts[1].trim();
  } else {
    dayRule = paymentDayStr.trim();
  }

  if (dayRule === '말일') {
    return new Date(year, month + 1, 0).getDate();
  }
  return parseInt(dayRule, 10) || 25;
}

// Resolve interval/month checking and payment date details
export function getPaymentInfoForMonth(
  paymentDayStr: string,
  startDateStr: string,
  targetYear: number,
  targetMonth: number // 0-indexed
): { paymentDay: number; paymentDate: string } | null {
  let interval = 1;
  let dayRule = '25';

  const parts = String(paymentDayStr).split('/');
  if (parts.length === 2) {
    interval = parseInt(parts[0], 10) || 1;
    dayRule = parts[1].trim();
  } else {
    dayRule = paymentDayStr.trim();
  }

  const [sYear, sMonth] = startDateStr.split('-').map(Number);
  const diffMonths = (targetYear - sYear) * 12 + (targetMonth - (sMonth - 1));

  if (diffMonths < 0 || diffMonths % interval !== 0) {
    return null;
  }

  let resolvedDay = 25;
  if (dayRule === '말일') {
    resolvedDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  } else {
    resolvedDay = parseInt(dayRule, 10) || 25;
  }

  const yearStr = targetYear;
  const monthStr = String(targetMonth + 1).padStart(2, '0');
  const dayStr = String(resolvedDay).padStart(2, '0');

  return {
    paymentDay: resolvedDay,
    paymentDate: `${yearStr}-${monthStr}-${dayStr}`
  };
}

// Get number of monthly payments between two dates
export function getRepaymentsBetween(date1: Date, date2: Date, paymentDayVal: string | number): number {
  if (date1 >= date2) return 0;
  
  let count = 0;
  let currentYear = date1.getFullYear();
  let currentMonth = date1.getMonth();
  
  const endYear = date2.getFullYear();
  const endMonth = date2.getMonth();
  
  let current = new Date(currentYear, currentMonth, 1);
  const end = new Date(endYear, endMonth, 1);
  
  while (current <= end) {
    const day = getPaymentDayForMonth(String(paymentDayVal), current.getFullYear(), current.getMonth());
    const payDate = new Date(current.getFullYear(), current.getMonth(), day);
    if (payDate > date1 && payDate <= date2) {
      count++;
    }
    current.setMonth(current.getMonth() + 1);
  }
  
  return count;
}

// Calculates remaining loan balance dynamically based on target query date and base data date
export function calculateDynamicBalance(loan: LoanStatus, queryDateStr: string, baseDateStr: string): number {
  if (!loan.repayStartDate || !loan.repayAmount || loan.repayAmount <= 0) {
    return loan.balance;
  }
  
  const queryDate = parseDateStr(queryDateStr);
  const baseDate = parseDateStr(baseDateStr);
  const repayStart = parseDateStr(loan.repayStartDate);
  
  const repayDayVal = loan.repayPaymentDay || loan.paymentDay || '1';
  
  if (queryDate.getTime() === baseDate.getTime()) {
    return loan.balance;
  }
  
  if (queryDate > baseDate) {
    const intervalStart = baseDate > repayStart ? baseDate : new Date(repayStart.getTime() - 24 * 60 * 60 * 1000);
    const repayments = getRepaymentsBetween(intervalStart, queryDate, repayDayVal);
    return Math.max(0, loan.balance - repayments * loan.repayAmount);
  } else {
    const intervalStart = queryDate > repayStart ? queryDate : new Date(repayStart.getTime() - 24 * 60 * 60 * 1000);
    if (baseDate < repayStart) {
      return loan.balance;
    }
    const repayments = getRepaymentsBetween(intervalStart, baseDate, repayDayVal);
    return Math.min(loan.loanAmount, loan.balance + repayments * loan.repayAmount);
  }
}



