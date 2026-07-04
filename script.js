const SHEET_CSV_URL="https://docs.google.com/spreadsheets/d/1_WsSmEpXcckIV9wbQp2K6YZe4jZ2XlX2Vt6lmXmfiHs/gviz/tq?tqx=out:csv&sheet=Sheet2";
const GROUP_SIZE=30;
const ADMIN_PASSWORD="0702";
// Apps Script 관리자 백엔드 배포 후 주소를 넣으면 실제 시트 저장이 작동합니다.
const BACKEND_URL="";
let members=[];let filtered=[];let selected="전체";let notice=localStorage.getItem("yeowoo_notice")||"";
const $=id=>document.getElementById(id);
function csvParse(text){const rows=[];let row=[],cur='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&q&&n==='"'){cur+='"';i++;continue}if(c==='"'){q=!q;continue}if(c===','&&!q){row.push(cur);cur='';continue}if((c==='
'||c==='')&&!q){if(cur!==''||row.length){row.push(cur);rows.push(row);row=[];cur=''}if(c===''&&n==='
')i++;continue}cur+=c}if(cur!==''||row.length){row.push(cur);rows.push(row)}return rows}
function normInsta(v){v=String(v||'').trim();if(!v)return'';return v.startsWith('@')?v:'@'+v}
async function loadData(){try{const url=SHEET_CSV_URL+(SHEET_CSV_URL.includes('?')?'&':'?')+'_=' + Date.now();const res=await fetch(url,{cache:'no-store'});const text=await res.text();const rows=csvParse(text);rows.shift();members=rows.map(r=>({no:Number(String(r[0]||'').replace(/[^0-9]/g,'')),name:String(r[1]||'').trim(),insta:normInsta(r[2])})).filter(x=>x.no&&x.name&&x.insta).sort((a,b)=>a.no-b.no);renderAll()}catch(e){alert('데이터를 불러오지 못했어요. 구글시트 공개 설정을 확인해주세요.')}}
function groupNo(no){return Math.floor((Number(no)-1)/GROUP_SIZE)+1}
function renderAll(){renderStats();renderTabs();renderNotice();renderList()}
function renderStats(){const max=members.length?Math.max(...members.map(x=>groupNo(x.no))):0;$('totalCount').textContent=members.length.toLocaleString();$('groupCount').textContent=max;$('groupSizeBox').textContent=GROUP_SIZE}
function renderTabs(){const max=members.length?Math.max(...members.map(x=>groupNo(x.no))):0;let html=`<button class="tab ${selected==='전체'?'active':''}" data-g="전체">전체</button>`;for(let i=1;i<=max;i++)html+=`<button class="tab ${selected===i?'active':''}" data-g="${i}">${i}조</button>`;$('tabs').innerHTML=html;document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{selected=b.dataset.g==='전체'?'전체':Number(b.dataset.g);renderTabs();renderList();})}
function renderNotice(){if(notice.trim()){$('noticeBox').classList.remove('hidden');$('noticeText').textContent=notice}else $('noticeBox').classList.add('hidden')}
function renderList(){const q=$('searchInput').value.toLowerCase().trim();filtered=members.filter(x=>{const hit=(x.no+' '+x.name+' '+x.insta).toLowerCase().includes(q);const gm=selected==='전체'||groupNo(x.no)===selected;return hit&&gm});$('resultCount').textContent=`검색 결과 ${filtered.length.toLocaleString()}명`;const groups={};filtered.forEach(x=>{const g=groupNo(x.no);(groups[g]??=[]).push(x)});let html='';Object.keys(groups).map(Number).sort((a,b)=>a-b).forEach(g=>{html+=`<div class="group-title">🦊 ${g}조 (${groups[g].length}명)</div><button class="group-copy" onclick="copyGroup(${g})">📋 ${g}조 복사</button>`;groups[g].forEach(x=>{const id=x.insta.replace('@','');html+=`<article class="member-card"><div class="num">${x.no}</div><div><div class="member-name">${escapeHtml(x.name)}</div><div class="member-id">${escapeHtml(x.insta)}</div></div><button class="insta-btn" onclick="openInsta('${id}')">📷 인스타</button></article>`})});$('list').innerHTML=html||'<div class="notice-card">표시할 인원이 없습니다.</div>'}
function escapeHtml(s){return String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function line(x){return `${x.no}. ${x.name} ${x.insta}`}
function copyText(t){navigator.clipboard?.writeText(t).then(()=>alert('복사되었습니다')).catch(()=>{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();alert('복사되었습니다')})}
function copyGroup(g){copyText(members.filter(x=>groupNo(x.no)===g).map(line).join('
'))}
function openInsta(id){window.open(`https://instagram.com/${id}`,'_blank')}
function openAdmin(){ $('adminModal').classList.remove('hidden'); $('adminPw').value=''; $('loginBox').classList.remove('hidden'); $('adminPanel').classList.add('hidden'); setTimeout(()=>$('adminPw').focus(),100)}
function closeAdmin(){ $('adminModal').classList.add('hidden')}
function login(){ if($('adminPw').value===ADMIN_PASSWORD){$('loginBox').classList.add('hidden');$('adminPanel').classList.remove('hidden');$('noticeInput').value=notice}else alert('비밀번호가 틀렸습니다.')}
function logout(){closeAdmin()}
async function backend(action,payload){if(!BACKEND_URL){return {ok:false,msg:'관리자 저장용 Apps Script 백엔드 연결이 필요합니다. ZIP 안의 README를 확인해주세요.'}}const res=await fetch(BACKEND_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({pw:ADMIN_PASSWORD,action,...payload})});return await res.json()}
async function doAdmin(action,payload,success){const r=await backend(action,payload);alert(r.msg||r.message|| (r.ok?'완료':'실패'));if(r.ok){success&&success();loadData()}}
function saveNotice(){notice=$('noticeInput').value.trim();localStorage.setItem('yeowoo_notice',notice);renderNotice();doAdmin('saveNotice',{content:notice},()=>{})}
function deleteNotice(){notice='';localStorage.removeItem('yeowoo_notice');$('noticeInput').value='';renderNotice();doAdmin('deleteNotice',{},()=>{})}
function addMember(){doAdmin('addMember',{nickname:$('addName').value,insta:$('addInsta').value},()=>{$('addName').value='';$('addInsta').value=''})}
function editMember(){doAdmin('updateMember',{no:$('editNo').value,nickname:$('editName').value,insta:$('editInsta').value},()=>{})}
function deleteMember(){if(confirm('정말 삭제할까요?'))doAdmin('deleteMember',{no:$('deleteNo').value},()=>{$('deleteNo').value=''})}
$('searchInput').addEventListener('input',renderList);$('reloadBtn').onclick=loadData;$('reloadBottomBtn').onclick=loadData;$('homeBtn').onclick=()=>scrollTo({top:0,behavior:'smooth'});$('adminOpenBtn').onclick=openAdmin;$('adminBottomBtn').onclick=openAdmin;$('adminCloseBtn').onclick=closeAdmin;$('loginBtn').onclick=login;$('logoutBtn').onclick=logout;$('saveNoticeBtn').onclick=saveNotice;$('deleteNoticeBtn').onclick=deleteNotice;$('addBtn').onclick=addMember;$('editBtn').onclick=editMember;$('deleteBtn').onclick=deleteMember;$('noticeMoreBtn').onclick=()=>{$('noticeBox').classList.add('hidden')};
if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js?v=15').catch(()=>{})}loadData();
