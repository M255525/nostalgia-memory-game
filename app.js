'use strict';
/* 懷舊回憶遊戲：進度只存在這支手機（localStorage 前綴 nmg.）。不計時，答錯也給糖。 */

var $ = function(id){ return document.getElementById(id); };
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function lsGet(k){ try { return localStorage.getItem('nmg.' + k); } catch(e){ return null; } }
function lsSet(k, v){ try { localStorage.setItem('nmg.' + k, v); return true; } catch(e){ return false; } }
function lsDel(k){ try { localStorage.removeItem('nmg.' + k); } catch(e){} }
function lsJson(k, d){ try { var v = JSON.parse(lsGet(k)); return v == null ? d : v; } catch(e){ return d; } }

var BY = {}; QUESTIONS.forEach(function(q){ BY[q.id] = q; });
var HOLES = 12;
var cfg = Object.assign({speak:false, sfx:true}, lsJson('cfg', {}));
var board = null;                 // {ids:[], done:[]}
var jar = lsJson('jar', {});      // {題目id: 吃到幾顆}
var cur = null;                   // 正在答的題 {id, opts, wrong, msg, hint}
var won = null;                   // 剛答完 {first:是否一次答對}
var gset = Object.assign({cat:'all', n:10, teams:0}, lsJson('gset', {}));
var stage = lsJson('stage', null);
var ua = navigator.userAgent || '';
var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
function saveCfg(){ lsSet('cfg', JSON.stringify(cfg)); }
function saveBoard(){ lsSet('board', JSON.stringify(board)); }
function saveStage(){ if(stage) lsSet('stage', JSON.stringify(stage)); else lsDel('stage'); }
function candies(){ return Object.keys(jar).reduce(function(s, k){ return s + jar[k]; }, 0); }
function shuffle(a){ a = a.slice(); for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function go(h){ if(location.hash === h) route(); else location.hash = h; }
function toast(t){ var e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.appendChild(e); setTimeout(function(){ e.remove(); }, 2400); }

/* ---------- 聲音 ---------- */
function say(t){
  if(!window.speechSynthesis) { toast('這台手機不支援朗讀'); return; }
  speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(t); u.lang = 'zh-TW'; u.rate = .9; speechSynthesis.speak(u);
}
function hush(){ if(window.speechSynthesis) speechSynthesis.cancel(); }
var actx = null;
function tone(notes){
  if(!cfg.sfx) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    notes.forEach(function(n, i){
      var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * .11;
      o.frequency.value = n; o.type = 'triangle'; g.gain.setValueAtTime(.16, t); g.gain.exponentialRampToValueAtTime(.001, t + .22);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + .24);
    });
  } catch(e){}
}

/* ---------- 戳戳紙 ---------- */
function newBoard(){
  // 先用還沒吃過的題目，三類輪流放，才不會一張全是同一類
  var fresh = {o:[], p:[], s:[]}, seen = [];
  shuffle(QUESTIONS).forEach(function(q){ if(jar[q.id]) seen.push(q.id); else fresh[q.c].push(q.id); });
  var ids = [], keys = ['o', 'p', 's'], i = 0, guard = 0;
  while(ids.length < HOLES && guard++ < 200){ var l = fresh[keys[i++ % 3]]; if(l.length) ids.push(l.shift()); else if(!fresh.o.length && !fresh.p.length && !fresh.s.length) break; }
  ids = ids.concat(seen.slice(0, HOLES - ids.length));
  board = {ids:shuffle(ids), done:[]}; saveBoard();
}
function loadBoard(){
  board = lsJson('board', null);
  if(!board || !Array.isArray(board.ids) || board.ids.length !== HOLES || !board.ids.every(function(i){ return BY[i]; })) newBoard();
}

