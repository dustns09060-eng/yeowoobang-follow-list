const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1_WsSmEpXcckIV9wbQp2K6YZe4jZ2XlX2Vt6lmXmfiHs/gviz/tq?tqx=out:csv&sheet=Sheet2';
const GROUP_SIZE = 30;
const ADMIN_PASSWORD = '0702';

// Apps Script backend URL을 넣으면 관리자 추가/수정/삭제/공지 저장이 실제 시트에 반영됩니다.
// 예: const BACKEND_URL = 'https://script.google.com/macros/s/배포ID/exec';
const BACKEND_URL = '';

let members = [];
let filtered = [];
let selectedGroup = 'all';
let adminLoggedIn = sessionStorage.getItem('yeowoo_admin') === '1';
let notice = localStorage.getItem('yeowoo_notice') || '';

const $ = (id) => document.getElementById(id);

function toast(msg){
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 1600);
}

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
      if(row.some(v=>String(v).trim() !== '')) rows.push(row);
      row=[];
    }else cell += c;
  }
  row.push(cell);
  if(row.some(v=>String(v).trim() !== '')) rows.push(row);
  return rows;
}

function normalizeInsta(v){
  v = String(v || '').trim();
  if(!v) return '';
  return v.startsWith('@') ? v : '@' + v;
}

async function loadData(){
  try{
    const res = await fetch(SHEET_CSV_URL + '&_=' + Date.now(), {cache:'no-store'});
    const text = await res.text();
    const rows = parseCSV(text);
    const body = rows.slice(1);
    members = body.map(r=>({
      no: Number(String(r[0]||'').replace(/[^0-9]/g,'')),
      nickname: String(r[1]||'').trim(),
      insta: normalizeInsta(r[2])
    })).filter(x=>x.no && x.nickname && x.insta).sort((a,b)=>a.no-b.no);
    updateStats();
    buildTabs();
    render();
    renderAdminList();
  }catch(e){
    toast('데이터를 불러오지 못했어요');
    console.error(e);
  }
}

function groupNo(no){ return Math.ceil(Number(no) / GROUP_SIZE); }
function maxGroup(){ return members.length ? Math.max(...members.map(x=>groupNo(x.no))) : 0; }

function updateStats(){
  $('totalCount').textContent = members.length.toLocaleString();
  $('groupCount').textContent = maxGroup().toLocaleString();
  $('groupSizeText').textContent = GROUP_SIZE;
}

function buildTabs(){
  const tabs = $('tabs');
  const max = maxGroup();
  let html = `<button class="${selectedGroup==='all'?'active':''}" data-g="all">전체</button>`;
  for(let i=1;i<=max;i++) html += `<button class="${selectedGroup===i?'active':''}" data-g="${i}">${i}조</button>`;
  tabs.innerHTML = html;
  tabs.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
    selectedGroup = btn.dataset.g === 'all' ? 'all' : Number(btn.dataset.g);
    buildTabs(); render();
  }));
}

function getFiltered(){
  const q = $('searchInput').value.trim().toLowerCase();
  return members.filter(x=>{
    const text = `${x.no} ${x.nickname} ${x.insta}`.toLowerCase();
    const groupOk = selectedGroup === 'all' || groupNo(x.no) === selectedGroup;
    return groupOk && text.includes(q);
  });
}

function renderNotice(){
  if(notice){
    $('noticeBox').classList.remove('hidden');
    $('noticeContent').textContent = notice;
  }else{
    $('noticeBox').classList.add('hidden');
    $('noticeContent').textContent = '';
  }
}

function render(){
  renderNotice();
  filtered = getFiltered();
  $('resultText').textContent = `검색 결과 ${filtered.length.toLocaleString()}명`;
  const list = $('list');
  list.innerHTML = '';
  if(!filtered.length){ list.innerHTML = '<div class="empty">표시할 명단이 없습니다.</div>'; return; }
  const groups = {};
  filtered.forEach(x=>{ const g = groupNo(x.no); (groups[g] ||= []).push(x); });
  Object.keys(groups).map(Number).sort((a,b)=>a-b).forEach(g=>{
    const items = groups[g];
    const title = document.createElement('div');
    title.className = 'group-title';
    title.textContent = `🦊 ${g}조 (${items.length}명)`;
    list.appendChild(title);
    const copy = document.createElement('button');
    copy.className = 'group-copy';
    copy.textContent = `📋 ${g}조 복사`;
    copy.onclick = ()=>copyGroup(g);
    list.appendChild(copy);
    items.forEach(x=>list.appendChild(memberCard(x)));
  });
}

function memberCard(x){
  const div = document.createElement('article');
  div.className = 'member-card';
  const id = x.insta.replace('@','');
  div.innerHTML = `
    <div class="num">${x.no}</div>
    <div class="info"><div class="name">${escapeHtml(x.nickname)}</div><div class="insta">${escapeHtml(x.insta)}</div></div>
    <a class="insta-btn" target="_blank" rel="noopener" href="https://instagram.com/${encodeURIComponent(id)}">📷 인스타</a>
  `;
  return div;
}

