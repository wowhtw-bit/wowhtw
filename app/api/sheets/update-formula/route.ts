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
  const credentialsPath = join(process.cwd(), 'webtoon-gwsapi-7c26c9d9b1a5.json');
  try {
    return JSON.parse(readFileSync(credentialsPath, 'utf-8'));
  } catch (error) {
    throw new Error('구글 시트 인증 정보를 찾을 수 없습니다. 환경 변수 GOOGLE_SHEETS_CREDENTIALS를 설정하거나 인증 파일을 확인하세요.');
  }
}

export async function POST(request: Request) {
  try {
    const { spreadsheetId, sheetName } = await request.json();

    if (!spreadsheetId || !sheetName) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (sheetName !== '추출테스트') {
      return NextResponse.json(
        { error: '이 기능은 "추출테스트" 시트에만 사용할 수 있습니다.' },
        { status: 400 }
      );
    }

    const credentials = getCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 현재 시트의 데이터 범위 확인
    const currentData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:G`,
    });

    if (!currentData.data.values || currentData.data.values.length === 0) {
      return NextResponse.json(
        { error: '시트에 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // 헤더 행 제외하고 데이터 행만 처리 (2행부터 시작)
    const dataRows = currentData.data.values.slice(1);
    const lastRow = currentData.data.values.length;

    // 시트 ID 찾기
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const targetSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === sheetName
    );

    if (!targetSheet || !targetSheet.properties?.sheetId) {
      return NextResponse.json(
        { error: '시트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const sheetId = targetSheet.properties.sheetId;

    // G열에 수식을 추가할 범위 계산
    const startRow = 2; // 헤더 다음 행부터
    const endRow = lastRow;

    // G열에 수식 추가 (batchUpdate 사용)
    const requests = [];
    
    // 각 행의 G열에 수식 추가
    for (let row = startRow; row <= endRow; row++) {
      requests.push({
        updateCells: {
          range: {
            sheetId: sheetId,
            startRowIndex: row - 1, // 0-based index
            endRowIndex: row,
            startColumnIndex: 6, // G열 (0-based: A=0, B=1, C=2, D=3, E=4, F=5, G=6)
            endColumnIndex: 7,
          },
          rows: [
            {
              values: [
                {
                  userEnteredValue: {
                    formulaValue: `=C${row}+D${row}`,
                  },
                },
              ],
            },
          ],
          fields: 'userEnteredValue',
        },
      });
    }

    // 배치 업데이트 실행
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests,
      },
    });

    return NextResponse.json({
      success: true,
      message: `G열에 C+D 수식이 ${endRow - startRow + 1}개 행에 추가되었습니다.`,
    });
  } catch (error: any) {
    console.error('Error updating formulas:', error);
    return NextResponse.json(
      { error: error.message || '수식 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
