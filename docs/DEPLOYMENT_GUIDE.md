# Tank Bulk Email System - 배포 가이드

## 목차
1. [시스템 요구사항](#시스템-요구사항)
2. [사전 준비사항](#사전-준비사항)
3. [설치 방법](#설치-방법)
4. [환경 설정](#환경-설정)
5. [실행 및 확인](#실행-및-확인)
6. [고객사별 배포](#고객사별-배포)
7. [문제 해결](#문제-해결)

---

## 시스템 요구사항

### 서버 사양
| 구분 | 최소 사양 | 권장 사양 |
|------|----------|----------|
| CPU | 2 Core | 4 Core |
| RAM | 4GB | 8GB |
| Disk | 50GB | 100GB+ |
| OS | Ubuntu 20.04+ / CentOS 8+ | Ubuntu 22.04 LTS |

### 필수 소프트웨어
- Docker 20.10+
- Docker Compose 2.0+
- Oracle Client (고객사 DB 연결용)

### 네트워크 요구사항
- 포트 80 (Frontend)
- 포트 3001 (Backend API)
- 포트 3002 (Worker)
- 포트 6379 (Redis - 내부 전용)
- AWS SES 연결을 위한 외부 인터넷 접근

---

## 사전 준비사항

### 1. AWS SES 설정

#### IAM User 생성
```bash
# AWS Console에서 IAM User 생성
# User name: tank-ses-user
# Access type: Programmatic access
```

#### 필요 권한 (IAM Policy)
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

#### 발신 이메일 인증
```bash
# SES Console에서 발신 이메일 주소 인증
# 또는 도메인 인증 (권장)
```

### 2. Oracle Database 접근 정보
- Host/IP
- Port (기본: 1521)
- Service Name
- Username / Password

### 3. 파일 저장 경로
- 첨부파일 저장 경로 결정 (예: `/data/tank/files`)

---

## 설치 방법

### Step 1: 소스 코드 배포

```bash
# 배포 파일 압축 해제 또는 Git Clone
cd /opt
tar -xzf tank-bulk-email.tar.gz
# 또는
git clone <repository-url> tank-bulk-email
cd tank-bulk-email
```

### Step 2: 환경 설정 파일 생성

```bash
# config 디렉토리 생성
mkdir -p config

# 환경 설정 파일 복사
cp config/.env.example config/.env

# 설정 파일 편집
nano config/.env
```

### Step 3: Docker 빌드 및 실행

```bash
# Docker 이미지 빌드
docker-compose build

# 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

---

## 환경 설정

### config/.env 파일 설정

```bash
# ===========================================
# Tank Bulk Email System - Production Config
# ===========================================

# Application
NODE_ENV=production
PORT=3001
WORKER_PORT=3002

# Database (Oracle)
ORACLE_HOST=<고객사 DB IP>
ORACLE_PORT=1521
ORACLE_SERVICE=<서비스명>
ORACLE_USER=<사용자명>
ORACLE_PASSWORD=<비밀번호>
ORACLE_POOL_MIN=2
ORACLE_POOL_MAX=20

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# AWS SES
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=<고객사 AWS Access Key>
AWS_SECRET_ACCESS_KEY=<고객사 AWS Secret Key>
SES_FROM_EMAIL=<발신 이메일 주소>

# JWT Secret (변경 필수!)
JWT_SECRET=<32자 이상의 랜덤 문자열>
JWT_EXPIRES_IN=1d

# File Storage
FILE_ROOT_PATH=/app/files
FILE_MAX_SIZE=10485760

# Scheduler
SCHEDULER_ENABLED=true
SCHEDULER_INTERVAL=30000

# Concurrency
MAX_PARALLEL_JOBS=5
BATCH_SIZE=100
SES_RATE_LIMIT=14

# Logging
LOG_LEVEL=info
LOG_PATH=/app/logs

# CORS (Frontend URL)
CORS_ORIGIN=http://<서버 IP 또는 도메인>
```

### 고객사별 필수 변경 항목

| 항목 | 설명 | 예시 |
|------|------|------|
| ORACLE_HOST | 고객사 Oracle DB 주소 | 192.168.1.100 |
| ORACLE_SERVICE | Oracle 서비스명 | ORCL |
| ORACLE_USER/PASSWORD | DB 계정 정보 | tank_user / xxxx |
| AWS_ACCESS_KEY_ID | 고객사 AWS Key | AKIA... |
| AWS_SECRET_ACCESS_KEY | 고객사 AWS Secret | xxxx |
| SES_FROM_EMAIL | 발신 이메일 주소 | noreply@company.com |
| JWT_SECRET | JWT 서명 키 (고유값) | 랜덤 32자 |
| CORS_ORIGIN | Frontend 접근 URL | http://tank.company.com |

---

## 실행 및 확인

### 서비스 시작

```bash
# 전체 서비스 시작
docker-compose up -d

# 개별 서비스 시작
docker-compose up -d redis
docker-compose up -d backend
docker-compose up -d worker
docker-compose up -d frontend
```

### 상태 확인

```bash
# 컨테이너 상태 확인
docker-compose ps

# 서비스 로그 확인
docker-compose logs -f backend
docker-compose logs -f worker

# Health Check
curl http://localhost:3001/api/v1/health
curl http://localhost:3002/health
```

### 초기 데이터 설정

```bash
# Backend 컨테이너 접속
docker-compose exec backend sh

# 시드 데이터 실행 (필요시)
npm run seed
```

### 접속 확인

| 서비스 | URL | 설명 |
|--------|-----|------|
| Frontend | http://<IP>:80 | 웹 UI |
| Backend API | http://<IP>:3001/api/v1 | REST API |
| Worker | http://<IP>:3002/health | Worker 상태 |
| Swagger | http://<IP>:3001/api/docs | API 문서 |

---

## 고객사별 배포

### 배포 체크리스트

- [ ] AWS IAM User 생성 및 키 발급
- [ ] SES 발신 이메일/도메인 인증
- [ ] Oracle DB 접속 정보 확인
- [ ] 서버 방화벽 포트 오픈 (80, 3001, 3002)
- [ ] config/.env 파일 설정
- [ ] Docker 이미지 빌드
- [ ] 서비스 시작 및 테스트
- [ ] 관리자 계정 생성
- [ ] 조직(Organization) 생성
- [ ] 테스트 자동화 생성 및 실행

### 배포 후 초기 설정

1. **관리자 로그인**
   - URL: http://<서버>/login
   - 초기 계정: admin / admin123 (즉시 변경 필요)

2. **조직 생성**
   - Settings > Organizations
   - 고객사명 입력

3. **자동화 생성 테스트**
   - Automation > New Automation
   - 테스트 템플릿 설정
   - 수동 실행 테스트

---

## 문제 해결

### 자주 발생하는 오류

#### Oracle 연결 실패
```
Error: ORA-12170: TNS:Connect timeout occurred
```
**해결:**
- 방화벽에서 1521 포트 확인
- Oracle 서비스 상태 확인
- TNS 설정 확인

#### SES 발송 실패
```
Error: Email address is not verified
```
**해결:**
- AWS SES Console에서 이메일 인증 확인
- Sandbox 모드인 경우 수신자도 인증 필요
- Production 모드 전환 요청

#### Redis 연결 실패
```
Error: ECONNREFUSED 127.0.0.1:6379
```
**해결:**
```bash
# Redis 컨테이너 상태 확인
docker-compose ps redis

# Redis 재시작
docker-compose restart redis
```

### 로그 확인 위치

| 서비스 | 로그 경로 |
|--------|----------|
| Backend | ./logs/backend/app.log |
| Worker | ./logs/worker/worker.log |
| Docker | docker-compose logs <service> |

### 서비스 재시작

```bash
# 전체 재시작
docker-compose restart

# 개별 서비스 재시작
docker-compose restart backend
docker-compose restart worker

# 완전 초기화 (주의!)
docker-compose down
docker-compose up -d
```

---

## 보안 체크리스트

- [ ] JWT_SECRET 변경 (기본값 사용 금지)
- [ ] 관리자 비밀번호 변경
- [ ] CORS_ORIGIN 적절히 설정
- [ ] AWS IAM 최소 권한 원칙 적용
- [ ] SSL/HTTPS 적용 (운영 환경)
- [ ] 방화벽 설정 (필요 포트만 오픈)
- [ ] 정기적인 로그 백업

---

## 업데이트 방법

```bash
# 서비스 중지
docker-compose down

# 최신 코드 받기
git pull origin main

# 이미지 재빌드
docker-compose build --no-cache

# 서비스 시작
docker-compose up -d
```

---

## 지원

기술 지원이 필요한 경우:
- Email: support@company.com
- 문서: /docs 디렉토리 참조
