# 배포 가이드 - 간단 버전

## 🚀 Vercel 배포 (가장 쉬움)

### 준비
1. GitHub 계정
2. `my-project-10565-484606-b5dd0171d354.json` 파일 내용 복사

### 배포 단계

#### 1. GitHub에 코드 업로드
```bash
cd community_dashboard
git init
git add .
git commit -m "Initial commit"
# GitHub에서 새 저장소 생성 후
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

#### 2. Vercel 배포
1. https://vercel.com 접속 → GitHub로 로그인
2. "Add New Project" → 저장소 선택
3. 환경 변수 추가:
   - 이름: `GOOGLE_SHEETS_CREDENTIALS`
   - 값: JSON 파일 전체 내용 붙여넣기
4. "Deploy" 클릭

#### 3. 완료!
배포된 URL에서 앱 사용 가능

---

## 🔧 환경 변수 설정

### Vercel 환경 변수
프로젝트 설정 → Environment Variables에서:
```
GOOGLE_SHEETS_CREDENTIALS = {"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

### 로컬 개발
`.env.local` 파일 생성 (선택사항):
```
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account",...}
```

로컬에서는 `my-project-10565-484606-b5dd0171d354.json` 파일이 있으면 자동으로 사용됩니다.

---

## 📝 참고사항

- 인증 파일은 절대 Git에 커밋하지 마세요 (이미 .gitignore에 추가됨)
- 배포 후 구글 시트 접근 권한 확인 필요
- 서비스 계정 이메일을 구글 시트에 공유해야 함
