// 여우방 V12
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1_WsSmEpXcckIV9wbQp2K6YZe4jZ2XlX2Vt6lmXmfiHs/gviz/tq?tqx=out:csv&sheet=Sheet2";
const NOTICE_CSV_URL = "https://docs.google.com/spreadsheets/d/1_WsSmEpXcckIV9wbQp2K6YZe4jZ2XlX2Vt6lmXmfiHs/gviz/tq?tqx=out:csv&sheet=공지";
const BACKEND_URL = ""; // Apps Script 웹앱 exec 주소를 넣으면 관리자 수정/삭제/공지 저장 가능
const ADMIN_PASSWORD = "0702";
const GROUP_SIZE = 30;

let allData = [];
let filtered = [];
let selectedGroup = "전체";

function parseCSV(text){
  const rows=[]; let row=[], cur="", quote=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c === '"' && quote && n === '"'){ cur+='"'; i++; }
    else if(c === '"'){ quote=!quote; }
    else if(c === ',' && !quote){ row.push(cur); cur=""; }
    else if((c === '\n' || c === '\r') && !quote){
      if(cur || row.length){ row.push(cur); rows.push(row); row=[]; cur=""; }
      if(c === '\r' && n === '\n') i++;
    }else cur+=c;
  }
  if(cur || row.length){ row.push(cur); rows.push(row); }
  return rows;
}
function normInsta(v){ v=String(v||"").trim(); return v ? (v.startsWith("@")?v:"@"+v) : ""; }
function groupNo(no){ return Math.floor((Number(no)-1)/GROUP_SIZE)+1; }

async function loadData(){
  const res = await fetch(SHEET_CSV_URL + "&_=" + Date.now());
  const text = await res.text();
  const rows = parseCSV(text);
  rows.shift();
  allData = rows.map(r=>({
    no:Number(String(r[0]||"").replace(/[^0-9]/g,"")),
    nickname:String(r[1]||"").trim(),
    insta:normInsta(r[2])
  })).filter(x=>x.no && x.nickname && x.insta).sort((a,b)=>a.no-b.no);
  renderStats(); renderTabs(); renderList();
}
async function loadNotice(){
  try{
    const res = await fetch(NOTICE_CSV_URL + "&_=" + Date.now());
    const rows = parseCSV(await res.text());
    const title = rows[1]?.[0] || "";
    const content = rows[1]?.[1] || "";
    const box = document.getElementById("noticeBox");
    if(title || content){ box.textContent = (title?("📢 "+title+"\n"):"") + content; box.classList.remove("hidden"); }
    else box.classList.add("hidden");
  }catch(e){}
}
function renderStats(){
  document.getElementById("totalCount").textContent = allData.length.toLocaleString();
  document.getElementById("groupCount").textContent = Math.ceil(allData.length/GROUP_SIZE);
  document.getElementById("groupSizeText").textContent = GROUP_SIZE;
}
function renderTabs(){
  const max = Math.ceil(allData.length/GROUP_SIZE);
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";
  ["전체", ...Array.from({length:max},(_,i)=>i+1)].forEach(g=>{
    const b=document.createElement("button");
    b.textContent = g==="전체" ? "전체" : `${g}조`;
    b.className = selectedGroup===g ? "on" : "";
    b.onclick=()=>{selectedGroup=g; renderTabs(); renderList();};
    tabs.appendChild(b);
  });
}
function renderList(){
  const q = document.getElementById("searchInput").value.toLowerCase().trim();
  filtered = allData.filter(x=>{
    const okGroup = selectedGroup==="전체" || groupNo(x.no)===selectedGroup;
    const text = `${x.no} ${x.nickname} ${x.insta}`.toLowerCase();
    return okGroup && text.includes(q);
  });
  document.getElementById("resultCount").textContent = `검색 결과 ${filtered.length.toLocaleString()}명`;
  const list = document.getElementById("list");
  list.innerHTML = "";
  const groups = {};
  filtered.forEach(x => { const g=groupNo(x.no); (groups[g] ||= []).push(x); });
  Object.keys(groups).map(Number).sort((a,b)=>a-b).forEach(g=>{
    const title=document.createElement("div");
    title.className="groupTitle";
    title.textContent=`🦊 ${g}조 (${groups[g].length}명)`;
    list.appendChild(title);
    const copy=document.createElement("button");
    copy.className="copyGroup";
    copy.textContent=`📋 ${g}조 복사`;
    copy.onclick=()=>copyGroup(g);
    list.appendChild(copy);
    groups[g].forEach(x=>list.appendChild(card(x)));
  });
}
function card(x){
  const div=document.createElement("div");
  div.className="card";
  const id=x.insta.replace("@","");
  div.innerHTML = `
    <div class="row"><span class="no">${x.no}</span><span class="name">${escapeHtml(x.nickname)}</span></div>
    <div class="insta">${escapeHtml(x.insta)}</div>
    <a class="instaBtn" href="https://instagram.com/${encodeURIComponent(id)}" target="_blank">📷 인스타 바로가기</a>
  `;
  return div;
}
function line(x){ return `${x.no}. ${x.nickname} ${x.insta}`; }
async function copyText(t){ await navigator.clipboard.writeText(t); alert("복사되었습니다"); }
function copyGroup(g){ copyText(allData.filter(x=>groupNo(x.no)===g).map(line).join("\n")); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }

