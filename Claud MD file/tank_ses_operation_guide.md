# AWS SES 운영 및 튜닝 가이드 (SES Operation & Tuning Guide v1)
본 문서는 Tank 자동 이메일 시스템의 핵심 외부 인프라인 **AWS SES(Simple Email Service)** 를 안정적으로 운영·관리하기 위한 가이드입니다.
고객사 온프레미스 + AWS SES 하이브리드 환경에서 필수적으로 관리해야 하는 항목들을 집중적으로 정리했습니다.

---
# 1. SES 운영의 핵심 포인트
AWS SES는 **대량 이메일 발송을 위한 고가용성 서비스**이지만, 아래 요소를 반드시 관리해야 안정적으로 운영할 수 있습니다.

- 발송 한도(Quota / Rate Limit)
- 도메인 인증 (SPF / DKIM / MAIL FROM)
- Bounce / Complaint 비율 관리
- 발송 성공률 모니터링
- IP Reputation 관리
- SES Key 보안 관리
- 네트워크 방화벽 설정

---
# 2. SES 인증 (Domain Verification) — 필수 설정
Tank 시스템에서 고객사 도메인(yokee.co.id 등)으로 발송하려면 **도메인 인증**이 반드시 필요함.

## ✔ 2.1 SPF 설정
DNS TXT 레코드 추가:
```
v=spf1 include:amazonses.com ~all
```

## ✔ 2.2 DKIM 설정 (3개의 CNAME)
예:
```
xxxx._domainkey.yokee.co.id → amazonses.com
yyyy._domainkey.yokee.co.id → amazonses.com
zzzz._domainkey.yokee.co.id → amazonses.com
```

## ✔ 2.3 Mail-From Domain (선택)
반송(BOUNCE) 도메인 커스텀:
```
return.yokee.co.id
```
DNS MX 레코드 추가 필요.

## ✔ 2.4 도메인 인증 완료 확인
AWS Console → SES → Verified Identities → Status = "Verified"

---
# 3. 발송 한도(Quota) 관리
SES는 계정별로 발송 가능량이 다름.

## ✔ 3.1 기본 한도 예시 (지역: ap-southeast-1)
- **Daily Sending Limit**: 50,000 emails/day
- **Maximum Send Rate**: 14 emails/sec

## ✔ 3.2 한도 초과 시 증상
- SES에서 Throttling 에러 발생
- Worker 오류: "Throttling – Rate exceeded"
- 이메일 발송 실패 급증

## ✔ 3.3 한도 증가 요청 (필수 업무)
AWS Support → Case 생성 → 다음 항목 제출:
- 사용 목적
- 1일 평균/최대 발송량
- Bounce/Complaint 관리 계획
- 도메인 인증 여부

### 추천 설정
Tank 솔루션 기준 **초당 최소 30~50건**은 필요.

---
# 4. Bounce / Complaint 관리 (발송 품질 유지)
AWS SES는 발송 품질을 매우 중요하게 관리함.
품질이 낮으면 한도 제한 또는 차단.

## ✔ 4.1 모니터링 기준
| 항목 | 정상 기준 | 위험 기준 |
|--------|-----------|-------------|
| Bounce Rate | 5% 이하 | 10% 이상 |
| Complaint Rate | 0.1% 이하 | 1% 이상 |

## ✔ 4.2 관리 방법
- 잘못된 이메일 주소 제거
- Hard Bounce 주소 Blacklist 처리
- 장기간 미사용 이메일 발송 금지

## ✔ 4.3 SNS + Lambda 연동(옵션)
Bounce/Complaint 이벤트를 자동 저장하려면 SNS → Lambda → Logs DB 저장 구조 추천.

---
# 5. 발송 성공률 / 도메인별 품질 관리
## ✔ 5.1 도메인별 성공률 확인
- @gmail.com
- @yahoo.com
- 회사 도메인(@yokee.co.id 등)

## ✔ 5.2 Worker 발송 구조 튜닝
### 병렬 처리(Promise Pool)
```
maxParallel = 10
SES Rate Limit 고려하여 조정
```

### Delay 삽입 (Throttle 방지)
```
await sleep(100ms)
```

---
# 6. IP Reputation 관리
AWS SES는 공유 IP 풀(shared IP pool)을 사용함.
고객사 요구 시 **전용 IP(dedicated IP)** 구매 가능.

## ✔ 전용 IP 사용 이유
- 대량 발송 품질 개선
- 도메인 기반 Reputation 향상
- 금융/공공기관 요구사항 충족

---
# 7. SES Key 관리 (보안)
## ✔ 원칙
- SES Key는 절대 Frontend(React)에 저장 금지
- 오직 Backend/Worker .env에만 저장
- 권한은 최소화 (SendEmail 권한만 허용)

## ✔ IAM Policy 예시
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    }
  ]
}
```

---
# 8. 네트워크 방화벽 설정
온프레미스 서버에서 AWS SES로 나가기 위한 **Outbound 허용 필요**.

## ✔ HTTPS(API 방식)
```
ses.ap-southeast-1.amazonaws.com:443
```

## ✔ SMTP (옵션)
```
email-smtp.ap-southeast-1.amazonaws.com:587
```

---
# 9. SES 오류 유형 및 해결 가이드
| 오류 유형 | 설명 | 해결 |
|-----------|-------|--------|
| Throttling | 속도 제한 초과 | 병렬 수 감소, delay 추가 |
| MessageRejected | 인증 문제 | SPF/DKIM 재확인 |
| AccessDenied | IAM 권한 문제 | IAM 수정 |
| InvalidParameter | 이메일 형식 문제 | 문자열 검사 추가 |
| MailFromDomainNotVerified | MAIL FROM 인증 실패 | DNS 레코드 수정 |

---
# 10. SES 비용 관리
## ✔ 과금 방식
- 발송 이메일 수
- 첨부파일 크기 기준
- 전용 IP 사용 시 월별 비용 발생

## ✔ 비용 최적화 팁
- 대량 발송은 RawEmail 대신 SendEmail API 사용
- 첨부파일 압축 가능 시 압축 후 발송
- 동일 내용 이메일은 템플릿 재사용

---
# 11. SES를 이용한 테스트 절차
1) 테스트용 도메인 1개 인증
2) 테스트 이메일 3~5건 발송
3) Bounce 여부 확인
4) Spam 처리 여부 체크
5) 모바일/PC 클라이언트에서 렌더링 확인

---
# 12. SES 운영 Quick Checklist
```
[매일]
- 발송 성공률 확인
- 실패 증가 여부 확인
- SMTP/HTTPS 연결 정상 여부

[매주]
- Bounce/Complaint 증가 여부
- 도메인 DNS 상태 점검

[매월]
- SES Quota 확인
- IAM Key rotate (보안)
```

---
# 13. 다음 문서
- 장애 대응 매뉴얼 (Troubleshooting Guide)
- 성능 테스트 매뉴얼 (Load Test Guide)
- 보안 가이드(Security Hardening Guide)

