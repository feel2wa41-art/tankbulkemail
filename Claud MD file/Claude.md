# 🚀 Tank 시스템 VSCode 로컬 개발 환경 구축 완전 가이드

백엔드-프론트엔드 연결과 임시데이터 처리 문제를 고려한 최적의 개발 환경을 설계했습니다.

---

## 📋 1. 프로젝트 구조 설계

```
tank-system/
├── backend/              # NestJS API
├── worker/               # 스케줄러 엔진
├── frontend/             # React
├── shared/               # 공통 타입/인터페이스
├── docker/               # 로컬 인프라
│   ├── oracle/
│   └── nginx/
├── test-data/            # 임시 테스트 데이터
│   ├── files/
│   ├── seeds/           # DB 시드 데이터
│   └── mock-emails/     # 발송 테스트 이메일
└── scripts/             # 개발 편의 스크립트
```

---

## ⚙️ 2. VSCode Workspace 설정

### 📁 tank-system.code-workspace

```json
{
  "folders": [
    {
      "path": "backend",
      "name": "🔧 Backend (NestJS)"
    },
    {
      "path": "worker",
      "name": "⚡ Worker (Scheduler)"
    },
    {
      "path": "frontend",
      "name": "🎨 Frontend (React)"
    },
    {
      "path": "shared",
      "name": "📦 Shared"
    }
  ],
  "settings": {
    "typescript.tsdk": "backend/node_modules/typescript/lib",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    },
    "files.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/.git": true
    },
    "search.exclude": {
      "**/node_modules": true,
      "**/dist": true
    }
  },
  "extensions": {
    "recommendations": [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "ms-vscode.vscode-typescript-next",
      "oracle.oracledevtools",
      "ritwickdey.liveserver",
      "humao.rest-client"
    ]
  }
}
```

---

## 🔥 3. 환경별 설정 파일 관리 (핵심!)

### 프론트엔드-백엔드 연결 문제 해결

```
backend/
├── .env.example          # 템플릿
├── .env.local            # 로컬 개발용 (gitignore)
├── .env.dev              # 개발서버용
└── .env.prod             # 운영용 (고객사)

worker/
├── .env.example
├── .env.local
└── .env.dev

frontend/
├── .env.development      # npm start시 자동 로드
├── .env.production
└── .env.local            # 개인별 설정 (gitignore)
```

### 🎯 backend/.env.local (예시)

```bash
# 데이터베이스
NODE_ENV=development
ORACLE_HOST=localhost
ORACLE_PORT=1521
ORACLE_SERVICE=XEPDB1
ORACLE_USER=TANK_DEV
ORACLE_PASSWORD=dev123

# API 서버
PORT=3001
API_PREFIX=/api

# CORS (프론트엔드 연결)
CORS_ORIGIN=http://localhost:3000

# AWS SES (Sandbox)
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxx
SES_FROM_EMAIL=test@yourdomain.com
SES_SANDBOX_MODE=true

# 첨부파일
FILE_ROOT_PATH=C:/tank-dev/test-data/files
FILE_MAX_SIZE=10485760

# 로깅
LOG_LEVEL=debug
LOG_PATH=./logs
```

### 🎯 worker/.env.local

```bash
NODE_ENV=development

# Backend API 연결
BACKEND_API_URL=http://localhost:3001/api

# Oracle (Worker도 직접 DB 접근)
ORACLE_HOST=localhost
ORACLE_PORT=1521
ORACLE_SERVICE=XEPDB1
ORACLE_USER=TANK_DEV
ORACLE_PASSWORD=dev123

# 스케줄러
SCHEDULER_ENABLED=false  # 로컬에서는 수동 실행
MANUAL_TRIGGER_PORT=3002

# 메일 발송 모드
DEV_MODE=true           # true면 실제 발송 안함
MOCK_EMAIL_PATH=C:/tank-dev/test-data/mock-emails
```

### 🎯 frontend/.env.development

