const { google } = require('googleapis');
const { readFileSync } = require('fs');
const { join } = require('path');

const credentialsPath = join(__dirname, 'webtoon-gwsapi-7c26c9d9b1a5.json');

async function checkCurrentFormulas() {
  try {
    const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1Khjhh49GE4u5XWlhWCAnvWBnNHoywnY3kz48tj3N5zU';
    const sheetName = 'pivot_커뮤니티 WUB';
    
    // 각 열의 시작 행 확인
    const ranges = [
      'H3', 'H4', 'H5',  // H열 샘플
      'O10', 'O11', 'O12',  // O열 샘플
      'P2', 'P3', 'P4',  // P열 샘플
      'Q3', 'Q4', 'Q5',  // Q열 샘플
      'S14', 'S15', 'S16',  // S열 샘플
      'U2', 'U3', 'U4',  // U열 샘플
    ];
    
    console.log('현재 수식 확인 중...\n');
    
    for (const range of ranges) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!${range}`,
          valueRenderOption: 'FORMULA',
        });
        
        const formula = response.data.values?.[0]?.[0];
        if (formula && formula.startsWith('=')) {
          console.log(`${range}: ${formula}`);
        }
      } catch (error) {
        // 무시
      }
    }
    
    // 데이터 행 수 확인
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });
    
    const lastRow = dataResponse.data.values?.length || 0;
    console.log(`\n총 데이터 행 수: ${lastRow}`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
}

checkCurrentFormulas();
