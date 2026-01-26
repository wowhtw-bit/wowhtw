const { google } = require('googleapis');
const { readFileSync } = require('fs');
const { join } = require('path');

const credentialsPath = join(__dirname, 'my-project-10565-484606-b5dd0171d354.json');

async function testSheetAccess() {
  try {
    const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1awXiWT5iDgIwcshB5l5FKcIES2fpK33ltwq8l-p8LxM';

    console.log('시트 접근 테스트 중...\n');

    // 시트 정보 가져오기
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    console.log('✅ 시트 접근 성공!\n');
    console.log('시트 제목:', response.data.properties?.title);
    console.log('시트 목록:');
    
    response.data.sheets?.forEach((sheet, index) => {
      console.log(`  ${index + 1}. ${sheet.properties?.title} (ID: ${sheet.properties?.sheetId})`);
    });

    // wow 시트가 있는지 확인
    const wowSheet = response.data.sheets?.find(
      (sheet) => sheet.properties?.title === 'wow'
    );

    if (wowSheet) {
      console.log('\n✅ "wow" 시트 발견!');
      
      // G4 셀의 수식 읽기 시도
      try {
        const formulaResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'wow!G4',
          valueRenderOption: 'FORMULA',
        });

        const formula = formulaResponse.data.values?.[0]?.[0];
        console.log('\nG4 셀 수식:', formula || '(수식 없음)');
      } catch (error) {
        console.log('\n⚠️ G4 셀 읽기 실패:', error.message);
      }
    } else {
      console.log('\n⚠️ "wow" 시트를 찾을 수 없습니다.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.code === 403) {
      console.error('\n권한 오류: 서비스 계정이 이 시트에 접근 권한이 없습니다.');
      console.error('해결 방법: 구글 시트를 다음 이메일과 공유하세요:');
      console.error('wowhtw@my-project-10565-484606.iam.gserviceaccount.com');
    } else if (error.code === 404) {
      console.error('\n시트를 찾을 수 없습니다. 스프레드시트 ID를 확인하세요.');
    }
  }
}

testSheetAccess();
