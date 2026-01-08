# 템플릿 매핑 규칙 상세 문서 (Template Mapping Specification v1)
본 문서는 Automation 엔진에서 HTML 템플릿과 DB 값이 어떻게 연결되는지,
또 템플릿 변수의 규칙·유효성 검사·에러 처리·치환 방식까지
개발자가 그대로 구현할 수 있도록 정리한 상세 명세서입니다.

---
# 1. 목적
Automation 템플릿은 **DB에서 조회한 값이 HTML 문서 내부 변수로 치환**되어 이메일 본문을 생성합니다.
이 문서는 해당 매핑 규칙을 완전하게 정의하며, 템플릿 오류로 인한 발송 실패를 막기 위한 검증 기준도 포함합니다.

---
# 2. 템플릿 변수 규칙
## ✔ 2.1 변수 문법
```
$(VARIABLE_NAME)
```
### 규칙:
- 대문자/소문자 모두 허용
- 공백 불가
- 특수문자 불가(언더스코어는 허용)
- 변수명은 Mapping Query의 컬럼명과 완전히 일치해야 함

---
# 3. 변수 종류
템플릿에서 사용 가능한 변수는 3가지 유형으로 분류됩니다.

## ✔ 3.1 Target List 변수
Query Target List에 포함된 컬럼
```
$(EMAIL)
$(CUST_ID)
$(ATTACH_FILE)
```
이 값은 **row 단위 반복(index loop)** 시 자동 주입됨.

## ✔ 3.2 Simple Mapping Query 변수
Mapping Query에서 가져온 개별 상세 데이터
```
$(NAME)
$(BALANCE)
$(ACCOUNT_NO)
```

## ✔ 3.3 TEXT Column(CLOB)
대형 HTML 조각 또는 긴 텍스트
```
$(TERMS_HTML)
```
이 변수는 템플릿 내부 특정 위치에 그대로 삽입됨.

---
# 4. 변수 치환 방식
Automation 엔진은 다음 단계로 템플릿을 렌더링합니다:
```
1) HTML 원본 로드
2) VARIABLE_LIST = MappingQuery + TargetList 컬럼
3) For each VARIABLE in VARIABLE_LIST:
       HTML = HTML.replace($(VARIABLE), VALUE)
4) 렌더링 완료된 HTML을 SES로 전달
```

---
# 5. 리스트 매핑 (List Mapping)
## ✔ 5.1 사용 목적
고객별 여러 값(여러 상품, 여러 거래내역 등)을 HTML 테이블 형태로 삽입할 때 사용.

## ✔ 5.2 Template 용 문법
```
<!--LIST:PRODUCT_LIST-->
<tr>
   <td>$(PRODUCT_NAME)</td>
   <td>$(PRICE)</td>
</tr>
<!--ENDLIST-->
```

## ✔ 5.3 작동 방식
1. LIST 구간을 템플릿에서 탐색
2. MappingQuery에서 다건 결과를 가져옴
3. 각 row마다 내부 변수 치환하여 반복 렌더링
4. 최종 HTML에 테이블 형태로 삽입

---
# 6. 템플릿 유효성 검사(Validation)
Automation 저장 시 반드시 아래 검증 수행

## ✔ 6.1 변수 존재 여부 확인
템플릿 내부 변수 목록 추출
```
['NAME', 'BALANCE', 'ACCOUNT']
```
→ MappingQuery + TargetList 컬럼과 비교

### 오류 예시
```
템플릿 변수 $(NAM) 는 매핑되지 않았습니다.
```
저장 중단 + 사용자에게 오류 메시지 표시

## ✔ 6.2 CLOB 변수는 반드시 단일 매핑이어야 함
리스트 매핑 안에 포함되면 오류

## ✔ 6.3 HTML 문법 기본 검사
태그 미닫힘 오류 시 Warning 로그

---
# 7. Preivew 기능
Preview 클릭 시 동작:
```
1) Index = 1 Row 로직 실행
2) MappingQuery 실행하여 값 가져옴
3) Template 렌더링 후 화면에 표시
4) 첨부파일 유무도 체크 (있음/없음 표시)
```

---
# 8. 에러 처리 규칙
| 오류 | 설명 | 처리 |
|------|------|------|
| 변수 미매핑 | 템플릿 변수와 DB 결과 불일치 | 저장/발송 금지 |
| HTML 문법 오류 | 태그 누락 | Warning 후 진행 가능 |
| 리스트 내부 변수 불일치 | 리스트 매핑 오류 | 저장 금지 |
| CLOB 변수를 리스트 안에 사용 | 구조상 잘못된 사용 | 저장 금지 |

---
# 9. Template 데이터 구조
```
TEMPLATE
------------------
TEMPLATE_ID
AUTO_ID
HTML_CONTENT
UPDATED_AT
UPDATED_BY
VALID_YN
PREVIEW_SAMPLE_ID
```

---
# 10. Next Documents
- Scheduler / Worker 엔진 문서
- 첨부파일 매칭 엔진 문서
- 리포트/로그 데이터 구조