```bash
# Backend API URL
REACT_APP_API_URL=http://localhost:3001/api

# Worker API URL (수동 실행용)
REACT_APP_WORKER_URL=http://localhost:3002

# Feature Flags
REACT_APP_ENABLE_MOCK_DATA=true
REACT_APP_SHOW_DEBUG_INFO=true

# 기타
REACT_APP_VERSION=1.0.0-dev
```

---

## 🐳 4. Docker로 로컬 인프라 구축

### docker-compose.local.yml

```yaml
version: '3.8'

services:
  oracle-dev:
    image: container-registry.oracle.com/database/express:21c
    container_name: tank-oracle-dev
    ports:
      - "1521:1521"
    environment:
      - ORACLE_PWD=DevPassword123
    volumes:
      - ./docker/oracle/init:/docker-entrypoint-initdb.d
      - oracle-data:/opt/oracle/oradata
    healthcheck:
      test: ["CMD", "sqlplus", "-L", "sys/DevPassword123@//localhost:1521/XEPDB1 as sysdba", "@healthcheck.sql"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  oracle-data:
```

### 🚀 실행

```bash
# Oracle 시작
docker-compose -f docker-compose.local.yml up -d

# 상태 확인
docker-compose -f docker-compose.local.yml ps
```

---

## 🔧 5. VSCode Tasks 설정 (통합 실행)

### .vscode/tasks.json

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "🚀 Start All Services",
      "dependsOn": [
        "Start Backend",
        "Start Worker",
        "Start Frontend"
      ],
      "problemMatcher": []
    },
    {
      "label": "Start Backend",
      "type": "npm",
      "script": "start:dev",
      "path": "backend/",
      "problemMatcher": ["$tsc"],
      "isBackground": true,
      "presentation": {
        "reveal": "always",
        "panel": "dedicated",
        "group": "dev"
      }
    },
    {
      "label": "Start Worker",
      "type": "npm",
      "script": "start:dev",
      "path": "worker/",
      "problemMatcher": ["$tsc"],
      "isBackground": true,
      "presentation": {
        "reveal": "always",
        "panel": "dedicated",
        "group": "dev"
      }
    },
    {
      "label": "Start Frontend",
      "type": "npm",
      "script": "start",
      "path": "frontend/",
      "problemMatcher": [],
      "isBackground": true,
      "presentation": {
        "reveal": "always",
        "panel": "dedicated",
        "group": "dev"
      }
    },
    {
      "label": "🧪 Seed Test Data",
      "type": "shell",
      "command": "npm run seed:local",
      "options": {
        "cwd": "${workspaceFolder}/backend"
      }
    }
  ]
}
```

### 사용법

1. `Ctrl+Shift+P` → `Tasks: Run Task`
2. `🚀 Start All Services` 선택
3. 3개 터미널에서 동시 실행됨

---

## 📊 6. 임시 데이터 관리 전략 (중요!)

### A. TypeScript 공통 타입 정의

```typescript
// shared/types/customer.ts
export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
}
```

### B. Mock 데이터 생성기

```typescript
// backend/src/utils/mock-data.generator.ts
import { faker } from '@faker-js/faker';

export function generateCustomers(count: number) {
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    company: faker.company.name(),
  }));
}

// API 엔드포인트
@Get('/dev/generate-customers')
async generateTestCustomers(@Query('count') count: number = 10) {
  if (process.env.NODE_ENV !== 'development') {
    throw new ForbiddenException('Only in dev mode');
  }
  return this.mockService.generateCustomers(count);
}
```

### C. 프론트엔드 Mock 데이터 처리

```typescript
// frontend/src/services/api.ts
const USE_MOCK = process.env.REACT_APP_ENABLE_MOCK_DATA === 'true';