/* ---------- 共用片段 ---------- */
function credit(id, full){
  var p = PHOTOS[id]; if(!p) return '';
  var lic = p.licenseUrl ? '<a href="' + esc(p.licenseUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(p.license) + '</a>' : esc(p.license);
  // 答題時不顯示檔名與來源連結，以免直接看到答案
  return '<small class="cr">照片：' + esc(p.author) + '／' + lic + (full ? '／<a href="' + esc(p.page) + '" target="_blank" rel="noopener noreferrer">' + esc(p.title) + '（Wikimedia Commons）</a>／已縮小尺寸' : '／Wikimedia Commons') + '</small>';
}
function media(q, full){
  if(q.c === 's') return '<div class="discwrap"><div class="disc" role="img" aria-label="旋轉的黑膠唱片"><b>' + esc(q.y) + '</b></div></div>';
  var p = PHOTOS[q.id];
  return '<figure class="pic" style="margin-inline:0"><img src="photos/' + q.id + '.jpg" width="' + p.w + '" height="' + p.h + '" alt="' + (full ? esc(q.a) + '的照片' : '題目照片') + '">' + credit(q.id, full) + '</figure>';
}
function srcLine(q){
  var l = SOURCES[q.id];
  var s = l ? l.map(function(x){ return '<a href="' + esc(x[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(x[0]) + '</a>'; }).join('、') : esc(LIFE);
  return '<p class="src">資料來源：' + s + '（文字為自行改寫）</p>';
}
function ytUrl(q){ return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q.a + ' ' + q.sing); }
function foot(){ return '<div class="foot noprint"><a href="#credits">資料來源與版權</a><button data-act="warn">⚠ 使用警語</button><a href="manual.html">操作手冊</a><button data-act="settings">⚙ 常用設定</button></div>'; }
function backBar(t, href, label){ return '<div class="bar noprint"><a class="back" href="' + (href || '#home') + '">← ' + (label || '回戳戳紙') + '</a><h1>' + esc(t) + '</h1></div>'; }

/* ---------- 首頁 ---------- */
function viewHome(){
  var h = '<header class="sign"><h1>懷舊回憶遊戲</h1><p>老東西・老照片・老歌</p><button class="gear" data-act="settings" aria-label="常用設定">⚙</button></header>';
  var all = board.done.length >= board.ids.length;
  h += '<section class="board"><div class="bh">' + (all ? '這張戳完了，太厲害了！' : '戳一個洞，看看裡面是什麼') + '</div><div class="holes">';
  board.ids.forEach(function(id, i){
    var d = board.done.indexOf(id) >= 0;
    h += '<button class="hole k' + (i % 4) + (d ? ' done' : '') + '" data-hole="' + i + '" aria-label="第 ' + (i + 1) + ' 個洞' + (d ? '，已經戳開，再看一次' : '') + '">' + (d ? '🍬' : (i + 1)) + '</button>';
  });
  h += '</div></section>';
  if(all) h += '<button class="btn" data-act="fresh">換一張新的戳戳紙</button>';
  h += '<div class="row2"><a class="btn teal" href="#group">👥 帶大家玩</a><a class="btn alt" href="#jar">🍬 糖果 ' + candies() + ' 顆</a></div>' + foot();
  $('app').innerHTML = h;
}

/* ---------- 答題 ---------- */
function readQ(q, opts){ say(q.q + '。' + opts.map(function(o, i){ return '第' + (i + 1) + '個，' + o; }).join('。')); }
function viewQ(id){
  var q = BY[id];
  if(!q){ location.replace('#home'); return; }
  if(board.done.indexOf(id) >= 0 && !(cur && cur.id === id)){ location.replace('#r/' + id); return; }
  var fresh = !cur || cur.id !== id;
  if(fresh) cur = {id:id, opts:shuffle([q.a].concat(q.w)), wrong:[], msg:'', hint:false};
  var h = backBar(CATS[q.c]) + '<section class="slip"><span class="tag c-' + q.c + '">' + CATS[q.c] + '</span>' + media(q, false) + '<p class="q">' + esc(q.q) + '</p>' + (cur.hint ? '<p class="hintbox">提示：' + esc(q.hint) + '</p>' : '') + '</section>';
  h += '<div class="opts">' + cur.opts.map(function(o, i){ var no = cur.wrong.indexOf(o) >= 0; return '<button class="opt' + (no ? ' no' : '') + '" data-opt="' + i + '"' + (no ? ' disabled' : '') + '>' + esc(o) + '</button>'; }).join('') + '</div>';
  h += '<p class="msg" role="status" style="margin:0">' + esc(cur.msg) + '</p><div class="tools"><button class="btn alt" data-act="readq">🔊 唸給我聽</button><button class="btn alt" data-act="hint"' + (cur.hint ? ' disabled' : '') + '>💡 給我提示</button></div>';
  $('app').innerHTML = h;
  if(fresh && cfg.speak) readQ(q, cur.opts);
}
var TRY = ['差一點點，再想想', '沒關係，再看看別的'];
function pick(i){
  var q = BY[cur.id], o = cur.opts[i];
  if(o === q.a){ finish(cur.wrong.length === 0, true); return; }
  if(cur.wrong.indexOf(o) >= 0) return;
  cur.wrong.push(o); tone([220]);
  if(cur.wrong.length >= 2){ finish(false, false); return; }
  cur.msg = TRY[(cur.wrong.length - 1) % 2]; cur.hint = true; viewQ(cur.id);
}
function finish(first, got){
  var id = cur.id;
  if(board.done.indexOf(id) < 0){ board.done.push(id); saveBoard(); jar[id] = (jar[id] || 0) + 1; lsSet('jar', JSON.stringify(jar)); }
  won = {first:first, got:got}; cur = null; tone(got ? [523, 659, 784] : [392, 523]);
  location.replace('#r/' + id);
}
var GOOD = ['答對了！記性真好！', '答對了！一看就知道！', '太厲害了，答對了！'];
function viewA(id){
  var q = BY[id]; if(!q){ location.replace('#home'); return; }
  var from = location.hash.slice(-4) === '?jar', h = from ? backBar('回憶', '#jar', '回糖果罐') : backBar('回憶');
  var w = won; won = null;
  if(w) h += '<div class="praise" role="status">' + (w.got ? (w.first ? GOOD[Math.floor(Math.random() * GOOD.length)] : '答對了！想起來了！') : '這題真的不簡單，一起來看答案') + '　🍬 送您一顆糖</div>';
  h += '<section class="slip"><span class="tag c-' + q.c + '">' + CATS[q.c] + '</span>' + media(q, true) + '<h2 class="ans">' + esc(q.a) + '</h2><p class="story">' + esc(q.story) + '</p>' + srcLine(q) + '</section>';
  h += '<section class="talk"><h3>聊一聊</h3><p>' + esc(q.talk) + '</p></section><div class="stack">';
  if(q.c === 's') h += '<a class="btn teal" href="' + esc(ytUrl(q)) + '" target="_blank" rel="noopener noreferrer">▶ 到 YouTube 找這首歌</a>';
  h += '<button class="btn alt" data-act="reada" data-id="' + id + '">🔊 唸給我聽</button>' + (from ? '' : '<a class="btn" href="#home">再戳一個</a>') + '</div>';
  $('app').innerHTML = h; window.scrollTo(0, 0);
  if(w && cfg.speak) say(q.a + '。' + q.story + '聊一聊：' + q.talk);
}

/* ---------- 糖果罐 ---------- */
function viewJar(){
  var n = candies(), ids = Object.keys(jar).filter(function(k){ return BY[k]; }), cols = ['#D32F2F', '#FFC928', '#26A69A', '#EC407A', '#42A5F5'], h = backBar('糖果罐');
  h += '<div class="jar" role="img" aria-label="糖果罐裡有 ' + n + ' 顆糖">';
  for(var i = 0; i < Math.min(n, 48); i++) h += '<i style="background:' + cols[i % 5] + '"></i>';
  h += '</div><p class="jarn" style="margin:.2rem 0">' + (n ? '已經收集 ' + n + ' 顆糖' : '還沒有糖，回去戳一個洞吧') + '</p>';
  if(ids.length) h += '<div class="jl">' + ids.map(function(k){ var q = BY[k]; return '<a class="ji" href="#r/' + k + '?jar">' + (q.c === 's' ? '<b class="nd">♪</b>' : '<img src="photos/' + k + '.jpg" alt="" loading="lazy">') + '<span>' + esc(q.a) + '</span></a>'; }).join('') + '</div>';
  $('app').innerHTML = h + foot();
}

/* ---------- 帶大家玩 ---------- */
function choice(key, list){ return '<div class="choice">' + list.map(function(x){ return '<button class="' + (gset[key] === x[0] ? 'on' : '') + '" data-gs="' + key + '" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>'; }
function viewGroup(){
  var h = backBar('帶大家玩') + '<section class="slip"><p style="margin:0">適合樂齡中心、社區據點。接上投影機或電視，由帶領人操作，大家一起看、一起聊。</p>' +
    '<p class="fld">玩什麼</p>' + choice('cat', [['all', '全部'], ['o', '老東西'], ['p', '老照片'], ['s', '老歌']]) +
    '<p class="fld">幾題</p>' + choice('n', [[5, '5 題'], [10, '10 題'], [15, '15 題']]) +
    '<p class="fld">要分隊嗎</p>' + choice('teams', [[0, '不分隊'], [2, '2 隊'], [3, '3 隊'], [4, '4 隊']]) + '</section>' +
    '<button class="btn" data-act="gstart">開始</button>' + (stage ? '<a class="btn alt" href="#stage">接著玩上次的</a>' : '') + '<a class="btn alt" href="#print">🖨 帶領人題本</a>';
  $('app').innerHTML = h + foot();
}
function gstart(){
  var pool = QUESTIONS.filter(function(q){ return gset.cat === 'all' || q.c === gset.cat; });
  var ids = shuffle(pool).slice(0, gset.n).map(function(q){ return q.id; }), opts = {}, t = [];
  ids.forEach(function(id){ var q = BY[id]; opts[id] = shuffle([q.a].concat(q.w)); });
  for(var i = 0; i < gset.teams; i++) t.push(0);
  stage = {ids:ids, i:0, show:false, opts:opts, teams:gset.teams, mark:{}}; saveStage(); go('#stage');
}
function scores(){ var s = []; for(var i = 0; i < stage.teams; i++) s.push(0); Object.keys(stage.mark).forEach(function(k){ stage.mark[k].forEach(function(t){ s[t]++; }); }); return s; }
function viewStage(){
  if(!stage){ location.replace('#group'); return; }
  var n = stage.ids.length, h;
  if(stage.i >= n){
    var sc = scores();
    h = '<div class="st-top"><a class="back" href="#group">← 結束</a><span class="n">今天玩了 ' + n + ' 題</span></div><div class="st" style="grid-template-columns:1fr"><div class="r" style="justify-content:center;text-align:center"><h2 class="ans" style="text-align:center">大家都好棒！</h2>' + (sc.length ? '<p class="score">' + sc.map(function(v, i){ return '第 ' + (i + 1) + ' 隊 ' + v + ' 分'; }).join('　') + '</p>' : '<p class="score">給自己拍拍手</p>') + '</div></div><div class="st-foot"><button class="btn alt" data-act="sprev">← 上一題</button><button class="btn" data-act="gstart">再玩一輪</button></div>';
    $('app').innerHTML = h; return;
  }
  var id = stage.ids[stage.i], q = BY[id], m = stage.mark[id] || [];
  h = '<div class="st-top"><a class="back" href="#group">← 結束</a><span class="n">第 ' + (stage.i + 1) + '／' + n + ' 題</span><span class="tag c-' + q.c + '">' + CATS[q.c] + '</span></div><div class="st"><div class="l">' + media(q, stage.show) + '</div><div class="r">';
  if(!stage.show){
    h += '<p class="q">' + esc(q.q) + '</p><ol>' + stage.opts[id].map(function(o){ return '<li>' + esc(o) + '</li>'; }).join('') + '</ol>';
  } else {
    h += '<h2 class="ans">' + esc(q.a) + '</h2><p class="story">' + esc(q.story) + '</p><section class="talk"><h3>聊一聊</h3><p>' + esc(q.talk) + '</p></section>' + srcLine(q);
    if(stage.teams){ h += '<div class="teams">'; for(var i = 0; i < stage.teams; i++) h += '<button class="' + (m.indexOf(i) >= 0 ? 'on' : '') + '" data-team="' + i + '">第 ' + (i + 1) + ' 隊答對</button>'; h += '</div>'; }
    if(q.c === 's') h += '<a class="btn teal" style="margin-top:.5em" href="' + esc(ytUrl(q)) + '" target="_blank" rel="noopener noreferrer">▶ 到 YouTube 找這首歌</a>';
  }
  h += '</div></div><div class="st-foot"><button class="btn alt" data-act="sprev"' + (stage.i ? '' : ' disabled') + '>← 上一題</button><button class="btn alt" data-act="sread">🔊 唸出來</button><button class="btn" data-act="snext">' + (stage.show ? (stage.i + 1 < n ? '下一題 →' : '看結果 →') : '看答案') + '</button></div>';
  $('app').innerHTML = h;
}
function snext(){ if(!stage) return; if(stage.i >= stage.ids.length) return; if(!stage.show) stage.show = true; else { stage.i++; stage.show = false; } hush(); saveStage(); viewStage(); }
function sprev(){ if(!stage) return; hush(); if(stage.show && stage.i < stage.ids.length) stage.show = false; else if(stage.i > 0){ stage.i--; stage.show = true; } saveStage(); viewStage(); }

/* ---------- 題本、來源 ---------- */
function viewPrint(){
  var h = backBar('帶領人題本', '#group', '回上一頁') + '<div class="stack noprint"><button class="btn" data-act="print">🖨 列印／存成 PDF</button></div><div class="doc"><h2>懷舊回憶遊戲・帶領人題本</h2><p class="small">共 ' + QUESTIONS.length + ' 題。不用考試，答案只是開場，重點是讓大家說自己的故事。照片版權資訊見遊戲內「資料來源與版權」。</p>';
  ['o', 'p', 's'].forEach(function(c){
    h += '<h2>' + CATS[c] + '</h2>';
    QUESTIONS.filter(function(q){ return q.c === c; }).forEach(function(q, i){
      h += '<div class="ph"><p><b>' + (i + 1) + '. ' + esc(q.a) + '</b>　' + esc(q.q) + '</p><p>' + esc(q.story) + '</p><p>聊一聊：' + esc(q.talk) + '</p></div>';
    });
  });
  $('app').innerHTML = h + '</div>';
}
function viewCredits(){
  var h = backBar('資料來源與版權') + '<div class="doc"><h2>文字</h2><p>題目、故事、聊天話題都是本工具自己撰寫。年份、人名與物品用途查證自下方列出的公開資料，沒有抄錄原文。列為「一般生活記憶」的題目沒有單一出處，各地經驗可能不同。</p>' +
    '<h2>老歌</h2><p>本工具<b>不放歌曲錄音，也不放歌詞</b>，只用自己的話描述歌曲，歌曲著作權屬原權利人。「到 YouTube 找這首歌」只是開啟 YouTube 搜尋，內容由 YouTube 與其上傳者負責。</p>' +
    '<h2>商標</h2><p>題目提到的品牌、節目與人物名稱只用來說明歷史，權利屬原權利人，本工具和他們沒有合作關係。</p>' +
    '<h2>照片（' + Object.keys(PHOTOS).length + ' 張）</h2><p>全部取自 Wikimedia Commons，只收 CC0、公有領域、CC BY、CC BY-SA 授權，已縮小尺寸，其餘未修改。CC BY-SA 照片的縮圖沿用原授權。部分「老東西」是國外拍攝的同類物品，僅供示意。</p><ol>';
  QUESTIONS.forEach(function(q){ var p = PHOTOS[q.id]; if(!p) return; h += '<li><b>' + esc(q.a) + '</b>：<a href="' + esc(p.page) + '" target="_blank" rel="noopener noreferrer">' + esc(p.title) + '</a>，' + esc(p.author) + '，' + (p.licenseUrl ? '<a href="' + esc(p.licenseUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(p.license) + '</a>' : esc(p.license)) + '</li>'; });
  h += '</ol><h2>各題資料來源</h2><ol>';
  QUESTIONS.forEach(function(q){ var l = SOURCES[q.id]; h += '<li><b>' + esc(q.a) + '</b>：' + (l ? l.map(function(x){ return '<a href="' + esc(x[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(x[0]) + '</a>'; }).join('、') : esc(LIFE)) + '</li>'; });
  h += '</ol><h2>權利人聯絡</h2><p>如果您是權利人，認為內容有不妥，請來信 <a href="mailto:tsaimark@gmail.com">tsaimark@gmail.com</a>，我們會儘快處理或移除。</p></div>';
  $('app').innerHTML = h + foot(); window.scrollTo(0, 0);
}

/* ---------- 路由 ---------- */
function route(){
  hush();
  var h = location.hash || '#home', st = h.indexOf('#stage') === 0;
  document.body.classList.toggle('stage', st);
  if(h.indexOf('#q/') === 0) return viewQ(h.slice(3));
  cur = null;
  if(h.indexOf('#r/') === 0) return viewA(h.slice(3).replace('?jar', ''));
  if(h === '#jar') return viewJar();
  if(h === '#group') return viewGroup();
  if(st) return viewStage();
  if(h === '#print') return viewPrint();
  if(h === '#credits') return viewCredits();
  viewHome();
}

/* ---------- 對話框、設定 ---------- */
function openModal(h){ $('modalBox').innerHTML = h; $('modal').classList.add('show'); $('modalBox').scrollTop = 0; }
function closeModal(){ $('modal').classList.remove('show'); }
var WARN_HTML = '<h2>⚠ 使用警語</h2><ul>' +
  '<li>這是聊天動腦的休閒遊戲，<b>不是失智檢測，也不是醫療</b>。答對答錯都不代表記憶力好不好，如果擔心記憶問題，請找醫師。</li>' +
  '<li>內容整理自公開資料和一般生活記憶，每個地方、每個人的經驗不一樣，有不同的記憶很正常，歡迎來信指正。</li>' +
  '<li>照片都標示了作者與授權。老歌不放錄音和歌詞，「到 YouTube 找這首歌」會離開本工具。</li>' +
  '<li>進度只存在這支手機裡，不會上傳。換手機或清除資料就不見了。</li></ul>';
function showWarn(){ openModal(WARN_HTML + '<div class="stack sticky"><button class="btn" data-act="close">我知道了</button></div>'); }
function sec(id, title, val, body){ return '<details class="set-sec" data-sec="' + id + '"><summary><span class="sst">' + title + '</span><span class="ssv">' + esc(val) + '</span></summary><div class="set-body">' + body + '</div></details>'; }
function openSettings(){
  var xl = lsGet('fs') === 'xl', hc = lsGet('hc') === '1';
  var h = '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem"><h2 style="flex:1 1 0;margin:0">⚙ 常用設定</h2><button class="link" data-act="foldall">全部展開／收合</button></div>' +
    sec('fs', '字體大小', xl ? '特大' : '大', '<div class="row2"><button class="btn' + (xl ? ' alt' : '') + '" data-fs="l">大</button><button class="btn' + (xl ? '' : ' alt') + '" data-fs="xl">特大</button></div><div class="stack" style="margin-top:.5rem"><button class="btn alt" data-act="hc">高對比：' + (hc ? '開' : '關') + '</button></div>') +
    sec('voice', '聲音', (cfg.speak ? '自動唸題' : '不自動唸') + '・' + (cfg.sfx ? '有音效' : '無音效'), '<div class="stack"><button class="btn alt" data-act="tSpeak">自動唸題目：' + (cfg.speak ? '開' : '關') + '</button><button class="btn alt" data-act="tSfx">答題音效：' + (cfg.sfx ? '開' : '關') + '</button></div>') +
    sec('data', '我的進度', candies() + ' 顆糖', '<p class="small">進度只存在這支手機。</p><button class="btn alt" data-act="wipe">全部重新開始</button>') +
    sec('about', '關於本工具', '', '<p>👤 創作者 Mark Tsai（蔡豐全）<br><a href="mailto:tsaimark@gmail.com">tsaimark@gmail.com</a></p><div class="stack"><a class="btn alt" href="manual.html">📖 操作手冊</a><a class="btn alt" href="manual.html#creator">👤 關於創作者</a><button class="btn alt" data-act="warn">⚠ 使用警語</button><a class="btn alt" href="#credits" data-close="1">📚 資料來源與版權</a>' + (standalone ? '' : '<button class="btn alt" data-act="install">📲 加入主畫面</button>') + '</div><p class="small" style="margin-top:.5rem">訪客數 <img src="https://visitor-badge.laobi.icu/badge?page_id=m255525.nostalgiamemorygame" alt="訪客次數" height="20" loading="lazy" style="vertical-align:middle"></p>') +
    '<div class="stack"><button class="btn" data-act="close">關閉</button></div>';
  openModal(h);
  var open = lsJson('fold', []);
  document.querySelectorAll('.set-sec').forEach(function(d){ d.open = open.indexOf(d.dataset.sec) >= 0; d.addEventListener('toggle', saveFold); });
}
function saveFold(){ var o = []; document.querySelectorAll('.set-sec').forEach(function(d){ if(d.open) o.push(d.dataset.sec); }); lsSet('fold', JSON.stringify(o)); }
function applyView(){
  document.documentElement.dataset.fs = lsGet('fs') === 'xl' ? 'xl' : 'l';
  if(lsGet('hc') === '1') document.documentElement.dataset.hc = '1'; else delete document.documentElement.dataset.hc;
}

var wipeArmed = false;
var acts = {
  fresh: function(){ newBoard(); viewHome(); window.scrollTo(0, 0); },
  readq: function(){ readQ(BY[cur.id], cur.opts); },
  hint: function(){ cur.hint = true; viewQ(cur.id); },
  gstart: gstart, snext: snext, sprev: sprev,
  sread: function(){ var q = BY[stage.ids[stage.i]]; if(stage.show) say(q.a + '。' + q.story + '聊一聊：' + q.talk); else readQ(q, stage.opts[q.id]); },
  print: function(){ window.print(); },
  warn: showWarn, close: closeModal, settings: openSettings,
  foldall: function(){ var l = document.querySelectorAll('.set-sec'), any = Array.prototype.some.call(l, function(d){ return d.open; }); l.forEach(function(d){ d.open = !any; }); },
  hc: function(){ lsSet('hc', lsGet('hc') === '1' ? '0' : '1'); applyView(); openSettings(); },
  tSpeak: function(){ cfg.speak = !cfg.speak; saveCfg(); openSettings(); },
  tSfx: function(){ cfg.sfx = !cfg.sfx; saveCfg(); openSettings(); },
  wipe: function(){
    if(!wipeArmed){ wipeArmed = true; toast('再按一次才會清除所有糖果'); setTimeout(function(){ wipeArmed = false; }, 4000); return; }
    wipeArmed = false; jar = {}; lsDel('jar'); newBoard(); closeModal(); toast('重新開始了'); go('#home');
  },
  install: function(){
    if(window._dp){ window._dp.prompt(); window._dp.userChoice.finally(function(){ window._dp = null; }); return; }
    openModal('<h2>📲 加入主畫面</h2>' + (ios ? '<p>iPhone／iPad：用 Safari 打開，按下方「分享」圖示（方框加箭頭），選「加入主畫面」。</p>' : '<p>按瀏覽器右上角「⋮」，選「加到主畫面」或「安裝應用程式」。</p>') + '<div class="stack"><button class="btn" data-act="close">知道了</button></div>');
  }
};
document.addEventListener('click', function(e){
  var t = e.target.closest('[data-act],[data-hole],[data-opt],[data-gs],[data-team],button[data-fs],[data-close]'); if(!t) return;
  if(t.dataset.close){ closeModal(); return; }
  if(t.dataset.hole != null){
    var id = board.ids[+t.dataset.hole];
    if(board.done.indexOf(id) >= 0){ go('#r/' + id); return; }
    tone([660]); t.classList.add('pop'); setTimeout(function(){ go('#q/' + id); }, 230); return;
  }
  if(t.dataset.opt != null){ pick(+t.dataset.opt); return; }
  if(t.dataset.gs){ var v = t.dataset.v; gset[t.dataset.gs] = /^\d+$/.test(v) ? +v : v; lsSet('gset', JSON.stringify(gset)); viewGroup(); return; }
  if(t.dataset.team != null){
    var k = stage.ids[stage.i], m = stage.mark[k] || [], n = +t.dataset.team, at = m.indexOf(n);
    if(at >= 0) m.splice(at, 1); else m.push(n);
    stage.mark[k] = m; saveStage(); viewStage(); return;
  }
  if(t.dataset.fs){ lsSet('fs', t.dataset.fs); applyView(); openSettings(); return; }
  if(t.dataset.act === 'reada'){ var q = BY[t.dataset.id]; say(q.a + '。' + q.story + '聊一聊：' + q.talk); return; }
  var a = acts[t.dataset.act]; if(a){ e.preventDefault(); a(); }
});
$('modal').addEventListener('click', function(e){ if(e.target.id === 'modal') closeModal(); });
window.addEventListener('hashchange', route);
document.addEventListener('keydown', function(e){
  if(!document.body.classList.contains('stage') || $('modal').classList.contains('show')) return;
  if(e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown'){ if(e.target.tagName === 'BUTTON' && e.key === ' ') return; e.preventDefault(); snext(); }
  if(e.key === 'ArrowLeft' || e.key === 'PageUp'){ e.preventDefault(); sprev(); }
});

/* ---------- 跑馬燈（工作區共用公告，不可關） ---------- */
function initMarquee(){
  var URL_ = "https://script.google.com/macros/s/AKfycbwKX0DNNbY8y4nf90BFTHtxgfqJcHHcZasRrgycl4QAe52_hkjMWSkYk4xOsqU-JPCROw/exec";
  var REFRESH = 20 * 60 * 1000, bar = $('marqueeBar'), track = $('marqueeTrack'), lastKey = null;
  function appendText(c, text){ var re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, li = 0, m; while((m = re.exec(text))){ if(m.index > li) c.appendChild(document.createTextNode(text.slice(li, m.index))); var a = document.createElement('a'); a.href = m[2]; a.textContent = m[1]; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.style.color = 'inherit'; a.style.textDecoration = 'underline'; c.appendChild(a); li = re.lastIndex; } if(li < text.length) c.appendChild(document.createTextNode(text.slice(li))); }
  function renderM(items){
    if(!items || !items.length) return;
    var k = JSON.stringify(items); if(k === lastKey) return; lastKey = k; track.innerHTML = '';
    var fr = document.createDocumentFragment();
    function pass(){ items.forEach(function(it, i){ if(i > 0) fr.appendChild(document.createTextNode('　★　')); appendText(fr, String(it)); }); }
    pass(); fr.appendChild(document.createTextNode('　★　')); pass(); track.appendChild(fr);
    bar.classList.add('show'); document.body.classList.add('has-marquee');
    track.style.animationDuration = Math.max(track.scrollWidth / 2 / 60, 12) + 's';
  }
  function fetchM(){ fetch(URL_, {method:'POST', body:JSON.stringify({serial:''})}).then(function(r){ return r.json(); }).then(function(d){ if(d && Array.isArray(d.marquee) && d.marquee.length){ lsSet('marquee', JSON.stringify(d.marquee)); renderM(d.marquee); } }).catch(function(){}); }
  renderM(lsJson('marquee', [])); fetchM(); setInterval(fetchM, REFRESH);
}

window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); window._dp = e; });
if('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('service-worker.js').catch(function(){});
applyView(); initMarquee(); loadBoard(); route();
if(!lsGet('warnSeen')){ lsSet('warnSeen', '1'); showWarn(); }
window._nmg = {route:route, get board(){ return board; }, get stage(){ return stage; }, get jar(){ return jar; }};
