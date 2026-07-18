홈시스 전기온수기 발주관리 앱 v10.0 로그인완료

[Supabase 사전 설정]
- Authentication 사용자 생성 완료
- app_state 테이블 RLS 설정 완료

[GitHub 업로드]
아래 4개 파일을 기존 저장소 최상위에 모두 업로드하세요.
1. index.html
2. style.css
3. app.js
4. storage.js

같은 이름의 기존 파일은 자동으로 교체됩니다.
Commit changes 후 30초~1분 기다린 뒤 앱에서 Ctrl+F5를 누르세요.

[로그인]
- 이메일: Supabase Authentication에서 만든 계정
- 비밀번호: 계정 생성 시 정한 비밀번호
- 로그인 상태는 브라우저에 유지됩니다.
- 로그아웃 버튼을 누르면 다시 로그인해야 합니다.

[보안]
- 로그인 전에는 앱 화면과 데이터가 보이지 않습니다.
- GitHub 코드에는 관리자 비밀번호를 넣지 않습니다.
- service_role/secret key는 절대 GitHub에 올리지 마세요.
