const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1_WsSmEpXcckIV9wbQp2K6YZe4jZ2XlX2Vt6lmXmfiHs/gviz/tq?tqx=out:csv&sheet=Sheet2";
const NOTICE_CSV_URL = "https://docs.google.com/spreadsheets/d/1_WsSmEpXcckIV9wbQp2K6YZe4jZ2XlX2Vt6lmXmfiHs/gviz/tq?tqx=out:csv&sheet=공지";
const GROUP_SIZE = 30;
const ADMIN_PASSWORD = "0702";

// 실제 구글시트 수정/삭제/공지 저장을 하려면 Apps Script 웹앱 URL을 여기에 넣으세요.
// 예: const APPS_SCRIPT_API_URL = "https://script.google.com/macros/s/배포ID/exec";
const APPS_SCRIPT_API_URL = "";

let members = [];
let filtered = [];
let selectedGroup = "all";
let adminLoggedIn = false;
const $ = (id) => document.getElementById(id);

function parseCSV(text){
  const rows=[]; let row=[]; let cur=""; let quote=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i], next=text[i+1];
    if(ch==='"'){
      if(quote && next==='"'){ cur+='"'; i++; }
      else quote=!quote;
    }else if(ch===',' && !quote){ row.push(cur); cur=""; }
    else if((ch==='\n'||ch==='\r') && !quote){
      if(ch==='\r' && next==='\n') i++;
      row.push(cur); rows.push(row); row=[]; cur="";
    }else cur+=ch;
  }
  if(cur || row.length){ row.push(cur); rows.push(row); }
  return rows.map(r=>r.map(v=>String(v||"").trim())).filter(r=>r.some(Boolean));
}
function normalizeId(value){
  const raw=String(value||"").trim();
  if(!raw) return "";
  return raw.startsWith("@") ? raw : "@"+raw;
}
async function fetchCSV(url){
  const res=await fetch(url + (url.includes('?')?'&':'?') + 'cache=' + Date.now(), {cache:'no-store'});
  if(!res.ok) throw new Error('구글시트 데이터를 불러오지 못했습니다.');
  return res.text();
}
async function loadMembers(){
  setLoading(true);
  try{
    const text=await fetchCSV(SHEET_CSV_URL);
    const rows=parseCSV(text);
    const body=rows[0] && String(rows[0][0]).includes('번호') ? rows.slice(1) : rows;
    members=body.map(r=>({
      no:Number(String(r[0]||'').replace(/[^0-9]/g,'')),
      nickname:String(r[1]||'').trim(),
      insta:normalizeId(r[2]||'')
    })).filter(x=>x.no && x.nickname && x.insta).sort((a,b)=>a.no-b.no);
    buildTabs();
    render();
  }catch(err){
    $('memberList').innerHTML='<div class="empty-card">데이터를 불러오지 못했습니다.<br>시트가 웹에 게시되어 있는지 확인해주세요.</div>';
    showToast(err.message || '오류가 발생했습니다.');
  }finally{ setLoading(false); }
}
async function loadNotice(){
  try{
    const text=await fetchCSV(NOTICE_CSV_URL);
    const rows=parseCSV(text);
    let title='', content='';
    if(rows.length>=2){ title=rows[1][0]||''; content=rows[1][1]||''; }
    if(title || content){
      $('noticeBanner').innerHTML = (title ? `<b>📢 ${escapeHTML(title)}</b>` : '') + (content ? escapeHTML(content).replace(/\n/g,'<br>') : '');
      $('noticeBanner').classList.remove('hidden');
      $('noticeTitle').value = title;
      $('noticeContent').value = content;
    }else $('noticeBanner').classList.add('hidden');
  }catch(e){ $('noticeBanner').classList.add('hidden'); }
}
function groupNo(no){ return Math.floor((Number(no)-1)/GROUP_SIZE)+1; }
function buildTabs(){
  const max=members.length ? Math.max(...members.map(m=>groupNo(m.no))) : 0;
  $('totalCount').textContent=members.length.toLocaleString('ko-KR');
  $('groupCount').textContent=max.toLocaleString('ko-KR');
  $('groupSizeText').textContent=GROUP_SIZE;
  let html=`<button class="tab ${selectedGroup==='all'?'active':''}" data-group="all">전체</button>`;
  for(let i=1;i<=max;i++) html+=`<button class="tab ${selectedGroup===i?'active':''}" data-group="${i}">${i}조</button>`;
  $('tabs').innerHTML=html;
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
    selectedGroup=btn.dataset.group==='all'?'all':Number(btn.dataset.group);
    buildTabs(); render();
  }));
}
function render(){
  const q=$('searchInput').value.trim().toLowerCase();
  filtered=members.filter(m=>{
    const groupMatch=selectedGroup==='all' || groupNo(m.no)===selectedGroup;
    const text=`${m.no} ${m.nickname} ${m.insta}`.toLowerCase();
    return groupMatch && text.includes(q);
  });
  $('resultText').textContent=`검색 결과 ${filtered.length.toLocaleString('ko-KR')}명`;
  renderList();
}
function renderList(){
  if(!filtered.length){
    $('memberList').innerHTML='<div class="empty-card">표시할 인원이 없습니다.</div>';
    return;
  }
  const groups={};
  filtered.forEach(m=>{ const g=groupNo(m.no); (groups[g]||(groups[g]=[])).push(m); });
  $('memberList').innerHTML=Object.keys(groups).map(Number).sort((a,b)=>a-b).map(g=>{
    const list=groups[g];
    return `<section class="group-section">
      <div class="group-head"><h2 class="group-title">🦊 ${g}조 (${list.length}명)</h2><button class="group-copy" data-copy-group="${g}">📋 ${g}조 복사</button></div>
      <div class="member-grid">${list.map(cardHTML).join('')}</div>
    </section>`;
  }).join('');
  document.querySelectorAll('[data-copy-group]').forEach(btn=>btn.addEventListener('click',()=>copyGroup(Number(btn.dataset.copyGroup))));
}
function cardHTML(m){
  const id=m.insta.replace('@','');
  return `<article class="member-card">
    <span class="member-no">${m.no}</span>
    <div class="member-info"><div class="member-name">${escapeHTML(m.nickname)}</div><div class="member-id">${escapeHTML(m.insta)}</div></div>
    <a class="insta-link" href="https://instagram.com/${encodeURIComponent(id)}" target="_blank" rel="noopener">📷 인스타</a>
  </article>`;
}
function escapeHTML(s){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function line(m){ return `${m.no}. ${m.nickname} ${m.insta}`; }
function copyGroup(g){ copyText(members.filter(m=>groupNo(m.no)===g).map(line).join('\n')); }
async function copyText(text){
  if(!text) return showToast('복사할 내용이 없습니다.');
  try{ await navigator.clipboard.writeText(text); showToast('복사되었습니다'); }
  catch(e){ const t=document.createElement('textarea'); t.value=text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); showToast('복사되었습니다'); }
}
function showToast(msg){ const el=$('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove('show'),1700); }
function setLoading(on){ if(on) $('resultText').textContent='불러오는 중...'; }

function openAdmin(){ $('adminModal').classList.remove('hidden'); $('adminModal').setAttribute('aria-hidden','false'); setTimeout(()=>$('adminPw').focus(),80); }
function closeAdmin(){ $('adminModal').classList.add('hidden'); $('adminModal').setAttribute('aria-hidden','true'); }
function loginAdmin(){
  if($('adminPw').value.trim() !== ADMIN_PASSWORD) return showToast('비밀번호가 틀렸습니다.');
  adminLoggedIn=true;
  $('loginBox').classList.add('hidden');
  $('adminPanel').classList.remove('hidden');
  showToast('관리자 로그인 완료');
}
function switchAdminTab(tab){
  document.querySelectorAll('.admin-tab').forEach(b=>b.classList.toggle('active', b.dataset.adminTab===tab));
  document.querySelectorAll('.admin-section').forEach(s=>s.classList.add('hidden'));
  $('adminTab-'+tab).classList.remove('hidden');
}
function adminSearch(){
  const q=$('adminSearch').value.trim().toLowerCase();
  if(!q){ $('adminSearchResult').innerHTML=''; return; }
  const result=members.filter(m=>`${m.no} ${m.nickname} ${m.insta}`.toLowerCase().includes(q)).slice(0,20);
  $('adminSearchResult').innerHTML=result.map(m=>`<div class="admin-item"><b>${m.no}. ${escapeHTML(m.nickname)}</b><br>${escapeHTML(m.insta)}<button type="button" data-fill="${m.no}">수정칸에 넣기</button></div>`).join('') || '<div class="admin-item">검색 결과가 없습니다.</div>';
  document.querySelectorAll('[data-fill]').forEach(btn=>btn.addEventListener('click',()=>{
    const m=members.find(x=>x.no===Number(btn.dataset.fill));
    if(!m) return;
    $('editNo').value=m.no; $('editName').value=m.nickname; $('editInsta').value=m.insta;
    showToast('수정칸에 넣었습니다');
  }));
}
async function adminAction(action, payload){
  if(!adminLoggedIn) return showToast('관리자 로그인이 필요합니다.');
  if(!APPS_SCRIPT_API_URL){
    showToast('Apps Script 주소 설정 필요');
    alert('실제 명단 수정은 Apps Script 관리자 API 연결 후 가능합니다. ZIP 안 README를 확인해주세요.');
    return;
  }
  const body=new URLSearchParams({action, password:ADMIN_PASSWORD, ...payload});
  try{
    await fetch(APPS_SCRIPT_API_URL, {method:'POST', mode:'no-cors', body});
    showToast('요청 완료');
    setTimeout(()=>{ loadMembers(); loadNotice(); }, 1200);
  }catch(e){ showToast('요청 실패'); }
}
function initAdminEvents(){
  $('adminOpenBtn').addEventListener('click', openAdmin);
  $('adminBottomBtn').addEventListener('click', openAdmin);
  $('adminCloseBtn').addEventListener('click', closeAdmin);
  $('loginBtn').addEventListener('click', loginAdmin);
  $('adminPw').addEventListener('keydown', e=>{ if(e.key==='Enter') loginAdmin(); });
  document.querySelectorAll('.admin-tab').forEach(b=>b.addEventListener('click',()=>switchAdminTab(b.dataset.adminTab)));
  $('adminSearch').addEventListener('input', adminSearch);
  $('saveNoticeBtn').addEventListener('click',()=>adminAction('notice',{title:$('noticeTitle').value, content:$('noticeContent').value}));
  $('addMemberBtn').addEventListener('click',()=>adminAction('add',{nickname:$('addName').value, insta:$('addInsta').value}));
  $('editMemberBtn').addEventListener('click',()=>adminAction('update',{no:$('editNo').value, nickname:$('editName').value, insta:$('editInsta').value}));
  $('deleteMemberBtn').addEventListener('click',()=>{ if(confirm('정말 삭제할까요?')) adminAction('delete',{no:$('deleteNo').value}); });
}
function init(){
  $('searchInput').addEventListener('input', render);
  $('refreshBtn').addEventListener('click',()=>{loadMembers();loadNotice();});
  $('refreshBottomBtn').addEventListener('click',()=>{loadMembers();loadNotice();});
  $('homeBtn').addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
  initAdminEvents();
  loadNotice(); loadMembers();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js?v=11').catch(()=>{});
}
document.addEventListener('DOMContentLoaded', init);
