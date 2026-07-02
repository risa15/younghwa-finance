// 영화포장 자금운용 시스템 데이터 타입 정의

// 탭 1: 현금입출금
export interface CashTransaction {
  date: string;       // YYYY-MM-DD
  account?: string;   // 계좌명 (신규 추가)
  client: string;     // 내역 (거래처)
  type: '입금' | '출금'; // 구분
  amount: number;     // 금액 (원 단위)
  category?: string;  // 카테고리 (신규 추가)
  memo?: string;      // 메모
}

// 탭 2: 계좌잔액
export interface AccountBalance {
  date: string;       // YYYY-MM-DD
  type: '보통예금' | '특정예금' | '현금'; // 계좌구분
  accountName: string; // 계좌명 (예: 기업은행(MMT))
  todayDeposit?: number;    // 금일입금액 (신규 추가)
  todayWithdrawal?: number; // 금일지출액 (신규 추가)
  balance: number;    // 잔액 (원 단위)
  remarks?: string;   // 비고 (신규 추가)
}

// 탭 3: 어음채권
export interface NoteBond {
  regDate: string;    // 등록일 (YYYY-MM-DD)
  type: '전자어음' | '종이어음' | '기업채권' | '외담대'; // 구분
  issuer: string;     // 발행인 (예: 아그니코리아㈜)
  realClient: string; // 실거래처 (예: 주식회사 무경)
  dueDate: string;    // 만기일 (YYYY-MM-DD)
  amount: number;     // 금액 (원 단위)
  status: '미결제' | '결제완료'; // 상태
  settledDate?: string; // 결제일 (신규 추가)
  remarks?: string;     // 비고 (신규 추가)
}

// 탭 4: 대출현황
export interface LoanStatus {
  loanId: string;      // 대출ID
  bank: string;        // 금융기관
  loanType: string;    // 대출종류 (시설자금/운전자금/외담대 등)
  loanAmount: number;  // 대출금액 (원 단위)
  balance: number;     // 현재 잔액 (원 단위)
  interestRate: number; // 금리 (%)
  startDate: string;   // 실행일 (YYYY-MM-DD)
  dueDate: string;     // 만기일 (YYYY-MM-DD)
  paymentDay: string;  // 이자납부일 (예: "15", "말일", "3/말일", "3/25")
  monthlyInterest: number; // 월 이자 (원 단위)
  repayStartDate?: string;  // 상환시작일 (신규 추가)
  repayPaymentDay?: string; // 상환납부일 (신규 추가)
  repayAmount?: number;     // 상환금액 (신규 추가)
  memo?: string;       // 비고 (N열 매핑)
}

// 탭 5: 수금예정
export interface ExpectedCollection {
  regDate: string;        // 등록일 (YYYY-MM-DD)
  client: string;         // 거래처명
  dueDate: string;        // 결제기한 (YYYY-MM-DD)
  amount: number;         // 예정금액 (원 단위)
  depositorName?: string; // 입금명의 (E열)
  actualDate?: string;    // 실제수금일 (F열)
  remarks?: string;       // 비고 (G열)
}

// 대시보드 API 응답 데이터 통합 구조
export interface DashboardData {
  selectedDate: string;
  maxAvailableDate: string;
  isDemo: boolean;
  kpis: {
    todayCollection: number;      // 당일 수금액
    todayExpense: number;         // 당일 지출액
    totalLiquidAssets: number;    // 보통예금 + 특정예금 + 현금 합계
    cashBalance: number;          // 현금 잔액
    expectedCollectionThisMonth?: number; // 이번 달 총 수금 예정액
    collectedThisMonth?: number;          // 이번 달 수금 완료액
    uncollectedThisMonth?: number;        // 이번 달 남은 미수 잔액
    upcomingNotes30Days?: number;        // 30일 이내 어음·채권 만기 예정액
    expectedCollection20Days?: number;   // 20일 이내 수금 예정액
  };
  upcomingAlerts: Array<{
    id: string;
    type: string;
    client: string;
    amount: number;
    dueDate: string;
    daysLeft: number;
  }>;
  upcomingCollections?: Array<{
    id: string;
    client: string;
    amount: number;
    dueDate: string;
    daysLeft: number;
    status: '대기' | '연체' | '완료';
  }>;
  accounts: AccountBalance[];
  simulation?: {
    notesMaturing: Array<{ client: string; type: string; amount: number }>;
    interestDue: Array<{ bank: string; loanType: string; amount: number }>;
    principalRepayments?: Array<{ bank: string; loanType: string; amount: number }>;
    expectedCollections?: Array<{ client: string; amount: number }>; // 신규 추가
    actualDeposits: number;
    actualWithdrawals: number;
    expectedIn: number;
    expectedOut: number;
    startLiquidAssets: number;
    endLiquidAssets: number;
  };
}
