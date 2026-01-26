const { readFileSync } = require('fs');

const data = JSON.parse(readFileSync('dashboard-data.json', 'utf-8'));

// 인덱스 매핑: W-7(2), W-6(3), W-5(4), W-4(5), W-3(6), W-2(7), W-1(8), Target Week(9), WoW(10), 8주 평균(13)
const WEEKS = ['W-7', 'W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'Target Week'];
const WEEK_INDICES = [2, 3, 4, 5, 6, 7, 8, 9];
const WOW_INDEX = 10;
const AVG_INDEX = 13;

// 숫자로 변환 (쉼표 제거, % 제거)
function parseNumber(value) {
  if (!value || value === '') return null;
  const cleaned = String(value).replace(/,/g, '').replace(/%/g, '').replace('p', '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// 퍼센트 포인트인지 확인
function isPercentagePoint(value) {
  return String(value).includes('%p') || String(value).includes('p');
}

// 데이터 구조화
const metrics = [];

for (let i = 2; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length < 14) continue;
  
  const category = row[0] || '';
  const metricName = row[1] || '';
  
  if (!metricName || metricName.trim() === '') continue;
  
  const values = WEEK_INDICES.map(idx => parseNumber(row[idx]));
  const wow = parseNumber(row[WOW_INDEX]);
  const avg = parseNumber(row[AVG_INDEX]);
  const isPctPoint = isPercentagePoint(row[WOW_INDEX]);
  
  metrics.push({
    category: category.trim(),
    name: metricName.trim(),
    values,
    wow,
    avg,
    isPctPoint,
    targetWeek: values[7], // Target Week
    prevWeek: values[6],   // W-1
  });
}

// 분석 함수들
function calculateTrend(values) {
  if (!values || values.length < 2) return 'stable';
  const validValues = values.filter(v => v !== null);
  if (validValues.length < 2) return 'stable';
  
  const first = validValues[0];
  const last = validValues[validValues.length - 1];
  const change = ((last - first) / first) * 100;
  
  if (change > 5) return 'increasing';
  if (change < -5) return 'decreasing';
  return 'stable';
}

function findPeaksAndValleys(values) {
  if (!values || values.length < 3) return null;
  const validValues = values.filter(v => v !== null);
  if (validValues.length < 3) return null;
  
  let max = -Infinity;
  let min = Infinity;
  let maxIdx = -1;
  let minIdx = -1;
  
  values.forEach((v, idx) => {
    if (v !== null) {
      if (v > max) {
        max = v;
        maxIdx = idx;
      }
      if (v < min) {
        min = v;
        minIdx = idx;
      }
    }
  });
  
  return { max, min, maxIdx, minIdx, maxWeek: WEEKS[maxIdx], minWeek: WEEKS[minIdx] };
}

// 분석 결과
const highlights = {
  wowComparison: [],      // Target Week vs W-1 비교
  trends: [],            // 8주 트렌드
  significantChanges: [], // 큰 변화
  peaks: [],             // 최고/최저점
};

// 1. WoW 비교 분석
metrics.forEach(metric => {
  if (metric.targetWeek !== null && metric.prevWeek !== null && metric.wow !== null) {
    const change = metric.targetWeek - metric.prevWeek;
    const changePct = ((change / metric.prevWeek) * 100);
    
    highlights.wowComparison.push({
      name: metric.name,
      category: metric.category,
      targetWeek: metric.targetWeek,
      prevWeek: metric.prevWeek,
      change: change,
      changePct: changePct,
      wow: metric.wow,
      isPctPoint: metric.isPctPoint,
    });
  }
});

// 2. 8주 트렌드 분석
metrics.forEach(metric => {
  const trend = calculateTrend(metric.values);
  const peakData = findPeaksAndValleys(metric.values);
  
  if (trend !== 'stable' || peakData) {
    highlights.trends.push({
      name: metric.name,
      category: metric.category,
      trend,
      peakData,
      values: metric.values,
      avg: metric.avg,
    });
  }
});

// 3. 큰 변화 포착 (WoW 변화율이 5% 이상 또는 -5% 이하)
highlights.significantChanges = highlights.wowComparison
  .filter(m => Math.abs(m.changePct) >= 5)
  .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

// 결과 출력
console.log('='.repeat(80));
console.log('📊 커뮤니티 주요 지표 분석 리포트');
console.log('='.repeat(80));

console.log('\n📈 1. Target Week vs 이전주(W-1) 비교 - 주요 변화');
console.log('-'.repeat(80));
highlights.significantChanges.slice(0, 10).forEach((m, idx) => {
  const symbol = m.changePct > 0 ? '📈' : '📉';
  const unit = m.isPctPoint ? '%p' : '%';
  console.log(`${idx + 1}. ${symbol} ${m.name}`);
  console.log(`   카테고리: ${m.category || 'N/A'}`);
  console.log(`   Target Week: ${m.targetWeek?.toLocaleString() || 'N/A'}`);
  console.log(`   이전주(W-1): ${m.prevWeek?.toLocaleString() || 'N/A'}`);
  console.log(`   변화: ${m.change > 0 ? '+' : ''}${m.change?.toLocaleString() || 'N/A'} (${m.changePct > 0 ? '+' : ''}${m.changePct.toFixed(2)}${unit})`);
  console.log(`   WoW: ${m.wow > 0 ? '+' : ''}${m.wow}${unit}`);
  console.log('');
});

console.log('\n📊 2. 8주간 트렌드 분석 - 지속적 증가/감소');
console.log('-'.repeat(80));
const increasing = highlights.trends.filter(t => t.trend === 'increasing');
const decreasing = highlights.trends.filter(t => t.trend === 'decreasing');

if (increasing.length > 0) {
  console.log('\n🟢 지속적 증가 추세:');
  increasing.slice(0, 5).forEach(m => {
    const first = m.values.find(v => v !== null);
    const last = m.values[m.values.length - 1];
    const totalChange = ((last - first) / first) * 100;
    console.log(`   • ${m.name} (${totalChange > 0 ? '+' : ''}${totalChange.toFixed(2)}%)`);
  });
}

if (decreasing.length > 0) {
  console.log('\n🔴 지속적 감소 추세:');
  decreasing.slice(0, 5).forEach(m => {
    const first = m.values.find(v => v !== null);
    const last = m.values[m.values.length - 1];
    const totalChange = ((last - first) / first) * 100;
    console.log(`   • ${m.name} (${totalChange.toFixed(2)}%)`);
  });
}

console.log('\n📌 3. 8주간 최고/최저점');
console.log('-'.repeat(80));
const withPeaks = highlights.trends.filter(t => t.peakData).slice(0, 10);
withPeaks.forEach(m => {
  if (m.peakData) {
    console.log(`\n${m.name}:`);
    console.log(`   최고점: ${m.peakData.max?.toLocaleString()} (${m.peakData.maxWeek})`);
    console.log(`   최저점: ${m.peakData.min?.toLocaleString()} (${m.peakData.minWeek})`);
    console.log(`   8주 평균: ${m.avg?.toLocaleString()}`);
  }
});

console.log('\n\n🎯 4. 하이라이트 요약');
console.log('='.repeat(80));

// 상위 5개 긍정적 변화
const topPositive = highlights.significantChanges
  .filter(m => m.changePct > 0)
  .slice(0, 5);
  
// 상위 5개 부정적 변화
const topNegative = highlights.significantChanges
  .filter(m => m.changePct < 0)
  .slice(0, 5);

console.log('\n✅ 긍정적 변화 (증가):');
topPositive.forEach((m, idx) => {
  const unit = m.isPctPoint ? '%p' : '%';
  console.log(`   ${idx + 1}. ${m.name}: +${m.changePct.toFixed(2)}${unit} (${m.wow > 0 ? '+' : ''}${m.wow}${unit})`);
});

console.log('\n⚠️  주의 필요 (감소):');
topNegative.forEach((m, idx) => {
  const unit = m.isPctPoint ? '%p' : '%';
  console.log(`   ${idx + 1}. ${m.name}: ${m.changePct.toFixed(2)}${unit} (${m.wow}${unit})`);
});

// JSON으로도 저장
const fs = require('fs');
fs.writeFileSync('analysis-results.json', JSON.stringify({
  wowComparison: highlights.wowComparison,
  trends: highlights.trends,
  significantChanges: highlights.significantChanges,
  summary: {
    topPositive,
    topNegative,
  }
}, null, 2));

console.log('\n\n✅ 분석 완료! 상세 결과는 analysis-results.json에 저장되었습니다.');
