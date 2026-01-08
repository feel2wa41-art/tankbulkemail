# 첨부파일 매칭 엔진 상세 문서 (Attachment Matching Engine v1)
본 문서는 자동 이메일 발송 과정에서 핵심 역할을 하는 **첨부파일 매칭 로직**을 개발자가 그대로 구현할 수 있도록 구조·규칙·알고리즘을 정리한 상세 명세서입니다.

Automation 엔진은 Oracle DB에서 가져온 파일명과 실제 파일 저장소(NAS, 로컬, S3 등)에서 생성된 배치 파일을 1:1로 정확히 매칭해야 하며, 이는 금융/명세서/과금 시스템의 필수 기능입니다.

---
# 1. 첨부파일 매칭의 목적
## ✔ 목적
```
DB에서 조회한 파일명 == 스토리지에 존재하는 파일명
```
이를 만족할 때만 해당 파일을 이메일에 첨부.

## ✔ 반드시 보장해야 할 사항
- 고객별 파일이 정확하게 매칭되어야 함
- 여러 파일이 존재해도 **정확히 하나만** 찾을 것
- 파일 없음 오류는 반드시 기록
- 파일 유효성(사이즈 0, 손상 등) 검사 필요

---
# 2. 시스템 내 파일 처리 범위
첨부파일 매칭은 다음 경로들에서 파일을 탐색할 수 있어야 함.

| 스토리지 종류 | 설명 |
|---------------|------|
| 로컬 디렉토리 | 온프레미스 배치 결과물이 저장되는 폴더 |
| NAS 공유 폴더 | 고객사 네트워크 드라이브(SMB/NFS) |
| AWS S3 | 클라우드 기반 배치 저장소 옵션 |

스토리지 타입은 조직 또는 Automation 설정에서 지정 가능.

---
# 3. DB 데이터 구조
첨부파일명은 Target Query에서 가져옵니다.
예:
```
SELECT
   CUST_ID,
   EMAIL_ADDR,
   ATTACH_FILE_NAME
FROM MTI_CUSTOMER
```

파일명 예시:
```
BAC04V403R_MERSTAT_GID_20001024_20170120_1.xls
```

---
# 4. 파일 경로 구조
## ✔ 4.1 로컬/NAS 경로 예시
```
/batch/report/AC/statement/YYYYMMDD/
```
Automation 설정에서 기본 루트 경로 지정 가능.

## ✔ 4.2 AWS S3 경로 예시
```
s3://mti-report-bucket/statement/YYYYMMDD/FILENAME
```

---
# 5. 첨부파일 매칭 알고리즘 (핵심)
## ✔ Step 1. DB에서 파일명 가져오기
```
filename = row['ATTACH_FILE_NAME']
```

## ✔ Step 2. 파일명 유효성 검사
```
IF filename == NULL OR filename == '' → Skip + Warning
```

## ✔ Step 3. 디렉토리 탐색
### 로컬
```
filepath = ROOT_PATH + '/' + filename
IF exists(filepath) → success
```

### S3
```
s3.getObject({Key: filename}) → success
```

## ✔ Step 4. 파일 중복 검사
```
IF 동일 파일명 2개 이상 발견 → ERROR (중복 파일)
```
→ 이를 반드시 Log로 남겨 운영자가 확인할 수 있게 함

## ✔ Step 5. 파일 크기 검사
```
IF filesize == 0 → ERROR (빈파일)
```

## ✔ Step 6. 파일 binary → attachment object 변환
SES 구조에 맞게 Buffer 또는 Base64 변환
```
{ filename, content(base64), contentType }
```

## ✔ Step 7. 엔진으로 반환
```
return attachmentObject
```

---
# 6. 파일 매칭 실패 처리 정책
첨부파일 매칭 실패 시 반드시 로깅 및 옵션 처리 필요.

| 유형 | 설명 | 처리 |
|------|------|------|
| 파일 없음 | 스토리지에서 파일이 없음 | Warning + Skip or Fail 선택 |
| 이름 불일치 | 파일명 오타 | Fail |
| 중복 파일 | 동일 파일 2개 | Fail |
| 파일 손상 | 읽기 실패 | Fail |
| S3 권한 없음 | IAM 오류 | Fail |

**Automation 설정 옵션:**
- 파일 없음 시 발송 중단
- 파일 없음 시 해당 고객만 Skip 후 계속
- 파일 오류 시 전체 실패 처리(강제)

---
# 7. 첨부파일 처리 성능 최적화
대량 메일 발송 시 속도 최적화를 위한 구조:

## ✔ 7.1 파일 캐싱
같은 경로 내 수천개 파일 접근 시 OS 디스크 캐시 활용

## ✔ 7.2 병렬 읽기 제한
I/O 폭주 방지
```
maxParallelFileRead = 5
```

## ✔ 7.3 파일명 → 경로 인덱싱
사전에 폴더 내 파일목록 인덱싱 가능
```
fileIndex = map {filename → real path}
```

---
# 8. 첨부파일 보안 처리
## ✔ 8.1 파일 확장자 제한
허용 확장자 목록
```
.pdf, .xls, .xlsx, .csv
```

## ✔ 8.2 파일명 validation
정규식 검사
```
^[A-Za-z0-9._-]+$
```

## ✔ 8.3 파일 무결성 검사(선택)
- SHA-256 hash 비교 기능 추가 가능

---
# 9. 첨부파일 엔진 핵심 함수 정의
## ✔ 9.1 findAttachment(row)
```
Input: row (Query target row)
Process:
  1) filename = row.ATTACH_FILE_NAME
  2) validate filename
  3) search in storage
  4) read file → buffer
  5) build attachmentObject
Return: attachmentObject or null
```

---
# 10. 로그 저장 구조
```
ATTACHMENT_LOG
--------------------------------
LOG_ID
AUTO_ID
ORG_ID
CUST_ID
FILE_NAME
STATUS (FOUND, NOT_FOUND, ERROR)
MESSAGE
CREATED_AT
```

---
# 11. 다음 문서
- 발송 로그 / 리포트 구조 문서
- 시스템 아키텍처 문서
- 프로젝트 구조 및 개발 표준 문서

