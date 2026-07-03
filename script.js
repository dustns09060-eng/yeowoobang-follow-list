/* 여우방 V7 - GitHub Pages/PWA 사용자용 */
const CONFIG = {
  appName: '여우방 팔로우리스트',
  groupSize: 30,
  // 구글시트 ID. Sheet2의 번호/닉네임/아이디를 읽습니다.
  sheetId: '1_WsSmEpXcckIV9wbQp2K6YZe4jZ2XlX2Vt6lmXmfiHs',
  sheetName: 'Sheet2',
  noticeSheetName: '공지',
  // 공개 CSV가 안 될 때 사용할 샘플 데이터
  sampleRows: [
    ['1','꼬꼬','@h_ggoggo'],
    ['2','이수','@awesome_in_autumn'],
    ['3','태태','@tae_taeyoon_mom']
  ]
};

let data = [];
let filtered = [];
let selected = '전체';
let deferredPrompt = null;

const $ = (id) => document.getElementById(id);
const NL = String.fromCharCode(10);
const csvUrl = (sheetName) => `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

function parseCSV(text){
  const rows = [];
  let row = [], cell = '', quote = false;
  for(let i=0;i<text.length;i++){
    const c = text[i], n = text[i+1];
    if(c === '"'){
      if(quote && n === '"'){ cell += '"'; i++; }
      else quote = !quote;
    }else if(c === ',' && !quote){ row.push(cell); cell=''; }
    else if((c === '\n' || c === '\r') && !quote){
      if(c === '\r' && n === '\n') i++;
      row.push(cell); cell='';
      if(row.some(v => String(v).trim() !== '')) rows.push(row);
      row=[];
    }else cell += c;
  }
  row.push(cell);
  if(row.some(v => String(v).trim() !== '')) rows.push(row);
  return rows;
}

function normalizeInsta(v){
  v = String(v || '').trim();
  if(!v) return '';
  return v.startsWith('@') ? v : '@' + v;
}

function rowsToMembers(rows){
  const body = rows.slice(1);
  return body.map(r => ({
    no: Number(String(r[0] || '').replace(/[^0-9]/g,'')),
    nickname: String(r[1] || '').trim(),
    insta: normalizeInsta(r[2])
  })).filter(x => x.no && x.nickname && x.insta).sort((a,b)=>a.no-b.no);
}

async function fetchSheet(sheetName){
  const res = await fetch(csvUrl(sheetName), {cache:'no-store'});
  if(!res.ok) throw new Error('시트 데이터를 불러오지 못했습니다.');
  const text = await res.text();
  return parseCSV(text);
}

async function load(){
  $('resultInfo').textContent = '불러오는 중...';
  try{
    const rows = await fetchSheet(CONFIG.sheetName);
    data = rowsToMembers(rows);
  }catch(e){
    console.warn(e);
    data = rowsToMembers([['번호','닉네임','아이디'], ...CONFIG.sampleRows]);
    $('resultInfo').textContent = '구글시트 연결 전 샘플 데이터 표시 중입니다.';
  }
  makeTabs();
  render();
}

async function loadNotice(){
  try{
    const rows = await fetchSheet(CONFIG.noticeSheetName);
    const title = rows[1]?.[0] || '';
    const content = rows[1]?.[1] || '';
    if(title || content){
      $('noticeBox').hidden = false;
      $('noticeBox').textContent = `${title}\n${content}`.trim();
      const todayKey = new Date().toISOString().slice(0,10);
      if(localStorage.getItem('noticeClosedDate') !== todayKey){
        $('noticeText').textContent = `${title}\n${content}`.trim();
        $('noticeModal').hidden = false;
      }
    }
  }catch(e){ console.warn('공지 없음', e); }
}

function groupNo(no){ return Math.floor((Number(no)-1)/CONFIG.groupSize)+1; }

function makeTabs(){
  $('appTitle').textContent = CONFIG.appName;
  $('totalCount').textContent = data.length;
  const max = data.length ? Math.max(...data.map(x=>groupNo(x.no))) : 0;
  $('groupCount').textContent = max;
  $('groupSizeLabel').textContent = CONFIG.groupSize;
  let html = `<button class="tab ${selected==='전체'?'active':''}" onclick="selectTab('전체')">전체</button>`;
  for(let i=1;i<=max;i++) html += `<button class="tab ${selected===i?'active':''}" onclick="selectTab(${i})">${i}조</button>`;
  $('tabs').innerHTML = html;
}

function selectTab(g){ selected = g; makeTabs(); render(); window.scrollTo({top:0,behavior:'smooth'}); }

function render(){
  const q = $('searchInput').value.toLowerCase().trim();
  filtered = data.filter(x => {
    const text = `${x.no} ${x.nickname} ${x.insta}`.toLowerCase();
    return text.includes(q) && (selected === '전체' || groupNo(x.no) === selected);
  });
  $('resultInfo').textContent = `검색 결과 ${filtered.length}명`;
  const list = $('list');
  list.innerHTML = '';
  if(!filtered.length){ list.innerHTML = `<div class="empty">표시할 인원이 없습니다.</div>`; return; }
  const groups = {};
  filtered.forEach(x => { const g=groupNo(x.no); (groups[g] ||= []).push(x); });
  Object.keys(groups).map(Number).sort((a,b)=>a-b).forEach(g=>{
    const title = document.createElement('div');
    title.className = 'group-title';
    title.textContent = `🦊 ${g}조 (${groups[g].length}명)`;
    list.appendChild(title);
    const copy = document.createElement('button');
    copy.className = 'btn gradient group-copy';
    copy.textContent = `📋 ${g}조 복사`;
    copy.onclick = () => copyGroup(g);
    list.appendChild(copy);
    groups[g].forEach(x => list.appendChild(memberCard(x)));
  });
}

function memberCard(x){
  const id = x.insta.replace('@','');
  const div = document.createElement('article');
  div.className = 'member-card';
  div.innerHTML = `
    <div class="member-top"><span class="no">${x.no}</span><span class="name">${escapeHTML(x.nickname)}</span></div>
    <div class="insta">${escapeHTML(x.insta)}</div>
    <div class="card-actions">
      <a class="link-btn" href="https://instagram.com/${encodeURIComponent(id)}" target="_blank" rel="noopener">📷 인스타 바로가기</a>
      <button class="copy-btn" type="button">📋 복사</button>
    </div>`;
  div.querySelector('.copy-btn').onclick = () => copyText(line(x));
  return div;
}

function line(x){ return `${x.no}. ${x.nickname} ${x.insta}`; }
async function copyText(text){
  if(!text) return alert('복사할 내용이 없습니다.');
  try{ await navigator.clipboard.writeText(text); alert('복사되었습니다'); }
  catch(e){
    const t=document.createElement('textarea'); t.value=text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); alert('복사되었습니다');
  }
}
function copyGroup(g){ copyText(data.filter(x=>groupNo(x.no)===g).map(line).join(NL)); }
function copyAll(){ copyText(filtered.map(line).join(NL)); }
function escapeHTML(s){ return String(s).replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m])); }

function closeNotice(today){
  if(today) localStorage.setItem('noticeClosedDate', new Date().toISOString().slice(0,10));
  $('noticeModal').hidden = true;
}

window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt=e; $('installBtn').hidden=false; });
$('installBtn').addEventListener('click', async()=>{ if(deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; $('installBtn').hidden=true; }});
$('searchInput').addEventListener('input', render);
$('copyAllBtn').addEventListener('click', copyAll);
$('bottomCopyBtn').addEventListener('click', copyAll);
$('refreshBtn').addEventListener('click', load);
$('bottomRefreshBtn').addEventListener('click', load);
$('homeBtn').addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));
$('noticeCloseBtn').addEventListener('click', ()=>closeNotice(false));
$('noticeTodayBtn').addEventListener('click', ()=>closeNotice(true));

if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(console.warn)); }
loadNotice();
load();
setInterval(load, 60000);
