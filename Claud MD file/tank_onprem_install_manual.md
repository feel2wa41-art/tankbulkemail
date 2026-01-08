# 고객사 설치 매뉴얼 (On-Premise Installation Guide v1)
본 문서는 Tank 자동 이메일 시스템을 **고객사 온프레미스 서버에 설치하기 위한 공식 설치 매뉴얼**입니다.
Linux 서버 기준으로 작성되며, Windows 설치 매뉴얼은 별도 문서로 제공 가능합니다.

본 문서는 실제 운영 환경에 설치할 때 개발자/인프라 담당자가 그대로 따라 하면 동작하도록 구성되었습니다.

---
# 1. 설치 구성요소
설치 패키지는 다음 구조로 제공됩니다:
```
/tank-mail-app
│
├── frontend/           # React Build 결과물
├── backend/            # NestJS API 서버
├── worker/             # Worker 엔진
├── nginx/              # Nginx 실행 파일 + 설정파일
├── config/             # 환경변수 파일(.env.example)
└── start.sh            # 전체 실행 스크립트
```

---
# 2. 시스템 요구사항
## ✔ OS
- Linux (Ubuntu 20+, CentOS 7+, RHEL 8+)

## ✔ 패키지 요구사항
- Node.js 18+
- npm 9+
- Oracle Instant Client (Oracle DB 연결 필수)
- Nginx (기본 포함)
- unzip 또는 tar

## ✔ 포트
| 포트 | 용도 |
|------|------|
| 80/443 | 프론트엔드 접속 요청 (Nginx) |
| 3000 | 백엔드 NestJS API |
| 3001 | Worker 엔진 운영 (선택) |

---
# 3. 설치 절차 (Linux 기준)
모든 과정은 root 또는 sudo 권한으로 실행합니다.

---
## Step 1. 설치 패키지 업로드
고객사 서버에 패키지를 업로드:
```
sftp> put tank-mail-app.tar.gz
```

---
## Step 2. 압축 해제
```
tar -xvzf tank-mail-app.tar.gz
cd tank-mail-app
```

---
## Step 3. .env 파일 생성
`config/.env.example` 파일을 복사하여 `.env` 생성

```
cp config/.env.example config/.env
```

환경변수 파일을 열어 고객사 정보로 변경합니다:
```
nano config/.env
```

예시:
```
ORACLE_HOST=10.0.1.12
ORACLE_USER=MTI
ORACLE_PASS=****
ORACLE_SID=ORCL

AWS_ACCESS_KEY=AKIA...
AWS_SECRET_KEY=...
AWS_REGION=ap-southeast-1

FILE_ROOT_PATH=/batch/report
```

---
## Step 4. Oracle Instant Client 설치
Oracle DB 연결을 위해 필수.

```
sudo apt install libaio1
unzip instantclient-basic.zip -d /opt/oracle
export LD_LIBRARY_PATH=/opt/oracle/instantclient:$LD_LIBRARY_PATH
```

이 설정은 `/etc/profile`에 영구 등록 권장.

---
## Step 5. Backend 의존성 설치
```
cd backend
npm install
npm run build
```

---
## Step 6. Worker 의존성 설치
```
cd ../worker
npm install
npm run build
```

---
## Step 7. Frontend(Nginx) 배포 준비
이미 build 폴더 제공됨:
```
/frontend/build
```
Nginx 설정파일 위치:
```
/nginx/conf/nginx.conf
```
필요 시 server_name 등 수정.

---
## Step 8. 실행 스크립트 실행
루트 폴더로 이동 후:
```
chmod +x start.sh
./start.sh
```

start.sh 기능:
- 백엔드 API 실행 (pm2 또는 node)
- Worker 실행
- Nginx 실행

---
# 4. 서비스 관리 명령어
## ✔ 전체 재시작
```
./start.sh
```

## ✔ 백엔드만 재시작
```
cd backend
pm2 restart backend
```

## ✔ Worker만 재시작
```
cd worker
pm2 restart worker
```

## ✔ Nginx 재시작
```
nginx -s reload
```

---
# 5. 설치 후 점검 체크리스트
| 점검 항목 | 정상 기준 |
|------------|------------|
| Frontend 접속 | 브라우저에서 로그인 화면 표시 |
| Backend 상태 | http://SERVER:3000/api/health 정상 응답 |
| Oracle 연결 | DB Profile 화면에서 "Connect Test" 성공 |
| 템플릿 저장 | Template Settings 저장 성공 |
| 스케줄 실행 | Scheduler Log 생성됨 |
| 첨부파일 조회 | 첨부파일 매칭 성공 로그 확인 |
| 이메일 발송 | SES 로그 정상, 테스트 메일 수신 |

---
# 6. 오류 발생 시 조치
## ✔ Oracle 연결 오류
- oracle instant client 설치 여부 확인
- ORACLE_HOST, PORT, SID 확인

## ✔ SES 발송 오류
- 방화벽에서 outbound 443 차단 여부 확인
- SES Key 정상 여부 확인

## ✔ 첨부파일 없음
- FILE_ROOT_PATH 경로 권한 확인
- 파일명 정확히 일치 여부 확인

## ✔ Nginx 에러
- conf 파일 문법 검사:
```
nginx -t
```

---
# 7. 유지보수 가이드
## ✔ Backup 필요 항목
- config/.env
- logs DB

## ✔ 업데이트 방법
1) 새로운 backend, worker 소스 제공 시:
```
npm install
npm run build
pm2 restart all
```
2) frontend 업데이트 시:
```
npm run build
build 폴더만 교체
nginx -s reload
```

---
# 8. 다음 문서
- Windows 설치 매뉴얼
- 운영자 매뉴얼 (UI 사용법)
- API 명세서
- 배포 자동화 스크립트