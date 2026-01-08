# Automation(대량메일 자동화) 상세 기획 문서 — (v1)
본 문서는 **DBIO Register → 템플릿 매핑 → 첨부파일 매칭 → SES 발송 → Update Query → 로그 저장**까지
전체 자동화 로직을 개발자가 그대로 구현할 수 있게 정리한 상세 문서입니다.

---

# 1. Automation 개요
Automation은 조직별로 생성되는 **대량 이메일 발송 규칙 세트**입니다.
구성 요소는 다음 네 가지로 이루어집니다.

1) **DBIO Register** (DB에서 어떤 값을 어떻게 가져올지 정의)
2) **Email Info 설정** (제목/발신자/언어 등)
3) **Template Settings** (HTML 템플릿 + 변수 치환)
4) **Email Sending Settings** (스케줄러)

Automation은 항상 아래 루프에서 동작합니다:
```
for each recipient in QueryTargetList:
    Load mapping values
    Apply to template
    Find attachment file
    Send Email(SES)
    Execute update query
```

---

# 2. DBIO Register (핵심 모듈)
DBIO Register는 외부 Oracle DB에서 가져올 데이터의 구조를 정의합니다.

## ✔ 2.1 Query Target List (필수)
받는 사람 목록을 가져오는 쿼리.
반드시 아래 컬럼 포함:
- Recipient Email
- Attach File Name (선택)
- Primary Key (Update Query용)

예:
```sql
SELECT CUST_ID, EMAIL_ADDR, ATTACH_FILE
FROM MTI_CUSTOMER
WHERE STATUS='ACTIVE'
```

## ✔ 2.2 Simple Mapping Query
템플릿에서 필요한 변수값 가져오는 쿼리.
```sql
SELECT NAME, BALANCE
FROM MTI_CUSTOMER_DETAIL
WHERE CUST_ID = ?
```

## ✔ 2.3 TEXT Column(CLOB)
대형 메시지(약관, 공지문 등)에 사용.
```sql
SELECT TERMS_HTML FROM MTI_TERMS WHERE TERMS_ID = ?
```

## ✔ 2.4 List Mapping
리스트 형태(여러 상품, 거래내역 등):
```sql
SELECT PRODUCT_NAME, PRICE
FROM MTI_PRODUCTS WHERE CUST_ID = ?
```

## ✔ 2.5 Update Query (선택아님) — 발송 완료 업데이트
```sql
UPDATE MTI_CUSTOMER
SET SEND_YN='Y', SEND_DATE=SYSDATE
WHERE CUST_ID = ?
```

---

# 3. Basic Email Information
템플릿 외 이메일 형식 관련 기본값.

| 필드 | 설명 |
|------|-------|
| Automation Topic | 자동화 이름 |
| Sender Email | 발신자 이메일 |
| Sender Name | 발신자 표시 이름 |
| Return Email | 반송 이메일 |
| Subject | 제목(변수 포함 가능) |
| Language | UTF-8 고정 |

Subject 예:
```
$(NAME)님의 3월 거래명세서 안내드립니다.
```

---

# 4. Incoming Mail Settings (수신자/첨부 설정)
## ✔ Recipient
필수 매핑 대상
```
$(RCR_EMAIL_ADDR)
```
→ Query Target List의 이메일 컬럼과 연결

## ✔ Attachment
첨부파일 매핑 값
```
$(ATTACH1)
```
Template에는 포함되지 않음 → 실제 메일 발송 로직에서만 사용

---

# 5. Template Settings (HTML)
HTML 템플릿을 직접 입력하는 화면.

## ✔ 5.1 HTML 코드 입력
예:
```html
<html>
<body>
    <p>안녕하세요, $(NAME)님</p>
    <p>이번달 거래 금액은 $(BALANCE)입니다.</p>
</body>
</html>
```

## ✔ 5.2 변수 매핑 규칙
- 변수명은 $(VARIABLE) 형태
- Simple Mapping Query 결과와 동일한 이름 필요
- 오타 시 경고창: "템플릿 변수 $(NAM) 는 매핑되지 않았습니다."

## ✔ 5.3 Preview 기능
- 모든 값 저장 후에만 Preview 가능
- index=1 기준으로 샘플 렌더링

---

# 6. 첨부파일 매칭 로직
DB Target List에서 가져온 첨부파일 이름을 기반으로 매칭.

## ✔ 6.1 첨부파일 경로 구조 (선택)
```
/local/batch/report/AC/statement/YYYYMMDD/
```
또는
```
/s3/bucket/path/
```

## ✔ 6.2 매칭 알고리즘
```
ATTACH_FILE_NAME = 'BAC04...xls'
→ 스토리지에서 동일 파일명 검색
→ 있으면 attach[] 배열에 추가
→ 없으면 Log 기록 + Skip 또는 Warning
```

## ✔ 6.3 오류 처리
- 파일 없음 → Warning + Log 저장
- 파일명 Null → Skip
- 권한 없음 → Error → Retry 가능

---

# 7. Email Sending Settings (스케줄)
Automation 실행 주기.

### ✔ Real-time
저장 즉시 실행

### ✔ Daily
매일 지정 시간 발송

### ✔ Weekly
요일 + 시간 설정

### ✔ Monthly
매월 N일 + 시간 설정

### ✔ 쿼리 반복 실행 옵션
| 옵션 | 설명 |
|------|-------|
| 신규 고객만 발송 | 이전에 Update Query가 안 된 고객만 |
| 모든 고객 발송 | 전체 대상 발송 |
| 1회성 발송 | 지정 기간 내 한 번만 |

---

# 8. Automation 실행 프로세스 (엔진 내부)
```
RUN AUTOMATION
→ Run Query Target List
→ For Each Row:
      Run Mapping Queries
      Apply Template HTML
      Match Attachment
      Send Email (SES)
      Run Update Query
      Write Log
→ Save Summary Result
```

---

# 9. 오류 처리 플로우
| 오류 | 처리 |
|------|--------|
| DB Connection Fail | 즉시 중단 + Log |
| Template 변수 누락 | 중단 + 사용자 Alert |
| 첨부파일 없음 | Warning + Log 후 진행 선택 |
| SES Limit 초과 | Retry Queue → Failover |

---

# 10. 자동화 데이터 구조
```
AUTOMATION
    AUTO_ID
    ORG_ID
    NAME
    STATUS
    LAST_RUN
    NEXT_RUN
    CREATED_AT
    UPDATED_AT
```

---

# 11. 다음 문서
- 조직 관리 문서
- 템플릿 변수 매핑 문서(추가 예정)
- 스케줄러/Worker 엔진 문서(추가 예정)
- 리포트/로그 구조 문서

