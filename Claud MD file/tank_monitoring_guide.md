# 운영 환경 모니터링 문서 (Operational Monitoring Guide v1)
본 문서는 Tank 자동 이메일 시스템을 **고객사 온프레미스 환경에서 안정적으로 운영하기 위해 필요한 전체 모니터링 정책과 절차**를 정의합니다.

대상 모듈:
- Frontend (Nginx)
- Backend (NestJS API)
- Worker Engine (Scheduler + Email Processor)
- Oracle DB 연결 상태
- File Storage 접근 상태
- AWS SES 발송 상태 / 한도(Limit)
- 시스템 자원(CPU, RAM, Disk)
- PM2 프로세스 상태

---
# 1. 모니터링 목적
- 장애 조기 발견
- 메일 발송 실패 예방
- SES 한도 초과 방지
- 파일 매칭 오류 추적
- 장기 운영 안정성 확보

---
# 2. 전체 모니터링 구조 (요약)
```
[PM2] → Backend/Worker 프로세스 상태 감시
[Health Check API] → 서버 실시간 상태 확인
[Nginx Status] → 프론트엔드 운영 지표
[Logs DB] → 발송 성공/실패 분석
[OS Monitoring] → CPU/RAM/Disk 확인
[SES Metrics] → AWS SES 콘솔 지표 확인
```

---
# 3. PM2 기반 프로세스 모니터링
Tank 시스템의 핵심 프로세스는 PM2로 관리됩니다.

## ✔ PM2 프로세스 확인
```
pm2 list
```
### 정상 상태 예:
```
backend   online
worker    online
```

## ✔ 프로세스 로그 확인
```
pm2 logs backend
pm2 logs worker
```

## ✔ 비정상 상태 처리
| 상태 | 조치 |
|------|------|
| stopped | pm2 start 재실행 |
| errored | 로그 확인 후 재시작 |
| restarting loop | .env 또는 코드 오류 가능 |

## ✔ 자동 재시작 설정(필수)
```
pm2 startup
pm2 save
```

---
# 4. Health Check API 모니터링
Backend는 헬스체크 API 제공:
```
GET /api/health
```
정상 응답:
```
{ "status": "ok" }
```

### 자동화 스케줄
- 1분 간격 cron 또는 외부 모니터링 도구로 호출
- 응답 없음 → Backend 다운 또는 네트워크 오류 가능

---
# 5. Scheduler / Worker 상태 감시
## ✔ Scheduler 확인
Scheduler는 자동으로 Job을 생성하므로 다음 로그 확인:
```
pm2 logs worker | grep "Scheduler"
```

## ✔ Worker 상태 확인
- "Processing job" 로그 반복 → 정상
- Error 로그 반복 → DB/파일/SES 문제

## ✔ Automation 실행 간격 확인
LogsDB의 AUTO_RUN_LOG를 조회
```
RUN_ID / STATUS / START_AT / END_AT
```
정상 패턴인지 주기적으로 점검.

---
# 6. Oracle DB 연결 상태 모니터링
## ✔ Backend 로그에서 Oracle 오류 감지
```
ORA-12514
ORA-28009
Connection Timeout
```
오류 유형별 원인은 다음과 같음:

| 오류 | 설명 | 해결 |
|------|------|--------|
| ORA-12514 | SID/Service Name 오류 | DB 포트/Listener 확인 |
| ORA-28009 | 계정 권한 부족 | DB 계정 권한 수정 |
| Timeout | 네트워크 차단 | 방화벽 검증 |

## ✔ 정기적 테스트
Automation의 "Connect Test" 기능으로 테스트.

---
# 7. 파일 스토리지(NAS/Local) 모니터링
## ✔ 접근 권한 확인
첨부파일 매칭 오류 발생 시 가장 흔한 원인:
- NAS 경로 변경
- 서버에서 권한 제거(Read Only 불가)
- 네트워크 드라이브 분리됨

## ✔ 파일 매칭 로그 확인
```
ATTACHMENT_LOG
STATUS = NOT_FOUND / INVALID / DUPLICATED
```

## ✔ 파일 용량 모니터링
- Disk 80% 이상 → 배치 파일 저장 실패 위험

---
# 8. AWS SES 모니터링
## ✔ 발송 한도 (Sending Limits)
AWS 콘솔 → SES → Sending Statistics

확인 항목:
- **Daily Sending Quota** (예: 50,000 emails/day)
- **Max Send Rate** (예: 14 mails/sec)
- Bounce/Complaint 비율

## ✔ Metric 모니터링 규칙
| 지표 | 기준 | 위험 |
|---------|--------|--------|
| Bounce | 5% 미만 | 10% 이상 위험 |
| Complaint | 0.1% 미만 | 1% 이상 위험 |
| Rejected | 거의 0% | 5% 이상 문제 |

## ✔ 발송 실패 증가 시 점검
- SES 권한 키 만료
- 이메일 주소 품질 문제
- Rate Limit 초과

---
# 9. OS 시스템 자원 감시
## ✔ CPU 사용률
```
top
```
80% 이상 지속 → Worker 병렬 처리 조정 필요

## ✔ 메모리 사용률
메모리가 부족하면 Worker가 중단될 수 있음

## ✔ Disk 사용률
```
df -h
```
NAS / 로컬 디렉토리 80% 이상 → 배치 파일 저장 문제 가능

---
# 10. Nginx 상태 모니터링
## ✔ Nginx 재시작 여부 확인
```
systemctl status nginx
```
문제 발생 시:
```
nginx -t
nginx -s reload
```

## ✔ 웹 화면 정상 로딩 여부
프론트가 로드 안 될 경우:
- React build 파일 손상
- 권한 문제
- 포트 충돌

---
# 11. LogsDB 모니터링
LogsDB는 시스템 전체의 상태를 반영하므로 필수 모니터링 대상.

## ✔ Email Send Log 증가 패턴 확인
갑자기 FAIL 증가 → Worker/SES/DB 문제 가능

## ✔ Attachment Log 분석
- NOT_FOUND 증가 → NAS 문제
- INVALID 증가 → 파일 손상 또는 배치 오류

## ✔ System Error Log 분석
```
MODULE = DBIO / TEMPLATE / SES / WORKER
```
특정 MODULE에서 반복되면 해당 영역 장애.

---
# 12. 모니터링 자동화 추천 도구
환경에 따라 아래 도구 연결 권장.

| 도구 | 기능 |
|------|-------|
| PM2 monit | Node 프로세스 실시간 모니터링 |
| Grafana | CPU/RAM/Disk + 로그 시각화 |
| Prometheus | Metric 수집 |
| Kibana | 로그 분석 |
| UptimeRobot | Health Check API 모니터링 |

---
# 13. 장애 대응 빠른 점검표
```
1) Backend 응답 없음 → pm2 status 확인
2) Template Error → TEMPLATE_LOG 확인
3) 첨부파일 없음 → NAS 경로/권한 점검
4) SES 발송 오류 → SES 콘솔에서 Metric 확인
5) DB 연결 실패 → Oracle Listener / 네트워크 점검
6) Worker 멈춤 → pm2 restart worker
7) CPU 100% → 병렬 처리 수 감소
```

---
# 14. 다음 문서
- AWS SES 운영 및 튜닝 가이드
- 장애 대응 매뉴얼 (Troubleshooting Guide)
- 성능 테스트 매뉴얼 (Load Test Guide)

