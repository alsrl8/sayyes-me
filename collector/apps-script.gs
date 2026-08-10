/* sayyes.me 로그 수집 + 모니터링 — Google Apps Script.
   서버 비용 0. 구글 계정만 있으면 된다.

   설치
     1) sheets.new 로 스프레드시트를 하나 만든다
     2) 확장 프로그램 → Apps Script → 이 파일 내용을 통째로 붙여넣는다
     3) 아래 ADMIN_KEY 를 아무 비밀 문자열로 바꾼다
     4) 배포 → 새 배포 → 유형: 웹 앱
        실행: 나                     (본인 계정으로 실행)
        액세스 권한: 모든 사용자      (링크를 여는 사람이 로그를 남겨야 하므로)
     5) 나온 웹 앱 URL 을 stats.js 의 ENDPOINT 에 넣는다

   모니터링
     <웹앱URL>?key=<ADMIN_KEY>
     신상·욕설로 의심되는 줄은 자동으로 표시된다.
*/

const ADMIN_KEY = 'CHANGE-ME';     // 반드시 바꿀 것
const SHEET     = 'log';
const MAX_VIEW  = 300;             // 모니터링 화면에 뿌릴 최근 줄 수

// ── 수집 ────────────────────────────────────────────────
function doPost(e){
  try {
    const d = JSON.parse(e.postData.contents);
    const sh = sheet_();
    sh.appendRow([
      new Date(),
      String(d.t || '').slice(0, 16),          // 이벤트 종류
      trunc_(d.q,  80),                        // 질문
      trunc_(d.to, 30),                        // 받는 사람
      trunc_(d.from, 30),                      // 보낸 사람
      trunc_(d.y,  20),                        // 눌리는 버튼
      trunc_(d.n,  20),                        // 도망가는 버튼
      trunc_((d.l || []).join(' / '), 900),    // 도망 문구 전체
      String(d.th || ''),
      Number(d.esc) || 0,                      // 도망 횟수
      String(d.s || ''),                       // 세션 임시 번호
      trunc_(d.ref, 120),                      // 어디서 왔나
    ]);
  } catch (err) { /* 수집 실패가 서비스를 막으면 안 된다 */ }
  return ContentService.createTextOutput('ok');
}

