# 온프레미스 Oracle + AWS SES 하이브리드 아키텍처 상세 문서 (v1)
본 문서는 **고객사 온프레미스 환경의 Oracle DB + 로컬/NAS 파일 저장소 + AWS SES 발송 인프라**를 조합한 하이브리드 아키텍처를 명확하게 정의한 기술 문서입니다.

Tank 자동 이메일 솔루션은 온프레미스 환경과 클라우드 환경을 동시에 사용하기 때문에,
전체 아키텍처를 정확하게 정의해 두어야 유지보수·설치형 납품·보안 검토가 쉬워집니다.

---
# 1. 전체 아키텍처 개요
본 시스템은 크게 5개의 구성요소로 이루어짐:

1) **Front (React + Nginx)** – On-prem 또는 사내망
2) **Back-End (NestJS)** – On-prem 서버에서 실행
3) **On-premise Oracle DB** – 고객사 내부 DB
4) **On-prem File Storage (배치 파일 생성 경로)** – 로컬/NAS/Samba
5) **AWS SES (클라우드 이메일 발송)** – 외부 인터넷 경유

---
# 2. 전체 구조 다이어그램 (텍스트 기반)
```
┌──────────────────────────────┐
│        React Frontend        │
│        (Nginx Hosting)       │
└───────────────┬──────────────┘
                │ HTTP/HTTPS
                ▼
┌──────────────────────────────┐
│        NestJS Backend        │
│  Scheduler + Worker Engine   │
└───────────────┬──────────────┘
                │
      ┌─────────┼───────────────┬───────────────┐
      │         │               │               │
      ▼         ▼               ▼               ▼
┌────────┐  ┌────────────┐  ┌────────┐   ┌───────────────────┐
│OracleDB│  │ FileStorage │  │ LogsDB │   │     AWS SES       │
│On-Prem │  │ NAS/Local   │  │ On-Prem│   │(ap-southeast-1 etc)│
└────────┘  └────────────┘  └────────┘   └───────────────────┘
```

---
# 3. 구성 요소 상세

# ✔ 3.1 React Frontend (On-Prem, Nginx)
- 사용자 인터페이스(UI)
- Nginx로 정적파일 배포
- 고객사 내부망에서만 접근
- 모든 기능은 API(백엔드) 호출 기반

---
# ✔ 3.2 NestJS Backend (On-Prem)
시스템 핵심 로직을 모두 담당:

### ◼ 기능
- DBIO Register 실행
- Oracle Query 실행
- Template Mapping
- 첨부파일 매칭
- AWS SES 발송
- Update Query 반영
- Log 저장
- Scheduler 동작
- Worker 병렬 처리

### ◼ 환경 변수 기반 설정
```
DB_HOST=
DB_USER=
DB_PASS=
SES_REGION=ap-southeast-1
SES_ACCESS_KEY=
SES_SECRET_KEY=
FILE_ROOT_PATH=/batch/report/
```

---
# ✔ 3.3 Oracle DB (On-Premise)
- 고객사 내부 시스템 데이터
- 수신자 정보, 파일명, 고객코드 등 제공
- Update Query로 발송상태 업데이트

### ◼ 연결 방식
- Oracle Client / oracledb 라이브러리 사용
- Private IP 기반 연결

---
# ✔ 3.4 File Storage (On-Premise NAS or 로컬)
배치 서버에서 생성한 파일이 저장되는 경로.
대표 경로:
```
/batch/report/AC/statement/YYYYMMDD/
```
또는 윈도우:
```
\\NAS-01\mti\report\20250101\
```

### ◼ 역할
- DB에서 가져온 파일명과 실제 파일 매칭
- 첨부파일 Buffer 생성

### ◼ 보안
- Read-only 권한으로 마운트

---
# ✔ 3.5 AWS SES (Cloud)
온프레미스에서 외부 클라우드로 HTTP(S) 연결.

### ◼ 필요한 조건
- 고객사 방화벽에서 AWS SES 엔드포인트 443(Open)
```
ses.ap-southeast-1.amazonaws.com
email-smtp.ap-southeast-1.amazonaws.com
```

### ◼ 기능
- 이메일 메시지 발송
- 첨부파일 Base64 전달
- SES Message-ID 반환

### ◼ 고가용성
SES는 다중 가용영역으로 안정적이며,
온프레미스 시스템의 대량 발송을 클라우드가 처리하도록 위임.

---
# 4. 데이터 흐름 상세

## ✔ Step 1. 스케줄러가 Automation 감지
NestJS Scheduler → 스케줄 조건 충족 시 Worker 실행 job 생성

## ✔ Step 2. Worker가 직렬 또는 병렬 방식으로 작업 수행
```
1) Oracle DB Query Target
2) For each row:
      - Mapping Query 실행
      - Template 변수 치환
      - 첨부파일 매칭 (NAS/Local)
      - SES 발송
      - Update Query 실행
      - 로그 저장
```

## ✔ Step 3. AWS SES로 발송
- HTTPS API 호출
- 대량 발송 시 Rate Limit 제어

## ✔ Step 4. 로그 저장
- On-prem Logs DB에 저장
- 대시보드에서 조회 가능

---
# 5. 네트워크 구조
고객사 보안정책을 고려한 구조.

### ◼ 인바운드 (고객사 내부 → 서버)
- Front → Back: HTTP/HTTPS 80/443

### ◼ 아웃바운드 (서버 → AWS SES)
- HTTPS 443 **반드시 허용**
- SMTP 587 (선택적)

---
# 6. 보안 아키텍처
## ✔ 주요 보안 포인트
| 영역 | 설명 |
|------|------|
| Oracle DB | 내부망-only 접근, 외부 차단 |
| File Storage | 읽기 전용 권한 부여 |
| SES | API Key는 백엔드 서버에만 저장 |
| Frontend | 비밀번호 입력 시 암호화 |
| Logs DB | 개인정보 마스킹 옵션 |

## ✔ 비밀정보 저장 규칙
- .env 파일은 고객사 서버 내부에서만 관리
- React에는 SES 키를 절대 넣지 않음

---
# 7. 설치형(On-Premise) 배포 구조
설치형 납품은 다음 방식으로 이루어짐:

```
/tank-mail-app
    /frontend (React build)
    /backend (NestJS)
    /nginx
    /config
    start.sh / start.bat
```

### ◼ 실행 흐름
```
./start.sh → Nginx 시작 → React UI 제공
node dist/main.js → NestJS Engine 구동
```

---
# 8. Docker 기반 배포(선택)
고객사가 Docker 허용 시 가장 간단한 설치형 제공 가능

```
docker-compose up -d
```
구성 요소:
- React(Nginx)
- NestJS
- Logs DB(PostgreSQL)

---
# 9. 장점 분석
| 영역 | 장점 |
|------|------|
| 온프레미스 Oracle | 고객 데이터 외부 유출 없음 |
| AWS SES | 대량 이메일 안정적 처리 |
| 하이브리드 구조 | 보안 + 성능 균형 |
| React/NestJS | 유지보수 쉬움, 기능 확장 쉬움 |

---
# 10. 다음 문서
- React/NestJS 프로젝트 구조 및 개발 표준 문서

