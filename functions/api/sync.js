export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  if (!env.EDUBOARD_KV) {
    return new Response(
      JSON.stringify({ ok: false, error: 'База KV не подключена в настройках Cloudflare' }),
      { status: 500, headers }
    );
  }

  try {
    const body = await request.json();
    const action = body?.action || (body?.data ? 'save' : 'load');
    const rawUser = body?.username || body?.login || body?.user || '';
    const rawPass = body?.passwordHash || body?.passHash || body?.password || body?.pass || '';
    const data = body?.data ?? null;

    if (!rawUser || !rawPass) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Укажите логин и пароль' }),
        { status: 400, headers }
      );
    }

    const key = `user:${String(rawUser).trim().toLowerCase()}`;
    const passVal = String(rawPass);
    const existingRaw = await env.EDUBOARD_KV.get(key);
    const existing = existingRaw ? JSON.parse(existingRaw) : null;

    if (action === 'load' || action === 'login' || action === 'get') {
      if (!existing) {
        await env.EDUBOARD_KV.put(key, JSON.stringify({ passwordHash: passVal, data: null, updatedAt: Date.now() }));
        return new Response(JSON.stringify({ ok: true, isNew: true, data: null }), { headers });
      }
      if (existing.passwordHash !== passVal) {
        return new Response(JSON.stringify({ ok: false, error: 'Неверный пароль' }), { status: 401, headers });
      }
      return new Response(JSON.stringify({ ok: true, isNew: false, data: existing.data }), { headers });
    }

    if (action === 'save' || action === 'register' || action === 'put') {
      if (existing && existing.passwordHash !== passVal) {
        return new Response(JSON.stringify({ ok: false, error: 'Неверный пароль' }), { status: 401, headers });
      }
      await env.EDUBOARD_KV.put(key, JSON.stringify({ passwordHash: passVal, data, updatedAt: Date.now() }));
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Неизвестное действие' }), { status: 400, headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers });
  }
}