function escapeHtml(s){ return String(s).replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function line(x){ return `${x.no}. ${x.nickname} ${x.insta}`; }

async function copyGroup(g){
  const text = members.filter(x=>groupNo(x.no)===g).map(line).join('\n');
  await navigator.clipboard.writeText(text);
  toast(`${g}조 복사 완료`);
}

function openAdmin(){
  if(adminLoggedIn){ showAdminPage(); return; }
  $('adminModal').classList.remove('hidden');
  setTimeout(()=>$('adminPw').focus(), 100);
}
function closeAdminModal(){ $('adminModal').classList.add('hidden'); $('adminPw').value=''; }
function login(){
  if($('adminPw').value === ADMIN_PASSWORD){
    adminLoggedIn = true;
    sessionStorage.setItem('yeowoo_admin','1');
    closeAdminModal(); showAdminPage();
  }else toast('비밀번호가 틀렸습니다');
}
function logout(){ adminLoggedIn=false; sessionStorage.removeItem('yeowoo_admin'); $('adminPage').classList.add('hidden'); $('app').classList.remove('hidden'); }
function showAdminPage(){ $('app').classList.add('hidden'); $('adminPage').classList.remove('hidden'); $('adminNotice').value = notice; renderAdminList(); window.scrollTo(0,0); }
function backToUser(){ $('adminPage').classList.add('hidden'); $('app').classList.remove('hidden'); window.scrollTo(0,0); }

async function api(action, payload){
  if(!BACKEND_URL){
    toast('백엔드 주소 설정이 필요해요');
    return {ok:false};
  }
  const res = await fetch(BACKEND_URL, {method:'POST', body: JSON.stringify({action, password:ADMIN_PASSWORD, ...payload})});
  return await res.json();
}

async function saveNotice(){
  const value = $('adminNotice').value.trim();
  if(BACKEND_URL) await api('saveNotice', {notice:value});
  notice = value;
  localStorage.setItem('yeowoo_notice', notice);
  renderNotice();
  toast('공지 저장 완료');
}
async function deleteNotice(){
  if(BACKEND_URL) await api('saveNotice', {notice:''});
  notice = '';
  localStorage.removeItem('yeowoo_notice');
  $('adminNotice').value='';
  renderNotice();
  toast('공지 삭제 완료');
}

async function addMember(){
  const nickname = $('addName').value.trim();
  const insta = normalizeInsta($('addInsta').value);
  if(!nickname || !insta){ toast('닉네임과 아이디를 입력하세요'); return; }
  if(BACKEND_URL){ await api('add', {nickname, insta}); await loadData(); }
  else {
    const next = members.length ? Math.max(...members.map(x=>x.no))+1 : 1;
    members.push({no:next,nickname,insta}); updateStats(); buildTabs(); render(); renderAdminList();
  }
  $('addName').value=''; $('addInsta').value=''; toast('추가 완료');
}

function renderAdminList(){
  const box = $('adminList'); if(!box) return;
  const q = ($('adminSearch')?.value || '').trim().toLowerCase();
  const arr = members.filter(x=>`${x.no} ${x.nickname} ${x.insta}`.toLowerCase().includes(q)).slice(0,80);
  box.innerHTML = arr.map(x=>`
    <div class="admin-person">
      <b>${x.no}</b>
      <div><strong>${escapeHtml(x.nickname)}</strong><br><small>${escapeHtml(x.insta)}</small></div>
      <button onclick="editPrompt(${x.no})">수정</button>
      <button class="del" onclick="deletePrompt(${x.no})">삭제</button>
    </div>`).join('') || '<div class="empty">검색 결과가 없습니다.</div>';
}

async function editPrompt(no){
  const item = members.find(x=>x.no===no); if(!item) return;
  const nickname = prompt('닉네임 수정', item.nickname); if(nickname===null) return;
  const insta = prompt('아이디 수정', item.insta); if(insta===null) return;
  if(BACKEND_URL){ await api('update', {no, nickname, insta:normalizeInsta(insta)}); await loadData(); }
  else { item.nickname=nickname.trim(); item.insta=normalizeInsta(insta); render(); renderAdminList(); }
  toast('수정 완료');
}
async function deletePrompt(no){
  if(!confirm(`${no}번을 삭제할까요?`)) return;
  if(BACKEND_URL){ await api('delete', {no}); await loadData(); }
  else { members = members.filter(x=>x.no!==no); updateStats(); buildTabs(); render(); renderAdminList(); }
  toast('삭제 완료');
}

function init(){
  $('refreshBtn').onclick = loadData;
  $('bottomRefreshBtn').onclick = loadData;
  $('homeBtn').onclick = ()=>window.scrollTo(0,0);
  $('adminOpenBtn').onclick = openAdmin;
  $('bottomAdminBtn').onclick = openAdmin;
  $('adminCloseBtn').onclick = closeAdminModal;
  $('loginBtn').onclick = login;
  $('adminPw').addEventListener('keydown', e=>{ if(e.key==='Enter') login(); });
  $('logoutBtn').onclick = logout;
  $('backToUserBtn').onclick = backToUser;
  $('saveNoticeBtn').onclick = saveNotice;
  $('deleteNoticeBtn').onclick = deleteNotice;
  $('addMemberBtn').onclick = addMember;
  $('searchInput').addEventListener('input', render);
  $('adminSearch').addEventListener('input', renderAdminList);
  document.querySelectorAll('.admin-tab').forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll('.admin-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.admin-panel').forEach(p=>p.classList.add('hidden'));
    $(btn.dataset.panel).classList.remove('hidden');
  });
  loadData();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}
window.addEventListener('DOMContentLoaded', init);
