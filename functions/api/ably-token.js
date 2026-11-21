export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  if (!env.ABLY_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ABLY_API_KEY не настроен в Cloudflare' }),
      { status: 500, headers }
    );
  }

  try {
    const apiKey = env.ABLY_API_KEY.trim();
    const keyName = apiKey.split(':')[0];
    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId') || `user-${Math.random().toString(36).slice(2, 10)}`;

    const res = await fetch(`https://rest.ably.io/keys/${encodeURIComponent(keyName)}/requestToken`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(apiKey)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        keyName,
        timestamp: Date.now(),
        clientId
      })
    });

    const data = await res.text();
    return new Response(data, { status: res.status, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
