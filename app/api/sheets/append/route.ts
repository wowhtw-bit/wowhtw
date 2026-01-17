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
    const { spreadsheetId, sheetName, values } = await request.json();

    if (!spreadsheetId || !sheetName || !values) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const credentials = getCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // "추출테스트" 시트인 경우 G열에 수식 추가를 위해 현재 마지막 행 확인
    let startRow = 1;
    if (sheetName === '추출테스트') {
      try {
        // 현재 시트의 데이터 범위 확인 (A열 전체)
        const currentData = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:A`,
        });
        
        // 마지막 행 번호 계산
        if (currentData.data.values && currentData.data.values.length > 0) {
          // 빈 행을 제외한 마지막 행 찾기
          let lastRowIndex = currentData.data.values.length - 1;
          while (lastRowIndex >= 0 && (!currentData.data.values[lastRowIndex] || currentData.data.values[lastRowIndex].length === 0 || !currentData.data.values[lastRowIndex][0])) {
            lastRowIndex--;
          }
          startRow = lastRowIndex + 2; // 다음 행부터 시작 (1-based index)
        } else {
          startRow = 2; // 헤더가 있다고 가정
        }
      } catch (error) {
        // 에러가 나면 기본값 사용
        console.log('Error getting current data, using default startRow:', error);
        startRow = 2;
      }
    }

    // 데이터에 G열 수식 추가 (추출테스트 시트인 경우)
    let valuesWithFormula = values;
    if (sheetName === '추출테스트') {
      valuesWithFormula = values.map((row: any[], index: number) => {
        const rowNumber = startRow + index;
        // 기존 데이터 복사
        const newRow = [...row];
        // G열(인덱스 6)에 수식 추가
        if (newRow.length <= 6) {
          // G열이 없으면 빈 셀로 채운 후 수식 추가
          while (newRow.length < 6) {
            newRow.push('');
          }
          newRow.push(`=C${rowNumber}+D${rowNumber}`);
        } else {
          // G열이 있으면 수식으로 교체
          newRow[6] = `=C${rowNumber}+D${rowNumber}`;
        }
        return newRow;
      });
    }

    // 데이터를 시트의 최하단에 추가
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: valuesWithFormula,
      },
    });

    // "추출테스트" 시트인 경우 기존 행들의 G열에도 수식 추가
    if (sheetName === '추출테스트') {
      try {
        // 시트 ID 찾기
        const spreadsheet = await sheets.spreadsheets.get({
          spreadsheetId,
        });

        const targetSheet = spreadsheet.data.sheets?.find(
          (sheet) => sheet.properties?.title === sheetName
        );

        if (targetSheet && targetSheet.properties?.sheetId) {
          const sheetId = targetSheet.properties.sheetId;

          // 현재 시트의 모든 데이터 확인
          const allData = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:G`,
          });

          if (allData.data.values && allData.data.values.length > 1) {
            const lastRow = allData.data.values.length;
            const startRow = 2; // 헤더 다음 행부터
            const endRow = lastRow;

            // G열에 수식 추가
            const requests = [];
            for (let row = startRow; row <= endRow; row++) {
              requests.push({
                updateCells: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: row - 1, // 0-based index
                    endRowIndex: row,
                    startColumnIndex: 6, // G열
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
            if (requests.length > 0) {
              await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                  requests,
                },
              });
            }
          }
        }
      } catch (error) {
        console.log('Error updating existing formulas:', error);
        // 기존 행 수식 업데이트 실패해도 새 데이터는 추가되었으므로 계속 진행
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `데이터가 성공적으로 추가되었습니다.${sheetName === '추출테스트' ? ' (G열에 C+D 수식이 자동으로 추가되었습니다)' : ''}` 
    });
  } catch (error: any) {
    console.error('Error appending data:', error);
    return NextResponse.json(
      { error: error.message || '데이터 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
