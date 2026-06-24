import { spawn } from "node:child_process";
import { createServer } from "node:http";

const port = 3100;
const supabaseMockPort = 3101;
const baseUrl = process.env.TEST_BASE_URL ?? `http://localhost:${port}`;
const useExternalServer = Boolean(process.env.TEST_BASE_URL);
const expectedStripePaymentLink = "https://buy.stripe.com/14AbJ33twfkeg9J7vIejK00";
const supabaseRequests = [];
const progressRows = new Map();

function fail(message) {
  throw new Error(message);
}

function getSetCookie(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const raw = headers.get("set-cookie");
  return raw ? raw.split(/,(?=\s*seminar_)/) : [];
}

function toCookieHeader(setCookies) {
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function waitForServer() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30000) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  fail("テスト用サーバーを起動できませんでした");
}

async function fetchText(path, cookieHeader = "", options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    ...options,
  });
  const text = await response.text();

  return {
    response,
    setCookies: getSetCookie(response.headers),
    text,
  };
}

async function fetchJson(path, cookieHeader = "", body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();

  return {
    response,
    json: text ? JSON.parse(text) : {},
    text,
  };
}

function startSupabaseMock() {
  if (useExternalServer) {
    return undefined;
  }

  const server = createServer((request, response) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      if (request.url === "/rest/v1/seminar_viewers" && request.method === "POST") {
        supabaseRequests.push({
          body: JSON.parse(body),
          headers: request.headers,
          method: request.method,
          url: request.url,
        });
        response.writeHead(201, { "content-type": "application/json" });
        response.end("{}");
        return;
      }

      if (request.url?.startsWith("/rest/v1/seminar_video_progress")) {
        const url = new URL(request.url, `http://localhost:${supabaseMockPort}`);
        const viewerId = url.searchParams.get("viewer_id")?.replace(/^eq\./, "");
        const videoId = url.searchParams.get("video_id")?.replace(/^eq\./, "");
        const key = `${viewerId ?? ""}:${videoId ?? ""}`;

        if (request.method === "GET") {
          const row = progressRows.get(key);
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify(row ? [row] : []));
          return;
        }

        if (request.method === "POST" || request.method === "PATCH") {
          const row = JSON.parse(body);
          const nextKey = `${row.viewer_id}:${row.video_id}`;
          progressRows.set(nextKey, row);
          response.writeHead(request.method === "POST" ? 201 : 200, {
            "content-type": "application/json",
          });
          response.end(JSON.stringify([row]));
          return;
        }
      }

      response.writeHead(404);
      response.end("not found");
    });
  });

  server.listen(supabaseMockPort);
  return server;
}

function expectIncludes(text, value, label) {
  if (!text.includes(value)) {
    fail(`${label} が表示されていません`);
  }
}

function expectExcludes(text, value, label) {
  if (text.includes(value)) {
    fail(`${label} が表示されてはいけません`);
  }
}

const supabaseMock = startSupabaseMock();
const server = useExternalServer
  ? undefined
  : spawn("npm", ["run", "start", "--", "--port", String(port)], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
        SUPABASE_URL: `http://localhost:${supabaseMockPort}`,
      },
      stdio: "ignore",
    });

try {
  await waitForServer();
  supabaseRequests.length = 0;
  progressRows.clear();

  const first = await fetchText("/?view=before");
  const cookies = toCookieHeader(first.setCookies);

  if (!cookies.includes("seminar_viewer_id=")) {
    fail("匿名閲覧者IDのCookieが発行されていません");
  }

  if (!first.setCookies.every((cookie) => cookie.includes("HttpOnly"))) {
    fail("CookieがHttpOnlyになっていません");
  }

  if (!useExternalServer) {
    if (supabaseRequests.length !== 1) {
      fail("初回アクセス情報がSupabaseへ1回保存されていません");
    }

    const savedRecord = supabaseRequests[0].body;
    if (!savedRecord.viewer_id || !savedRecord.first_accessed_at || !savedRecord.expires_at) {
      fail("Supabaseへ保存する閲覧期限情報に不足があります");
    }

    if (savedRecord.first_accessed_at === savedRecord.expires_at) {
      fail("初回アクセス日時と期限日時が同じになっています");
    }
  }

  expectIncludes(first.text, "セミナー動画", "販売前の動画");
  expectExcludes(first.text, "今すぐ申し込む", "販売前の申込ボタン");
  expectExcludes(first.text, "期限付きセミナー参加者限定プログラム", "販売前の商品説明");

  const second = await fetchText("/?view=before", cookies);
  if (!useExternalServer && supabaseRequests.length !== 1) {
    fail("再アクセスで初回アクセス情報が上書き保存されています");
  }
  expectIncludes(second.text, "セミナー動画", "再アクセス後の動画");
  expectExcludes(second.text, "今すぐ申し込む", "再アクセス後の販売前申込ボタン");

  if (!useExternalServer) {
    const excessiveJump = await fetchJson("/api/video-progress", cookies, {
      currentPositionSeconds: 999,
      maxWatchedSeconds: 999,
    });

    if (excessiveJump.json.maxWatchedSeconds !== 15) {
      fail("不自然に大きい視聴位置が制限されていません");
    }

    for (const seconds of [30, 45, 60]) {
      await fetchJson("/api/video-progress", cookies, {
        currentPositionSeconds: seconds,
        maxWatchedSeconds: seconds,
      });
    }

    const unlocked = await fetchJson("/api/video-progress", cookies);
    if (!unlocked.json.salesUnlocked) {
      fail("販売パート解放条件を満たしても解放済みになっていません");
    }

    const unlockedPage = await fetchText("/?view=before", cookies);
    expectIncludes(unlockedPage.text, "今すぐ申し込む", "販売解放後の申込ボタン");
    expectIncludes(unlockedPage.text, expectedStripePaymentLink, "販売解放後のStripe決済リンク");
  }

  const after = await fetchText("/?view=after", cookies);
  if (!useExternalServer && supabaseRequests.length !== 1) {
    fail("販売後表示で初回アクセス情報が上書き保存されています");
  }
  expectIncludes(after.text, "今すぐ申し込む", "販売後の申込ボタン");
  expectIncludes(after.text, expectedStripePaymentLink, "販売後のStripe決済リンク");
  expectIncludes(after.text, "運営からのお知らせ", "販売後のお知らせ");

  const expiredCookies = [
    "seminar_viewer_id=test-expired-viewer",
    "seminar_started_at=2020-01-01T00%3A00%3A00.000Z",
    "seminar_expires_at=2020-01-01T00%3A05%3A00.000Z",
  ].join("; ");
  const expired = await fetchText("/?view=after", expiredCookies);
  if (!useExternalServer && supabaseRequests.length !== 1) {
    fail("期限切れ表示で初回アクセス情報が上書き保存されています");
  }
  expectIncludes(expired.text, "視聴期限切れ", "期限切れタイトル");
  expectIncludes(expired.text, "閲覧期限は終了しました", "期限切れ本文");
  expectExcludes(expired.text, "今すぐ申し込む", "期限切れ後の申込ボタン");
  expectExcludes(expired.text, "期限付きセミナー参加者限定プログラム", "期限切れ後の商品説明");
  expectExcludes(expired.text, "love-opening", "期限切れ後の画像");

  console.log("期限管理フローの自動チェックに合格しました。");
} finally {
  server?.kill("SIGTERM");
  supabaseMock?.close();
}
