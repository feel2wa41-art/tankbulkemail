# 운영자 매뉴얼 (Operator Manual v1)
본 문서는 Tank 자동 이메일 시스템을 사용하는 **운영자 / 관리자 / 부서 담당자**가
하루 업무를 수행하기 위해 필요한 모든 UI 기능을 단계별로 정리한 **완전한 사용자 매뉴얼**입니다.

시스템 전체 화면을 그대로 따라할 수 있도록 메뉴 구조 → 기능 설명 → 오류 대응 → 실사용 시나리오 순으로 구성하였습니다.

---
# 1. 로그인 / 권한
## ✔ 1.1 로그인 화면
- 사용자 ID, 비밀번호 입력 후 로그인
- 권한 종류: **관리자 / 운영자 / 조회전용**

## ✔ 1.2 권한별 기능 차이
| 기능 | 관리자 | 운영자 | 조회전용 |
|------|---------|---------|---------|
| DB Profile 설정 | ✔ | ✖ | ✖ |
| 이메일 템플릿 수정 | ✔ | ✔ | ✖ |
| 자동화 생성/수정 | ✔ | ✔ | ✖ |
| 로그/리포트 조회 | ✔ | ✔ | ✔ |
| 조직 추가/삭제 | ✔ | ✖ | ✖ |

---
# 2. 대시보드 (Dashboard)
자동 이메일 시스템 운영 상태를 한눈에 확인할 수 있는 화면입니다.

## ✔ 표시 항목
- **오늘 발송 건수 / 실패 건수**
- **도메인별 성공률(gmail, yahoo, 회사도메인 등)**
- **시간대별 발송 그래프 (Line Chart)**
- **최근 Automation 실행 결과**
- **발송 한도(SES Limit) 근접 여부 알림**

## ✔ 기능
- 기간 선택(오늘 / 최근 7일 / 최근 30일)
- 조직 단위 필터 (MTI 1부서, MTI 2부서 등)
- Automation 단위 필터

---
# 3. 조직 관리 화면 (Organization)
조직별로 자동 이메일 그룹을 관리하는 화면입니다.

## ✔ 3.1 조직 리스트 화면
```
MTI 1부서 자동 이메일
MTI 2부서 자동 이메일
MT1 본부 고객 자동 이메일
+ 자동 이메일 그룹 추가
```

## ✔ 3.2 기능 설명
- 조직 선택 → 해당 조직의 자동 이메일 세트로 이동
- 조직명 수정
- 조직 삭제 (주의: 하위 Automation 전체 삭제)
- 새 조직 추가

---
# 4. DB Profile (Oracle DB 연결 설정)
Automation이 고객 정보를 가져오기 위해 필요한 설정입니다.

## ✔ 4.1 항목
- DB 타입
- 서버 IP
- Port
- SID / Service Name
- 계정(ID/PW)
- Charset

## ✔ 4.2 기능
- **Connect Test** 버튼 → Oracle 연결 테스트
- 설정 저장/삭제

## ✔ 4.3 오류 메시지
| 오류 | 원인 |
|------|------|
| ORA-28009 | 접속 계정 권한 오류 |
| ORA-12514 | SID 오타 또는 Listener 미작동 |
| Connection timeout | 네트워크 차단 |

---
# 5. Automation 리스트 화면
조직에서 운영 중인 자동 이메일(Job) 목록 표시.

## ✔ 표시 항목
- Automation 제목
- 진행 상태 (Active / Paused / Inactive)
- 마지막 실행 시간
- 상태 관리 버튼 ↓
  - Pause
  - Resume
  - Delete
  - Edit
  - View Log

## ✔ 5.1 Automation 생성 절차
1) "새 Automation 만들기" 클릭
2) Automation 이름 입력
3) DBIO Register 화면으로 이동

---
# 6. DBIO Register (DB 쿼리 설정)
Automation의 핵심 기능 중 하나.

