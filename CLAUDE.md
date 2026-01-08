# Tank Bulk Email System - Development Guidelines

## Project Overview

**Tank System**: 온프레미스 설치형 대량 이메일 자동 발송 솔루션
- **Frontend**: React (Atomic Design)
- **Backend**: NestJS (Domain Driven)
- **Worker**: BullMQ 기반 스케줄러 엔진
- **Database**: Oracle
- **Email Service**: AWS SES

---

## Project Structure

```
/tank-mail-system
├── frontend/        # React (Nginx 배포)
├── backend/         # NestJS API 서버
├── worker/          # 스케줄러 엔진
├── shared/          # 공통 타입/인터페이스
├── nginx/           # Nginx 설정
├── docker/          # Docker 설정
├── docs/            # 기획/설계 문서
└── config/          # 환경변수 템플릿
```

---

## Development Rules

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Class, DTO | PascalCase | `CustomerService`, `CreateEmailDto` |
| Function, Variable | camelCase | `getCustomers`, `emailCount` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Files (Component) | PascalCase | `EmailTemplate.tsx` |
| Files (Service) | kebab-case | `email-service.ts` |

### Code Standards
- TypeScript strict mode 필수
- ESLint + Prettier 적용
- 모듈 시작부 주석 필수
- 함수별 JSDoc 권장

### API Standards
- Base URL: `/api/v1`
- Response Format:
```json
{
  "success": true,
  "message": "설명",
  "data": {},
  "errorCode": "OPTIONAL"
}
```
- JWT 인증: `Authorization: Bearer <token>`

---

## Git Workflow

### Branch Strategy
```
main        # 운영 배포
release     # 릴리즈 준비
develop     # 개발 통합
feature/*   # 신규 기능
fix/*       # 버그 수정
hotfix/*    # 긴급 수정
```

### Commit Convention
```
feat: 신규 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드, 설정 변경
style: 코드 포맷팅
```

### PR Rules
- develop 브랜치로 PR
- 최소 1명 리뷰 필수
- CI 통과 후 머지

---

## Security Rules

### Critical (절대 금지)
- .env 파일 Git 커밋 금지
- Frontend에 AWS Key 저장 금지
- 운영 DB 직접 연결 금지 (개발 환경에서)
- 실제 고객 이메일로 테스트 발송 금지
- 채팅/문서에 비밀번호 공유 금지

### Required
- AWS IAM 최소 권한 원칙 적용
- JWT 토큰 인증 필수
- Rate Limit 적용 (100 req/min)
- CORS 화이트리스트 적용
- 파일명 인젝션 검증

### Recommended
- HTTPS 적용
- 6개월마다 Key Rotation
- 로그 30일 보관 후 삭제
- 개인정보 마스킹 처리

---

## Environment Configuration

### Required .env Variables
```bash
# Database
ORACLE_HOST=
ORACLE_PORT=1521
ORACLE_SERVICE=
ORACLE_USER=
ORACLE_PASSWORD=

# AWS SES
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SES_FROM_EMAIL=

# Application
NODE_ENV=development
PORT=3001
API_PREFIX=/api
CORS_ORIGIN=http://localhost:3000

# File Storage
FILE_ROOT_PATH=
FILE_MAX_SIZE=10485760

# Logging
LOG_LEVEL=debug
LOG_PATH=./logs
```

### Environment Files
```
.env.example    # Git에 포함 (템플릿)
.env.local      # 로컬 개발용 (gitignore)
.env.dev        # 개발서버용
.env.prod       # 운영용 (고객사 서버에만 존재)
```

---

## AWS SES IAM Setup

### Required Permissions (최소 권한)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:GetSendQuota",
        "ses:GetSendStatistics"
      ],
      "Resource": "*"
    }
  ]
}
```

### IAM User 생성 절차
1. AWS Console → IAM → Users → Add User
2. User name: `tank-ses-user`
3. Access type: Programmatic access
4. Permissions: 위 Policy 적용
5. Access Key ID / Secret Access Key 저장
6. .env 파일에 설정

### SES Sandbox Mode
- 개발 환경에서는 SES_SANDBOX_MODE=true
- Verified Email만 발송 가능
- Production 이동 시 AWS에 요청 필요

---

## Testing Rules

### Required Tests
- Jest 기반 단위 테스트
- Oracle 연결은 Mock 사용
- 템플릿 엔진 테스트 필수
- API 엔드포인트 E2E 테스트

### Test Commands
```bash
npm run test          # 단위 테스트
npm run test:e2e      # E2E 테스트
npm run test:cov      # 커버리지
```

### Mock Data
- `test-data/` 디렉토리 사용
- Faker.js로 테스트 데이터 생성
- 실제 고객 데이터 사용 금지

---

## Build & Deploy

### Development
```bash
# Frontend
cd frontend && npm start

# Backend
cd backend && npm run start:dev

# Worker
cd worker && npm run start:dev
```

### Production Build
```bash
# Frontend
npm run build → nginx/html로 복사

# Backend
npm run build && pm2 start dist/main.js

# Worker
npm run build && pm2 start dist/worker.js
```

### Docker
```bash
docker-compose -f docker-compose.yml up -d
```

---

## Logging Standards

### Log Levels
| Level | Usage |
|-------|-------|
| error | 시스템 오류, 발송 실패 |
| warn | 재시도, 임계치 도달 |
| info | 발송 완료, 주요 이벤트 |
| debug | 개발/디버깅용 상세 로그 |

### Log Format
```
[timestamp] [level] [module] message
```

### Log Files
```
backend/logs/app.log
backend/logs/error.log
worker/logs/worker.log
worker/logs/email-send.log
```

---

## Performance Guidelines

### Database
- 대량 쿼리 시 페이징 필수 (1000건 단위)
- Connection Pool 사용
- 쿼리 실행 시간 로깅

### Email Sending
- SES Rate Limit 준수 (14 emails/sec default)
- Batch 처리 (100건 단위)
- 실패 시 지수 백오프 재시도

### File Handling
- 첨부파일 10MB 제한
- 스트리밍 처리
- 임시파일 즉시 삭제

---

## Troubleshooting

### Common Issues
| Issue | Solution |
|-------|----------|
| Oracle 연결 실패 | TNS 설정, 방화벽 확인 |
| SES Throttling | Rate limit 조정, 배치 크기 축소 |
| 첨부파일 미매칭 | 파일명 패턴, 경로 권한 확인 |
| JWT 만료 | 토큰 갱신 로직 확인 |

### Health Check
```
GET /api/v1/health
```

---

## Reference Documents

- [tank_react_nest_project_standard.md](./Claud%20MD%20file/tank_react_nest_project_standard.md)
- [tank_api_spec.md](./Claud%20MD%20file/tank_api_spec.md)
- [tank_db_schema_erd.md](./Claud%20MD%20file/tank_db_schema_erd.md)
- [tank_security_hardening_guide.md](./Claud%20MD%20file/tank_security_hardening_guide.md)
- [tank_ses_operation_guide.md](./Claud%20MD%20file/tank_ses_operation_guide.md)

---

## Quick Commands

```bash
# 개발 시작
docker-compose -f docker-compose.local.yml up -d  # Oracle 시작
cd backend && npm run seed:local                   # 테스트 데이터
npm run start:dev                                  # 서버 시작

# 코드 품질
npm run lint                                       # ESLint 검사
npm run format                                     # Prettier 적용
npm run test                                       # 테스트 실행

# Git 작업
git checkout -b feature/새기능                     # 브랜치 생성
git commit -m "feat: 기능 설명"                    # 커밋
```
