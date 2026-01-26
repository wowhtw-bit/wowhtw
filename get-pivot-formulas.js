const { google } = require('googleapis');
const { readFileSync } = require('fs');
const { join } = require('path');

const credentialsPath = join(__dirname, 'webtoon-gwsapi-7c26c9d9b1a5.json');

async function getPivotFormulas() {
  try {
    const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1Khjhh49GE4u5XWlhWCAnvWBnNHoywnY3kz48tj3N5zU';
    const sheetName = 'pivot_커뮤니티 WUB';
    
    // 확인할 열들
    const columns = ['G', 'H', 'I', 'O', 'P', 'Q', 'R', 'S', 'T', 'U'];
    
    console.log('수식 확인 중...\n');

    // 먼저 시트의 데이터 범위 확인
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [`${sheetName}!A:Z`],
    });

    // 각 열의 수식 확인 (처음 몇 개 행 확인)
    for (const col of columns) {
      console.log(`\n=== ${col}열 수식 확인 ===`);
      
      // 1행부터 20행까지 확인
      for (let row = 1; row <= 20; row++) {
        const range = `${sheetName}!${col}${row}`;
        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            valueRenderOption: 'FORMULA',
          });
          
          const formula = response.data.values?.[0]?.[0];
          if (formula && formula.startsWith('=')) {
            console.log(`${col}${row}: ${formula}`);
          }
        } catch (error) {
          // 셀이 없거나 오류가 나면 무시
        }
      }
    }

    // 전체 데이터 구조 확인
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:U50`,
    });

    console.log('\n\n=== 데이터 구조 확인 ===');
    console.log(`총 행 수: ${dataResponse.data.values?.length || 0}`);
    if (dataResponse.data.values && dataResponse.data.values.length > 0) {
      console.log('첫 번째 행:', dataResponse.data.values[0]);
      if (dataResponse.data.values.length > 1) {
        console.log('두 번째 행:', dataResponse.data.values[1]);
      }
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.response) {
      console.error('상세 오류:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

getPivotFormulas();