## ✔ 6.1 Query Target List 설정 (필수)
- 메일 대상자 목록을 가져오는 쿼리
- 필수 컬럼: EMAIL, PRIMARY_KEY, ATTACH_NAME

## ✔ 6.2 Mapping Query 설정
- 템플릿에 들어갈 상세 값 조회
예: 고객 이름, 계좌번호, 잔액 등

## ✔ 6.3 Update Query
- 메일 발송 완료 시 DB에 반영되는 쿼리

## ✔ 6.4 Append 옵션
- 기존 값을 덮어쓸지(Replace)
- 기존에 누적할지(Append)

---
# 7. Basic Email Settings (발신 정보)
- Sender Email
- Sender Name
- Return Email
- Subject
- Language(UTF-8)

Subject에는 변수 사용 가능:
```
$(NAME) 고객님 거래명세서 안내드립니다
```

---
# 8. Template Settings (HTML 템플릿 관리)
Automation에서 고객에게 발송되는 이메일 본문을 관리합니다.

## ✔ 8.1 HTML 코드 입력
- 직접 HTML 작성
- 변수 문법: `$(VARIABLE)`

## ✔ 8.2 Preview
- Automation 설정값 저장 후 Preview 가능
- index=1 기준 샘플 표시

## ✔ 8.3 오류 경고
- 템플릿 변수 오타 → 저장 불가
- HTML 중복 태그 → Warning

---
# 9. Incoming Mail Settings (수신자/첨부 설정)
- Recipient 필드 매핑
- Attachment 매핑 (ATTACH1, ATTACH2 ...)
- 언어/본문 설정

---
# 10. 첨부파일 매칭 설정
Automation이 DB에서 가져온 파일명과
실제 NAS/파일서버에서 배치가 생성한 파일을 매칭.

## ✔ 파일 매칭 상태 표시
- FOUND (정상)
- NOT FOUND (경고)
- DUPLICATED (오류)
- INVALID (손상 파일)

## ✔ 매칭 실패 시 옵션
- 전체 작업 중단
- 해당 고객만 Skip

---
# 11. 스케줄 설정 (Scheduler)
Automation 실행 주기를 설정.

## ✔ 11.1 반복 주기
- Real-time
- Daily
- Weekly
- Monthly
- Custom (특정일 + 시간)

## ✔ 11.2 옵션
- "신규 고객만 발송"
- "전체 대상 발송"
- "1회성 발송"

---
# 12. Report / Log 보기
발송 결과를 전체적으로 확인하는 화면.

## ✔ 12.1 Daily Summary
- 전체 성공률
- 실패 건수
- 도메인별 성공률
- 오류 유형 차트

## ✔ 12.2 Automation 실행 기록
- 실행 시간
- 성공/실패 카운트
- Run ID 기반 상세페이지 이동

## ✔ 12.3 개별 이메일 로그
- 고객별 성공/실패 조회
- 첨부파일 매칭 상태 표시
- SES Message-ID 확인 가능

---
# 13. 자주 발생하는 오류 및 해결 방법
| 문제 | 원인 | 해결 방법 |
|------|------|-----------|
| 첨부파일 없음 | 파일명 불일치 | 파일명 DB값 확인 |
| SES 발송 실패 | 인터넷 차단 | 방화벽 443 허용 필요 |
| 템플릿 오류 | 변수 오타 | 템플릿 Validation 사용 |
| Oracle 연결 실패 | 계정/포트/Listener 문제 | DB팀 확인 |

---
# 14. 운영 팁
- Automation은 생성 후 반드시 Preview 테스트할 것
- 스케줄 실행 전 Test Send 기능으로 검증 필수
- 첨부파일 경로는 NAS 권한 최소화 (Read Only 권장)

---
# 15. 다음 문서
- **API 명세서**
- ERD & DB 스키마 정의서
- Sequence Diagram(전체 플로우)
- 배포/업데이트 가이드