export async function getCustomers() {
  if (USE_MOCK) {
    // 로컬 Mock 데이터
    return import('../mocks/customers.json').then(m => m.default);
  }
  
  // 실제 API 호출
  const response = await fetch(`${API_URL}/customers`);
  return response.json();
}
```

### D. DB 시드 스크립트

```typescript
// backend/scripts/seed.local.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const customerRepo = app.get('CustomerRepository');
  
  // 기존 데이터 삭제 (로컬만)
  await customerRepo.truncate();
  
  // 테스트 데이터 생성
  const customers = generateCustomers(50);
  await customerRepo.bulkInsert(customers);
  
  console.log('✅ Seed completed: 50 customers');
  
  await app.close();
}

seed();
```

```bash
# package.json에 추가
"scripts": {
  "seed:local": "ts-node scripts/seed.local.ts"
}
```

---

## 🧪 7. API 테스트 환경

### test-requests/customers.http (REST Client)

```http
### 로컬 환경 변수
@baseUrl = http://localhost:3001/api
@token = your-dev-token

### 고객 목록 조회
GET {{baseUrl}}/customers
Authorization: Bearer {{token}}

### Mock 데이터 생성 (개발 전용)
GET {{baseUrl}}/dev/generate-customers?count=20

### 이메일 발송 테스트
POST {{baseUrl}}/emails/send
Content-Type: application/json

{
  "templateId": "welcome",
  "recipients": ["test@example.com"],
  "testMode": true
}
```

---

## 🔄 8. 개발 워크플로우

### 1단계: 환경 준비

```bash
# Oracle 시작
docker-compose -f docker-compose.local.yml up -d

# 의존성 설치
cd backend && npm install
cd ../worker && npm install
cd ../frontend && npm install
```

### 2단계: 테스트 데이터 준비

```bash
# DB 시드
cd backend
npm run seed:local

# 테스트 파일 복사
cp test-data/files-sample/* test-data/files/
```

### 3단계: 서비스 시작

```bash
# VSCode에서
Ctrl+Shift+P → Run Task → 🚀 Start All Services

# 또는 수동으로
cd backend && npm run start:dev
cd worker && npm run start:dev  
cd frontend && npm start
```

### 4단계: 개발

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Worker Trigger: http://localhost:3002/trigger

---

## 🎯 9. 디버깅 설정

### .vscode/launch.json

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "🔧 Debug Backend",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "⚡ Debug Worker",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "cwd": "${workspaceFolder}/worker",
      "console": "integratedTerminal"
    },
    {
      "name": "🎨 Debug Frontend",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/frontend/src"
    }
  ],
  "compounds": [
    {
      "name": "🚀 Debug All",
      "configurations": [
        "🔧 Debug Backend",
        "⚡ Debug Worker",
        "🎨 Debug Frontend"
      ]
    }
  ]
}
```

---

## ✅ 10. 체크리스트

### 초기 설정
- [ ] VSCode Workspace 파일 생성
- [ ] 권장 Extension 설치
- [ ] Docker Oracle 시작
- [ ] .env.local 파일 생성 (각 프로젝트)

### 개발 시작 전
- [ ] Oracle 상태 확인
- [ ] DB 시드 데이터 최신화
- [ ] 테스트 파일 경로 확인
- [ ] SES Sandbox 이메일 인증

### 코딩 중
- [ ] TypeScript 타입 공유 (shared/)
- [ ] API 변경 시 프론트엔드 즉시 반영
- [ ] Mock 데이터로 UI 먼저 개발
- [ ] Worker 수동 실행으로 검증

---

## 🚨 주의사항

### ❌ 절대 하지 말 것

1. **운영 DB에 직접 연결 금지**
2. **운영 SES 키를 로컬에서 사용 금지**
3. **.env.local 파일 Git 커밋 금지**
4. **실제 고객 이메일로 테스트 발송 금지**

### ✅ 꼭 할 것

1. **Mock 데이터로 충분히 테스트**
2. **Worker는 DEV_MODE=true로 실행**
3. **환경별 설정 파일 철저히 분리**
4. **코드 변경 시 즉시 Hot Reload 확인**
