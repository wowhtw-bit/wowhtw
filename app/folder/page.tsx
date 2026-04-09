'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

interface SpreadsheetFile {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink: string;
  sheetCount: number;
  sheetNames: string[];
}

interface FolderInfo {
  id: string;
  name: string;
  modifiedTime: string;
}

interface FolderSummary {
  folder: FolderInfo;
  files: SpreadsheetFile[];
  totalCount: number;
}

export default function FolderPage() {
  const [folderUrl, setFolderUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [summary, setSummary] = useState<FolderSummary | null>(null);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  const fetchFolderSummary = async () => {
    if (!folderUrl.trim()) {
      setMessage({ type: 'error', text: '폴더 URL 또는 ID를 입력해주세요.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setSummary(null);

    try {
      const response = await fetch('/api/drive/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderUrl }),
      });

      const data = await response.json();
      if (response.ok) {
        setSummary(data);
        setMessage({
          type: 'success',
          text: `"${data.folder.name}" 폴더에서 스프레드시트 ${data.totalCount}개를 불러왔습니다.`,
        });
      } else {
        setMessage({ type: 'error', text: data.error || '폴더 정보를 가져오는데 실패했습니다.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '폴더 정보를 가져오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format('YYYY.MM.DD HH:mm');
  };

  const totalSheets = summary?.files.reduce((sum, f) => sum + f.sheetCount, 0) ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">폴더 요약</h1>
          <p className="text-gray-500 text-center mb-8 text-sm">
            Google Drive 폴더 내 스프레드시트 목록과 시트 구성을 확인합니다.
          </p>

          {/* 메시지 */}
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

          {/* 폴더 URL 입력 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Google Drive 폴더 URL 또는 ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={folderUrl}
                onChange={(e) => setFolderUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchFolderSummary()}
                placeholder="폴더 URL 또는 ID를 입력하세요"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-500"
              />
              <button
                onClick={fetchFolderSummary}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {loading ? '불러오는 중...' : '폴더 조회'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              예: https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz
            </p>
          </div>

          {/* 폴더 요약 결과 */}
          {summary && (
            <div className="space-y-6">
              {/* 폴더 정보 카드 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-blue-900">{summary.folder.name}</h2>
                    <p className="text-sm text-blue-600 mt-1">
                      마지막 수정: {formatDate(summary.folder.modifiedTime)}
                    </p>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                      <div className="text-2xl font-bold text-blue-700">{summary.totalCount}</div>
                      <div className="text-xs text-gray-500 mt-0.5">스프레드시트</div>
                    </div>
                    <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                      <div className="text-2xl font-bold text-blue-700">{totalSheets}</div>
                      <div className="text-xs text-gray-500 mt-0.5">전체 시트</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 스프레드시트 목록 */}
              {summary.files.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  이 폴더에 스프레드시트가 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    스프레드시트 목록 ({summary.totalCount}개)
                  </h3>
                  {summary.files.map((file) => (
                    <div
                      key={file.id}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div
                        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          setExpandedFile(expandedFile === file.id ? null : file.id)
                        }
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                          </svg>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{file.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              수정: {formatDate(file.modifiedTime)} · 시트 {file.sheetCount}개
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            열기
                          </a>
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              expandedFile === file.id ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* 시트 목록 (펼침) */}
                      {expandedFile === file.id && file.sheetNames.length > 0 && (
                        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                          <div className="text-xs font-medium text-gray-500 mb-2">시트 목록</div>
                          <div className="flex flex-wrap gap-2">
                            {file.sheetNames.map((name, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs bg-white border border-gray-200 rounded text-gray-700"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
