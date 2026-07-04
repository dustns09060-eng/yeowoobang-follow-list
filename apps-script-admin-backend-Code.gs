// 여우방 GitHub Pages 관리자 모드용 Apps Script 백엔드
// 1) 새 Apps Script 프로젝트에 이 파일 전체 붙여넣기
// 2) SPREADSHEET_ID 확인
// 3) 배포 > 새 배포 > 웹 앱 > 모든 사용자 > 배포
// 4) 배포 URL을 script.js의 APPS_SCRIPT_API_URL에 넣기

const SPREADSHEET_ID = '1_WsSmEpXcckIV9wbQp2K6YZe4jZ2XlX2Vt6lmXmfiHs';
const SHEET_NAME = 'Sheet2';
const NOTICE_SHEET = '공지';
const ADMIN_PASSWORD = '0702';

function doPost(e) {
  const p = e.parameter || {};
  if (String(p.password || '') !== ADMIN_PASSWORD) return text('비밀번호 오류');
  const action = String(p.action || '');
  if (action === 'add') return text(addMember_(p.nickname, p.insta));
  if (action === 'update') return text(updateMember_(p.no, p.nickname, p.insta));
  if (action === 'delete') return text(deleteMember_(p.no));
  if (action === 'notice') return text(saveNotice_(p.title, p.content));
  return text('알 수 없는 요청');
}
function text(msg){ return ContentService.createTextOutput(String(msg)).setMimeType(ContentService.MimeType.TEXT); }
function ss_(){ return SpreadsheetApp.openById(SPREADSHEET_ID); }
function sheet_(){ return ss_().getSheetByName(SHEET_NAME); }
function insta_(v){ v=String(v||'').trim(); return v && !v.startsWith('@') ? '@'+v : v; }
function data_(){
  const values = sheet_().getDataRange().getDisplayValues(); values.shift();
  return values.filter(r=>r[0]&&r[1]&&r[2]).map(r=>({no:Number(String(r[0]).replace(/[^0-9]/g,'')), nickname:String(r[1]).trim(), insta:insta_(r[2])})).filter(x=>x.no&&x.nickname&&x.insta);
}
function addMember_(nickname, insta){
  nickname=String(nickname||'').trim(); insta=insta_(insta);
  if(!nickname || !insta) return '닉네임과 아이디를 입력해주세요.';
  const d=data_(); const next=d.length ? Math.max(...d.map(x=>x.no))+1 : 1;
  sheet_().appendRow([next,nickname,insta]);
  return next+'번 추가 완료';
}
function updateMember_(no,nickname,insta){
  no=Number(no); nickname=String(nickname||'').trim(); insta=insta_(insta);
  if(!no || !nickname || !insta) return '번호, 닉네임, 아이디를 입력해주세요.';
  const sh=sheet_(); const values=sh.getDataRange().getValues();
  for(let i=1;i<values.length;i++){
    if(Number(values[i][0])===no){ sh.getRange(i+1,2).setValue(nickname); sh.getRange(i+1,3).setValue(insta); return no+'번 수정 완료'; }
  }
  return '번호를 찾지 못했습니다.';
}
function deleteMember_(no){
  no=Number(no); if(!no) return '삭제할 번호를 입력해주세요.';
  const sh=sheet_(); const values=sh.getDataRange().getValues();
  for(let i=1;i<values.length;i++){
    if(Number(values[i][0])===no){ sh.deleteRow(i+1); return no+'번 삭제 완료'; }
  }
  return '번호를 찾지 못했습니다.';
}
function saveNotice_(title, content){
  const ss=ss_(); let sh=ss.getSheetByName(NOTICE_SHEET);
  if(!sh){ sh=ss.insertSheet(NOTICE_SHEET); sh.getRange('A1').setValue('제목'); sh.getRange('B1').setValue('내용'); }
  sh.getRange('A2').setValue(title||''); sh.getRange('B2').setValue(content||'');
  return '공지 저장 완료';
}
