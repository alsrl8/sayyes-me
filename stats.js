/* sayyes.me 로그.

   악용 신고에 대응하려면 무슨 내용이 오갔는지 남아 있어야 한다.
   그래서 질문·이름·문구를 그대로 기록한다. 이 사실은 만들기 화면과
   링크를 여는 화면 양쪽에 적어두었다. 몰래 모으지 않는다.

   ENDPOINT 가 비어 있으면 아무것도 전송하지 않는다. */
window.STATS = (function(){

  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbw9RRr9OVGUVKkZttMZD-DBqlosqnBonkPlsqLnS7eSRAMtyN-KQdJdme6NF1_D6Jfz/exec';

  // 같은 사람이 만든 링크와 열린 기록을 이어보기 위한 임시 번호.
  // 탭을 닫으면 사라지고, 사람을 식별하지는 않는다.
  let sid = '';
  try {
    sid = sessionStorage.getItem('sid') || '';
    if (!sid){
      sid = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('sid', sid);
    }
  } catch (e) {}

  /* Apps Script 는 preflight(OPTIONS) 를 처리하지 못한다.
     'application/json' 으로 보내면 preflight 가 붙어 전송 자체가 막히므로
     반드시 text/plain 으로 보낸다. 내용은 그대로 JSON 문자열이다. */
  function send(type, data){
    if (!ENDPOINT) return;
    const body = JSON.stringify(Object.assign(
      { t: type, s: sid, ref: (document.referrer || '').slice(0, 120) },
      data || {}
    ));
    try {
      if (navigator.sendBeacon){
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain;charset=UTF-8' }));
      } else {
        fetch(ENDPOINT, {
          method: 'POST', body, keepalive: true, mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        });
      }
    } catch (e) { /* 기록 실패가 서비스를 막으면 안 된다 */ }
  }

  // 내용 전체. 신고가 들어왔을 때 이걸로 판단한다.
  function payload(cfg){
    return {
      q: cfg.q, to: cfg.t, from: cfg.f,
      y: cfg.y, n: cfg.n,
      l: Array.isArray(cfg.l) ? cfg.l : [],
      th: cfg.th,
    };
  }

  return {
    openMake(){ send('make_open'); },

    // 링크를 만들어 복사한 시점
    create(cfg){ send('create', payload(cfg)); },

    // 받는 사람이 링크를 연 시점.
    // 주소창을 직접 고쳐 만든 링크는 create 기록이 없으므로 여기서도 내용을 남긴다.
    open(cfg){ send('open', payload(cfg)); },

    yes(escapes){ send('yes', { esc: escapes }); },
    leave(escapes, done){ if (!done) send('leave', { esc: escapes }); },
  };
})();
