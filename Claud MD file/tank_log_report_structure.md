# 발송 로그 / 리포트 구조 상세 문서 (Log & Report Specification v1)
본 문서는 자동 이메일 시스템에서 발생하는 **모든 로그 저장 규칙**과
운영자가 웹 대시보드에서 확인할 수 있는 **리포트(Report) 구조**를 기술한 문서입니다.

대량 발송 시스템에서는 오류 발생 원인 추적·발송 성공률 관리·첨부파일 문제 파악이 핵심이므로
로그 체계는 매우 중요하며, 이 문서는 Claude 개발자가 그대로 구현할 수 있는 수준으로 상세화했습니다.

---
# 1. 로그 / 리포트 목적
## ✔ 운영 관점:
- 발송 성공/실패 원인 파악
- 재발송 대상 고객 선별
- 첨부파일 문제 확인
- AWS SES 발송 한도 모니터링

## ✔ 기술 관점:
- 장애 발생 시 재현 가능성 확보
- Update Query 실패 추적
- 템플릿 오류 로그 수집

---
# 2. 주요 로그 종류
전체 로깅은 다음 네 가지로 나뉩니다:

| 종류 | 설명 |
|------|------|
| 1. Automation 실행 로그 | 전체 작업 단위 요약 |
| 2. 개별 이메일 발송 로그 | 고객별 발송 성공/실패 기록 |
| 3. 첨부파일 로그 | 파일 매칭 상태 기록 |
| 4. 시스템 에러 로그 | 템플릿 오류, DB 오류, SES 에러 등 |

---
# 3. Automation 실행 로그 구조
Automation이 실행될 때마다 1건 생성되는 최상위 로그.

```
AUTO_RUN_LOG
---------------------------------------
RUN_ID (PK)
AUTO_ID
ORG_ID
START_AT
END_AT
STATUS (SUCCESS, PARTIAL, FAIL)
TOTAL_TARGET
SUCCESS_COUNT
FAIL_COUNT
FILE_ERROR_COUNT
DB_ERROR_COUNT
SES_ERROR_COUNT
MESSAGE (요약)
```

## ✔ STATUS 규칙
| 상태 | 의미 |
|-------|-------|
| SUCCESS | 전체 고객 발송 성공 |
| PARTIAL | 일부 성공/일부 실패 |
| FAIL | 전체 실패 또는 중단 |

---
# 4. 개별 이메일 발송 로그 구조
각 고객별 발송 결과를 기록.

```
EMAIL_SEND_LOG
---------------------------------------
SEND_ID (PK)
RUN_ID (FK)
AUTO_ID
ORG_ID
CUST_ID
EMAIL
SUBJECT
ATTACH_FILE_NAME
SEND_AT
STATUS (SUCCESS, FAIL)
ERROR_TYPE
ERROR_MESSAGE
SES_MESSAGE_ID
UPDATE_QUERY_STATUS (Y/N)
```

## ✔ ERROR_TYPE 분류
| 코드 | 의미 |
|-------|------|
| FILE_NOT_FOUND | 첨부파일 없음 |
| TEMPLATE_ERROR | HTML 변수 오류 |
| SES_ERROR | AWS SES API 오류 |
| DB_ERROR | Update Query 실패 |
| UNKNOWN | 미분류 오류 |

---
# 5. 첨부파일 로그 구조
첨부파일 매칭 관련 모든 상태 기록.

```
ATTACHMENT_LOG
---------------------------------------
LOG_ID (PK)
RUN_ID (FK)
AUTO_ID
ORG_ID
CUST_ID
FILE_NAME
STATUS (FOUND, NOT_FOUND, DUPLICATED, INVALID)
MESSAGE
CREATED_AT
```

---
# 6. 시스템 에러 로그 구조 (전역)
템플릿 오류, DB 연결 실패, 스케줄 오류 등 시스템 수준 오류.

```
SYSTEM_ERROR_LOG
---------------------------------------
ERROR_ID (PK)
AUTO_ID
ORG_ID
MODULE (SCHEDULER, WORKER, DBIO, TEMPLATE, ATTACHMENT, SES)
ERROR_MESSAGE
STACK_TRACE
CREATED_AT
```

---
# 7. 리포트 화면 구조 (UI)
리포트는 세 가지 화면으로 구성됩니다.

## ✔ 7.1 Daily Summary Report
```
- 전체 발송량 (Total Send)
- 성공/실패 카운트
- 도메인별 성공률: gmail / yahoo / company.co.id 등
- 시간대별 발송량 그래프
- Error Type 분포 그래프
```

## ✔ 7.2 Automation 실행 기록 화면
```
RUN_ID / 일자 / 성공률 / 오류 수 / 상세보기 버튼
```
상세화면에서는 RUN_ID 기준으로 모든 EMAIL_SEND_LOG 조회.

## ✔ 7.3 고객별 발송 로그 조회
- Email 검색
- CUST_ID 검색
- 특정 Automation 필터

---
# 8. 리포트 계산 규칙
## ✔ 8.1 성공률 계산
```
SUCCESS_RATE = SUCCESS_COUNT / TOTAL_TARGET * 100
```

## ✔ 8.2 도메인별 성공률
EMAIL_SEND_LOG 의 EMAIL 도메인 분류

## ✔ 8.3 시간대별 발송량
SEND_AT 기준 HH 단위 group by

---
# 9. SES Bounce / Complaint 처리(optional)
SES SNS Feedback 처리할 상황을 대비한 구조:

```
SES_EVENT_LOG
---------------------------------------
EVENT_ID
EMAIL
TYPE (BOUNCE, COMPLAINT)
DETAIL
RECEIVED_AT
```

Automation 실행 로그와 연결할 필요는 없지만,
운영에서 매우 중요할 수 있어 옵션으로 남겨둡니다.

---
# 10. 로그 보관 정책
- EMAIL_SEND_LOG, ATTACHMENT_LOG: 12개월 보관
- SYSTEM_ERROR_LOG: 24개월 보관
- AUTO_RUN_LOG: 24개월 보관

고객사 정책에 따라 조정 가능.

---
# 11. Next Documents
- 온프레미스 Oracle + AWS SES 아키텍처 문서
- React/NestJS 프로젝트 구조 및 개발 표준 문서

