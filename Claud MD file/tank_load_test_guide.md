# 성능 테스트 매뉴얼 (Load Test Guide v1)
본 문서는 Tank 자동 이메일 시스템의 전체 성능을 검증하기 위한 **성능 테스트(부하 테스트) 절차·도구·측정 지표·성능 기준·튜닝 방법**을 정리한 문서입니다.

이 테스트는 배포 전·운영 초기·대량 발송 시점에 반드시 필요합니다.

---
# 1. 성능 테스트 목적
- Worker의 대량 이메일 처리 성능 검증
- Oracle DB에 대한 대량 Query 동작 확인
- 첨부파일 매칭 대량 처리 확인
- AWS SES 전송 속도 및 Rate Limit 확인
- 시스템 자원(CPU/RAM/Disk) 병목 구간 파악
- 운영 환경에서 안정적 성능 확보

---
# 2. 테스트 대상 모듈
```
1) Backend API (NestJS)
2) Worker (Scheduler + Email Processor)
3) Oracle Query
4) 파일 매칭 엔진
5) AWS SES 발송 엔진
```

---
# 3. 테스트 환경 준비
## ✔ 테스트 데이터 준비
- 1,000 / 5,000 / 10,000 / 30,000 건의 고객데이터 샘플
- 첨부파일은 실제 구조와 동일하게 준비 (NAS/Local)

## ✔ Worker 병렬 처리 설정
```
maxParallel = 10 (기본)
→ 20 / 30 등 조정하며 테스트
```

## ✔ .env 설정
```
LOG_LEVEL=DEBUG
DB_POOL_SIZE=20
```

---
# 4. 테스트 종류 및 절차

# ✔ 4.1 Oracle Query 성능 테스트
목적: Target List / Mapping Query의 속도 검증

### 절차
```
1) Query Target List 실행 시간 측정
2) Mapping Query 1,000건 병렬 실행 시간 측정
```

### 기준
| 데이터 수 | 목표 시간 |
|-----------|------------|
| 1,000건 | < 1초 |
| 10,000건 | < 3초 |
| 30,000건 | < 8초 |

---
# ✔ 4.2 파일 매칭 엔진 테스트
목적: 첨부파일 탐색 및 읽기 성능 검증

### 테스트 방법
- 1,000~10,000개 파일이 존재하는 폴더를 대상으로 탐색
- 파일명 검색 → 파일 읽기(Buffer) 처리

### 기준
- 1개 파일 매칭 < 20ms
- 1초당 최소 100~300건 파일 매칭 가능

---
# ✔ 4.3 Worker 전체 처리량(Throughput) 테스트
목적: 이메일 발송 전체 사이클의 총 처리량 측정

### 테스트 시나리오
Target List = 5,000명 기준

### 측정 지표
- 초당 처리 건수 (TPS)
- 총 발송 소요 시간
- 성공률 / 실패율
- Update Query 성공률

### 목표 기준
| 고객 수 | 목표 처리시간 |
|---------|---------------|
| 1,000명 | < 30초 |
| 5,000명 | < 2분 |
|10,000명 | < 4~5분 |

---
# ✔ 4.4 AWS SES Rate Limit 테스트
SES는 속도 제한이 있으므로 필수 테스트.

### 절차
- Worker maxParallel 조정 (10 → 20 → 30)
- SES 에러(Throttling) 발생 여부 확인

### 기준
- Throttling 발생 시 → 0.1초 delay 삽입 또는 병렬 수 감소

---
# ✔ 4.5 Backend API 부하 테스트
도구: **k6, JMeter, Locust** 등

### 예: 로그인 API 테스트(k6)
```
import http from 'k6/http';
export default function () {
  http.get('http://localhost:3000/api/health');
}
```

### 측정 지표
- 초당 요청 처리량
- 평균 응답시간
- 오류율

### 목표 기준
- P95 응답시간 < 150ms
- 오류율 < 0.1%

---
# 5. 테스트 수행 후 로그 분석
## ✔ Worker 로그 분석
- SES 오류 비율
- 파일 매칭 실패 패턴
- DB 오류 발생률

## ✔ Logs DB 분석
- EMAIL_SEND_LOG
- ATTACHMENT_LOG

## ✔ OS 및 서버 자원 분석
- CPU 급등 위치 확인
- 메모리 누수여부

---
# 6. 성능 튜닝 가이드
## ✔ 6.1 Worker 병렬 처리 튜닝
```
maxParallel: 10 → 20 → 30
```
단, SES 속도 제한 고려 필요.

## ✔ 6.2 Oracle 튜닝
- 쿼리 인덱스 생성 추천
- DB 풀 크기 조절 (Pool = 10~20)
- Mapping Query 최소화

## ✔ 6.3 파일 매칭 튜닝
- 파일명 → 경로 pre-indexing
- NAS 접근 속도 개선

## ✔ 6.4 Template 렌더링 튜닝
- 변수 치환 함수 최적화
- HTML 조립 캐싱 적용

## ✔ 6.5 Backend API 튜닝
- 캐싱 적용 (DB 설정 목록 등)
- Response 압축(Gzip)

---
# 7. 성능 테스트 체크리스트
```
[사전 준비]
- 테스트 데이터 5~30k 준비
- 첨부파일 경로 준비
- SES 키 정상 여부 확인

[테스트 중]
- Worker CPU 모니터링
'top'
- SES Throttling 여부
- Worker 로그 확인

[테스트 후]
- 전체 처리 시간 기록
- 평균 처리량 계산
- 실패 로그 분석 후 수정
```

---
# 8. 다음 문서
- 보안 강화 가이드(Security Hardening Guide)