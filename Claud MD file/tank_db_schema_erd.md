# ERD & DB 스키마 정의서 (Database Schema Specification v1)
본 문서는 Tank 자동 이메일 시스템의 **전체 데이터베이스 스키마(테이블 정의)와 ERD 관계 구조**를 정리한 공식 기술 문서입니다.

해당 스키마는 설치형(On-Prem) 기준이며, LogsDB는 PostgreSQL/MySQL 사용을 권장합니다.
Automation / Scheduler / Logs / Organization 등 모든 기능에 필요한 테이블을 포함합니다.

---
# 1. 전체 ERD 요약 (텍스트 기반)
```
ORG_GROUP (1) ─── (N) AUTOMATION ─── (1) SCHEDULER
        │                 │
        │                 └── (N) TEMPLATE
        │                 └── (N) DBIO_TARGET
        │                 └── (N) DBIO_MAPPING
        │                 └── (N) DBIO_UPDATE
        │                 └── (N) EMAIL_SEND_LOG
        │                 └── (N) ATTACHMENT_LOG
        │                 └── (N) AUTO_RUN_LOG
        
USERS ─── (N) ORG_GROUP (권한 기반)
```

---
# 2. 조직 테이블 (ORG_GROUP)
```
ORG_GROUP
---------------------------------------
ORG_ID            BIGINT PK
ORG_NAME          VARCHAR(100)
DESCRIPTION       VARCHAR(300)
USE_YN            CHAR(1) DEFAULT 'Y'
CREATED_AT        DATETIME
UPDATED_AT        DATETIME
```
설명: 조직 단위로 Automation을 묶어 관리.

---
# 3. 사용자(User) 테이블
```
USERS
---------------------------------------
USER_ID           BIGINT PK
USER_NAME         VARCHAR(100)
USER_EMAIL        VARCHAR(200)
PASSWORD_HASH     VARCHAR(300)
ROLE              VARCHAR(20)  -- admin/operator/viewer
USE_YN            CHAR(1)
CREATED_AT        DATETIME
UPDATED_AT        DATETIME
```

---
# 4. 조직-사용자 매핑 (선택)
```
ORG_USER
---------------------------------------
MAPPING_ID        BIGINT PK
ORG_ID            BIGINT FK
USER_ID           BIGINT FK
ROLE              VARCHAR(20)
```

---
# 5. Automation 테이블
```
AUTOMATION
---------------------------------------
AUTO_ID           BIGINT PK
ORG_ID            BIGINT FK
AUTO_NAME         VARCHAR(200)
STATUS            VARCHAR(20)   -- ACTIVE, PAUSED, INACTIVE
LAST_RUN_AT       DATETIME
NEXT_RUN_AT       DATETIME
CREATED_AT        DATETIME
UPDATED_AT        DATETIME
```

---
# 6. DBIO 설정 테이블
Automation의 핵심 기능(DB 쿼리 설정 구성)입니다.

## 6.1 대상자 조회 쿼리 (Target)
```
DBIO_TARGET
---------------------------------------
TARGET_ID         BIGINT PK
AUTO_ID           BIGINT FK
QUERY_TEXT        TEXT
APPEND_MODE       CHAR(1)      -- Y/N
CREATED_AT        DATETIME
UPDATED_AT        DATETIME
```

## 6.2 매핑 쿼리 (Mapping)
```
DBIO_MAPPING
---------------------------------------
MAP_ID            BIGINT PK
AUTO_ID           BIGINT FK
QUERY_TEXT        TEXT
MAP_TYPE          VARCHAR(20)  -- SIMPLE, LIST, TEXT
CREATED_AT        DATETIME
UPDATED_AT        DATETIME
```

## 6.3 Update Query
```
DBIO_UPDATE
---------------------------------------
UPDATE_ID         BIGINT PK
AUTO_ID           BIGINT FK
QUERY_TEXT        TEXT
CREATED_AT        DATETIME
UPDATED_AT        DATETIME
```

---
# 7. Template 테이블
```
TEMPLATE
---------------------------------------
TEMPLATE_ID       BIGINT PK
AUTO_ID           BIGINT FK
HTML_CONTENT      LONGTEXT
VALID_YN          CHAR(1)
UPDATED_BY        BIGINT FK (USERS)
UPDATED_AT        DATETIME
```

