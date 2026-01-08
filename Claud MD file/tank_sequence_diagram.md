# 전체 Sequence Diagram 상세 문서 (End-to-End Process v1)
본 문서는 Tank 자동 이메일 시스템의 **전체 프로세스를 시퀀스 다이어그램 형태로 상세 설명**하여,
개발자·QA·인프라 담당자가 전체 동작 흐름을 한눈에 이해할 수 있도록 만든 문서입니다.

이 문서는 실제 UML 이미지 없이, 텍스트 기반 시퀀스 다이어그램 형태로 구조화되어 있습니다.

---
# 1. 전체 구성 요소
시퀀스는 아래 컴포넌트 간의 상호작용으로 구성됩니다.

```
USER (운영자)
React Frontend (Nginx)
Backend API (NestJS)
Scheduler
Worker Engine
Oracle DB (On-Prem)
File Storage (NAS/Local)
AWS SES
Logs DB
```

---
# 2. 자동 이메일 전체 흐름 (High-Level Sequence)
```
USER → FRONT → BACKEND → SCHEDULER → WORKER → ORACLE → FILE STORAGE → SES → LOGS DB
```

---
# 3. Sequence Diagram: Automation 생성 과정
```
USER → FRONT: "새 Automation 생성"
FRONT → BACKEND: POST /automation
BACKEND → LogsDB: Automation 생성 기록 저장
BACKEND → FRONT: 생성 성공 응답
```

---
# 4. Sequence Diagram: DBIO 설정 과정
```
USER → FRONT: Target Query 입력
FRONT → BACKEND: POST /automation/:id/dbio/target
BACKEND → ORACLE: Query Syntax Test
ORACLE → BACKEND: 결과 OK
BACKEND → FRONT: 저장 성공

USER → FRONT: Mapping Query 입력
FRONT → BACKEND: POST /automation/:id/dbio/mapping
BACKEND → ORACLE: Syntax Test
BACKEND → FRONT: 저장
```

---
# 5. 템플릿 저장 및 Preview 과정
```
USER → FRONT: HTML 템플릿 작성
FRONT → BACKEND: POST /automation/:id/template
BACKEND → LogsDB: 템플릿 저장
BACKEND → FRONT: 저장 성공

USER → FRONT: "Preview" 클릭
FRONT → BACKEND: POST /automation/:id/template/preview
BACKEND → ORACLE: Sample Row 조회
BACKEND → BACKEND: Template 변수 치환
BACKEND → FRONT: 렌더링된 HTML 반환
```

---
# 6. 스케줄 생성 과정
```
USER → FRONT: 스케줄 설정
FRONT → BACKEND: POST /scheduler
BACKEND → LogsDB: 스케줄 저장
BACKEND → FRONT: 성공

Scheduler: 주기적으로 스케줄 테이블 조회
```

---
# 7. 스케줄 실행 → Worker 시작 (핵심)
```
Scheduler → LogsDB: 실행 조건 충족 여부 확인
Scheduler → LogsDB: Job 생성 (WAITING)
Scheduler → Worker: Job 전달
```

---
# 8. Worker 발송 시나리오 (전체 핵심 프로세스)
```
Worker → LogsDB: 실행 시작 로그 기록 (RUN_ID 생성)

Worker → ORACLE: Query Target List 실행
ORACLE → Worker: 대상 고객 목록 반환

loop (각 고객 Row)
    Worker → ORACLE: MappingQuery 실행
    Worker ← ORACLE: 상세 데이터 반환

    Worker → FileStorage: 첨부파일 탐색
    FileStorage → Worker: 파일 FOUND / NOT_FOUND

    Worker: Template HTML 변수 치환
    Worker → SES: 이메일 + 첨부파일 발송
    SES → Worker: Message-ID 응답

    Worker → ORACLE: Update Query 실행
    Worker → LogsDB: EMAIL_SEND_LOG 저장
end loop

Worker → LogsDB: 자동화 실행 요약 업데이트
Worker: Job 완료 상태로 변경
```

---
# 9. 첨부파일 매칭 오류 흐름
```
Worker → FileStorage: 파일 검색
FileStorage → Worker: NOT_FOUND
Worker → LogsDB: ATTACHMENT_LOG (NOT_FOUND)

Worker 정책에 따라:
  - 옵션1: 해당 고객 Row만 Skip
  - 옵션2: 전체 Automation 중단 → FAIL 처리
```

---
# 10. SES 오류 흐름
```
Worker → SES: 이메일 발송 요청
SES → Worker: 오류 응답 (Throttle / Invalid Address)

Worker: Retry 최대 3회

if 계속 실패:
    Worker → LogsDB: EMAIL_SEND_LOG (FAIL, SES_ERROR)
```

---
# 11. DB Update Query 실패 흐름
```
Worker → ORACLE: Update Query 실행
ORACLE → Worker: 오류 응답

Worker → LogsDB: EMAIL_SEND_LOG (UPDATE_QUERY_OK = N)
```

---
# 12. Manual Trigger (수동 실행) Sequence
```
USER → FRONT: "즉시 실행"
FRONT → BACKEND: POST /automation/:id/run
BACKEND → Worker Queue: Job 생성
Worker: 즉시 처리 시작
```

---
# 13. 리포트 조회 Sequence
```
USER → FRONT: 리포트 화면 접근
FRONT → BACKEND: GET /report/summary
BACKEND → LogsDB: 통계 쿼리 실행
BACKEND → FRONT: 요약/그래프 데이터 반환
```

---
# 14. 전체 시스템 오류 Sequence
```
Worker → ORACLE: 연결 실패
Worker → LogsDB: SYSTEM_ERROR_LOG 저장
Scheduler: Worker 상태 FAIL로 업데이트
FRONT → BACKEND: 오류 알림 정보 요청
BACKEND → FRONT: SYSTEM_ERROR_LOG 노출
```

---
# 15. 최종 시퀀스 요약
```
1) Scheduler → Worker Job 전달
2) Worker → Oracle (대상자 조회)
3) Worker → Oracle (매핑값 조회)
4) Worker → File Storage (첨부파일 매칭)
5) Worker → Template 엔진 (HTML 렌더링)
6) Worker → SES (메일 발송)
7) Worker → Oracle (Update Query)
8) Worker → LogsDB (로그 기록)
9) Dashboard/Report에서 기록 조회
```

---
# 16. 다음 문서
- 배포 자동화 스크립트
- 운영 환경 모니터링 문서(Optional)