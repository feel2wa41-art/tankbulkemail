# Scheduler / Worker 엔진 상세 설계 문서 (v1)
본 문서는 자동 이메일 발송 시스템의 핵심 엔진인 **Scheduler(스케줄러)** 와 **Worker(메일 발송 엔진)** 의 전체 구조와 상세 동작 방식을 개발자가 그대로 구현할 수 있도록 정의한 기술 명세서입니다.

---
# 1. 개요
본 시스템은 대량 이메일 발송 특성상 다음 두 모듈이 필수입니다.

## ✔ Scheduler
- Automation 별로 설정된 스케줄(Daily, Weekly, Monthly, Real-time 등)을 모니터링
- 지정된 시간에 Worker에게 "발송 작업"을 전달

## ✔ Worker
- DB 조회 → 템플릿 매핑 → 첨부파일 매칭 → SES 발송 → Update Query → 로그 저장
- 대량 처리(수천~수만 건)를 안정적으로 수행

이 두 모듈은 **완전히 독립 프로세스**로 구성되며, 실패/재시도/중단을 세밀하게 제어함.

---
# 2. 전체 실행 구조 흐름
```
[Scheduler]
   ↓  자동화 스케줄 감지
   ↓  작업 생성(Job)
[Worker]
   ↓  Job 수신
   ↓  대상 고객 조회(Query Target)
   ↓  Index Loop 시작
   ↓  매핑 데이터 로드
   ↓  HTML 렌더링
   ↓  첨부파일 매칭
   ↓  AWS SES 발송
   ↓  Update Query
   ↓  로그 저장
   ↓  전체 처리 완료
```

---
# 3. Scheduler 설계
Scheduler는 Cron 기반 또는 Node Scheduler 기반으로 구현 가능.

## ✔ 3.1 Scheduler 역할
| 기능 | 설명 |
|------|------|
| 스케줄링 모니터링 | 각 Automation의 스케줄 필드를 읽고 실행 여부 판단 |
| Job 생성 | Worker에서 처리할 수 있도록 JobQueue에 작업 생성 |
| 중복 실행 방지 | 동일 Automation이 동시에 실행되지 않도록 Lock 필요 |
| 상태 업데이트 | Next Run, Last Run 갱신 |

---
# 4. Scheduler 동작 방식
Scheduler는 1분 또는 30초 간격으로 다음 작업을 반복.

## ✔ Step 1. 전체 Automation 조회
```
SELECT * FROM AUTOMATION WHERE STATUS='ACTIVE'
```

## ✔ Step 2. 현재 시간과 스케줄 비교
- Daily
- Weekly
- Monthly
- Real-time(저장 즉시 Job 생성)

## ✔ Step 3. 실행 조건 충족 시 Job 생성
```
JOB_QUEUE.push({ AUTO_ID: 10, SCHEDULE_ID: 3 })
```

## ✔ Step 4. 상태 업데이트
Automation 테이블 업데이트
```
LAST_RUN = NOW
NEXT_RUN = 계산된 다음 시간
```

## ✔ Step 5. 중복 실행 방지
Automation 실행 여부 플래그 사용
```
IS_RUNNING = true   → Worker 완료 후 false
```

---
# 5. Worker 엔진 설계
Worker는 대량 이메일 발송의 모든 실제 로직을 수행.

## ✔ 5.1 Worker 주요 기능
| 기능 | 설명 |
|------|------|
| Query 실행 | Automation의 DBIO Register에 따라 DB에서 데이터 조회 |
| Index loop 처리 | 수천 명 고객 대상 반복 처리 |
| Template 렌더링 | $(VAR) 치환 |
| 첨부파일 매칭 | 파일명 기반 스토리지 탐색 |
| SES 발송 | AWS SES API 호출 |
| Update Query | 성공한 Row만 해당 DB 업데이트 |
| Log 기록 | 성공/실패, 파일 없음, 매핑 에러 등 기록 |
| Retry 처리 | SES 오류 등 재시도 가능 |

---
# 6. Worker 내부 프로세스 상세
Worker는 하나의 Job을 처리할 때 다음 단계를 순차적으로 수행.

## ✔ Step 1. Query Target List 실행
```
rows = oracle.query(TargetQuery)
```

## ✔ Step 2. For each row → Index Loop 시작
```
for row in rows:
    primary_id = row[CUST_ID]
```

## ✔ Step 3. Mapping Query 실행
```
mapData = oracle.query(MappingQuery, [primary_id])
```

## ✔ Step 4. Template HTML 렌더링
```
html = render(template, mapData)
```

## ✔ Step 5. 첨부파일 매칭
```
attach = findFile(row['ATTACH_NAME'])
```
- 파일 없음 → Log 기록 + 선택적 Skip

## ✔ Step 6. SES 발송
```
ses.send({
   to: row.email,
   subject: renderedSubject,
   htmlBody: html,
   attachments: attach
})
```

## ✔ Step 7. Update Query 실행
```
oracle.execute(UpdateQuery, [primary_id])
```

## ✔ Step 8. 로그 저장
- 성공/실패 기록
- 첨부파일 없음 기록
- SES 응답 저장
- 템플릿 오류 저장

---
# 7. Worker 동시성(병렬 처리) 구조
## ✔ 7.1 처리 방식
- 기본: 순차 처리
- 옵션: 병렬 처리(Promise Pool)
- 병렬 처리 시 SES rate limit(초당 14건 등) 적용

## ✔ 7.2 동시성 알고리즘(예시)
```
maxParallel = 10
while index < total:
    배치 10개씩 병렬 발송
    Sleep(SES Limit 보정)
```

---
# 8. 오류 처리 규칙
| 오류 | 처리 |
|------|------|
| DB 커넥션 실패 | Job 전체 중단 + Log |
| Template 변수 오류 | Job 중단 + 사용자 경고 |
| File Not Found | Warning Log + Skip 또는 Hard Fail |
| SES 오류 | Retry 3회 후 실패 처리 |
| UpdateQuery 실패 | 메일은 성공 → Update만 실패 로그 |

---
# 9. Job Queue 구조
Redis 또는 DB 기반 Queue 사용 가능.
```
JOB_QUEUE
--------------------
JOB_ID
AUTO_ID
STATUS (WAITING, RUNNING, DONE, FAIL)
START_AT
END_AT
LOG
```

---
# 10. Scheduler + Worker 연동 흐름 (최종)
```
[Scheduler]
1) 스케줄 감지
2) Job 생성
3) 상태 변경 → WAITING

[Worker]
1) WAITING Job 가져옴
2) RUNNING 변경
3) Query → Template → SES 처리
4) DONE or FAIL 변경
5) 로그 저장
```

---
# 11. Next Documents
- 첨부파일 매칭 엔진 상세 문서
- 로그/리포트 문서
- 전체 아키텍처 문서