---
# 8. Email Settings
```
EMAIL_SETTING
---------------------------------------
SETTING_ID        BIGINT PK
AUTO_ID           BIGINT FK
SENDER_EMAIL      VARCHAR(200)
SENDER_NAME       VARCHAR(100)
RETURN_EMAIL      VARCHAR(200)
SUBJECT_TEMPLATE  VARCHAR(500)
LANGUAGE          VARCHAR(20) DEFAULT 'UTF-8'
UPDATED_AT        DATETIME
```

---
# 9. Scheduler 테이블
```
SCHEDULER
---------------------------------------
SCHEDULER_ID      BIGINT PK
AUTO_ID           BIGINT FK
TYPE              VARCHAR(20)  -- REALTIME, DAILY, WEEKLY, MONTHLY
DAY               INT NULL     -- 월/주
HOUR              INT
MINUTE            INT
STATUS            VARCHAR(20) DEFAULT 'ACTIVE'
CREATED_AT        DATETIME
UPDATED_AT        DATETIME
```

---
# 10. Automation 실행 로그 (AUTO_RUN_LOG)
```
AUTO_RUN_LOG
---------------------------------------
RUN_ID            BIGINT PK
AUTO_ID           BIGINT FK
ORG_ID            BIGINT FK
START_AT          DATETIME
END_AT            DATETIME
STATUS            VARCHAR(20)   -- SUCCESS, FAIL, PARTIAL
TOTAL_TARGET      INT
SUCCESS_COUNT     INT
FAIL_COUNT        INT
FILE_ERROR_COUNT  INT
DB_ERROR_COUNT    INT
SES_ERROR_COUNT   INT
MESSAGE           TEXT
```

---
# 11. 이메일 발송 로그 (EMAIL_SEND_LOG)
```
EMAIL_SEND_LOG
---------------------------------------
SEND_ID           BIGINT PK
RUN_ID            BIGINT FK
AUTO_ID           BIGINT FK
ORG_ID            BIGINT FK
CUST_ID           VARCHAR(200)
EMAIL             VARCHAR(200)
SUBJECT           VARCHAR(500)
ATTACH_FILE_NAME  VARCHAR(300)
STATUS            VARCHAR(20)   -- SUCCESS, FAIL
ERROR_TYPE        VARCHAR(50)
ERROR_MESSAGE     TEXT
SES_MESSAGE_ID    VARCHAR(300)
UPDATE_QUERY_OK   CHAR(1)
SEND_AT           DATETIME
```

---
# 12. 첨부파일 로그 (ATTACHMENT_LOG)
```
ATTACHMENT_LOG
---------------------------------------
LOG_ID            BIGINT PK
RUN_ID            BIGINT FK
AUTO_ID           BIGINT FK
ORG_ID            BIGINT FK
CUST_ID           VARCHAR(200)
FILE_NAME         VARCHAR(300)
STATUS            VARCHAR(20) -- FOUND, NOT_FOUND, DUPLICATED, INVALID
MESSAGE           TEXT
CREATED_AT        DATETIME
```

---
# 13. 시스템 오류 로그 (SYSTEM_ERROR_LOG)
```
SYSTEM_ERROR_LOG
---------------------------------------
ERROR_ID          BIGINT PK
AUTO_ID           BIGINT FK NULL
ORG_ID            BIGINT FK NULL
MODULE            VARCHAR(50)
ERROR_MESSAGE     TEXT
STACK_TRACE       TEXT
CREATED_AT        DATETIME
```

---
# 14. SES 이벤트 로그 (선택)
```
SES_EVENT_LOG
---------------------------------------
EVENT_ID          BIGINT PK
EMAIL             VARCHAR(200)
TYPE              VARCHAR(20)  -- BOUNCE, COMPLAINT
DETAIL            TEXT
RECEIVED_AT       DATETIME
```

---
# 15. 관계 요약
| Parent | Child |
|--------|--------|
| ORG_GROUP | AUTOMATION |
| AUTOMATION | TEMPLATE |
| AUTOMATION | DBIO_TARGET |
| AUTOMATION | DBIO_MAPPING |
| AUTOMATION | DBIO_UPDATE |
| AUTOMATION | SCHEDULER |
| AUTO_RUN_LOG | EMAIL_SEND_LOG |
| AUTO_RUN_LOG | ATTACHMENT_LOG |

---
# 16. 다음 문서
- 전체 Sequence Diagram
- 배포 자동화 스크립트

