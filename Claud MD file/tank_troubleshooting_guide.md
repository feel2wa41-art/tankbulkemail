# 장애 대응 매뉴얼 (Troubleshooting Guide v1)
본 문서는 Tank 자동 이메일 시스템 운영 중 발생할 수 있는 **모든 주요 장애 상황에 대한 원인 → 점검 → 해결 → 방지** 절차를 일관된 구조로 정리한 매뉴얼입니다.

온프레미스 Oracle / NAS / AWS SES / Node.js / Nginx 등 다양한 구성 요소가 연결된 하이브리드 시스템이므로, 장애 대응 절차의 표준화는 운영 안정성에 매우 중요합니다.

---
# 1. 장애 대응 개요
Tank 시스템 장애는 아래 7개의 영역으로 분류됩니다:
```
1) Backend 장애 (NestJS)
2) Worker/Scheduler 장애
3) Oracle DB 연결 오류
4) 첨부파일 매칭 오류
5) AWS SES 발송 오류
6) Frontend(Nginx) 관련 오류
7) 시스템(서버/네트워크/디스크) 장애
```
각 장애는 반드시 로그 기반으로 추적 가능하며, 모든 로그는 Logs DB 또는 PM2 logs에 저장됩니다.

---
# 2. 장애 발생 시 공통 점검 순서 (필수)
가장 먼저 아래 순서를 따릅니다:
```
1) pm2 status
2) Backend Health API 확인 (/api/health)
3) Worker 로그 확인
4) Oracle 연결 테스트 실행
5) 첨부파일 존재 여부 확인
6) SES 발송 오류 로그 확인
7) OS 자원 확인 (CPU/RAM/Disk)
```
이 7가지만 확인해도 전체 장애의 90% 이상을 진단할 수 있습니다.

---
# 3. Backend 장애 대응
### 증상
- 화면 접속은 되지만 기능 실행이 안 됨
- 500 Internal Server Error 발생
- /api/health 응답 없음

### 점검 절차
```
pm2 status backend
pm2 logs backend
```
로그에서 다음 오류를 확인합니다:
- NestJS Dependency Injection 오류
- .env 설정 오류
- 포트 충돌 (EADDRINUSE)

### 해결방법
- pm2 restart backend
- 포트 변경 후 재기동
- .env 파라미터 재확인 (DB, SES Key 등)

---
# 4. Worker/Scheduler 장애 대응
Worker는 핵심 엔진이므로 장애 확인이 중요합니다.

### 증상
- Automation 실행이 안 됨
- 메일 발송이 멈춤
- Scheduler가 Job을 생성하지 않음

### 점검 절차
```
pm2 status worker
pm2 logs worker
```
오류 유형:
- "Oracle connection failed"
- "SES send error"
- "File not found"
- "Template variable mismatch"

### 해결방법
- pm2 restart worker
- Oracle/NAS/SES 연결 상태 확인

---
# 5. Oracle DB 연결 오류 대응
### 증상
- Connect Test 실패
- Worker에서 대상자 조회 실패
- DBIO 쿼리 실행 시 오류

### 주요 오류
| ORA 코드 | 의미 |
|---------|-------|
| ORA-12514 | SID/Service Name 문제 |
| ORA-12170 | Timeout (방화벽/네트워크 차단) |
| ORA-28009 | 계정 권한 문제 |
| ORA-01017 | ID/PW 오류 |

### 해결방법
- DB 계정/비밀번호 확인
- LISTENER 상태 점검
- 방화벽에서 Oracle 포트(1521) 허용
- Instant Client 설치/환경변수 확인

---
# 6. 첨부파일 매칭 오류 대응
### 증상
- 파일 없음 (NOT_FOUND)
- 파일 2개 이상 중복 (DUPLICATED)
- 파일 손상됨 (INVALID)

### 점검 절차
1) NAS/로컬 경로 존재 여부 확인
```
ls /batch/report/AC/...
```
2) 파일 실제 존재 여부 확인
3) 파일명 대소문자 차이 확인
4) 경로 권한(Read Only 허용) 확인

### 해결방법
- 파일명 수정 또는 DB 값 수정
- 배치 스크립트 점검
- NAS 재마운트

### 방지 팁
- 파일 생성 배치에서 이름 규칙 표준화
- Worker에서 파일 pre-scan 기능 적용

---
# 7. AWS SES 발송 오류 대응
### 증상
- 이메일 발송 안 됨
- SES MessageRejected 오류
- Throttling 에러

### 주요 오류 유형
| 오류 | 설명 | 조치 |
|------|-------|-------|
| MessageRejected | 인증 문제 | SPF/DKIM 확인 |
| Throttling | Rate Limit 초과 | Worker 병렬 수 감소 |
| AccessDenied | IAM 권한 부족 | ses:SendEmail 권한 부여 |
| InvalidParameter | 이메일 주소 형식 문제 | 입력 데이터 검증 |

### 점검 절차
- AWS 콘솔 → SES → Sending Statistics 확인
- Bounce/Complaint 급증 여부 확인

---
# 8. Frontend(Nginx) 장애 대응
### 증상
- 화면 흰 화면(Blank Screen)
- 404 또는 502 오류

### 점검 절차
```
systemctl status nginx
nginx -t
```
### 주요 원인
- Nginx conf 문법 오류
- React build 파일 손상 또는 누락
- 포트 충돌

### 해결방법
```
systemctl restart nginx
```
React build 재배포

---
# 9. 시스템(OS) 장애 대응
### 확인 명령어
```
top
free -m
df -h
```
### 증상 및 해결
| 증상 | 원인 | 해결 |
|------|------|--------|
| CPU 100% | 병렬 처리 과도 | Worker 병렬 수 감소 |
| RAM 부족 | 대량 템플릿/파일 처리 | 서버 메모리 증설 |
| Disk 90% 이상 | 로그 및 첨부파일 누적 | 정기적 Log Rotate |

---
# 10. 장애 발생 시 공통 로그 분석 위치
```
/backend/logs/*.log
/worker/logs/*.log
NGINX: /var/log/nginx*
PM2: pm2 logs
LogsDB: EMAIL_SEND_LOG, ATTACHMENT_LOG, SYSTEM_ERROR_LOG
```

---
# 11. 장애 대응 프로세스 (표준)
```
1) 장애 감지 (Dashboard / Monitoring)
2) 1차 원인 분석 (LogsDB + PM2)
3) 영향도 분석 (전체/부분/특정부서)
4) 즉시 조치 (재시작/권한 수정/경로 수정 등)
5) 재발 방지 조치 실행
6) 원인보고 문서화
```

---
# 12. 긴급 복구(롤백) 절차
패키지 업데이트 중 문제 발생 시:
```
1) pm2 stop all
2) rm -rf /opt/tank-mail-app
3) mv /opt/tank-mail-app-backup-YYYYMMDDHHMM /opt/tank-mail-app
4) pm2 start backend
5) pm2 start worker
6) nginx -s reload
```

---
# 13. 장애 사전 예방 체크리스트
```
[Daily]
- Worker 로그 오류 확인
- Oracle 연결 상태 점검
- 파일 매칭 실패 증가 여부 확인
- SES Throttle 발생 여부

[Weekly]
- Bounce/Complaint 증가 확인
- Disk 용량 점검

[Monthly]
- IAM Key 변경 권고
- 템플릿 변수 무결성 검사
- NAS 경로 접근 테스트
```

---
# 14. 다음 문서
- 성능 테스트 매뉴얼 (Load Test Guide)
- 보안 강화 가이드(Securi