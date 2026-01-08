# API 명세서 (API Specification v1 — REST/Swagger 기반)
본 문서는 Tank 자동 이메일 시스템(React + NestJS)의 **전체 API 명세서**입니다.
백엔드 개발자, 프론트엔드 개발자, QA, 그리고 향후 유지보수 담당자가 그대로 사용할 수 있도록 구조화했습니다.

Swagger 문서 기준으로 작성되었으며, NestJS에서 `@nestjs/swagger` 사용 시 자동 문서화가 가능합니다.

---
# 1. 공통 규칙
## ✔ Base URL
```
/api/v1
```

## ✔ 응답(Response) 공통 형식
```
{
  success: true/false,
  message: "설명 메시지",
  data: {},
  errorCode: "OPTIONAL"
}
```

## ✔ 인증 방식
- JWT Access Token
- Header:
```
Authorization: Bearer <token>
```

---
# 2. Auth API
## ✔ POST /auth/login
### Request
```
{
  "userId": "admin",
  "password": "1234"
}
```
### Response
```
{
  "success": true,
  "data": {
     "token": "jwt-token-value",
     "user": {
        "id": 1,
        "name": "Tank Admin",
        "role": "admin"
     }
  }
}
```

---
## ✔ GET /auth/me
JWT 검증 후 사용자 정보 반환.

---
# 3. 조직(Organization) API
## ✔ GET /org
조직 리스트 조회

## ✔ POST /org
조직 생성
### Body
```
{
  "name": "MTI 1부서 자동 이메일",
  "description": "1부서 자동화 그룹"
}
```

## ✔ PUT /org/:id
조직 정보 수정

## ✔ DELETE /org/:id
조직 삭제 (Automation 전체 삭제 포함)

---
# 4. DB Profile API
## ✔ GET /dbprofile
DB 설정 리스트 조회

## ✔ POST /dbprofile
DB 설정 추가
```
{
  "dbType": "oracle",
  "host": "10.0.0.12",
  "port": 1521,
  "sid": "ORCL",
  "user": "MTI",
  "password": "****",
  "charset": "UTF8"
}
```

## ✔ POST /dbprofile/test
Oracle 연결 테스트

---
# 5. Automation API
## ✔ GET /automation?orgId=
조직별 Automation 리스트 조회

## ✔ POST /automation
Automation 생성
```
{
  "orgId": 1,
  "name": "월간 수수료 자동 발송",
  "status": "ACTIVE"
}
```

## ✔ GET /automation/:id
Automation 상세 조회

## ✔ PUT /automation/:id
Automation 수정

## ✔ DELETE /automation/:id
Automation 삭제

---
# 6. DBIO Register API
## ✔ POST /automation/:id/dbio/target
Query Target List 등록
```
{
  "query": "SELECT CUST_ID, EMAIL_ADDR, ATTACH_FILE_NAME FROM MTI_CUSTOMER"
}
```

## ✔ POST /automation/:id/dbio/mapping
Mapping Query 등록
```
{
  "query": "SELECT NAME, ACCOUNT_NO FROM MTI_DETAIL WHERE CUST_ID = ?"
}
```

## ✔ POST /automation/:id/dbio/update
Update Query 등록

---
# 7. Template API
## ✔ GET /automation/:id/template
Template 조회

## ✔ POST /automation/:id/template
HTML 템플릿 저장
```
{
  "html": "<p>안녕하세요 $(NAME) 고객님</p>"
}
```

## ✔ POST /automation/:id/template/preview
템플릿 Preview 생성

---
# 8. Email Settings API
## ✔ POST /automation/:id/email-setting
발신자/제목 설정 저장
```
{
  "senderEmail": "no-reply@company.com",
  "senderName": "MTI Center",
  "subject": "$(NAME) 고객님 명세서"
}
```

---
# 9. Attachment API
## ✔ POST /automation/:id/attachment/test
첨부파일 매칭 테스트 실행

## ✔ GET /automation/:id/attachment/logs
첨부파일 로그 조회

---
# 10. Scheduler API
## ✔ GET /scheduler
등록된 스케줄 리스트 조회

## ✔ POST /scheduler
스케줄 생성
```
{
  "automationId": 20,
  "type": "MONTHLY",
  "day": 5,
  "hour": 8,
  "minute": 30
}
```

## ✔ DELETE /scheduler/:id
스케줄 삭제

---
# 11. Manual Trigger API (테스트/수동 실행)
## ✔ POST /automation/:id/run
Automation을 수동으로 즉시 실행

---
# 12. Logs API
## ✔ GET /log/automation?orgId=&automationId=
Automation 실행 로그

## ✔ GET /log/email?runId=
이메일 개별 로그 조회

## ✔ GET /log/system
시스템 에러 로그 조회

---
# 13. Report API
## ✔ GET /report/summary?range=7d
요약 리포트

## ✔ GET /report/domain-stats?range=30d
도메인별 성공률

## ✔ GET /report/timeline?range=1d
시간대 발송 그래프 데이터

---
# 14. Health Check API
## ✔ GET /health
서버 헬스체크 → 설치형에서 서버 상태 점검 시 필수
```
{
  "status": "ok",
  "timestamp": "2025-01-01 10:00:00"
}
```

---
# 15. Swagger 적용 방법 (NestJS 기준)
백엔드에서 Swagger 문서 자동 생성:
```ts
const config = new DocumentBuilder()
  .setTitle('Tank Mail API')
  .setDescription('Automatic Email System API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```
결과:
```
http://localhost:3000/api/docs
```
에서 전체 API 문서 자동 제공.

---
# 16. 다음 문서
- ERD / DB 스키마 정의서
- Sequence Diagram (전체 발송 프로세스)
- 배포 자동화 스크립트

