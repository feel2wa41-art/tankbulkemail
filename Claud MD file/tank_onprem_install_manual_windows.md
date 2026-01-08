# Windows 설치 매뉴얼 (On-Premise Installation Guide for Windows v1)
본 문서는 Tank 자동 이메일 시스템을 **Windows Server 환경**에 설치하기 위한 공식 설치 매뉴얼입니다.
Windows Server 2016~2022 환경을 기준으로 작성되었으며, 고객사 온프레미스 설치형 납품 시 그대로 사용 가능합니다.

본 문서는 실제 운영 환경에서 개발자/인프라 담당자가 그대로 수행할 수 있도록 단계별로 작성되었습니다.

---
# 1. 설치 구성요소
Windows 배포 패키지 구성은 다음과 같습니다:
```
/tank-mail-app-windows
│
├── frontend/           # React Build 결과물
├── backend/            # NestJS API 서버 (Node.js)
├── worker/             # Worker 엔진
├── nginx/              # Nginx Windows 실행 파일 및 설정
├── config/             # 환경변수(.env.example)
├── start.bat           # 전체 서비스 시작 스크립트
└── stop.bat            # 전체 종료 스크립트
```

---
# 2. 시스템 요구사항
## ✔ Windows 버전
- Windows Server 2016 / 2019 / 2022
- Windows 10 / 11 (테스트 환경)

## ✔ 필수 설치 프로그램
1) Node.js 18+ (LTS 권장)  
2) Oracle Instant Client for Windows  
3) Nginx for Windows (패키지에 포함)  
4) PowerShell 5.1+ (기본 포함)  

## ✔ 포트 사용
| 포트 | 설명 |
|------|------|
| 80/443 | 프론트엔드 접속용 (Nginx) |
| 3000 | Backend API |
| 3001 | Worker 엔진(optional) |

---
# 3. 설치 절차 (Windows)
모든 절차는 **관리자 권한(Administrator)** 으로 실행되어야 합니다.

---
## Step 1. 압축 해제
다운로드한 패키지를 원하는 위치에 압축 해제:
```
C:\tank-mail-app-windows
```

폴더 구조 확인:
```
C:\tank-mail-app-windows\frontend
C:\tank-mail-app-windows\backend
C:\tank-mail-app-windows\worker
...
```

---
## Step 2. 환경변수 파일(.env) 생성
```
C:\tank-mail-app-windows\config\.env
```
아래는 예시:
```
ORACLE_HOST=10.0.0.12
ORACLE_PORT=1521
ORACLE_USER=MTI
ORACLE_PASS=****
ORACLE_SID=ORCL

AWS_ACCESS_KEY=AKIA...
AWS_SECRET_KEY=...
AWS_REGION=ap-southeast-1

FILE_ROOT_PATH=C:\\batch\\report
```

※ Windows 경로는 반드시 이스케이프(\\) 두 번 사용

---
## Step 3. Oracle Instant Client 설치
1. Instant Client ZIP 다운로드 후:
```
C:\oracle\instantclient_19_19
```
2. 환경변수 추가: 시스템 환경변수에 등록
```
ORACLE_HOME=C:\oracle\instantclient_19_19
PATH=C:\oracle\instantclient_19_19;%PATH%
```
3. 서버 재부팅 권장

---
## Step 4. Backend 의존성 설치
PowerShell에서:
```
cd C:\tank-mail-app-windows\backend
npm install
npm run build
```

---
## Step 5. Worker 의존성 설치
```
cd C:\tank-mail-app-windows\worker
npm install
npm run build
```

---
## Step 6. Frontend 배포 준비
React build 결과물은 이미 `/frontend/build` 안에 포함됩니다.
Nginx 설정파일:
```
/tank-mail-app-windows/nginx/conf/nginx.conf
```
필요 시 server_name 수정 가능.

---
## Step 7. start.bat 실행
루트 디렉토리에서 다음 실행:
```
start.bat
```

### start.bat는 다음 작업을 수행함:
- Backend 실행
- Worker 실행
- Nginx 실행

---
# 4. 서비스 관리
## ✔ 전체 종료
```
stop.bat
```

## ✔ 개별 서비스 종료
### Backend 종료
PowerShell에서:
```
Get-Process node | Stop-Process
```

### Nginx 종료
```
nginx -s stop
```

---
# 5. 설치 후 점검 체크리스트
| 항목 | 정상 기준 |
|------|-----------|
| 프론트엔드 접속 | http://localhost 에 접속 가능 |
| Backend API | http://localhost:3000/api/health 정상 응답 |
| Oracle 연결 | DB Profile → Connect Test 성공 |
| 템플릿 저장 | 정상 저장 가능 |
| 스케줄러 | 자동 스케줄 등록 시 실행 로그 생성 |
| 첨부파일 | 첨부파일 매칭 성공 |
| 이메일 발송 | 테스트 메일 수신 성공 |

---
# 6. 오류 발생 시 대응
## ✔ Node.js 실행 오류
- 관리자 권한으로 PowerShell 실행 필요
- .env 파일 누락 확인

## ✔ Oracle 연결 실패
- Instant Client 설치 여부 확인
- 환경변수 PATH 등록 여부 확인
- SID/PORT/IP 확인

## ✔ SES 발송 오류
- Windows 방화벽 Outbound 443 차단 여부 확인
- 고객사 네트워크 보안장비에서 AWS SES 주소 허용 필요

## ✔ Nginx 80포트 충돌
```
netstat -ano | findstr :80
```
→ 다른 서비스 IIS 등이 포트 점유 중일 수 있음

---
# 7. 유지보수
## ✔ 업데이트 방법
### Backend 업데이트
```
npm install
npm run build
stop.bat
start.bat
```

### Frontend 업데이트
```
npm run build
↓
build 폴더 교체
nginx -s reload
```

---
# 8. 백업 대상
- config/.env
- backend 및 worker 로그
- 리포트/로그 DB

---
# 9. 다음 문서
- 운영자 매뉴얼 (UI 사용 매뉴얼)
- API 명세서
- ERD & DB 스키마 정의서