# React + NestJS 프로젝트 구조 및 개발 표준 문서 (v1)
본 문서는 **Tank 자동 이메일 시스템을 실제 개발/납품/유지보수하기 위한 표준 개발 규칙**을 정의합니다.

온프레미스 설치형 기반으로 유지보수하기 위해 가장 안정적이고 대규모 운영이 가능한 폴더 구조, 코딩 규칙, 환경변수 규칙, 배포 기준 등을 상세히 정리했습니다.

---
# 1. 전체 Monorepo 구조
Tank 솔루션은 **Frontend + Backend + Scheduler/Worker**를 하나의 Repository로 관리하는 것이 유지보수상 최적입니다.

```
/tank-mail-system
│
├── frontend/        # React (Nginx로 배포)
├── backend/         # NestJS API 서버
├── worker/          # Worker 엔진(BullMQ 또는 Scheduler 포함)
├── nginx/           # 설치형용 Nginx 설정 파일
├── docs/            # 기획 및 설계 문서(MD)
├── docker/          # Dockerfile 및 docker-compose
└── config/          # 공통 설정파일(env template 등)
```

---
# 2. Frontend (React) 구조
React는 **Atomic Design 패턴 + 기능 단위 모듈 구조**로 나누는 것이 유지보수상 가장 유리합니다.

```
/frontend
│
├── src/
│   ├── api/                 # API 통신 모듈
│   ├── components/          # 공통 UI 컴포넌트
│   │   ├── atoms/
│   │   ├── molecules/
│   │   └── organisms/
│   ├── pages/               # 화면 단위
│   │   ├── Login/
│   │   ├── Dashboard/
│   │   ├── Settings/
│   │   ├── Automation/
│   │   └── Report/
│   ├── hooks/               # Custom Hooks
│   ├── store/               # Zustand 또는 Redux 상태관리
│   ├── utils/               # 유틸리티
│   ├── routes/              # 라우팅
│   └── i18n/                # 다국어 JSON
│
├── public/
└── package.json
```

---
# 3. Backend (NestJS) 구조
NestJS는 **Domain Driven Module 구조** 권장.

```
/backend
│
├── src/
│   ├── modules/
│   │   ├── org/              # 조직 관리
│   │   ├── auth/             # 로그인/토큰
│   │   ├── dbprofile/        # DB 연결 설정
│   │   ├── automation/       # Automation 설정
│   │   ├── email/            # 이메일 발송/템플릿
│   │   ├── scheduler/        # Scheduler 모듈
│   │   ├── log/              # 로그 저장/조회
│   │   ├── report/           # 리포트 API
│   │   └── storage/          # 첨부파일 매칭
│   │
│   ├── common/               # DTO, Decorator, Interceptor
│   ├── config/               # 환경변수 설정
│   ├── utils/                # 공통 유틸
│   └── main.ts               # Entry Point
│
└── package.json
```

---
# 4. Worker 구조 (대량 발송 엔진)
Worker는 Backend와 별도 프로세스로 실행.

```
/worker
│
├── src/
│   ├── queue/                # BullMQ Queue 정의
│   ├── processor/            # Job 처리
│   ├── services/             # DB, Template, SES, File 매칭
│   ├── config/               # 환경 설정
│   └── main.ts
```

---
# 5. 공통 환경변수(.env) 규칙
환경 변수는 설치형에서 가장 중요.

## ✔ 구조 예시
```
# Oracle DB
ORACLE_HOST=10.0.10.15
ORACLE_USER=TANK
ORACLE_PASS=****
ORACLE_SID=ORCL

# SES
AWS_ACCESS_KEY=
AWS_SECRET_KEY=
AWS_REGION=ap-southeast-1

# File Storage
FILE_ROOT_PATH=/batch/report

# Scheduler
SCHEDULER_INTERVAL=30000
```

## ✔ 보안 규칙
- **Frontend(React)에는 절대 Key 저장 금지**
- Backend/Worker만 Key 사용 가능
- .env 파일은 배포 시 고객사 서버 내부에서만 존재

---
# 6. API 통신 규칙
Frontend ↔ Backend 통신은 REST 기반.

### ✔ 규칙
- 모든 API는 `/api/v1/...` 패턴 사용
- 모든 응답은 공통 Response 형식 사용

### ✔ Response 규칙
```
{
  success: true/false,
  message: "",
  data: {},
  errorCode: ""
}
```

---
# 7. 코드 표준 규칙
## ✔ Naming
- PascalCase: Class, DTO
- camelCase: 함수명, 변수명
- UPPER_SNAKE_CASE: 상수

## ✔ 주석 규칙
모듈 시작부에 반드시 주석 작성.

## ✔ Exception 규칙
NestJS HttpException 사용.

---
# 8. 버전 관리(Git) 규칙
### ✔ Branch 구조
```
main
release
develop
feature/*
fix/*
```

### ✔ Commit 규칙
```
feat: 신규 기능
fix: 버그 수정
docs: 문서
refactor: 코드 리팩토링
chore: 기타
```

---
# 9. 빌드/배포 규칙
## ✔ Frontend
```
npm run build
→ build/ 를 nginx/html 경로로 복사
```

## ✔ Backend
```
npm run build
pm2 start dist/main.js
```

## ✔ Worker
```
pm2 start dist/worker.js
```

---
# 10. Docker 배포 표준
Docker 허용 환경일 경우 최고의 방식.

### docker-compose.yml 예시
```
version: "3"
services:
  frontend:
    image: nginx:latest
    volumes:
      - ./frontend/build:/usr/share/nginx/html
    ports:
      - "80:80"

  backend:
    build: ./backend
    env_file:
      - ./config/.env
    ports:
      - "3000:3000"

  worker:
    build: ./worker
    env_file:
      - ./config/.env
```

---
# 11. 로그 파일/에러 파일 규칙
- backend/logs/*.log
- worker/logs/*.log

Log 파일은 30일 보관 후 rotation.

---
# 12. 테스트 규칙
- Jest 기반 단위 테스트 작성
- Oracle 연결 테스트는 Mock 사용
- 템플릿 엔진 테스트 필수

---
# 13. 다음 문서
모든 기술 문서가 완료되었습니다.
필요 시 다음 항목도 추가 제작 가능:
- 배포 가이드
- 고객사 설치 매뉴얼
- 운영자 매뉴얼
- API 명세서

