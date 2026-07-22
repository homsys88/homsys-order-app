홈시스 발주관리 앱 - 거래명세서 PDF 링크 카카오 발송 설정

이 기능은 무엇인가요
- 거래명세서 화면에서 "💬 카톡 발송" → "📎 명세서 링크 포함 발송"을 누르면
  1) 화면의 거래명세서를 PDF로 만들고
  2) Supabase Storage에 업로드해서 다운로드 링크를 만들고
  3) 그 링크를 카카오 알림톡 버튼에 담아 자동 발송합니다.
- 기존 "✉ 문자 발송"(MMS/SMS), "알림톡 보내기"(요약만)는 전혀 건드리지 않았습니다.
  이 기능이 설정 전이거나 문제가 생겨도 기존 발송 기능은 그대로 작동합니다.

전체 순서 (총 3단계)
1. Supabase Storage 버킷 만들기
2. Edge Function(send-solapi-kakao-link) 배포
3. 카카오 알림톡 템플릿에 링크 버튼 추가 + 재검수

──────────────────────────────
1. Supabase Storage 버킷 만들기
──────────────────────────────
1) Supabase 프로젝트(온수기앱) 접속 → 왼쪽 메뉴 Storage
2) "New bucket" → 이름: invoices → Public bucket 체크 해제(비공개로 둡니다)
3) 왼쪽 메뉴 SQL Editor에서 아래 SQL 실행 (직원 로그인 계정만 업로드/열람 가능하게 하는 정책)

  create policy "invoices_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'invoices');

  create policy "invoices_authenticated_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'invoices');

  (이미 만든 적이 있어서 정책 이름이 중복된다는 오류가 나면 무시해도 됩니다.)

──────────────────────────────
2. Edge Function 배포
──────────────────────────────
1) Supabase 왼쪽 메뉴 Edge Functions → Create a new function
2) 함수 이름: send-solapi-kakao-link  (반드시 이 이름 그대로)
3) 저장소의 supabase/functions/send-solapi-kakao-link/index.ts 내용을 전체 붙여넣고 Deploy
4) JWT 확인(Verify JWT)은 켜둡니다.
5) Secrets는 기존 send-solapi-message와 동일한 3개를 그대로 씁니다 (새로 등록할 필요 없음)
   SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_FROM_NUMBER

──────────────────────────────
3. 카카오 알림톡 템플릿에 링크 버튼 추가
──────────────────────────────
1) Solapi 콘솔 → 카카오/네이버 → 알림톡 템플릿 관리
2) 기존 "발주내역안내" 템플릿은 그대로 두고, 버튼이 추가된 새 템플릿을 하나 더 만드는 것을 권장합니다.
   (기존 템플릿을 수정하면 재검수 중에는 요약 알림톡도 같이 막힐 수 있습니다.)
3) 새 템플릿에 버튼 추가: 버튼 타입 "웹링크", URL을 변수로 지정 (예: #{링크})
   본문에는 기존과 동일하게 #{공급자} #{거래처} #{합계} #{계좌} 변수를 사용하시면 됩니다.
4) 저장 후 카카오 비즈니스 채널 검수 요청 (승인까지 보통 1~2일, 최대 며칠 소요될 수 있습니다)
5) 승인이 완료되면 발급된 templateId를 app.js에서 찾아 입력합니다.

  app.js 안에서 아래 줄을 찾아
    const KAKAO_ORDER_LINK_TEMPLATE_ID = '';
  승인된 템플릿 ID를 따옴표 안에 넣고 저장 → GitHub에 커밋/푸시

  예: const KAKAO_ORDER_LINK_TEMPLATE_ID = 'AbCdEfGhIj';

이 값이 빈 문자열인 동안에는 "📎 명세서 링크 포함 발송" 버튼을 눌러도
"아직 설정 전입니다"라는 안내만 뜨고 실제 발송은 되지 않습니다. 설정 전 오발송 걱정 없이
미리 배포해두셔도 괜찮습니다.

──────────────────────────────
시험 발송
──────────────────────────────
- 템플릿 승인 + templateId 입력까지 끝나면, 본인 휴대폰 번호로 먼저 1건 시험 발송해보세요.
- 받은 알림톡의 버튼을 눌러 PDF가 정상적으로 열리는지 확인합니다.
- 링크는 7일간 유효합니다 (그 이후에는 다시 발송해야 합니다).

오류 확인
- "링크 포함 발송은 아직 설정 전입니다": templateId 미입력
- 업로드 실패: 1번 Storage 버킷/정책 재확인
- 발송 실패(카카오 관련 오류): 템플릿 승인 상태, pfId/templateId 확인
- 401: 로그아웃 후 재로그인 / Edge Function JWT 설정 확인
