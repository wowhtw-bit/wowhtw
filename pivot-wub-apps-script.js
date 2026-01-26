/**
 * pivot_커뮤니티 WUB 시트 자동 수식 적용 Apps Script
 * 
 * 사용 방법:
 * 1. Google Sheets에서 Extensions > Apps Script 메뉴 선택
 * 2. 이 코드를 붙여넣기
 * 3. 저장 후 실행 권한 부여
 * 4. onEdit 트리거 설정 (선택사항)
 */

/**
 * 시트 변경 시 자동으로 수식 적용
 * onEdit 트리거로 설정하거나 수동 실행 가능
 */
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  
  // pivot_커뮤니티 WUB 시트에서만 실행
  if (sheetName !== 'pivot_커뮤니티 WUB') {
    return;
  }
  
  // 수식 적용
  applyFormulasToSheet(sheet);
}

/**
 * 시트의 모든 수식을 자동으로 적용
 * 수동 실행: applyAllFormulas()
 */
function applyAllFormulas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('pivot_커뮤니티 WUB');
  
  if (!sheet) {
    Logger.log('시트를 찾을 수 없습니다: pivot_커뮤니티 WUB');
    return;
  }
  
  applyFormulasToSheet(sheet);
  Logger.log('수식 적용 완료');
}

/**
 * 시트에 수식 적용 (성능 최적화 버전)
 */
function applyFormulasToSheet(sheet) {
  // 마지막 데이터 행 찾기 (A열 기준)
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    return; // 데이터가 없으면 종료
  }
  
  // H열: WoW(pv) - 전주 대비 변화율
  // 패턴: =C3/C2-1 (3행부터 시작)
  if (lastRow >= 3) {
    const hFormulas = [];
    for (let row = 3; row <= lastRow; row++) {
      hFormulas.push([`=IF(ISBLANK(C${row}), "", IF(C${row-1}=0, "", C${row}/C${row-1}-1))`]);
    }
    sheet.getRange(`H3:H${lastRow}`).setFormulas(hFormulas);
  }
  
  // O열: 커뮤니티 WUB - 합계
  // 패턴: =B10+K10 (10행부터 시작)
  if (lastRow >= 10) {
    const oFormulas = [];
    for (let row = 10; row <= lastRow; row++) {
      oFormulas.push([`=B${row}+K${row}`]);
    }
    sheet.getRange(`O10:O${lastRow}`).setFormulas(oFormulas);
  }
  
  // P열: 커뮤니티 WPV - 합계
  // 패턴: =C2+L2 (2행부터 시작)
  if (lastRow >= 2) {
    const pFormulas = [];
    for (let row = 2; row <= lastRow; row++) {
      pFormulas.push([`=C${row}+L${row}`]);
    }
    sheet.getRange(`P2:P${lastRow}`).setFormulas(pFormulas);
  }
  
  // Q열: WoW(wub) - 전주 대비 변화율
  // 패턴: =O3/O2-1 (3행부터 시작)
  if (lastRow >= 3) {
    const qFormulas = [];
    for (let row = 3; row <= lastRow; row++) {
      qFormulas.push([`=IF(ISBLANK(O${row}), "", IF(O${row-1}=0, "", O${row}/O${row-1}-1))`]);
    }
    sheet.getRange(`Q3:Q${lastRow}`).setFormulas(qFormulas);
  }
  
  // S열: WoW(wpv) - 전주 대비 변화율
  // 패턴: =P14/P13-1 (14행부터 시작)
  if (lastRow >= 14) {
    const sFormulas = [];
    for (let row = 14; row <= lastRow; row++) {
      sFormulas.push([`=IF(ISBLANK(P${row}), "", IF(P${row-1}=0, "", P${row}/P${row-1}-1))`]);
    }
    sheet.getRange(`S14:S${lastRow}`).setFormulas(sFormulas);
  }
  
  // U열: 전체 WUB 대비(커뮤니티) - 비율
  // 패턴: =AA2/X2 (2행부터 시작)
  if (lastRow >= 2) {
    const uFormulas = [];
    for (let row = 2; row <= lastRow; row++) {
      uFormulas.push([`=IF(ISBLANK(AA${row}), "", IF(X${row}=0, "", AA${row}/X${row}))`]);
    }
    sheet.getRange(`U2:U${lastRow}`).setFormulas(uFormulas);
  }
}

/**
 * 특정 행 범위에만 수식 적용 (성능 최적화용)
 */
function applyFormulasToRange(startRow, endRow) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('pivot_커뮤니티 WUB');
  
  if (!sheet) {
    Logger.log('시트를 찾을 수 없습니다: pivot_커뮤니티 WUB');
    return;
  }
  
  // H열: WoW(pv)
  if (startRow <= 3) {
    const hStart = Math.max(3, startRow);
    for (let row = hStart; row <= endRow; row++) {
      const formula = `=IF(ISBLANK(C${row}), "", IF(C${row-1}=0, "", C${row}/C${row-1}-1))`;
      sheet.getRange(`H${row}`).setFormula(formula);
    }
  }
  
  // O열: 커뮤니티 WUB
  if (startRow <= 10) {
    const oStart = Math.max(10, startRow);
    for (let row = oStart; row <= endRow; row++) {
      const formula = `=B${row}+K${row}`;
      sheet.getRange(`O${row}`).setFormula(formula);
    }
  }
  
  // P열: 커뮤니티 WPV
  if (startRow <= 2) {
    const pStart = Math.max(2, startRow);
    for (let row = pStart; row <= endRow; row++) {
      const formula = `=C${row}+L${row}`;
      sheet.getRange(`P${row}`).setFormula(formula);
    }
  }
  
  // Q열: WoW(wub)
  if (startRow <= 3) {
    const qStart = Math.max(3, startRow);
    for (let row = qStart; row <= endRow; row++) {
      const formula = `=IF(ISBLANK(O${row}), "", IF(O${row-1}=0, "", O${row}/O${row-1}-1))`;
      sheet.getRange(`Q${row}`).setFormula(formula);
    }
  }
  
  // S열: WoW(wpv)
  if (startRow <= 14) {
    const sStart = Math.max(14, startRow);
    for (let row = sStart; row <= endRow; row++) {
      const formula = `=IF(ISBLANK(P${row}), "", IF(P${row-1}=0, "", P${row}/P${row-1}-1))`;
      sheet.getRange(`S${row}`).setFormula(formula);
    }
  }
  
  // U열: 전체 WUB 대비(커뮤니티)
  if (startRow <= 2) {
    const uStart = Math.max(2, startRow);
    for (let row = uStart; row <= endRow; row++) {
      const formula = `=IF(ISBLANK(AA${row}), "", IF(X${row}=0, "", AA${row}/X${row}))`;
      sheet.getRange(`U${row}`).setFormula(formula);
    }
  }
  
  Logger.log(`수식 적용 완료: ${startRow}행 ~ ${endRow}행`);
}

/**
 * 설치 시 한 번 실행하여 기존 데이터에 수식 적용
 */
function onOpen() {
  // 메뉴 추가 (선택사항)
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('수식 자동 적용')
    .addItem('전체 수식 적용', 'applyAllFormulas')
    .addToUi();
}
