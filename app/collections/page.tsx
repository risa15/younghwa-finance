'use client';

import React, { useState, useEffect, useMemo } from 'react';

import { 
  TrendingUp, 
  Calendar, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  ListTodo,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  ArrowUpDown,
  Search,
  X,
  Edit,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { CashTransaction, ExpectedCollection, MatchingSuggestion } from '@/lib/types';
import MatchingSuggestions from '@/components/MatchingSuggestions';
import { formatKoreanShorthand } from '@/components/KPICard';

// Helpers
function formatDateStr(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function CollectionsPage() {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('2026-06-16'); // Default to key demo date
  const [viewType, setViewType] = useState<'daily' | 'monthly'>('monthly'); // Default to monthly for better summary view
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New Expected Collections states
  const [activeSubTab, setActiveSubTab] = useState<'actual' | 'crossCheck' | 'issueClients'>('actual');
  const [expectedCollections, setExpectedCollections] = useState<any[]>([]);
  const [matchingSuggestions, setMatchingSuggestions] = useState<MatchingSuggestion[]>([]);
  const [expectedLoading, setExpectedLoading] = useState<boolean>(false);
  const [expectedError, setExpectedError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [showOnlyWithRemarks, setShowOnlyWithRemarks] = useState<boolean>(false);

  // Issue clients states
  const [issueClients, setIssueClients] = useState<any[]>([]);
  const [dismissedClients, setDismissedClients] = useState<string[]>([]);
  const [customRemarksMap, setCustomRemarksMap] = useState<Record<string, { remarks: string; history: any[] }>>({});
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<any | null>(null);

  // Load dismissed issue clients & custom remarks from localStorage
  useEffect(() => {
    try {
      const savedDismissed = localStorage.getItem('dismissedIssueClients');
      if (savedDismissed) {
        setDismissedClients(JSON.parse(savedDismissed));
      }
      const savedRemarks = localStorage.getItem('customIssueRemarks');
      if (savedRemarks) {
        setCustomRemarksMap(JSON.parse(savedRemarks));
      }
    } catch (e) {
      console.error('Failed to parse issue clients state from localStorage:', e);
    }
  }, []);

  // Fetch issue clients Watchlist
  const fetchIssueClients = React.useCallback(async () => {
    try {
      const res = await fetch('/api/issue-clients');
      if (res.ok) {
        const result = await res.json();
        setIssueClients(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch issue clients:', err);
    }
  }, []);

  useEffect(() => {
    fetchIssueClients();
  }, [fetchIssueClients]);

  // Helper for normalizing client names
  const getCleanKey = (name: string): string => {
    if (!name) return '';
    return name
      .replace(/\(주\)/g, '')
      .replace(/주식회사/g, '')
      .replace(/㈜/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();
  };

  // Map of active issue clients for quick lookup and badge display
  const activeIssueClientsMap = useMemo(() => {
    const map: Record<string, any> = {};
    issueClients.forEach(ic => {
      const key = getCleanKey(ic.client);
      const isDismissed = dismissedClients.some(d => getCleanKey(d) === key);
      if (ic.status === 'ACTIVE' && !isDismissed) {
        map[key] = ic;
      }
    });
    return map;
  }, [issueClients, dismissedClients]);

  // Memoize available client names for dropdown filter
  const availableClients = useMemo(() => {
    const set = new Set<string>();
    expectedCollections.forEach(c => {
      if (c.client && c.client.trim()) {
        set.add(c.client.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [expectedCollections]);


  // Fetch transactions
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch('/api/transactions');
        if (!res.ok) throw new Error('API fetch error');
        const response = await res.json();
        setTransactions(response.data);
        
        // Default to maximum date in transactions if available
        if (response.data.length > 0) {
          const maxDate = response.data
            .filter((t: CashTransaction) => t.type === '입금')
            .reduce((max: string, t: CashTransaction) => t.date > max ? t.date : max, '2026-06-10');
          setSelectedDate(maxDate);
        }
      } catch (err) {
        console.error(err);
        setError('수금 내역 데이터를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fetch expected collections when sub-tab or date changes
  const fetchExpectedData = React.useCallback(async () => {
    setExpectedLoading(true);
    setExpectedError(null);
    try {
      const res = await fetch(`/api/expected-collections?date=${selectedDate}`);
      if (!res.ok) throw new Error('API fetch error');
      const result = await res.json();
      setExpectedCollections(result.data);
      
      const rawSuggestions = result.matchingSuggestions || [];
      // Filter out matching suggestions that have been dismissed via localStorage
      try {
        const dismissed = localStorage.getItem('dismissedSuggestions');
        if (dismissed) {
          const dismissedList = JSON.parse(dismissed);
          const filtered = rawSuggestions.filter((s: any) => {
            const key = `${s.expected.rowIndex}-${s.actual.date}-${s.actual.amount}`;
            return !dismissedList.includes(key);
          });
          setMatchingSuggestions(filtered);
        } else {
          setMatchingSuggestions(rawSuggestions);
        }
      } catch (e) {
        console.error('Failed to parse dismissedSuggestions:', e);
        setMatchingSuggestions(rawSuggestions);
      }
    } catch (err) {
      console.error(err);
      setExpectedError('수금 예정 및 크로스체크 내역을 불러오는 데 실패했습니다.');
    } finally {
      setExpectedLoading(false);
    }
  }, [selectedDate]);

  // Handle direct confirm by prompting for actual collection date, amount, and remarks
  const handleDirectConfirm = async (rowIndex: number, clientName: string, currentAmount: number, currentRemarks?: string, currentActualDate?: string) => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const defaultDate = currentActualDate || todayStr;
    const actualDateInput = window.prompt(`[${clientName}] 건의 실제 수금일을 입력해주세요 (YYYY-MM-DD) (비워두면 수금 미완료 상태로 돌아갑니다):`, defaultDate);
    
    if (actualDateInput === null) return;
    
    const actualDate = actualDateInput.trim();
    if (actualDate !== '') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(actualDate)) {
        alert('올바른 날짜 형식(YYYY-MM-DD)으로 입력해주세요.');
        return;
      }
    }

    const amountInput = window.prompt(`[${clientName}] 건의 예정금액(수금액)을 수정하시겠습니까? (수정 불필요 시 그냥 엔터):`, currentAmount.toString());
    const remarksInput = window.prompt(`[${clientName}] 건의 비고(메모)를 등록/수정하시겠습니까? (수정 불필요 시 그냥 엔터):`, currentRemarks || '');

    const body: any = { rowIndex, actualDate, client: clientName };
    
    if (amountInput !== null && amountInput.trim() !== '' && amountInput.trim() !== currentAmount.toString()) {
      const parsedAmount = parseInt(amountInput.replace(/,/g, ''), 10);
      if (isNaN(parsedAmount)) {
        alert('올바른 예정금액(숫자)을 입력해주세요.');
        return;
      }
      body.amount = parsedAmount;
    }
    
    if (remarksInput !== null && remarksInput.trim() !== (currentRemarks || '')) {
      body.remarks = remarksInput.trim();
    }

    try {
      setExpectedLoading(true);
      const response = await fetch('/api/expected-collections/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '수금 확정 처리 중 오류가 발생했습니다.');
      }

      alert('수금 확정 처리가 완료되었습니다.');
      fetchExpectedData();
      fetchIssueClients();
    } catch (err: any) {
      alert(err.message || '수금 확정 처리에 실패했습니다.');
    } finally {
      setExpectedLoading(false);
    }
  };

  // Handle editing remarks only
  const handleEditRemarks = async (rowIndex: number, clientName: string, currentRemarks: string, currentActualDate?: string) => {
    const remarksInput = window.prompt(`[${clientName}] 건의 비고(체크 포인트)를 등록/수정해주세요:`, currentRemarks);
    if (remarksInput === null) return;

    const remarks = remarksInput.trim();
    const actualDate = currentActualDate || '';

    try {
      setExpectedLoading(true);
      const response = await fetch('/api/expected-collections/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex, actualDate, remarks, client: clientName })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '비고 수정 중 오류가 발생했습니다.');
      }

      alert('비고가 성공적으로 업데이트되었습니다.');
      fetchExpectedData();
      fetchIssueClients();
    } catch (err: any) {
      alert(err.message || '비고 수정에 실패했습니다.');
    } finally {
      setExpectedLoading(false);
    }
  };

  // Handle updating due date (입금예정일 변경 - 거래처 결재조건 변경 등)
  const handleUpdateDueDate = async (
    rowIndex: number, 
    clientName: string, 
    currentDueDate: string, 
    currentRemarks?: string, 
    currentActualDate?: string
  ) => {
    const dueDateInput = window.prompt(
      `[${clientName}] 건의 새 입금예정일(수금예정일)을 입력해주세요 (YYYY-MM-DD):`, 
      currentDueDate
    );
    if (dueDateInput === null) return;
    
    const newDueDate = dueDateInput.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDueDate)) {
      alert('올바른 날짜 형식(YYYY-MM-DD)으로 입력해주세요. 예: 2026-09-30');
      return;
    }

    const defaultRemarks = currentRemarks || '거래처 결재조건 변경';
    const remarksInput = window.prompt(
      `[${clientName}] 건의 변경 사유(비고)를 입력/수정해주세요:`, 
      defaultRemarks
    );
    const remarks = remarksInput !== null ? remarksInput.trim() : (currentRemarks || '');

    try {
      setExpectedLoading(true);
      const response = await fetch('/api/expected-collections/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rowIndex, 
          actualDate: currentActualDate || '', 
          dueDate: newDueDate, 
          remarks,
          client: clientName 
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '수금예정일 변경 중 오류가 발생했습니다.');
      }

      alert('수금예정일 변경이 완료되었습니다.');
      fetchExpectedData();
      fetchIssueClients();
    } catch (err: any) {
      alert(err.message || '수금예정일 변경에 실패했습니다.');
    } finally {
      setExpectedLoading(false);
    }
  };

  // Handle toggling issue client status (ACTIVE <-> RESOLVED)
  const handleToggleIssueStatus = async (clientName: string, currentStatus: string) => {
    const cleanName = clientName.trim();
    const cleanKey = getCleanKey(cleanName);
    const isCurrentlyDismissed = dismissedClients.some(d => getCleanKey(d) === cleanKey) || currentStatus === 'RESOLVED';
    const newStatus = isCurrentlyDismissed ? 'ACTIVE' : 'RESOLVED';
    const actionText = newStatus === 'RESOLVED' ? '이슈 리스트에서 제외' : '이슈 관리 리스트에 재지정';

    if (!window.confirm(`[${cleanName}] 거래처를 ${actionText}하시겠습니까?`)) return;

    // 1. Instant Optimistic UI & localStorage Update
    setDismissedClients(prev => {
      let updatedDismissed: string[];
      if (newStatus === 'RESOLVED') {
        updatedDismissed = Array.from(new Set([...prev, cleanName]));
      } else {
        updatedDismissed = prev.filter(c => getCleanKey(c) !== cleanKey);
      }
      try {
        localStorage.setItem('dismissedIssueClients', JSON.stringify(updatedDismissed));
      } catch (e) {}
      return updatedDismissed;
    });

    try {
      const res = await fetch('/api/issue-clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: cleanName, status: newStatus })
      });

      if (!res.ok) throw new Error('상태 변경에 실패했습니다.');
      fetchIssueClients();
    } catch (err: any) {
      console.error(err);
    }
  };

  // Handle manual add comment to issue client
  const handleAddIssueClientRemark = async (clientName: string) => {
    const cleanName = clientName.trim();
    const cleanKey = getCleanKey(cleanName);
    const remarksInput = window.prompt(`[${cleanName}] 거래처의 관리 코멘트를 입력해주세요:`);
    if (!remarksInput || !remarksInput.trim()) return;

    const newRemark = remarksInput.trim();
    const todayStr = new Date().toISOString().substring(0, 10);

    const newHistoryItem = {
      id: `${Date.now()}-opt`,
      date: todayStr,
      remarks: newRemark
    };

    // 1. Instant Optimistic UI Update for customRemarksMap using normalized cleanKey
    setCustomRemarksMap(prev => {
      const prevClientHistory = prev[cleanKey]?.history || [];
      const updatedMap = {
        ...prev,
        [cleanKey]: {
          remarks: newRemark,
          history: [newHistoryItem, ...prevClientHistory]
        }
      };
      try {
        localStorage.setItem('customIssueRemarks', JSON.stringify(updatedMap));
      } catch (e) {}
      return updatedMap;
    });

    // 2. Instant Optimistic UI Update for issueClients state
    setIssueClients(prev => {
      const existingIdx = prev.findIndex(c => getCleanKey(c.client) === cleanKey);

      if (existingIdx >= 0) {
        const updatedList = [...prev];
        const prevHistory = updatedList[existingIdx].remarksHistory || [];
        updatedList[existingIdx] = {
          ...updatedList[existingIdx],
          status: 'ACTIVE',
          latestRemarks: newRemark,
          remarksHistory: [newHistoryItem, ...prevHistory],
          updatedAt: new Date().toISOString()
        };
        return updatedList;
      } else {
        return [
          {
            client: cleanName,
            status: 'ACTIVE',
            latestRemarks: newRemark,
            remarksHistory: [newHistoryItem],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          ...prev
        ];
      }
    });

    // 3. Ensure client is reactivated from dismissed list if needed
    setDismissedClients(prev => {
      const updated = prev.filter(c => getCleanKey(c) !== cleanKey);
      try {
        localStorage.setItem('dismissedIssueClients', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      const res = await fetch('/api/issue-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: cleanName, remarks: newRemark })
      });

      if (!res.ok) throw new Error('코멘트 등록에 실패했습니다.');
      fetchIssueClients();
    } catch (err: any) {
      alert(err.message || '코멘트 등록 중 오류가 발생했습니다.');
    }
  };

  // Sorting states
  const [sortBy, setSortBy] = useState<'dueDate' | 'actualDate' | 'status' | 'remarks' | 'client'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Toggle sort direction or field
  const toggleSort = (field: 'dueDate' | 'actualDate' | 'status' | 'remarks' | 'client') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Sort helper for status priority
  const getStatusPriority = (status: string): number => {
    switch (status) {
      case '연체': return 1;
      case '수동완료': return 5.5;
                        case '불일치_내역없음': return 2;
      case '불일치_금액오차': return 3;
      case '대기': return 4;
      case '완료': return 5;
      default: return 6;
    }
  };

  // Memoized sorted collections
  const sortedExpectedCollections = useMemo(() => {
    let list = [...expectedCollections];
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      list = list.filter(c => c.client.toLowerCase().includes(term));
    }
    if (selectedClientFilter !== 'ALL') {
      list = list.filter(c => c.client === selectedClientFilter);
    }
    if (selectedStatusFilter !== 'ALL') {
      if (selectedStatusFilter === '연체') {
        list = list.filter(c => c.status === '연체' || c.overdueMonths >= 1);
      } else {
        list = list.filter(c => c.status === selectedStatusFilter);
      }
    }
    if (showOnlyWithRemarks) {
      list = list.filter(c => c.remarks && c.remarks.trim() !== '');
    }
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'client') {
        // 1순위: 연체 상태 우선 배치 (연체건이 상단에 묶임)
        const isAOverdue = (a.status === '연체' || a.overdueMonths >= 1) ? 0 : 1;
        const isBOverdue = (b.status === '연체' || b.overdueMonths >= 1) ? 0 : 1;
        if (isAOverdue !== isBOverdue) {
          return isAOverdue - isBOverdue;
        }
        // 2순위: 거래처명 가나다순 정렬
        comparison = a.client.localeCompare(b.client, 'ko');
      } else if (sortBy === 'dueDate') {
        comparison = a.dueDate.localeCompare(b.dueDate);
      } else if (sortBy === 'actualDate') {
        const aDate = a.actualDate || (sortOrder === 'asc' ? '9999-99-99' : '0000-00-00');
        const bDate = b.actualDate || (sortOrder === 'asc' ? '9999-99-99' : '0000-00-00');
        comparison = aDate.localeCompare(bDate);
      } else if (sortBy === 'status') {
        const prioDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
        if (prioDiff !== 0) return prioDiff;
        comparison = a.client.localeCompare(b.client, 'ko');
      } else if (sortBy === 'remarks') {
        const aRemarks = a.remarks || '';
        const bRemarks = b.remarks || '';
        comparison = aRemarks.localeCompare(bRemarks);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [expectedCollections, sortBy, sortOrder, searchTerm, selectedClientFilter, selectedStatusFilter, showOnlyWithRemarks]);

  // Memoized Overdue Items & Total Overdue Amount
  const overdueItems = useMemo(() => {
    return expectedCollections.filter(c => c.status === '연체' || c.overdueMonths >= 1);
  }, [expectedCollections]);

  const overdueTotalAmount = useMemo(() => {
    return overdueItems.reduce((sum, c) => sum + c.amount, 0);
  }, [overdueItems]);

  // Export Expected Collections / Overdue list to CSV (UTF-8 BOM for Excel)
  const handleDownloadCSV = (onlyOverdue: boolean = false) => {
    const sourceList = onlyOverdue 
      ? expectedCollections.filter(c => c.status === '연체' || c.overdueMonths >= 1)
      : sortedExpectedCollections;

    if (sourceList.length === 0) {
      alert(onlyOverdue ? '다운로드할 연체 거래처 내역이 없습니다.' : '다운로드할 내역이 없습니다.');
      return;
    }

    const headers = [
      '연체 구분',
      '결제기한',
      '거래처명',
      '이월 여부',
      '예정금액(원)',
      '입금명의',
      '실제수금일',
      '대조 상태',
      '비고 (체크 포인트)',
      '장부 대조 상세 정보'
    ];

    const rows = sourceList.map(c => {
      let overdueLabel = '정상';
      if (c.overdueMonths >= 3) overdueLabel = '3달+ 연체';
      else if (c.overdueMonths >= 1) overdueLabel = `${c.overdueMonths}달 연체`;
      else if (c.status === '연체') overdueLabel = '연체';

      let statusLabel = '대기';
      switch (c.status) {
        case '완료': statusLabel = '일치'; break;
        case '불일치_금액오차': statusLabel = '금액불일치'; break;
        case '수동완료': statusLabel = '직접확정'; break;
        case '불일치_내역없음': statusLabel = '내역누락'; break;
        case '연체': statusLabel = '연체'; break;
        default: statusLabel = '대기';
      }

      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const s = String(val).replace(/"/g, '""');
        return `"${s}"`;
      };

      return [
        escapeCsv(overdueLabel),
        escapeCsv(c.dueDate || ''),
        escapeCsv(c.client || ''),
        escapeCsv(c.isCarriedOver ? '이월' : '당월'),
        c.amount || 0,
        escapeCsv(c.depositorName || ''),
        escapeCsv(c.actualDate || ''),
        escapeCsv(statusLabel),
        escapeCsv(c.remarks || ''),
        escapeCsv(c.matchDetails?.message || (c.status === '대기' ? '수금 대기 중' : '결제 기한 경과 미수'))
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const dateTag = selectedDate.replace(/-/g, '').substring(0, 6);
    const todayTag = formatDateStr(new Date()).replace(/-/g, '');
    const filenamePrefix = onlyOverdue ? '연체거래처_리스트' : '수금예정_장부크로스체크';
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filenamePrefix}_${dateTag}_${todayTag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Actual Collections to CSV
  const handleDownloadActualCSV = () => {
    if (filteredCollections.length === 0) {
      alert('다운로드할 수금 완료 내역이 없습니다.');
      return;
    }

    const headers = ['날짜', '거래처명', '카테고리', '메모', '금액(원)'];
    const rows = filteredCollections.map(col => {
      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const s = String(val).replace(/"/g, '""');
        return `"${s}"`;
      };
      return [
        escapeCsv(col.date),
        escapeCsv(col.client),
        escapeCsv(col.category || ''),
        escapeCsv(col.memo || ''),
        col.amount || 0
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const dateTag = selectedDate.replace(/-/g, '');
    const todayTag = formatDateStr(new Date()).replace(/-/g, '');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `수금완료_입금내역_${dateTag}_${todayTag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderSortIcon = (field: 'dueDate' | 'actualDate' | 'status' | 'remarks' | 'client') => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-3 w-3 text-slate-350 shrink-0" />;
    }
    return sortOrder === 'asc' 
      ? <span className="text-emerald-600 font-black text-[9px] shrink-0">▲</span>
      : <span className="text-emerald-600 font-black text-[9px] shrink-0">▼</span>;
  };

  useEffect(() => {
    if (activeSubTab === 'crossCheck') {
      fetchExpectedData();
    }
  }, [activeSubTab, fetchExpectedData]);

  // Filter transactions based on viewType and selectedDate
  const filteredCollections = useMemo(() => {
    if (transactions.length === 0) return [];
    
    let onlyDeposits = transactions.filter(t => 
      t.type === '입금' && 
      (t.category?.trim() === '매출수금' || t.category?.trim() === '어음입금')
    );

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      onlyDeposits = onlyDeposits.filter(t => t.client.toLowerCase().includes(term));
    }

    if (showOnlyWithRemarks) {
      onlyDeposits = onlyDeposits.filter(t => t.memo && t.memo.trim() !== '');
    }
    
    if (viewType === 'daily') {
      return onlyDeposits.filter(t => t.date === selectedDate);
    } else {
      // Monthly view: match year and month
      const [year, month] = selectedDate.split('-');
      return onlyDeposits.filter(t => {
        const [ty, tm] = t.date.split('-');
        return ty === year && tm === month;
      });
    }
  }, [transactions, viewType, selectedDate, searchTerm, showOnlyWithRemarks]);

  // Sum of filtered collections
  const totalAmount = useMemo(() => {
    return filteredCollections.reduce((sum, c) => sum + c.amount, 0);
  }, [filteredCollections]);



  // Date handlers
  const adjustDate = (offset: number) => {
    if (viewType === 'daily') {
      const dateObj = parseDateStr(selectedDate);
      dateObj.setDate(dateObj.getDate() + offset);
      setSelectedDate(formatDateStr(dateObj));
    } else {
      // Adjust month
      const [year, month] = selectedDate.split('-').map(Number);
      const dateObj = new Date(year, month - 1 + offset, 1);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      setSelectedDate(`${yyyy}-${mm}-01`); // default day 1
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    setSelectedDate(e.target.value);
  };



  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 tracking-wide">수금 현황</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            회사로 유입되는 현금 입금 목록과 월별 수금 추이를 분석합니다.
          </p>
        </div>

        {/* View toggler & Date navigation */}
        {activeSubTab !== 'issueClients' && (
          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            {/* Toggle Daily/Monthly */}
            <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 h-9 shadow-sm">
              <button
                onClick={() => setViewType('daily')}
                className={`px-3 text-xs font-semibold rounded-md transition-all ${
                  viewType === 'daily' 
                    ? 'bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                일별
              </button>
              <button
                onClick={() => setViewType('monthly')}
                className={`px-3 text-xs font-semibold rounded-md transition-all ${
                  viewType === 'monthly' 
                    ? 'bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                월별
              </button>
            </div>

            {/* Date controls */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden h-9 shadow-sm">
              <button 
                onClick={() => adjustDate(-1)}
                className="p-2 text-slate-400 hover:text-slate-850 hover:bg-slate-50 transition-colors"
                disabled={loading}
                title={viewType === 'daily' ? '하루 전' : '한 달 전'}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="relative px-3 flex items-center justify-center gap-2 border-x border-slate-200 hover:bg-slate-50 cursor-pointer h-full text-xs font-semibold text-slate-700 min-w-[130px]">
                <span>
                  {viewType === 'daily' 
                    ? `${selectedDate.split('-')[0]}년 ${selectedDate.split('-')[1]}월 ${selectedDate.split('-')[2]}일`
                    : `${selectedDate.split('-')[0]}년 ${selectedDate.split('-')[1]}월`
                  }
                </span>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={loading}
                />
              </div>
              
              <button 
                onClick={() => adjustDate(1)}
                className="p-2 text-slate-400 hover:text-slate-850 hover:bg-slate-50 transition-colors"
                disabled={loading}
                title={viewType === 'daily' ? '하루 후' : '한 달 후'}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-slate-250 mt-4 mb-6">
        <button
          onClick={() => setActiveSubTab('actual')}
          className={`pb-3 text-xs sm:text-sm font-semibold px-4 border-b-2 transition-all duration-150 ${
            activeSubTab === 'actual'
              ? 'border-brand-emerald text-brand-emerald'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          수금 완료 내역 (실제 입금)
        </button>
        <button
          onClick={() => setActiveSubTab('crossCheck')}
          className={`pb-3 text-xs sm:text-sm font-semibold px-4 border-b-2 transition-all duration-150 flex items-center gap-1.5 ${
            activeSubTab === 'crossCheck'
              ? 'border-brand-emerald text-brand-emerald'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>수금 예정 & 장부 크로스체크</span>
          <span className="px-1.5 py-0.5 text-[9px] bg-slate-100 text-slate-600 rounded-full font-mono">신규</span>
        </button>
        <button
          onClick={() => setActiveSubTab('issueClients')}
          className={`pb-3 text-xs sm:text-sm font-semibold px-4 border-b-2 transition-all duration-150 flex items-center gap-1.5 ${
            activeSubTab === 'issueClients'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>⚠️ 이슈 거래처 관리 (Watchlist)</span>
          {Object.keys(activeIssueClientsMap).length > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] bg-amber-100 text-amber-800 font-bold rounded-full font-mono">
              {Object.keys(activeIssueClientsMap).length}
            </span>
          )}
        </button>
      </div>

      {/* Search Bar & Filters */}
      {activeSubTab !== 'issueClients' && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="거래처명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-emerald focus:border-brand-emerald shadow-sm bg-white text-slate-800 placeholder-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowOnlyWithRemarks(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all duration-200 shadow-sm h-9 ${
                showOnlyWithRemarks
                  ? 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/30 font-bold'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>비고/메모가 있는 건만 보기</span>
            </button>
          </div>
        </div>
      )}

      {error && activeSubTab === 'actual' && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs mb-4">
          ⚠️ {error}
        </div>
      )}

      {expectedError && activeSubTab === 'crossCheck' && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs mb-4">
          ⚠️ {expectedError}
        </div>
      )}

      {/* Main content area */}
      {activeSubTab === 'actual' ? (
        <div className={`space-y-6 sm:space-y-8 ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
          {/* 2. Collection Details Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {viewType === 'daily' ? '일별 수금 상세 내역' : '월별 수금 상세 내역'}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-[10px] text-slate-400 font-semibold font-mono">
                  조회 대상 기간: <span className="text-slate-600">
                    {viewType === 'daily' ? selectedDate : `${selectedDate.split('-')[0]}-${selectedDate.split('-')[1]}`}
                  </span>
                </div>
                <button
                  onClick={handleDownloadActualCSV}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-sm"
                  title="수금 완료 내역 엑셀(CSV) 다운로드"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>엑셀 다운로드</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 tracking-wider">
                    <th className="px-6 py-3">날짜</th>
                    <th className="px-6 py-3">거래내용</th>
                    <th className="px-6 py-3">카테고리</th>
                    <th className="px-6 py-3">메모</th>
                    <th className="px-6 py-3 text-right">금액</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100">
                  {filteredCollections.length > 0 ? (
                    filteredCollections.map((col, idx) => (
                      <tr key={`${col.client}-${col.date}-${idx}`} className="hover:bg-slate-50/50 transition-colors duration-150">
                        <td className="px-6 py-3.5 font-mono text-slate-500">{col.date}</td>
                        <td className="px-6 py-3.5 text-slate-800 font-bold">{col.client}</td>
                        <td className="px-6 py-3.5">
                          {col.category ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                              {col.category}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 font-medium">{col.memo || '-'}</td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                          {col.amount.toLocaleString('ko-KR')} 원
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-6 py-8 text-center text-slate-400 font-medium" colSpan={5}>
                        {searchTerm ? '검색 조건에 맞는 수금(입금) 내역이 없습니다.' : '지정된 일자에 등록된 수금(입금) 내역이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Sum */}
            <div className="px-6 py-4.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {viewType === 'daily' ? '일 수금 합계' : '월 누적 수금 합계'}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 font-mono">
                  ({formatKoreanShorthand(totalAmount)})
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-mono font-black text-brand-emerald tracking-tight">
                    {totalAmount.toLocaleString('ko-KR')}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">원</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Cross Check Tab Rendering */}
      {activeSubTab === 'crossCheck' && (
        <div className={`space-y-6 sm:space-y-8 ${expectedLoading ? 'opacity-40 pointer-events-none' : ''}`}>
          
          {/* 스마트 입금 매칭 추천 */}
          {matchingSuggestions.length > 0 && (
            <MatchingSuggestions 
              suggestions={matchingSuggestions} 
              onMatched={fetchExpectedData} 
            />
          )}
          
          {/* 🚨 연체 거래처 현황 및 바로 다운로드 배너 */}
          {overdueItems.length > 0 && (
            <div className="bg-gradient-to-r from-rose-50 to-rose-100/70 border border-rose-200/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-sm shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-extrabold text-rose-950">🚨 연체 거래처 현황</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs">
                      총 {overdueItems.length}건
                    </span>
                  </div>
                  <p className="text-xs text-rose-700 mt-0.5 font-medium">
                    결제 기한이 지난 미수 금액 합계: <span className="font-mono font-extrabold text-rose-900">{overdueTotalAmount.toLocaleString()}원</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
                <button
                  onClick={() => setSelectedStatusFilter('연체')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all duration-150 shadow-sm ${
                    selectedStatusFilter === '연체'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  🚨 연체건만 보기
                </button>
                <button
                  onClick={() => handleDownloadCSV(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-lg transition-all shadow-sm"
                  title="연체된 거래처 목록을 엑셀(CSV) 파일로 다운로드합니다."
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>연체 거래처 엑셀 다운로드</span>
                </button>
              </div>
            </div>
          )}

          {/* Summary KPIs for Cross-check */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-xs">
              <span className="text-[10px] text-slate-400 font-bold block">조회월 총 수금 예정</span>
              <span className="font-mono font-black text-slate-800 text-base mt-1.5 block">
                {expectedCollections.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}원
              </span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-xs">
              <span className="text-[10px] text-emerald-600 font-bold block">대조 완료 금액</span>
              <span className="font-mono font-black text-brand-emerald text-base mt-1.5 block">
                {expectedCollections
                  .filter(c => c.status === '완료')
                  .reduce((sum, c) => sum + c.amount, 0).toLocaleString()}원
              </span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-xs">
              <span className="text-[10px] text-rose-500 font-bold block">미수 금액</span>
              <span className="font-mono font-black text-rose-600 text-base mt-1.5 block">
                {expectedCollections
                  .filter(c => !c.actualDate || c.actualDate.trim() === '')
                  .reduce((sum, c) => sum + c.amount, 0).toLocaleString()}원
              </span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-xs">
              <span className="text-[10px] text-slate-500 font-bold block">대조 성공률</span>
              <span className="font-mono font-black text-slate-800 text-base mt-1.5 block">
                {expectedCollections.length > 0
                  ? Math.round(
                      (expectedCollections.filter(c => c.status === '완료').length /
                        expectedCollections.length) *
                        100
                    )
                  : 0}%
              </span>
            </div>
          </div>

          {/* Cross check table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between md:items-center gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  수금 예정 내역 및 입출금 장부 크로스체크 (대조)
                </h3>
              </div>

              {/* 필터 컨트롤 박스: 상태 드롭다운 + 거래처 드롭다운 + 검색창 + 다운로드 버튼 */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-sm">
                  <Clock className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">전체 상태 보기</option>
                    <option value="연체">🚨 연체 항목만 보기</option>
                    <option value="대기">⏳ 대기 항목만 보기</option>
                    <option value="완료">✅ 완료(일치) 항목만 보기</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-sm">
                  <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <select
                    value={selectedClientFilter}
                    onChange={(e) => setSelectedClientFilter(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">전체 거래처 ({availableClients.length}곳)</option>
                    {availableClients.map(client => (
                      <option key={client} value={client}>{client}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="거래처 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-emerald shadow-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                  <button
                    onClick={() => handleDownloadCSV(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-sm"
                    title="연체 거래처 목록 엑셀 다운로드"
                  >
                    <Download className="h-3.5 w-3.5 text-rose-600" />
                    <span>연체 리스트 다운로드</span>
                  </button>
                  <button
                    onClick={() => handleDownloadCSV(false)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-sm"
                    title="현재 대조 테이블 목록 엑셀 다운로드"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    <span>전체 대조 내역 다운로드</span>
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 font-semibold font-mono flex items-center gap-1.5 ml-1">
                  <span>조회월: {selectedDate.split('-')[0]}-{selectedDate.split('-')[1]}</span>
                  <button 
                    onClick={fetchExpectedData} 
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                    title="새로고침"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 tracking-wider">
                    <th className="px-3 py-3 text-center min-w-[85px]">연체 구분</th>
                    <th 
                      className="px-4 py-3 min-w-[110px] cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => toggleSort('dueDate')}
                    >
                      <div className="flex items-center gap-1">
                        <span>결제기한</span>
                        {renderSortIcon('dueDate')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => toggleSort('client')}
                    >
                      <div className="flex items-center gap-1">
                        <span>거래처명</span>
                        {renderSortIcon('client')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right">예정금액</th>
                    <th className="px-4 py-3">입금명의</th>
                    <th 
                      className="px-4 py-3 min-w-[110px] cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => toggleSort('actualDate')}
                    >
                      <div className="flex items-center gap-1">
                        <span>실제수금일</span>
                        {renderSortIcon('actualDate')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => toggleSort('status')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>대조 상태</span>
                        {renderSortIcon('status')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 min-w-[150px] cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => toggleSort('remarks')}
                    >
                      <div className="flex items-center gap-1">
                        <span>비고 (체크 포인트)</span>
                        {renderSortIcon('remarks')}
                      </div>
                    </th>
                    <th className="px-4 py-3">장부 대조 상세 정보</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100">
                  {sortedExpectedCollections.length > 0 ? (
                    sortedExpectedCollections.map((col, idx) => {
                      let statusBadge = null;
                      
                      // Single highlight style for 1+ month overdue issues
                      const isOverdueIssue = col.overdueMonths >= 1 || col.status === '연체';
                      const statusRowClass = isOverdueIssue 
                        ? 'bg-rose-50/80 border-l-4 border-l-rose-500' 
                        : 'bg-white hover:bg-slate-50/50';

                      switch (col.status) {
                        case '완료':
                          statusBadge = (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center gap-1 w-fit mx-auto">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>일치</span>
                            </span>
                          );
                          break;
                        case '불일치_금액오차':
                          statusBadge = (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center gap-1 w-fit mx-auto">
                              <AlertTriangle className="h-3 w-3" />
                              <span>금액불일치</span>
                            </span>
                          );
                          break;
                        case '수동완료':
                          statusBadge = (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center gap-1 w-fit mx-auto">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>직접확정</span>
                            </span>
                          );
                          break;
                        case '불일치_내역없음':
                          statusBadge = (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-100 flex items-center justify-center gap-1 w-fit mx-auto">
                              <AlertTriangle className="h-3 w-3" />
                              <span>내역누락</span>
                            </span>
                          );
                          break;
                        case '연체':
                          statusBadge = (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center gap-1 w-fit mx-auto animate-pulse">
                              <Clock className="h-3 w-3" />
                              <span>연체</span>
                            </span>
                          );
                          break;
                        default:
                          statusBadge = (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-100 flex items-center justify-center gap-1 w-fit mx-auto">
                              <span>대기</span>
                            </span>
                          );
                      }

                      return (
                        <tr 
                          key={`${col.client}-${idx}`} 
                          className={`transition-colors duration-150 ${statusRowClass}`}
                        >
                          <td className="px-3 py-4 text-center">
                            {col.overdueMonths >= 1 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white shadow-sm shrink-0 inline-block whitespace-nowrap">
                                {col.overdueMonths >= 3 ? '3달+ 연체' : `${col.overdueMonths}달 연체`}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-[10px] font-medium">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 font-mono text-slate-500 group">
                            <div className="flex items-center justify-between gap-1">
                              <span>{col.dueDate}</span>
                              <button
                                onClick={() => handleUpdateDueDate(col.rowIndex, col.client, col.dueDate, col.remarks, col.actualDate)}
                                className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-all p-1 rounded shrink-0"
                                title="입금예정일 변경 (결재조건 변경 등)"
                              >
                                <Calendar className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-800 font-bold">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{col.client}</span>
                              {activeIssueClientsMap[col.client?.trim()] && (
                                <button
                                  onClick={() => setSelectedClientForHistory(activeIssueClientsMap[col.client?.trim()])}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                                  title="수금 이슈 관리 거래처 (과거 비고 히스토리 보기)"
                                >
                                  <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                                  <span>이슈 관리</span>
                                </button>
                              )}
                              {col.isCarriedOver && (
                                <span 
                                  className="px-1 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100 shadow-sm shrink-0" 
                                  title="이전 달에 연체되어 이월된 수금 건입니다."
                                >
                                  이월
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right font-mono font-bold text-slate-800">
                            {col.amount.toLocaleString()} 원
                          </td>
                          <td className="px-4 py-4 text-slate-500">
                            {col.depositorName ? (
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[10px]">
                                {col.depositorName}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 font-mono text-slate-500">
                            {col.actualDate ? (
                              <div className="flex items-center gap-1.5">
                                <span>{col.actualDate}</span>
                                <button
                                  onClick={() => handleDirectConfirm(col.rowIndex, col.client, col.amount, col.remarks, col.actualDate)}
                                  className="text-slate-400 hover:text-emerald-600 hover:underline transition-colors font-bold text-[10px] shrink-0"
                                  title="수금 정보 수정"
                                >
                                  [수정]
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 flex-wrap">
                                <button
                                  onClick={() => handleDirectConfirm(col.rowIndex, col.client, col.amount, col.remarks)}
                                  className="px-2 py-1 rounded bg-slate-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 border border-slate-200 text-slate-600 font-bold text-[10px] transition-all duration-200 active:scale-95 whitespace-nowrap shadow-sm"
                                  title="실제 수금일 직접 등록"
                                >
                                  직접 확정
                                </button>
                                <button
                                  onClick={() => handleUpdateDueDate(col.rowIndex, col.client, col.dueDate, col.remarks, col.actualDate)}
                                  className="px-2 py-1 rounded bg-slate-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 border border-slate-200 text-slate-600 font-bold text-[10px] transition-all duration-200 active:scale-95 whitespace-nowrap shadow-sm"
                                  title="거래처 결재조건 변경 등으로 인한 입금예정일 수정"
                                >
                                  예정일 변경
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">{statusBadge}</td>
                          <td className="px-4 py-4 max-w-[250px] group">
                            <div className="flex items-start justify-between gap-1.5">
                              <span 
                                className={col.remarks ? "text-slate-750 font-semibold whitespace-pre-wrap break-all leading-normal text-[11px]" : "text-slate-350 italic text-[11px]"}
                                title={col.remarks}
                              >
                                {col.remarks || ''}
                              </span>
                              <button
                                onClick={() => handleEditRemarks(col.rowIndex, col.client, col.remarks || '', col.actualDate)}
                                className="text-slate-400 hover:text-brand-emerald opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 shrink-0 ml-1 mt-0.5"
                                title="비고 수정"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-[11px]">
                            {col.matchDetails ? (
                              <div className="space-y-1">
                                <div className="font-semibold text-slate-700">
                                  {col.matchDetails.message}
                                </div>
                                {col.matchDetails.actualClient && (
                                  <div className="text-[10px] text-slate-450 flex items-center gap-1 font-mono">
                                    <span>장부내용:</span>
                                    <span className="text-slate-600 font-bold">{col.matchDetails.actualClient}</span>
                                    <span className="text-slate-300">|</span>
                                    <span>입금액: {col.matchDetails.actualAmount.toLocaleString()}원</span>
                                    <span className="text-slate-300">|</span>
                                    <span>입금일: {col.matchDetails.actualDate}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium">
                                {col.status === '대기' ? '수금 대기 중인 항목입니다.' : '결제 기한이 지난 미수 항목입니다.'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-6 py-8 text-center text-slate-400 font-medium" colSpan={8}>
                        {searchTerm ? '검색 조건에 맞는 수금 예정 내역이 없습니다.' : '이번 달에 등록된 수금 예정 내역이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab 3: Issue Clients Watchlist View */}
      {activeSubTab === 'issueClients' && (
        <div className="space-y-6">
          {/* Watchlist Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>수금 이슈 거래처 목록</span>
                </h3>
                <span className="text-xs text-slate-400">({issueClients.filter(c => c.status === 'ACTIVE' && !dismissedClients.some(d => getCleanKey(d) === getCleanKey(c.client))).length}건)</span>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    const clientName = window.prompt('수동으로 이슈 목록에 추가할 거래처명을 입력해주세요:');
                    if (clientName && clientName.trim()) {
                      handleAddIssueClientRemark(clientName.trim());
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span>수동 거래처 추가</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-400 tracking-wider">
                    <th className="px-4 py-3 min-w-[140px]">거래처명 (가나다 순)</th>
                    <th className="px-4 py-3 min-w-[280px]">최근 비고 (체크 포인트)</th>
                    <th className="px-4 py-3 min-w-[130px]">최근 업데이트 / 등록일</th>
                    <th className="px-4 py-3 text-center min-w-[120px]">비고 이력</th>
                    <th className="px-4 py-3 text-center min-w-[90px]">관리</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100">
                  {issueClients.filter(c => c.status === 'ACTIVE' && !dismissedClients.some(d => getCleanKey(d) === getCleanKey(c.client))).length > 0 ? (
                    issueClients
                      .filter(c => c.status === 'ACTIVE' && !dismissedClients.some(d => getCleanKey(d) === getCleanKey(c.client)))
                      .sort((a, b) => a.client.localeCompare(b.client, 'ko'))
                      .map((item) => {
                        const cleanKey = getCleanKey(item.client);
                        const customRecord = customRemarksMap[cleanKey];
                        const displayRemarks = customRecord?.remarks || item.latestRemarks || '기록된 비고 없음';

                        const customHist = customRecord?.history || [];
                        const itemHist = item.remarksHistory || [];
                        const combinedHist = [...customHist];
                        itemHist.forEach((h: any) => {
                          if (!combinedHist.some((c: any) => c.id === h.id || (c.date === h.date && c.remarks === h.remarks))) {
                            combinedHist.push(h);
                          }
                        });
                        const itemWithMergedHistory = { ...item, remarksHistory: combinedHist };

                        return (
                          <tr key={item.client} className="hover:bg-slate-50/80 transition-colors bg-white">
                            <td className="px-4 py-4 font-bold text-slate-800">
                              <span>{item.client}</span>
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              <div className="flex items-start justify-between gap-3">
                                <div className="font-medium whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                                  {displayRemarks}
                                </div>
                                <button
                                  onClick={() => handleAddIssueClientRemark(item.client)}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold rounded transition-colors shrink-0 whitespace-nowrap shadow-2xs cursor-pointer"
                                  title="추가 코멘트 작성"
                                >
                                  + 코멘트
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-4 font-mono text-slate-500 text-[11px]">
                              <div>{item.updatedAt ? item.updatedAt.split('T')[0] : '-'}</div>
                              <div className="text-[9px] text-slate-400 font-normal">등록: {item.createdAt ? item.createdAt.split('T')[0] : '-'}</div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() => setSelectedClientForHistory(itemWithMergedHistory)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded text-[11px] transition-colors inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <span>이력 ({combinedHist.length}건)</span>
                              </button>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() => handleToggleIssueStatus(item.client, item.status)}
                                className="px-3 py-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-600 font-bold text-xs rounded transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                                title="이슈 목록에서 제외"
                              >
                                제외
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                        등록되거나 수집된 이슈 관리 거래처가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* History Modal Popup */}
      {selectedClientForHistory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                    <span>[{selectedClientForHistory.client}]</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      {selectedClientForHistory.status === 'ACTIVE' ? '이슈 관리 중' : '정상 해제됨'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">수금 결재 및 비고 변경 누적 타임라인</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClientForHistory(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              <div className="border-l-2 border-amber-300 pl-4 space-y-4 ml-1">
                {selectedClientForHistory.remarksHistory && selectedClientForHistory.remarksHistory.length > 0 ? (
                  selectedClientForHistory.remarksHistory.map((h: any, i: number) => (
                    <div key={h.id || i} className="relative group">
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white ring-2 ring-amber-100" />
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-400 mb-1">
                          <span className="font-semibold text-slate-600">{h.date}</span>
                          {h.amount && <span className="text-amber-700 font-bold">금액: {Number(h.amount).toLocaleString()}원</span>}
                        </div>
                        <p className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {h.remarks}
                        </p>
                        {(h.dueDate || h.actualDate) && (
                          <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-200/50 pt-1.5 flex items-center gap-3">
                            {h.dueDate && <span>예정일: {h.dueDate}</span>}
                            {h.actualDate && <span>실제수금일: {h.actualDate}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">기록된 비고 이력이 없습니다.</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-between items-center">
              <button
                onClick={() => {
                  handleAddIssueClientRemark(selectedClientForHistory.client);
                  setSelectedClientForHistory(null);
                }}
                className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors flex items-center gap-1"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>+ 새 코멘트 추가</span>
              </button>
              <button
                onClick={() => setSelectedClientForHistory(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors shadow-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
