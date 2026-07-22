// send-solapi-kakao-link
// 거래명세서 PDF 링크를 카카오 알림톡(웹링크 버튼)으로 발송합니다.
// 기존 send-solapi-message(문자/MMS)와는 완전히 별개의 함수이며,
// 여기서 문제가 생겨도 문자/MMS 발송에는 영향이 없습니다.
//
// 배포 방법은 README_카톡링크발송_설정순서.txt 참고.

import { createHmac } from "node:crypto";

const SOLAPI_API_KEY = Deno.env.get("SOLAPI_API_KEY") ?? "";
const SOLAPI_API_SECRET = Deno.env.get("SOLAPI_API_SECRET") ?? "";
const SOLAPI_FROM_NUMBER = Deno.env.get("SOLAPI_FROM_NUMBER") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function solapiAuthHeader(): string {
  const date = new Date().toISOString();
  const salt = crypto.randomUUID();
  const signature = createHmac("sha256", SOLAPI_API_SECRET)
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;
}

interface RequestBody {
  to?: string;
  pfId?: string;
  templateId?: string;
  variables?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "POST만 지원합니다." }, 405);

  if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET || !SOLAPI_FROM_NUMBER) {
    return jsonResponse({ ok: false, error: "Solapi Secrets이 설정되지 않았습니다." }, 500);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "요청 본문이 올바르지 않습니다." }, 400);
  }

  const { to, pfId, templateId, variables } = body;
  if (!to || !pfId || !templateId || !variables || !variables["링크"]) {
    return jsonResponse(
      { ok: false, error: "받는 번호, 템플릿 정보, 명세서 링크가 모두 필요합니다." },
      400,
    );
  }

  const message = {
    to: to.replace(/[^0-9]/g, ""),
    from: SOLAPI_FROM_NUMBER,
    kakaoOptions: {
      pfId,
      templateId,
      variables,
      disableSms: true, // 알림톡 실패 시 문자로 자동 대체 발송하지 않음 (요금 방지)
    },
  };

  try {
    const res = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: solapiAuthHeader(),
      },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (!res.ok) {
      return jsonResponse(
        { ok: false, error: data?.errorMessage || data?.message || "솔라피 발송에 실패했습니다." },
        res.status,
      );
    }
    return jsonResponse({ ok: true, data });
  } catch (e) {
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : "발송 중 오류가 발생했습니다." },
      500,
    );
  }
});
