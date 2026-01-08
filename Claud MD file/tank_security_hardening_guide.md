# 보안 강화 가이드 (Security Hardening Guide v1)
본 문서는 Tank 자동 이메일 시스템을 **고객사 온프레미스 환경에서 안전하게 운영하기 위한 보안 강화 정책**을 정리한 문서입니다.

Tank 솔루션은 온프레미스 서버, Oracle DB, AWS SES, 네트워크, Worker 엔진 등 다양한 구성 요소를 포함하므로, 각 영역별로 위험 요소를 제거하고 안전하게 운영할 수 있도록 보안 규칙을 제공합니다.

---
# 1. 보안 목표
```
1) 고객 데이터 보호 (이메일 / 첨부파일 / 고객 정보)
2) 발송 시스템 무단 접근 방지
3) SES Key 및 민감정보 보호
4) 파일 서버 및 DB 접근 제어 강화
5) 로그/오류 데이터의 안전한 보관
```

---
# 2. 서버 접근 제어(Security)
## ✔ 2.1 관리자 계정 보호
- OS 계정은 반드시 비밀번호 복잡성 규칙 적용
- root 로그인 비활성화 권장
- 관리자 계정 2개 이하 유지

## ✔ 2.2 SSH 보안 강화 (Linux)
```
/etc/ssh/sshd_config
→ PermitRootLogin no
→ PasswordAuthentication no (Key 인증만 허용 권장)
```

## ✔ 2.3 방화벽 규칙 예시
```
Inbound:
80      (Nginx)
443     (HTTPS 사용 시)
3000    (Backend API)
3001    (Worker API - 필요 시)
22      (SSH)

Outbound:
443 → AWS SES (필수)
1521 → Oracle DB (필요 시)
```
불필요한 포트는 모두 차단.

---
# 3. .env 및 Key 보호 정책
## ✔ 3.1 .env는 절대 Git에 포함 금지
- .env.example만 포함
- 실제 .env는 고객사 서버 내부에서만 존재

## ✔ 3.2 AWS SES Key 최소 권한 적용
IAM Policy 최소화:
```
ses:SendEmail
ses:SendRawEmail
```
이외 권한은 불필요.

## ✔ 3.3 Key Rotation 권장
- 최소 6개월마다 Key 교체
- 교체 후 Worker/Backend 재기동

---
# 4. Oracle DB 보안
## ✔ 4.1 DB 계정은 최소 권한 적용
Tank 시스템 계정은 아래 권한만 필요:
- SELECT (Target/Mapping Query)
- UPDATE (발송 완료 플래그)

DB 생성/삭제 권한 불필요.

## ✔ 4.2 DB 연결 암호화(TLS) 옵션 지원
지원 환경일 경우 Oracle Client TLS 적용.

## ✔ 4.3 DB 비밀번호 정책
- 12자 이상
- 대문자/소문자/숫자 포함
- 비밀번호는 .env에서만 관리

---
# 5. 파일 스토리지(NAS/Local) 보안
## ✔ 5.1 권한 정책
- Worker는 Read Only 권한만 필요
- NAS 경로 기준 권한 예:
```
chmod -R 755 /batch/report
```

## ✔ 5.2 첨부파일 삭제 정책
- 발송 후 일정기간 보관 (30일 등)
- NAS 용량 압박 방지

## ✔ 5.3 파일명 인젝션 방지
- Worker 내부에서 파일명 검증 필수
```
정상 문자만 허용: a-z, A-Z, 0-9, ., _
```

---
# 6. Backend(API) 보안
## ✔ 6.1 JWT 기반 인증
모든 API는 JWT 토큰을 통해 보호.
```
Authorization: Bearer <token>
```

## ✔ 6.2 Rate Limit 적용
Brute-force 보호용:
```
100 requests / 1 min
```

## ✔ 6.3 CORS 설정 강화
React 도메인 또는 localhost만 허용.

## ✔ 6.4 HTTPS 적용 권장
설치형이라도 Reverse Proxy(Nginx) 기반 HTTPS 권장:
- 자체 CA
- 고객사 SSL 인증서

---
# 7. Worker 보안(대량 발송 엔진)
## ✔ 7.1 Worker 실행 권한 제한
- 루트 권한으로 Worker 실행 금지
- 전용 사용자 생성 후 실행
```
useradd tankmail
```

## ✔ 7.2 Job Queue 조작 방지
- Worker API 비공개 (내부 IP에서만 접근)

## ✔ 7.3 SES 발송 오류 자동 감지
- Bounce/Complaint 증가 시 자동 중단 옵션 지원

---
# 8. 로그 및 데이터 보호
## ✔ 8.1 로그 파일 권한
```
chmod 600 backend/logs/*.log
chmod 600 worker/logs/*.log
```

## ✔ 8.2 개인정보 마스킹
EMAIL_SEND_LOG 저장 시 고객 정보 마스킹 권장:
```
홍길동 → 홍*동
email@test.com → e****@test.com
```

## ✔ 8.3 로그 보관 기간
- 기본 30일 → 이후 자동 삭제 또는 아카이브

---
# 9. 네트워크 보안 (Outbound 제한)
AWS SES에 필요한 Outbound만 허용:
```
ses.ap-southeast-1.amazonaws.com:443
```
SMTP 사용 시:
```
email-smtp.ap-southeast-1.amazonaws.com:587
```
그 외 외부 접속은 차단.

---
# 10. Nginx 보안 강화
## ✔ 10.1 서버 정보 숨기기
```
server_tokens off;
```

## ✔ 10.2 브라우저 보안 헤더
```
add_header X-Frame-Options "DENY";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
```

---
# 11. 배포 보안
## ✔ 11.1 배포 파일 검증
배포 .tar.gz/.zip 파일은 SHA256 체크 후 교체.

## ✔ 11.2 GitHub/GitLab 계정 보안
- 2FA 필수
- Access Token 최소 권한 적용

---
# 12. 보안 점검 체크리스트
```
[Daily]
- 서버 접근 로그 점검
- Worker 이상 동작 여부 확인
- SES Throttling 여부 확인

[Weekly]
- DB 접근 권한 점검
- 파일 서버 권한 점검
- 로그 마스킹 규칙 점검

[Monthly]
- IAM Key 로테이션
- SSL 인증서 갱신
- 포트 점검(불필요 포트 차단)
```

---
# 13. 다음 문서
- 고객사 전달용 운영 가이드 (End User Manual)
- SLA 운영 정책(Optional)
- Backup & Recovery 가이