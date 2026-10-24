/**
 * Cloudflare Pages Function —— 学堂云端同步接口（无鉴权后端，靠「同步密钥哈希」作为存储键）
 *
 * 路由：/api/sync?k=<key>
 *   GET  → 返回该 key 下保存的同步包（{updatedAt, data}），无数据则返回 {updatedAt:0, data:null}
 *   PUT  → 以请求体（JSON 同步包）覆盖写入该 key
 *   POST → 同 PUT（兼容）
 *   OPTIONS → 预检（跨域）
 *
 * 部署前准备（Cloudflare 控制台）：
 *   1. 建一个 KV 命名空间（如 xuetang-sync）。
 *   2. 在你的 Pages 项目（两个域名都要）绑定该 KV，变量名必须叫 SYNC_KV。
 *   3. 推本仓库到 main → Pages 自动部署 /functions，两个域名共用同一个 SYNC_KV → 数据互通。
 *
 * 安全说明：key = SHA-256(同步密钥)。任何人拿到密钥即可读写该家庭数据；适合家庭自用。
 * 如需云端不可读，可后续在客户端用密钥派生再做一层加密（本版未做）。
 */
// redeploy trigger (ah): 确保 /api/sync 函数在本次发布中被正确发布
const JSON_HEAD = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const CORS_HEAD = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,PUT,POST,OPTIONS", "access-control-allow-headers": "content-type" };

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { ...JSON_HEAD, ...CORS_HEAD } });
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEAD });
  }

  const url = new URL(request.url);
  const k = (url.searchParams.get("k") || "").trim();
  // key 必须是 16~128 位十六进制（即 SHA-256 哈希），防止任意键名滥用
  if (!/^[a-f0-9]{16,128}$/i.test(k)) {
    return json({ error: "bad_key" }, 400);
  }

  const kv = env.SYNC_KV;
  if (!kv) {
    return json({ error: "kv_not_bound" }, 500);
  }

  try {
    if (method === "GET") {
      const v = await kv.get(k);
      if (v === null) return json({ updatedAt: 0, data: null });
      return new Response(v, { status: 200, headers: { ...JSON_HEAD, ...CORS_HEAD } });
    }

    if (method === "PUT" || method === "POST") {
      const body = await request.text();
      if (body.length > 5 * 1024 * 1024) return json({ error: "too_large" }, 413);
      let parsed;
      try { parsed = JSON.parse(body); } catch (e) { return json({ error: "bad_json" }, 400); }
      if (!parsed || typeof parsed !== "object" || !("data" in parsed)) return json({ error: "bad_payload" }, 400);
      parsed.updatedAt = Number(parsed.updatedAt) || Date.now();
      await kv.put(k, JSON.stringify(parsed));
      return json({ ok: true, updatedAt: parsed.updatedAt });
    }

    return json({ error: "method_not_allowed" }, 405);
  } catch (e) {
    return json({ error: "server_error", detail: String(e && e.message || e) }, 500);
  }
}
