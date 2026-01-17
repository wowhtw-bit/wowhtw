# 배포 가이드

## 빠른 시작 (Vercel - 5분 배포)

### 1단계: GitHub에 코드 업로드
```bash
cd community_dashboard
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2단계: Vercel 배포
1. https://vercel.com 접속 후 GitHub로 로그인
2. "Add New Project" 클릭
3. 저장소 선택 후 "Import"
4. **환경 변수 추가**:
   - Key: `GOOGLE_SHEETS_CREDENTIALS`
   - Value: `my-project-10565-484606-b5dd0171d354.json` 파일의 전체 내용 (JSON)
5. "Deploy" 클릭

완료! 🎉

---

## 1. Vercel 배포 (권장 - 가장 쉬움)

### 준비 사항
1. GitHub 계정
2. Vercel 계정 (https://vercel.com)

### 배포 단계

#### 1-1. GitHub에 코드 푸시
```bash
cd community_dashboard
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

#### 1-2. Vercel 배포
1. https://vercel.com 접속 후 로그인
2. "Add New Project" 클릭
3. GitHub 저장소 선택
4. 프로젝트 설정:
   - Framework Preset: Next.js
   - Root Directory: `./community_dashboard` (또는 프로젝트 루트)
5. 환경 변수 설정 (아래 참고)
6. "Deploy" 클릭

#### 1-3. 환경 변수 설정
Vercel 대시보드에서 환경 변수 추가:
- `GOOGLE_SHEETS_CREDENTIALS`: 구글 시트 API 인증 JSON 파일의 전체 내용

### Vercel CLI로 배포
```bash
npm i -g vercel
cd community_dashboard
vercel
```

---

## 2. Docker를 사용한 자체 서버 배포

### 2-1. Dockerfile 생성
프로젝트 루트에 `Dockerfile` 생성 (이미 생성됨)

### 2-2. 빌드 및 실행
```bash
# 이미지 빌드
docker build -t community-dashboard .

# 컨테이너 실행
docker run -p 3000:3000 \
  -e GOOGLE_SHEETS_CREDENTIALS='<json-content>' \
  community-dashboard
```

---

## 3. 일반 서버 배포 (Node.js 직접 실행)

### 3-1. 서버 준비
```bash
# Node.js 18+ 설치 필요
node --version

# 프로젝트 빌드
cd community_dashboard
npm install
npm run build
```

### 3-2. 환경 변수 설정
`.env.local` 파일 생성:
```
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account",...}
```

### 3-3. 프로덕션 실행
```bash
npm start
# 또는 PM2 사용
npm install -g pm2
pm2 start npm --name "community-dashboard" -- start
```

---

## 4. 환경 변수 설정 (중요!)

구글 시트 API 인증 파일을 환경 변수로 처리해야 합니다.

### 방법 1: JSON 파일 내용을 환경 변수로
`.env.local` 파일 생성:
```
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

### 방법 2: Vercel 환경 변수
Vercel 대시보드 → Project Settings → Environment Variables에서 추가

---

## 5. 보안 주의사항

⚠️ **중요**: 
- `my-project-10565-484606-b5dd0171d354.json` 파일은 절대 Git에 커밋하지 마세요
- `.gitignore`에 이미 추가되어 있습니다
- 환경 변수로만 관리하세요

---

## 6. 배포 후 확인 사항

1. ✅ 앱이 정상적으로 로드되는지 확인
2. ✅ 구글 시트 연결이 작동하는지 테스트
3. ✅ 데이터 추가 기능 테스트
4. ✅ "추출테스트" 시트의 G열 수식 자동 추가 확인

---

## 문제 해결

### 빌드 에러
```bash
npm run build
```
로컬에서 빌드 테스트 후 배포

### 환경 변수 에러
- 환경 변수가 올바르게 설정되었는지 확인
- JSON 형식이 올바른지 확인 (따옴표 이스케이프 필요)

### 구글 API 권한 에러
- 서비스 계정이 구글 시트에 접근 권한이 있는지 확인
- 구글 시트를 서비스 계정 이메일과 공유했는지 확인
