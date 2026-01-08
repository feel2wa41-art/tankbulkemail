# Backup & Recovery 가이드 (Backup & Disaster Recovery Guide v1)
본 문서는 Tank 자동 이메일 시스템을 고객사 온프레미스 환경에서 **데이터 손실 없이 안전하게 운영하기 위한 백업 및 복구 절차**를 정의한 문서입니다.

Tank 시스템은 Oracle DB와 직접 연동하고 첨부파일을 NAS 또는 로컬 스토리지에서 가져오며, 자체 LogsDB를 사용하기 때문에 **각 구성요소별 백업 전략 및 재해 복구(RDR) 절차**가 매우 중요합니다.

---
# 1. Backup & Recovery 대상 구성요소
Tank 시스템의 백업 대상은 아래 4개 영역으로 구분됩니다.

```
1) Application (Backend / Worker / Frontend)
2) Configuration (.env, 설정 파일)
3) LogsDB (발송 기록 DB)
4) File Storage (첨부파일 경로)
```

각 항목마다 백업 주기, 방법, 복구 절차를 상세히 기술합니다.

---
# 2. Application 백업
Application 코드는 **배포 패키지 단위**로 관리합니다.

## ✔ 2.1 백업 대상
```
/opt/tank-mail-app
  ├── backend/
  ├── worker/
  ├── frontend/
  ├── nginx/
  ├── config/.env (별도 백업)
```

## ✔ 2.2 백업 방법
```
tar -czvf tank-app-backup-$(date +%F).tar.gz /opt/tank-mail-app
```

## ✔ 2.3 백업 주기
- 배포 전 1회 필수
- 정기 백업: 주 1회

## ✔ 2.4 복구 절차
```
pm2 stop all
rm -rf /opt/tank-mail-app
tar -xzvf tank-app-backup-YYYYMMDD.tar.gz -C /opt/
pm2 start backend
pm2 start worker
nginx -s reload
```

---
# 3. Configuration(.env) 백업
`.env` 파일은 시스템 핵심 설정이므로 반드시 별도 백업해야 합니다.

## ✔ 3.1 백업 대상
```
/opt/tank-mail-app/config/.env
```

## ✔ 3.2 백업 방법
```
cp /opt/tank-mail-app/config/.env /backup/env/.env-$(date +%F)
```

## ✔ 3.3 백업 주기
- 변경 시마다 즉시 백업
- 최소 주 1회

## ✔ 3.4 복구 절차
```
cp /backup/env/.env-YYYYMMDD /opt/tank-mail-app/config/.env
pm2 restart all
```

---
# 4. LogsDB 백업
LogsDB는 발송기록/첨부파일 매칭 기록/오류로그를 저장하는 핵심 DB입니다.

## ✔ 4.1 백업 대상 테이블
```
AUTO_RUN_LOG
EMAIL_SEND_LOG
ATTACHMENT_LOG
SYSTEM_ERROR_LOG
```

## ✔ 4.2 백업 주기
```
Daily Backup (1일 1회)
```
운영 데이터가 빠르게 쌓이므로 최소 하루에 1번 백업 필요.

## ✔ 4.3 백업 방법 예시 (MySQL/PostgreSQL)
### PostgreSQL
```
pg_dump -U tank logsdb > logsdb-$(date +%F).sql
```
### MySQL
```
mysqldump -u tank -p logsdb > logsdb-$(date +%F).sql
```

## ✔ 4.4 복구 절차
### PostgreSQL
```
dropdb logsdb
createdb logsdb
psql logsdb < logsdb-YYYYMMDD.sql
```
### MySQL
```
mysql -u tank -p logsdb < logsdb-YYYYMMDD.sql
```

---
# 5. File Storage 백업 (첨부파일)
첨부파일은 고객사 배치 시스템에서 생성되며 NAS 또는 로컬에 저장됩니다.
Tank 시스템 특성상 파일 누락 시 이메일 발송 실패가 발생하므로 **정기적인 파일 백업 필수**.

## ✔ 5.1 백업 대상
```
/batch/report/YYYY/MM/
```

## ✔ 5.2 백업 방법
```
rsync -av /batch/report/ /backup/report/
```

## ✔ 5.3 백업 주기
- 일일 배치가 있을 경우 → 매일
- 파일 생성량이 많을 경우 → 하루 2~3회도 가능

## ✔ 5.4 복구 절차
```
rsync -av /backup/report/YYYYMMDD/ /batch/report/
```

---
# 6. Full Server Backup (전체 서버 이미지 백업)
고객사 정책에 따라 전체 서버 이미지 백업을 사용할 수 있습니다.

## ✔ 권장 도구
- Veeam
- Acronis
- VMware Snapshot
- Hyper-V Checkpoint

## ✔ 백업 주기
- 월 1~2회

## ✔ 복구 절차
- Snapshot 복귀 또는 Disk Image Restore

---
# 7. DR (재해 복구) 절차
복구 절차(Disaster Recovery)는 아래 순서로 진행됩니다.

```
1) Oracle DB 정상 복귀 확인
2) NAS/파일서버 복원 확인
3) LogsDB 복원
4) .env 복원
5) Application 복원
6) Backend/Worker 기동
7) Nginx 기동
8) 전체 기능 테스트 (Automation 테스트)
```

---
# 8. 백업/복구 테스트 절차 (필수)
분기마다 아래 테스트를 실행하여 백업과 복구가 정상적으로 동작하는지 검증합니다.

### ✔ 테스트 항목
```
1) LogsDB 복구 테스트
2) 첨부파일 복구 테스트
3) Worker/Test Trigger 발송 테스트
4) 스케줄 정상 동작 확인
5) Template 정상 로딩 확인
```

---
# 9. 백업 보관 정책
```
Daily Backup: 7일 보관
Weekly Backup: 4주 보관
Monthly Backup: 6개월~1년 보관
```

---
# 10. 백업 보안 정책
- 백업 파일은 반드시 별도 서버 또는 외부 스토리지에 보관
- SFTP 등 암호화된 채널로만 백업 전송
- 백업 파일의 접근 권한 최소화
- 백업 파일 암호화 권장 (AES256)

---
# 11. Backup Checklist
```
[Daily]
- LogsDB 백업 완료 여부 확인
- NAS 파일 백업 여부 확인

[Weekly]
- .env 변경사항 백업
- Application 백업

[Monthly]
- DR 테스트 1회 수행
```

---
# 12. 다음 문서
- Batch 파일 생성 가이드 (배치 생성 시스템 포함 시 작성)
- 운영자 교육 문서(Optional)
- 변경 관리(Change Management) 프로세스(Optional)