function sheet_(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh){
    sh = ss.insertSheet(SHEET);
    sh.appendRow(['시각','종류','질문','받는사람','보낸사람','예','아니오','도망문구','색','도망수','세션','유입']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function trunc_(v, n){ return v == null ? '' : String(v).slice(0, n); }

// ── 모니터링 화면 ───────────────────────────────────────
function doGet(e){
  if (!e || e.parameter.key !== ADMIN_KEY){
    return HtmlService.createHtmlOutput('<p style="font:14px system-ui">키가 필요합니다.</p>');
  }

  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return HtmlService.createHtmlOutput(page_([], 0));

  const from = Math.max(2, last - MAX_VIEW + 1);
  const rows = sh.getRange(from, 1, last - from + 1, 12).getValues().reverse();

  // ?format=json 이면 순수 JSON 으로 돌려준다.
  // HTML 은 iframe 안에 들어가서 브라우저 없이는 못 읽는다.
  if (e.parameter.format === 'json'){
    const out = rows.map(r => ({
      at: Utilities.formatDate(new Date(r[0]), 'Asia/Seoul', 'MM-dd HH:mm:ss'),
      t: r[1], q: r[2], to: r[3], from: r[4], y: r[5], n: r[6],
      lines: r[7], th: r[8], esc: r[9], s: r[10], ref: r[11],
    }));
    return ContentService
      .createTextOutput(JSON.stringify({ total: last - 1, rows: out }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createHtmlOutput(page_(rows, last - 1))
    .setTitle('sayyes 모니터링');
}

// 형태가 뚜렷해 오탐이 적은 것만 표시한다. 욕설은 자연어라 여기서 다 걸러지지 않는다.
const FLAGS = [
  { k:'주민번호', re:/\d{6}\s*[-–—]\s*[1-4]\d{6}/ },
  { k:'카드번호', re:/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/ },
  { k:'전화번호', re:/01[016-9][-.\s]?\d{3,4}[-.\s]?\d{4}/ },
  { k:'계좌번호', re:/\b\d{10,16}\b/ },
  { k:'이메일',   re:/[\w.+-]+@[\w-]+\.[a-z]{2,}/i },
  { k:'주소',     re:/\d+\s*동\s*\d+\s*호/ },
  { k:'욕설의심', re:/(시발|씨발|ㅅㅂ|병신|ㅄ|좆|개새|미친년|미친놈|죽어|꺼져)/ },
];

function page_(rows, total){
  const body = rows.map(r => {
    const text = [r[2], r[3], r[4], r[5], r[6], r[7]].join(' ');
    const hits = FLAGS.filter(f => f.re.test(text)).map(f => f.k);
    const when = Utilities.formatDate(new Date(r[0]), 'Asia/Seoul', 'MM-dd HH:mm');
    const cell = v => '<td>' + String(v == null ? '' : v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</td>';
    // 유입이 make.html 이면 만들기 화면의 미리보기다. 실제 열람과 구분해야 한다.
    const preview = /make\.html/.test(String(r[11] || ''));
    return '<tr class="' + (hits.length ? 'flag' : (preview ? 'prev' : '')) + '">'
      + '<td class="dim">' + when + '</td>'
      + cell(r[1])
      + (hits.length ? '<td class="tag">' + hits.join(', ') + '</td>'
                     : (preview ? '<td class="dim">미리보기</td>' : '<td></td>'))
      + cell(r[2]) + cell(r[3]) + cell(r[4])
      + cell(r[5] + ' / ' + r[6])
      + cell(r[9])
      + '<td class="dim">' + String(r[10] || '') + '</td>'
      + '<td class="lines">' + String(r[7]||'').replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</td>'
      + '</tr>';
  }).join('');

  return '<!DOCTYPE html><meta charset="utf-8">'
   + '<meta name="viewport" content="width=device-width,initial-scale=1">'
   + '<style>'
   + 'body{font:13px/1.5 system-ui,-apple-system,"Apple SD Gothic Neo",sans-serif;margin:0;padding:16px;color:#222}'
   + 'h1{font-size:17px;margin:0 0 4px}'
   + '.sub{color:#777;font-size:12px;margin-bottom:12px}'
   + '#q{width:100%;max-width:420px;padding:9px 12px;border:1px solid #ddd;border-radius:9px;font:inherit;margin-bottom:12px}'
   + 'table{border-collapse:collapse;width:100%;font-size:12.5px}'
   + 'th,td{border-bottom:1px solid #eee;padding:7px 9px;text-align:left;vertical-align:top}'
   + 'th{background:#fafafa;position:sticky;top:0;font-size:11.5px;color:#666}'
   + 'tr.flag{background:#fff6f6}'
   + 'tr.prev{opacity:.45}'
   + '.tag{color:#c0392b;font-weight:700;white-space:nowrap}'
   + '.dim{color:#999;white-space:nowrap}'
   + '.lines{color:#666;max-width:420px}'
   + '</style>'
   + '<h1>sayyes 로그</h1>'
   + '<div class="sub">전체 ' + total + '건 · 최근 ' + rows.length + '건 · 붉은 줄=신상/욕설 의심 · 흐린 줄=만들기 화면 미리보기</div>'
   + '<input id="q" placeholder="검색 (질문, 이름, 문구...)">'
   + '<table><thead><tr><th>시각</th><th>종류</th><th>표시</th><th>질문</th><th>받는</th><th>보낸</th>'
   + '<th>버튼</th><th>도망</th><th>세션</th><th>문구</th></tr></thead><tbody id="b">' + body + '</tbody></table>'
   + '<script>'
   + 'document.getElementById("q").addEventListener("input",function(e){'
   + 'var v=e.target.value.toLowerCase();'
   + 'Array.prototype.forEach.call(document.querySelectorAll("#b tr"),function(tr){'
   + 'tr.style.display = !v || tr.innerText.toLowerCase().indexOf(v)>-1 ? "" : "none";});});'
   + '<\/script>';
}
