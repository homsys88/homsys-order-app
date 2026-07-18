홈시스 발주관리 앱 v12.0 솔라피 보안연동

중요
- SOLAPI API Key / Secret은 GitHub 또는 app.js에 입력하지 않습니다.
- Supabase Edge Function Secrets에만 저장합니다.
- SOLAPI에서 발신번호 등록과 승인이 끝나 있어야 발송됩니다.
- 로그인한 사용자만 Edge Function을 호출합니다.

1. Supabase에서 Edge Function 만들기
- 온수기앱 프로젝트를 엽니다.
- 왼쪽 메뉴에서 Edge Functions(번개 모양)를 엽니다.
- 새 함수 만들기(Create a new function)를 누릅니다.
- 함수 이름: send-solapi-message
- supabase/functions/send-solapi-message/index.ts 내용을 전체 붙여넣고 Deploy 합니다.
- JWT 확인(Verify JWT)은 켜둡니다. 공개 함수로 만들지 않습니다.

2. Supabase Secrets 등록
Edge Functions 화면에서 Secrets 또는 Manage secrets를 엽니다.
아래 3개를 등록합니다.

SOLAPI_API_KEY       = 솔라피 API Key
SOLAPI_API_SECRET    = 솔라피 API Secret
SOLAPI_FROM_NUMBER   = 솔라피에 등록 완료된 발신번호 (숫자만 입력 권장)

예: SOLAPI_FROM_NUMBER = 0268679389

3. GitHub 앱 파일 교체
GitHub 저장소에 다음 4개 파일을 올립니다.
- index.html
- style.css
- app.js
- storage.js

Commit changes 후 30초~1분 뒤 앱에서 Ctrl+F5를 누릅니다.
상단에 v12.0 솔라피 보안연동이 표시되면 앱 적용 완료입니다.

4. 시험 발송
- 거래처와 품목을 선택하여 거래명세서를 만듭니다.
- 문자 발송을 누릅니다.
- 처음에는 본인 휴대폰 번호로 글자 문자 1건을 보냅니다.
- 성공 후 이미지 문자(MMS)도 1건 시험합니다.

오류 확인
- 401: 앱에서 로그아웃 후 다시 로그인 / 함수 JWT 설정 확인
- Secrets 미설정: 세 가지 Secret 이름과 값을 다시 확인
- 발신번호 오류: SOLAPI 발신번호 등록 및 승인 상태 확인
- 잔액 오류: SOLAPI 잔액 충전
- CORS/500: Supabase Edge Functions > Logs에서 send-solapi-message 로그 확인

보안 원칙
- API Secret을 채팅 캡처나 GitHub 화면에 노출하지 마세요.
- 이전에 브라우저 앱에 Secret을 입력한 적이 있다면 SOLAPI에서 기존 Secret을 폐기하고 새 Secret을 발급하세요.
