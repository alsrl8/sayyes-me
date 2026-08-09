/* sayyes.me 집계 수집기 — Cloudflare Worker.

   설치
     1) dash.cloudflare.com → Workers & Pages → Create → Worker
     2) 이 파일 내용을 통째로 붙여넣고 Deploy
     3) Settings → Variables → KV Namespace Bindings
        Variable name: STATS   /   KV namespace: 새로 하나 만들어 연결
     4) Settings → Variables → 환경변수 ADMIN 에 아무 비밀 문자열 하나
     5) 배포된 주소를 stats.js 의 ENDPOINT 에 넣는다

   보는 법
     https://<worker주소>/report?key=<ADMIN>

   원문은 애초에 여기까지 오지 않는다. 종류·길이·횟수만 센다. */

const ALLOW = 'https://alsrl8.github.io';

const cors = res => {
  res.headers.set('Access-Control-Allow-Origin', ALLOW);
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
};

// 세어도 되는 값만 통과시킨다. 예상 밖의 필드는 버린다.
function keysFor(e){
  const day = new Date().toISOString().slice(0, 10);
  const t = String(e.t || '').slice(0, 16);
  if (!/^(make_open|create|open|yes|leave)$/.test(t)) return [];

  const out = [`${day}|${t}`];

  if (t === 'create'){
    if (e.p)  out.push(`${day}|preset:${String(e.p).slice(0,12)}`);
    if (e.th) out.push(`${day}|theme:${String(e.th).slice(0,12)}`);
    if (e.custom) out.push(`${day}|custom_lines`);
    if (e.named)  out.push(`${day}|named`);
    const q = Number(e.qlen) || 0;
    out.push(`${day}|qlen:${q < 10 ? '0-9' : q < 20 ? '10-19' : q < 30 ? '20-29' : '30+'}`);
  }
  if (t === 'yes' || t === 'leave'){
    const n = Math.min(Number(e.esc) || 0, 99);
    out.push(`${day}|${t}_esc:${n < 1 ? '0' : n < 4 ? '1-3' : n < 8 ? '4-7' : '8+'}`);
  }
  return out;
}

export default {
  async fetch(req, env){
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));

    // 집계 보기
    if (url.pathname === '/report'){
      if (!env.ADMIN || url.searchParams.get('key') !== env.ADMIN){
        return new Response('nope', { status: 403 });
      }
      const list = await env.STATS.list({ limit: 1000 });
      const rows = await Promise.all(
        list.keys.map(async k => [k.name, Number(await env.STATS.get(k.name)) || 0])
      );
      rows.sort((a, b) => a[0] < b[0] ? 1 : -1);
      return new Response(JSON.stringify(Object.fromEntries(rows), null, 2),
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    if (req.method !== 'POST') return new Response('ok');

    let e;
    try { e = await req.json(); } catch { return cors(new Response('bad', { status: 400 })); }

    // KV 에는 원자적 증가가 없다. 소규모에서는 이 정도로 충분하고,
    // 동시 요청이 겹치면 몇 건 덜 세일 수 있다는 점만 알고 쓰면 된다.
    const keys = keysFor(e);
    await Promise.all(keys.map(async k => {
      const cur = Number(await env.STATS.get(k)) || 0;
      await env.STATS.put(k, String(cur + 1), { expirationTtl: 60 * 60 * 24 * 400 });
    }));

    return cors(new Response('ok'));
  },
};
