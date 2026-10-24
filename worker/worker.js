/**
 * 学堂 —— 完整 Cloudflare Worker（同时托管 site/ 静态站 + 云端同步接口）
 *
 * 作用：
 *   1. GET/PUT /api/sync?k=<hex>  → 读写 Cloudflare KV（云端同步；key = 同步密钥的 SHA-256）
 *   2. 其余所有请求 → 交给 site/ 静态资源（ASSETS 绑定）
 *
 * 部署（在仓库根目录执行）：
 *   1. npm i -g wrangler            # 装 wrangler
 *   2. wrangler login              # 浏览器登录 Cloudflare
 *   3. wrangler kv namespace create xuetang-sync   # 建 KV，复制返回的 id
 *   4. 把 worker/wrangler.toml 里的 account_id 和 kv_namespaces.id 填上
 *   5. cd worker && wrangler deploy
 *
 * 如果你的站当前就是「自定义 Worker 直传部署」，把本文件粘进 Worker 编辑器、
 * 在控制台把 KV 绑定到变量名 SYNC_KV，再部署即可（站点静态文件仍由 site/ 提供）。
 */
const JSON_HEAD = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const CORS_HEAD = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,PUT,POST,OPTIONS", "access-control-allow-headers": "content-type" };
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { ...JSON_HEAD, ...CORS_HEAD } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // 云端同步接口（assets 优先模式下，只有未命中静态资产的请求才会进入 worker）
    if (url.pathname === "/api/sync") {
      return handleSync(request, env);
    }
    // 其余请求（理论上 assets 已优先接管，这里兜底透传，保证 404 等行为正常）
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("not found", { status: 404 });
  }
};

async function handleSync(request, env) {
  const method = request.method.toUpperCase();
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEAD });

  const k = (new URL(request.url).searchParams.get("k") || "").trim();
  if (!/^[a-f0-9]{16,128}$/i.test(k)) return json({ error: "bad_key" }, 400);

  const kv = env.SYNC_KV;
  if (!kv) return json({ error: "kv_not_bound" }, 500);

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
    return json({ error: "server_error", detail: String((e && e.message) || e) }, 500);
  }
}
