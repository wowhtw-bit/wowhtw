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
    const { spreadsheetId, sheetName, cell } = await request.json();

    if (!spreadsheetId || !sheetName || !cell) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다. (spreadsheetId, sheetName, cell 필요)' },
        { status: 400 }
      );
    }

    const credentials = getCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 수식을 읽기 위해 valueRenderOption을 FORMULA로 설정
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${cell}`,
      valueRenderOption: 'FORMULA', // 수식을 그대로 가져옴
    });

    // 수식 값 가져오기
    const formula = response.data.values?.[0]?.[0] || null;

    // 계산된 값도 함께 가져오기 (선택사항)
    const calculatedValue = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${cell}`,
      valueRenderOption: 'FORMATTED_VALUE', // 계산된 값
    });

    return NextResponse.json({
      success: true,
      cell,
      formula: formula || null,
      calculatedValue: calculatedValue.data.values?.[0]?.[0] || null,
      hasFormula: formula ? formula.toString().startsWith('=') : false,
    });
  } catch (error: any) {
    console.error('Error getting formula:', error);
    return NextResponse.json(
      { error: error.message || '수식을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
