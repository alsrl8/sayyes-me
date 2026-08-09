/* sayyes.me — 에디터(index.html)와 결과 화면(p.html)이 함께 쓰는 정의.
   서버가 없으므로 모든 내용은 URL 에 실어 보낸다. */
window.SAYYES = (function(){

  // 키를 한 글자로 줄인 건 URL 길이 때문. t=to, q=질문, y=예, n=아니오,
  // f=보낸사람, dt/ds=성공화면 제목·설명, th=테마, l=도망 문구들
  const DEFAULTS = {
    t:'', q:'나 용서해줄래?', y:'응', n:'싫어', f:'',
    dt:'고마워!', ds:'이제 화 풀린 걸로 할게', th:'pink',
    l:[
      '제발...',
      '어? 손가락 미끄러졌지',
      '그 버튼은 안 눌려',
      '진짜 안 눌린다니까',
      '계속 해봐 ㅋㅋ',
      '이거 만든 사람이 그렇게 짰어',
      '손 안 아파?',
      '그냥 응 눌러주라',
      '응 누를 때까지 안 끝남',
      '...',
      '알겠으니까 응 눌러'
    ]
  };

  // 도망 횟수에 따라 표정이 순해진다. 문구 개수와 무관하게 비율로 매핑.
  const FACES = ['🥺','🥺','😢','😭','🙏','🙏','😇','😌','🫠','😐','🥹'];

  const PRESETS = [
    {
      key:'sorry', chip:'🥺 사과', th:'pink',
      q:'나 용서해줄래?', y:'응', n:'싫어',
      dt:'고마워!', ds:'이제 화 풀린 걸로 할게',
      l:DEFAULTS.l
    },
    {
      key:'love', chip:'💗 고백', th:'purple',
      q:'나랑 사귈래?', y:'좋아', n:'싫어',
      dt:'우리 이제 1일!', ds:'스크린샷 찍어놨다',
      l:[
        '두근두근...',
        '어 그거 잘못 눌렀지?',
        '그 버튼은 장식이야',
        '한 번만 더 생각해봐',
        '왜 자꾸 그쪽으로 가',
        '이거 만든 사람이 그렇게 짰어',
        '손가락 안 아파?',
        '좋아 누르면 끝나',
        '좋아 누를 때까지 안 끝남',
        '...',
        '알겠으니까 좋아 눌러'
      ]
    },
    {
      key:'date', chip:'🍽️ 약속', th:'peach',
      q:'내일 나랑 밥 먹을래?', y:'콜', n:'바빠',
      dt:'좋아 그럼 내일!', ds:'시간이랑 장소는 따로 보낼게',
      l:[
        '맛있는 거 사줄게',
        '어? 잘못 눌렀네',
        '바빠는 안 눌려',
        '스케줄 비었잖아',
        '계속 해봐 ㅋㅋ',
        '이거 만든 사람이 그렇게 짰어',
        '손 안 아파?',
        '그냥 콜 눌러주라',
        '콜 누를 때까지 안 끝남',
        '...',
        '알겠으니까 콜 눌러'
      ]
    },
    {
      key:'favor', chip:'🙏 부탁', th:'mint',
      q:'이번 한 번만 부탁 들어줄래?', y:'알겠어', n:'싫어',
      dt:'진짜 고마워!', ds:'이 은혜는 갚을게',
      l:[
        '진짜 이번 한 번만',
        '어? 손가락 미끄러졌지',
        '그 버튼은 안 눌려',
        '다음엔 내가 갚을게',
        '계속 해봐 ㅋㅋ',
        '이거 만든 사람이 그렇게 짰어',
        '손 안 아파?',
        '그냥 알겠어 눌러주라',
        '알겠어 누를 때까지 안 끝남',
        '...',
        '제발'
      ]
    }
  ];

  const THEMES = [
    {key:'pink',   label:'핑크',   c:'#ff6b9d'},
    {key:'purple', label:'퍼플',   c:'#8b5cf6'},
    {key:'mint',   label:'민트',   c:'#14b8a6'},
    {key:'peach',  label:'피치',   c:'#fb7a4b'}
  ];

  /* ── 내용 검사 ──────────────────────────────────────────────
     이 서비스는 내용을 URL 에 담아 보낸다. 서버에 저장되는 게 없다는 뜻이고,
     한번 퍼진 링크를 나중에 내릴 방법도 없다는 뜻이다.
     그래서 '만들 때'가 아니라 '열릴 때' 검사한다. 주소창을 직접 고쳐도 이건 통과 못 한다. */

  const LIMITS = { q:60, t:20, f:20, y:12, n:12, dt:40, ds:60, line:40, lines:30 };

  // 형태가 뚜렷해서 오탐이 적은 것만 막는다. 욕설 같은 자연어는 여기서 못 거른다.
  const RISKY = [
    { kind:'주민등록번호', re:/\d{6}\s*[-–—]\s*[1-4]\d{6}/ },
    { kind:'카드번호',     re:/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/ },
    { kind:'전화번호',     re:/01[016-9][-.\s]?\d{3,4}[-.\s]?\d{4}/ },
    { kind:'전화번호',     re:/\b0[2-6]\d?[-.\s]\d{3,4}[-.\s]\d{4}\b/ },
    { kind:'계좌번호',     re:/\b\d{10,16}\b/ },
    { kind:'이메일 주소',  re:/[\w.+-]+@[\w-]+\.[a-z]{2,}/i },
    { kind:'상세 주소',    re:/\d+\s*동\s*\d+\s*호/ }
  ];

  // 길이를 넘는 입력은 잘라낸다. 장문으로 남의 사연을 늘어놓는 걸 구조적으로 막는다.
  function clamp(cfg){
    const c = Object.assign({}, cfg);
    ['q','t','f','y','n','dt','ds'].forEach(k=>{
      if (typeof c[k] === 'string') c[k] = c[k].slice(0, LIMITS[k]);
    });
    if (Array.isArray(c.l)){
      c.l = c.l.slice(0, LIMITS.lines).map(s => String(s).slice(0, LIMITS.line));
    }
    return c;
  }

  // 내용에 남의 신상이 들어 있으면 화면을 아예 띄우지 않는다.
  function inspect(cfg){
    const text = ['q','t','f','y','n','dt','ds']
      .map(k => cfg[k] || '')
      .concat(Array.isArray(cfg.l) ? cfg.l : [])
      .join('\n');
    for (const r of RISKY){
      if (r.re.test(text)) return { ok:false, kind:r.kind };
    }
    return { ok:true };
  }

  /* 도망갈 자리를 고른다. 질문 화면과 데모가 같은 규칙을 쓴다.
     o = { w,h        : 도망칠 버튼 크기
           boxW,boxH  : 움직일 수 있는 영역 크기
           curX,curY  : 지금 위치 (좌상단 기준)
           px,py      : 포인터/손가락 위치
           avoid      : 절대 겹치면 안 되는 사각형들 [{x,y,w,h}]
           pad, gap }
     규칙 1. avoid 와 겹치는 자리는 무조건 탈락 — '응' 버튼을 가리면 안 된다.
     규칙 2. 포인터에서 충분히 멀되, 지금 자리에서 가장 가까운 곳.
             구석으로 순간이동하면 금방 질리고, 찔끔찔끔 피해야 약이 오른다. */
  function pickSpot(o){
    const pad = o.pad != null ? o.pad : 10;
    const gap = o.gap != null ? o.gap : 16;
    const w = o.w, h = o.h;
    const maxX = Math.max(pad, o.boxW - w - pad);
    const maxY = Math.max(pad, o.boxH - h - pad);
    const safe = Math.min(150, Math.min(o.boxW, o.boxH) * .36);
    const avoid = o.avoid || [];

    const blocked = (x, y) => avoid.some(a =>
      x < a.x + a.w + gap && x + w + gap > a.x &&
      y < a.y + a.h + gap && y + h + gap > a.y
    );

    let best = null, near = Infinity, fb = null, fbFar = -1;
    for (let i = 0; i < 48; i++){
      const x = pad + Math.random() * (maxX - pad);
      const y = pad + Math.random() * (maxY - pad);
      if (blocked(x, y)) continue;
      const dp = Math.hypot(x + w/2 - o.px, y + h/2 - o.py);
      if (dp > fbFar){ fbFar = dp; fb = {x,y}; }   // 못 고르면 쓸 예비 후보
      if (dp < safe) continue;
      const dh = Math.hypot(x - o.curX, y - o.curY);
      if (dh < near){ near = dh; best = {x,y}; }
    }
    if (best) return best;
    if (fb) return fb;

    // 화면이 좁아 랜덤이 전부 막히는 경우가 있다. 격자로 확실히 훑는다.
    let g = null, gFar = -1;
    const sx = Math.max(8, (maxX - pad) / 14), sy = Math.max(8, (maxY - pad) / 14);
    for (let x = pad; x <= maxX; x += sx){
      for (let y = pad; y <= maxY; y += sy){
        if (blocked(x, y)) continue;
        const dp = Math.hypot(x + w/2 - o.px, y + h/2 - o.py);
        if (dp > gFar){ gFar = dp; g = {x,y}; }
      }
    }
    return g || {x:pad, y:pad};
  }

  // 한글이 섞이므로 UTF-8 로 바꾼 뒤 base64url. URL 에 안전한 문자만 남긴다.
  function encode(obj){
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = '';
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  function decode(str){
    let s = str.replace(/-/g,'+').replace(/_/g,'/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  return { DEFAULTS, FACES, PRESETS, THEMES, LIMITS, clamp, inspect, pickSpot, encode, decode };
})();
