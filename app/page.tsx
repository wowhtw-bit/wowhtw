'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/ko';

dayjs.extend(isoWeek);
dayjs.locale('ko');

interface SheetInfo {
  title: string;
  sheetId: number;
}

interface SheetTabData {
  sheetName: string;
  startDate: string;
  dataMode: 'excel' | 'paste';
  excelFile: File | null;
  pastedData: string;
  parsedData: any[][];
  filteredData: any[][];
}

export default function Home() {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [sheetTabs, setSheetTabs] = useState<Record<string, SheetTabData>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // URL에서 스프레드시트 ID 추출
  const extractSpreadsheetId = (urlOrId: string): string | null => {
    if (!urlOrId.trim()) return null;
    
    if (urlOrId.includes('docs.google.com/spreadsheets/d/')) {
      const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : null;
    }
    
    return urlOrId.trim();
  };

  // 오늘 날짜 기준 주간 시작일 계산 (월요일)
  const getDefaultWeekStartDate = () => {
    return dayjs().startOf('isoWeek').format('YYYY-MM-DD');
  };

  // 주간 시작일 계산 (월요일)
  const getWeekStartDate = (date: string) => {
    const d = dayjs(date);
    return d.startOf('isoWeek').format('YYYY-MM-DD');
  };

  // 주간 종료일 계산 (일요일)
  const getWeekEndDate = (date: string) => {
    const d = dayjs(date);
    return d.endOf('isoWeek').format('YYYY-MM-DD');
  };

  // 구글 시트 목록 가져오기
  const fetchSheets = async () => {
    if (!spreadsheetUrl.trim()) {
      setMessage({ type: 'error', text: '스프레드시트 URL 또는 ID를 입력해주세요.' });
      return;
    }

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) {
      setMessage({ type: 'error', text: '올바른 스프레드시트 URL 또는 ID를 입력해주세요.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/sheets/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId }),
      });

      const data = await response.json();
      if (response.ok) {
        setSheets(data.sheets);
        setMessage({ type: 'success', text: `시트 ${data.sheets.length}개를 불러왔습니다.` });
      } else {
        setMessage({ type: 'error', text: data.error || '시트 목록을 가져오는데 실패했습니다.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '시트 목록을 가져오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 시트 선택 및 탭 생성
  const handleSheetSelection = (sheetNames: string[]) => {
    setSelectedSheets(sheetNames);
    
    // 새로 선택된 시트에 대한 탭 데이터 초기화
    const newTabs: Record<string, SheetTabData> = { ...sheetTabs };
    const defaultStartDate = getDefaultWeekStartDate();
    sheetNames.forEach((sheetName) => {
      if (!newTabs[sheetName]) {
        newTabs[sheetName] = {
          sheetName,
          startDate: defaultStartDate,
          dataMode: 'paste',
          excelFile: null,
          pastedData: '',
          parsedData: [],
          filteredData: [],
        };
      }
    });
    
    // 선택 해제된 시트의 탭 제거
    Object.keys(newTabs).forEach((sheetName) => {
      if (!sheetNames.includes(sheetName)) {
        delete newTabs[sheetName];
      }
    });
    
    setSheetTabs(newTabs);
    
    // 첫 번째 탭 활성화
    if (sheetNames.length > 0 && !activeTab) {
      setActiveTab(sheetNames[0]);
    }
  };

  // 엑셀 파일 읽기
  const handleExcelUpload = async (file: File, sheetName: string) => {
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      setSheetTabs((prev) => ({
        ...prev,
        [sheetName]: {
          ...prev[sheetName],
          excelFile: file,
          parsedData: data as any[][],
        },
      }));
      
      setMessage({ type: 'success', text: `[${sheetName}] 엑셀 파일에서 ${data.length}행을 읽었습니다.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '엑셀 파일을 읽는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 붙여넣은 데이터 파싱
  const handlePasteData = (sheetName: string) => {
    const tabData = sheetTabs[sheetName];
    if (!tabData?.pastedData.trim()) {
      setMessage({ type: 'error', text: '데이터를 붙여넣어주세요.' });
      return;
    }

    try {
      const lines = tabData.pastedData.trim().split('\n');
      const data = lines.map((line) => {
        if (line.includes('\t')) {
          return line.split('\t');
        } else if (line.includes(',')) {
          return line.split(',').map((cell) => cell.trim());
        } else {
          return [line];
        }
      });
      
      setSheetTabs((prev) => ({
        ...prev,
        [sheetName]: {
          ...prev[sheetName],
          parsedData: data,
        },
      }));
      
      setMessage({ type: 'success', text: `[${sheetName}] 데이터 ${data.length}행을 파싱했습니다.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '데이터 파싱에 실패했습니다.' });
    }
  };

  // 날짜 필터링
  const filterDataByDate = (sheetName: string) => {
    const tabData = sheetTabs[sheetName];
    if (!tabData) return;
    
    if (!tabData.startDate) {
      setMessage({ type: 'error', text: '기준 날짜를 선택해주세요.' });
      return;
    }

    if (tabData.parsedData.length === 0) {
      setMessage({ type: 'error', text: '먼저 데이터를 업로드하거나 붙여넣어주세요.' });
      return;
    }

    try {
      const weekStart = getWeekStartDate(tabData.startDate);
      const weekEnd = getWeekEndDate(tabData.startDate);

      const header = tabData.parsedData[0];
      const dataRows = tabData.parsedData.slice(1);

      let dateColumnIndex = 0;
      const headerStr = header.join(' ').toLowerCase();
      if (headerStr.includes('날짜') || headerStr.includes('date') || headerStr.includes('일자')) {
        dateColumnIndex = header.findIndex((cell: any) => {
          const cellStr = String(cell).toLowerCase();
          return cellStr.includes('날짜') || cellStr.includes('date') || cellStr.includes('일자');
        });
      }

      const filtered = dataRows.filter((row) => {
        if (!row[dateColumnIndex]) return false;
        const rowDate = dayjs(row[dateColumnIndex]);
        if (!rowDate.isValid()) return false;
        const dateStr = rowDate.format('YYYY-MM-DD');
        return dateStr >= weekStart && dateStr <= weekEnd;
      });

      setSheetTabs((prev) => ({
        ...prev,
        [sheetName]: {
          ...prev[sheetName],
          filteredData: filtered,
        },
      }));
      
      setMessage({
        type: 'success',
        text: `[${sheetName}] 기준 날짜(${weekStart} ~ ${weekEnd})로 ${filtered.length}행을 추출했습니다.`,
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '데이터 필터링에 실패했습니다.' });
    }
  };

  // 기존 행들의 G열에 수식 추가 (추출테스트 시트만)
  const updateExistingFormulas = async (sheetName: string) => {
    if (sheetName !== '추출테스트') {
      setMessage({ type: 'error', text: '이 기능은 "추출테스트" 시트에만 사용할 수 있습니다.' });
      return;
    }

    if (!spreadsheetUrl.trim()) {
      setMessage({ type: 'error', text: '스프레드시트 URL 또는 ID를 입력해주세요.' });
      return;
    }

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) {
      setMessage({ type: 'error', text: '올바른 스프레드시트 URL 또는 ID를 입력해주세요.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/sheets/update-formula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          sheetName,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: `[${sheetName}] ${data.message || 'G열에 수식이 추가되었습니다.'}` });
      } else {
        setMessage({ type: 'error', text: `[${sheetName}] ${data.error || '수식 추가에 실패했습니다.'}` });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `[${sheetName}] ${error.message || '수식 추가에 실패했습니다.'}` });
    } finally {
      setLoading(false);
    }
  };

  // 구글 시트에 데이터 추가
  const appendToSheet = async (sheetName: string) => {
    if (!spreadsheetUrl.trim()) {
      setMessage({ type: 'error', text: '스프레드시트 URL 또는 ID를 입력해주세요.' });
      return;
    }

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) {
      setMessage({ type: 'error', text: '올바른 스프레드시트 URL 또는 ID를 입력해주세요.' });
      return;
    }

    const tabData = sheetTabs[sheetName];
    if (!tabData) return;

    if (tabData.filteredData.length === 0) {
      setMessage({ type: 'error', text: '추출된 데이터가 없습니다. 먼저 데이터를 필터링해주세요.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/sheets/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          sheetName,
          values: tabData.filteredData,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: `[${sheetName}] ${data.message || '데이터가 성공적으로 추가되었습니다.'}` });
        // 해당 탭의 데이터 초기화
        setSheetTabs((prev) => ({
          ...prev,
          [sheetName]: {
            ...prev[sheetName],
            filteredData: [],
            parsedData: [],
            pastedData: '',
            excelFile: null,
          },
        }));
        if (fileInputRefs.current[sheetName]) {
          fileInputRefs.current[sheetName]!.value = '';
        }
      } else {
        setMessage({ type: 'error', text: `[${sheetName}] ${data.error || '데이터 추가에 실패했습니다.'}` });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `[${sheetName}] ${error.message || '데이터 추가에 실패했습니다.'}` });
    } finally {
      setLoading(false);
    }
  };

  const currentTabData = activeTab ? sheetTabs[activeTab] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            구글 시트 데이터 연동
          </h1>

          {/* 메시지 표시 */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 스프레드시트 URL 입력 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              구글 스프레드시트 URL 또는 ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={spreadsheetUrl}
                onChange={(e) => setSpreadsheetUrl(e.target.value)}
                placeholder="스프레드시트 URL 또는 ID를 입력하세요"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={fetchSheets}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                시트 목록 가져오기
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              예: https://docs.google.com/spreadsheets/d/1Khjhh49GE4u5XWlhWCAnvWBnNHoywnY3kz48tj3N5zU/edit
            </p>
          </div>

          {/* 시트 선택 (다중 선택) */}
          {sheets.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  시트 선택 (여러 개 선택 가능)
                </label>
                <button
                  onClick={() => {
                    if (selectedSheets.length === sheets.length) {
                      // 모두 선택되어 있으면 모두 해제
                      handleSheetSelection([]);
                      setActiveTab('');
                    } else {
                      // 모두 선택
                      const allSheetNames = sheets.map((s) => s.title);
                      handleSheetSelection(allSheetNames);
                      if (allSheetNames.length > 0) {
                        setActiveTab(allSheetNames[0]);
                      }
                    }
                  }}
                  className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  {selectedSheets.length === sheets.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {sheets.map((sheet) => (
                  <label key={sheet.sheetId} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedSheets.includes(sheet.title)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSheetSelection([...selectedSheets, sheet.title]);
                        } else {
                          const newSelected = selectedSheets.filter((s) => s !== sheet.title);
                          handleSheetSelection(newSelected);
                          if (activeTab === sheet.title && newSelected.length > 0) {
                            setActiveTab(newSelected[0]);
                          } else if (newSelected.length === 0) {
                            setActiveTab('');
                          }
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{sheet.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 탭 네비게이션 */}
          {selectedSheets.length > 0 && (
            <div className="mb-6 border-b border-gray-200">
              <div className="flex space-x-1 overflow-x-auto">
                {selectedSheets.map((sheetName) => (
                  <button
                    key={sheetName}
                    onClick={() => setActiveTab(sheetName)}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === sheetName
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {sheetName}
                    {sheetTabs[sheetName]?.filteredData.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                        {sheetTabs[sheetName].filteredData.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 활성 탭 내용 */}
          {currentTabData && (
            <div className="space-y-6">
              {/* 데이터 입력 방식 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  데이터 입력 방식
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center text-black">
                    <input
                      type="radio"
                      value="excel"
                      checked={currentTabData.dataMode === 'excel'}
                      onChange={(e) => {
                        setSheetTabs((prev) => ({
                          ...prev,
                          [activeTab]: {
                            ...prev[activeTab],
                            dataMode: e.target.value as 'excel',
                          },
                        }));
                      }}
                      className="mr-2"
                    />
                    엑셀 업로드
                  </label>
                  <label className="flex items-center text-black">
                    <input
                      type="radio"
                      value="paste"
                      checked={currentTabData.dataMode === 'paste'}
                      onChange={(e) => {
                        setSheetTabs((prev) => ({
                          ...prev,
                          [activeTab]: {
                            ...prev[activeTab],
                            dataMode: e.target.value as 'paste',
                          },
                        }));
                      }}
                      className="mr-2"
                    />
                    데이터 붙여넣기
                  </label>
                </div>
              </div>

              {/* 엑셀 업로드 */}
              {currentTabData.dataMode === 'excel' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    엑셀 파일 업로드
                  </label>
                  <input
                    ref={(el) => (fileInputRefs.current[activeTab] = el)}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleExcelUpload(file, activeTab);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* 데이터 붙여넣기 */}
              {currentTabData.dataMode === 'paste' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    데이터 붙여넣기 (탭 또는 쉼표로 구분)
                  </label>
                  <textarea
                    value={currentTabData.pastedData}
                    onChange={(e) => {
                      setSheetTabs((prev) => ({
                        ...prev,
                        [activeTab]: {
                          ...prev[activeTab],
                          pastedData: e.target.value,
                        },
                      }));
                    }}
                    placeholder="엑셀에서 복사한 데이터를 붙여넣으세요"
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                  <button
                    onClick={() => handlePasteData(activeTab)}
                    className="mt-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    데이터 파싱
                  </button>
                </div>
              )}

              {/* 기준 날짜 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기준 날짜 (주간 시작일 - 월요일)
                </label>
                <input
                  type="date"
                  value={currentTabData.startDate}
                  onChange={(e) => {
                    setSheetTabs((prev) => ({
                      ...prev,
                      [activeTab]: {
                        ...prev[activeTab],
                        startDate: e.target.value,
                      },
                    }));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {currentTabData.startDate && (
                  <p className="mt-2 text-sm text-gray-600">
                    선택된 주간: {getWeekStartDate(currentTabData.startDate)} (월) ~ {getWeekEndDate(currentTabData.startDate)} (일)
                  </p>
                )}
              </div>

              {/* 데이터 필터링 버튼 */}
              <div>
                <button
                  onClick={() => filterDataByDate(activeTab)}
                  disabled={loading || !currentTabData.startDate || currentTabData.parsedData.length === 0}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  기준 날짜로 데이터 추출
                </button>
                {currentTabData.filteredData.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600 text-center">
                    추출된 데이터: {currentTabData.filteredData.length}행
                  </p>
                )}
              </div>

              {/* 구글 시트 연동 버튼 */}
              <div>
                <button
                  onClick={() => appendToSheet(activeTab)}
                  disabled={loading || currentTabData.filteredData.length === 0}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
                >
                  {loading ? '처리 중...' : `[${activeTab}] 구글 시트에 데이터 추가`}
                </button>
              </div>

              {/* 추출된 데이터 미리보기 */}
              {currentTabData.filteredData.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">추출된 데이터 미리보기</h2>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {currentTabData.parsedData[0]?.map((header: any, idx: number) => (
                            <th
                              key={idx}
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentTabData.filteredData.slice(0, 10).map((row, idx) => (
                          <tr key={idx}>
                            {row.map((cell: any, cellIdx: number) => (
                              <td key={cellIdx} className="px-4 py-3 text-sm text-gray-900">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {currentTabData.filteredData.length > 10 && (
                      <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600 text-center">
                        ... 외 {currentTabData.filteredData.length - 10}행 더 있음
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
