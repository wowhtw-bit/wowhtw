const { google } = require('googleapis');
const { readFileSync } = require('fs');
const { join } = require('path');

const credentialsPath = join(__dirname, 'webtoon-gwsapi-7c26c9d9b1a5.json');

async function analyzeDashboard() {
  try {
    const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1Khjhh49GE4u5XWlhWCAnvWBnNHoywnY3kz48tj3N5zU';
    const sheetName = '26 대시보드';
    const range = 'B9:O44';

    console.log('데이터 가져오는 중...\n');

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${range}`,
    });

    const values = response.data.values || [];
    
    if (values.length === 0) {
      console.log('데이터가 없습니다.');
      return;
    }

    // 데이터 출력
    console.log('=== 원본 데이터 ===');
    values.forEach((row, index) => {
      console.log(`Row ${index + 9}:`, row);
    });

    // 분석을 위해 데이터 구조화
    console.log('\n=== 데이터 분석 ===');
    console.log(`총 행 수: ${values.length}`);
    console.log(`총 열 수: ${values[0]?.length || 0}`);

    // JSON으로 저장
    const fs = require('fs');
    fs.writeFileSync('dashboard-data.json', JSON.stringify(values, null, 2));
    console.log('\n데이터가 dashboard-data.json에 저장되었습니다.');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.response) {
      console.error('상세 오류:', error.response.data);
    }
  }
}

analyzeDashboard();
