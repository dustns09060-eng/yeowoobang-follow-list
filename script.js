const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1_WsSmEpXcckIV9wbQp2K6YZe4jZ2XlX2Vt6lmXmfiHs/gviz/tq?tqx=out:csv&sheet=Sheet2";
const GROUP_SIZE = 30;

let members = [];
let filtered = [];
let selectedGroup = "all";
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
      <div class="group-title">🦊 ${g}조 (${list.length}명)</div>
      <button class="group-copy" data-copy-group="${g}">📋 ${g}조 복사</button>
      <div class="member-grid">${list.map(cardHTML).join('')}</div>
    </section>`;
  }).join('');
  document.querySelectorAll('[data-copy-group]').forEach(btn=>btn.addEventListener('click',()=>copyGroup(Number(btn.dataset.copyGroup))));
}
function cardHTML(m){
  const id=m.insta.replace('@','');
  return `<article class="member-card">
    <div class="member-head"><span class="member-no">${m.no}</span><span class="member-name">${escapeHTML(m.nickname)}</span></div>
    <div class="member-id">${escapeHTML(m.insta)}</div>
    <a class="insta-link" href="https://instagram.com/${encodeURIComponent(id)}" target="_blank" rel="noopener">📷 인스타 바로가기</a>
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
function showToast(msg){ const el=$('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove('show'),1600); }
function setLoading(on){ if(on) $('resultText').textContent='불러오는 중...'; }
function init(){
  $('searchInput').addEventListener('input', render);
  $('refreshBtn').addEventListener('click',loadMembers);
  $('refreshBottomBtn').addEventListener('click',loadMembers);
  $('homeBtn').addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
  loadMembers();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js?v=10').catch(()=>{});
}
document.addEventListener('DOMContentLoaded', init);
