/* 익명 집계.
   사람들이 적은 내용(질문·이름·문구 원문)은 절대 보내지 않는다.
   보내는 건 "어떤 종류를 골랐나 / 몇 글자였나 / 끝까지 갔나" 뿐이다.

   ENDPOINT 가 비어 있으면 아무것도 전송하지 않는다. 수집처를 정한 뒤 이 한 줄만 채우면 된다. */
window.STATS = (function(){

  const ENDPOINT = '';        // 예: 'https://<수집처>/e'

  // 방문자를 식별하지 않는다. 세션 구분용으로 탭이 살아있는 동안만 쓰는 임시 번호.
  let sid = '';
  try {
    sid = sessionStorage.getItem('sid') || '';
    if (!sid){
      sid = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('sid', sid);
    }
  } catch (e) { /* 저장이 막혀 있으면 그냥 세션 구분 없이 간다 */ }

  function send(type, data){
    if (!ENDPOINT) return;
    const body = JSON.stringify(Object.assign({ t: type, s: sid, at: Date.now() }, data || {}));
    try {
      if (navigator.sendBeacon){
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(ENDPOINT, { method:'POST', body, keepalive:true, headers:{'Content-Type':'application/json'} });
      }
    } catch (e) { /* 집계 실패가 서비스를 방해하면 안 된다 */ }
  }

  return {
    // 만들기 화면에 들어옴
    openMake(){ send('make_open'); },

    // 링크를 복사함. 무엇을 골랐는지만 남기고 내용은 남기지 않는다.
    create(cfg, preset){
      send('create', {
        p: preset || null,                                   // 프리셋 종류
        th: cfg.th,                                          // 색
        qlen: (cfg.q || '').length,                          // 질문 길이만
        named: !!cfg.t,                                      // 받는 사람을 적었는지 여부
        lines: Array.isArray(cfg.l) ? cfg.l.length : 0,      // 문구 줄 수
        custom: !!cfg.customLines,                           // 문구를 직접 고쳤는지
      });
    },

    // 받는 사람이 링크를 열었다
    open(cfg){ send('open', { th: cfg.th, qlen: (cfg.q || '').length }); },

    // 끝까지 눌렀다. 여기까지 온 비율이 이 서비스의 성적표다.
    yes(escapes){ send('yes', { esc: escapes }); },

    // 열었지만 '응'을 누르지 않고 떠났다
    leave(escapes, done){ if (!done) send('leave', { esc: escapes }); },
  };
})();