function openAdmin(){ document.getElementById("adminModal").classList.remove("hidden"); }
function closeAdmin(){ document.getElementById("adminModal").classList.add("hidden"); }
function loginAdmin(){
  const pw=document.getElementById("adminPw").value.trim();
  if(pw!==ADMIN_PASSWORD){ alert("비밀번호가 틀렸습니다."); return; }
  document.getElementById("adminArea").classList.remove("hidden");
}
function switchAdminTab(tab){
  document.querySelectorAll(".adminTabs button").forEach(b=>b.classList.toggle("on", b.dataset.adminTab===tab));
  document.querySelectorAll(".adminPane").forEach(p=>p.classList.add("hidden"));
  document.getElementById("admin-"+tab).classList.remove("hidden");
}
async function adminCall(action, payload){
  if(!BACKEND_URL){
    alert("관리자 저장 기능은 Apps Script BACKEND_URL 연결 후 사용할 수 있습니다.");
    return;
  }
  const body = {password:ADMIN_PASSWORD, action, ...payload};
  const res = await fetch(BACKEND_URL, {method:"POST", body:JSON.stringify(body)});
  const msg = await res.text();
  alert(msg);
  await loadData(); await loadNotice();
}
function adminAdd(){ adminCall("add", {nickname:val("addName"), insta:val("addInsta")}); }
function adminEdit(){ adminCall("edit", {no:val("editNo"), nickname:val("editName"), insta:val("editInsta")}); }
function adminDelete(){ if(confirm("정말 삭제할까요?")) adminCall("delete", {no:val("deleteNo")}); }
function adminNotice(){ adminCall("notice", {title:val("noticeTitle"), content:val("noticeContent")}); }
function val(id){ return document.getElementById(id).value.trim(); }

document.getElementById("searchInput").addEventListener("input", renderList);
document.getElementById("refreshBtn").addEventListener("click", ()=>{loadData();loadNotice();});
document.getElementById("bottomRefresh").addEventListener("click", ()=>{loadData();loadNotice();});
document.getElementById("adminBtn").addEventListener("click", openAdmin);
document.getElementById("bottomAdmin").addEventListener("click", openAdmin);
document.getElementById("closeAdmin").addEventListener("click", closeAdmin);
document.getElementById("loginBtn").addEventListener("click", loginAdmin);
document.querySelectorAll(".adminTabs button").forEach(b=>b.onclick=()=>switchAdminTab(b.dataset.adminTab));

if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
loadData(); loadNotice();
