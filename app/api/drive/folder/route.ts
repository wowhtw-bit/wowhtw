import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { join } from 'path';

function getCredentials() {
  if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
    return JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
  }
  const credentialsPath = join(process.cwd(), 'webtoon-gwsapi-7c26c9d9b1a5.json');
  try {
    return JSON.parse(readFileSync(credentialsPath, 'utf-8'));
  } catch {
    throw new Error('구글 인증 정보를 찾을 수 없습니다. 환경 변수 GOOGLE_SHEETS_CREDENTIALS를 설정하거나 인증 파일을 확인하세요.');
  }
}

function extractFolderId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  // Google Drive folder URL 형식: /folders/{id}
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (folderMatch) return folderMatch[1];

  // 단순 ID
  if (/^[a-zA-Z0-9-_]+$/.test(trimmed)) return trimmed;

  return null;
}

export async function POST(request: Request) {
  try {
    const { folderUrl } = await request.json();

    if (!folderUrl) {
      return NextResponse.json({ error: '폴더 URL 또는 ID가 필요합니다.' }, { status: 400 });
    }

    const folderId = extractFolderId(folderUrl);
    if (!folderId) {
      return NextResponse.json({ error: '올바른 Google Drive 폴더 URL 또는 ID를 입력해주세요.' }, { status: 400 });
    }

    const credentials = getCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/spreadsheets.readonly',
      ],
    });

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    // 폴더 정보 가져오기
    const folderInfo = await drive.files.get({
      fileId: folderId,
      fields: 'id,name,modifiedTime',
    });

    // 폴더 내 스프레드시트 목록 가져오기
    const filesResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
      fields: 'files(id,name,modifiedTime,webViewLink)',
      orderBy: 'name',
    });

    const files = filesResponse.data.files || [];

    // 각 스프레드시트의 시트 목록 가져오기
    const fileDetails = await Promise.all(
      files.map(async (file) => {
        try {
          const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: file.id!,
            fields: 'sheets.properties.title',
          });
          const sheetNames = spreadsheet.data.sheets?.map((s) => s.properties?.title || '') || [];
          return {
            id: file.id,
            name: file.name,
            modifiedTime: file.modifiedTime,
            webViewLink: file.webViewLink,
            sheetCount: sheetNames.length,
            sheetNames,
          };
        } catch {
          return {
            id: file.id,
            name: file.name,
            modifiedTime: file.modifiedTime,
            webViewLink: file.webViewLink,
            sheetCount: 0,
            sheetNames: [],
          };
        }
      })
    );

    return NextResponse.json({
      folder: {
        id: folderId,
        name: folderInfo.data.name,
        modifiedTime: folderInfo.data.modifiedTime,
      },
      files: fileDetails,
      totalCount: fileDetails.length,
    });
  } catch (error: any) {
    console.error('Error fetching folder:', error);
    return NextResponse.json(
      { error: error.message || '폴더 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
