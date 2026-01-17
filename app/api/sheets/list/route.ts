import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { join } from 'path';

// 환경 변수에서 인증 정보 가져오기 (배포 환경) 또는 파일에서 읽기 (로컬 환경)
function getCredentials() {
  // 환경 변수가 있으면 사용 (배포 환경)
  if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
    return JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
  }
  
  // 로컬 환경에서는 파일에서 읽기
  const credentialsPath = join(process.cwd(), 'my-project-10565-484606-b5dd0171d354.json');
  try {
    return JSON.parse(readFileSync(credentialsPath, 'utf-8'));
  } catch (error) {
    throw new Error('구글 시트 인증 정보를 찾을 수 없습니다. 환경 변수 GOOGLE_SHEETS_CREDENTIALS를 설정하거나 인증 파일을 확인하세요.');
  }
}

export async function POST(request: Request) {
  try {
    const { spreadsheetId } = await request.json();

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: '스프레드시트 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const credentials = getCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetNames = response.data.sheets?.map((sheet) => ({
      title: sheet.properties?.title,
      sheetId: sheet.properties?.sheetId,
    })) || [];

    return NextResponse.json({ sheets: sheetNames });
  } catch (error: any) {
    console.error('Error fetching sheets:', error);
    return NextResponse.json(
      { error: error.message || '시트 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
